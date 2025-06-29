import * as DBHelpers from "../../lib/db-helpers.js"
import * as APIHelpers from "../../lib/api-helpers.js"
import * as PGPOperations from "../../lib/pgp-operations.js"

const PGPKeyHandlers = ({ KeyUserId, PGPSubkey, PGPKey, KeyStats }) => ({
  add: async ({ keytext, mr }, ctx) => {
    try {
      // Parse and validate the PGP key
      const parseResult = await PGPOperations.parseKey(keytext)
      if (!parseResult.isValid) {
        return {
          success: false,
          message: `Invalid PGP key: ${parseResult.error}`,
          keyid: null
        }
      }

      // Extract key metadata
      const keyMetadata = await PGPOperations.extractKeyMetadata(parseResult.key)

      // Validate extracted data
      const validation = DBHelpers.validateKeyData(keyMetadata)
      if (!validation.isValid) {
        return {
          success: false,
          message: `Key validation failed: ${validation.errors.join(', ')}`,
          keyid: null
        }
      }

      // Check if key already exists
      const existingKey = await PGPKey.findOne({
        where: [
          { keyid: keyMetadata.keyid },
          { fingerprint: keyMetadata.fingerprint }
        ]
      })

      if (existingKey) {
        return {
          success: false,
          message: 'Key already exists on server',
          keyid: keyMetadata.keyid
        }
      }

      // Create key record with ASCII-armored data
      const keyRecord = PGPKey.create({
        ...keyMetadata,
        keydata: keytext
      })

      const savedKey = await PGPKey.save(keyRecord)

      // Extract and save user IDs
      const userIds = await PGPOperations.extractUserIds(parseResult.key)
      for (const uid of userIds) {
        const userIdRecord = KeyUserId.create({
          key_id: savedKey.id,
          ...uid
        })
        await KeyUserId.save(userIdRecord)
      }

      // Extract and save subkeys
      const subkeys = await PGPOperations.extractSubkeys(parseResult.key)
      for (const subkey of subkeys) {
        const subkeyRecord = PGPSubkey.create({
          primary_key_id: savedKey.id,
          ...subkey
        })
        await PGPSubkey.save(subkeyRecord)
      }

      return {
        success: true,
        message: 'Key successfully added to keyserver',
        keyid: keyMetadata.keyid
      }

    } catch (error) {
      ctx.logger?.error('Error adding PGP key:', error)
      return {
        success: false,
        message: 'Internal server error while processing key',
        keyid: null
      }
    }
  },

  lookup: async ({ search, ...opts }, ctx) => {
    try {
      const {
        op = 'index',
        exact = false,
        fingerprint = false,
        mr = false,
        limit = 20,
        offset = 0
      } = opts

      // Build search conditions
      const { conditions, joins } = DBHelpers.buildSearchConditions({
        search,
        exact,
        ...opts
      })

      // Create query builder
      let queryBuilder = PGPKey.createQueryBuilder('key')

      // Add joins
      if (joins.includes('userIds')) {
        queryBuilder = queryBuilder
          .leftJoinAndSelect('key.userIds', 'userIds')
      }

      // Add subkeys if needed for detailed operations
      if (op === 'get' || op === 'vindex') {
        queryBuilder = queryBuilder
          .leftJoinAndSelect('key.subkeys', 'subkeys')
      }

      // Apply conditions
      Object.entries(conditions).forEach(([field, value]) => {
        if (typeof value === 'object' && value.like) {
          queryBuilder = queryBuilder.andWhere(`${field} LIKE :${field.replace('.', '_')}`, {
            [field.replace('.', '_')]: value.like
          })
        } else if (typeof value === 'object' && (value.gte || value.lte)) {
          if (value.gte) {
            queryBuilder = queryBuilder.andWhere(`${field} >= :${field.replace('.', '_')}_gte`, {
              [`${field.replace('.', '_')}_gte`]: value.gte
            })
          }
          if (value.lte) {
            queryBuilder = queryBuilder.andWhere(`${field} <= :${field.replace('.', '_')}_lte`, {
              [`${field.replace('.', '_')}_lte`]: value.lte
            })
          }
        } else {
          queryBuilder = queryBuilder.andWhere(`${field} = :${field.replace('.', '_')}`, {
            [field.replace('.', '_')]: value
          })
        }
      })

      // Get total count
      const total = await queryBuilder.getCount()

      // Apply pagination
      queryBuilder = queryBuilder
        .skip(offset)
        .take(limit)
        .orderBy('key.creation_date', 'DESC')

      // Execute query
      const keyResults = await queryBuilder.getMany()

      // Format results based on operation type
      const keys = keyResults.map(key => {
        const result = {
          keyid: key.keyid,
          fingerprint: fingerprint ? key.fingerprint : undefined,
          algorithm: key.algorithm,
          keysize: key.keysize,
          creation_date: key.creation_date.toISOString(),
          expiration_date: key.expiration_date ? key.expiration_date.toISOString() : null,
          revoked: key.revoked,
          expired: key.expired,
          uids: key.userIds ? key.userIds.map(uid => uid.uid_string) : []
        }

        // Include key data for 'get' operation
        if (op === 'get') {
          result.keydata = key.keydata
        }

        // Include additional details for verbose index
        if (op === 'vindex') {
          result.subkeys = key.subkeys ? key.subkeys.map(subkey => ({
            keyid: subkey.keyid,
            fingerprint: subkey.fingerprint,
            algorithm: subkey.algorithm,
            keysize: subkey.keysize,
            usage_flags: subkey.usage_flags,
            creation_date: subkey.creation_date.toISOString(),
            expiration_date: subkey.expiration_date ? subkey.expiration_date.toISOString() : null,
            revoked: subkey.revoked,
            expired: subkey.expired
          })) : []
        }

        // Remove undefined values
        return Object.fromEntries(
          Object.entries(result).filter(([_, value]) => value !== undefined)
        )
      })

      // Update lookup statistics
      if (keys.length > 0) {
        try {
          const today = new Date().toISOString().split('T')[0]

          // Update global stats
          await KeyStats.createQueryBuilder()
            .insert()
            .into(KeyStats)
            .values({
              key_id: null,
              date: today,
              lookup_count: 1,
              download_count: op === 'get' ? 1 : 0
            })
            .orUpdate(['lookup_count', 'download_count'], ['key_id', 'date'])
            .execute()

          // Update individual key stats
          for (const key of keyResults) {
            await KeyStats.createQueryBuilder()
              .insert()
              .into(KeyStats)
              .values({
                key_id: key.id,
                date: today,
                lookup_count: 1,
                download_count: op === 'get' ? 1 : 0
              })
              .orUpdate(['lookup_count', 'download_count'], ['key_id', 'date'])
              .execute()
          }
        } catch (statsError) {
          ctx.logger?.warn('Failed to update lookup statistics:', statsError)
        }
      }

      return {
        keys,
        total,
        offset,
        limit
      }

    } catch (error) {
      ctx.logger?.error('Error during key lookup:', error)
      throw error
    }
  },

  delete: async ({ keyid, token }, ctx) => {
    try {
      // Validate JWT token
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
      const validation = await APIHelpers.validateJWT(token, JWT_SECRET)

      if (!validation.isValid) {
        return {
          success: false,
          message: `Authentication failed: ${validation.error}`
        }
      }

      // Find the key to delete
      const key = await PGPKey.findOne({
        where: [
          { keyid: keyid.toUpperCase() },
          { fingerprint: keyid.toUpperCase() }
        ],
        relations: ['userIds', 'subkeys']
      })

      if (!key) {
        return {
          success: false,
          message: 'Key not found'
        }
      }

      // Delete related records (cascade should handle this, but explicit for safety)
      await KeyUserId.delete({ key_id: key.id })
      await PGPSubkey.delete({ primary_key_id: key.id })
      await KeyStats.delete({ key_id: key.id })

      // Delete the key
      await PGPKey.delete(key.id)

      ctx.logger?.info(`Key deleted: ${key.keyid} by admin`, {
        keyid: key.keyid,
        fingerprint: key.fingerprint,
        admin: validation.payload.sub
      })

      return {
        success: true,
        message: 'Key successfully deleted from keyserver'
      }

    } catch (error) {
      ctx.logger?.error('Error deleting key:', error)
      return {
        success: false,
        message: 'Internal server error while deleting key'
      }
    }
  }
})

export default PGPKeyHandlers
import * as DBHelpers from "../../lib/db-helpers.js"
import * as APIHelpers from "../../lib/api-helpers.js"
import * as PGPOperations from "../../lib/pgp-operations.js"
import { PGP_ALGORITHM_ID } from "../../lib/pgp-utils.js"

// Helper function to format dates for machine-readable output (seconds since epoch)
const formatDateForMR = (date) => {
  if (!date) return ''
  return Math.floor(new Date(date).getTime() / 1000)
}

// Helper function to create flags for machine-readable output
const createFlagsForMR = (key) => {
  const flags = []
  if (key.revoked) flags.push('r')
  if (key.expired) flags.push('e')
  // 'd' (disabled) flag is not in the current schema, so it's omitted.
  return flags.join('')
}

/**
 * Formats key data into the HKP machine-readable format for lookup operations.
 * @param {Array} keys - The array of key objects from the database.
 * @param {string} op - The operation type ('index' or 'vindex').
 * @returns {string} The machine-readable representation.
 */
const formatMachineReadableLookup = (keys, op) => {
  // Handle the case of no results with correct formatting.
  if (keys.length === 0) {
    return 'info:1:0\r\n'
  }

  const lines = []
  lines.push(`info:1:${keys.length}`)

  keys.forEach(key => {
    const pubFlags = createFlagsForMR(key)
    // Use the 32-bit (short) key ID for compatibility with clients like GPG Keychain.
    const shortKeyId = key.keyid.slice(-8)

    // Primary key line
    lines.push([
      'pub',
      shortKeyId, // Use the short key ID
      PGP_ALGORITHM_ID[key.algorithm] || 0,
      key.keysize,
      formatDateForMR(key.creation_date),
      formatDateForMR(key.expiration_date),
      pubFlags
    ].join(':'))

    // User ID lines
    if (key.userIds) {
      key.userIds.forEach(uid => {
        const escapedUid = encodeURIComponent(uid.uid_string)
        lines.push([
          'uid',
          escapedUid,
          formatDateForMR(key.creation_date),
          formatDateForMR(key.expiration_date),
          ''
        ].join(':'))
      })
    }

    // Subkey lines (for 'vindex' operation)
    if (op === 'vindex' && key.subkeys) {
      key.subkeys.forEach(subkey => {
        const subkeyFlags = createFlagsForMR(subkey)
        // Also use short key ID for subkeys for consistency.
        const subkeyShortId = subkey.keyid.slice(-8)
        lines.push([
          'sub',
          subkeyShortId,
          PGP_ALGORITHM_ID[subkey.algorithm] || 0,
          subkey.keysize,
          formatDateForMR(subkey.creation_date),
          formatDateForMR(subkey.expiration_date),
          subkeyFlags
        ].join(':'))
      })
    }
  })

  // Join with CRLF and add a trailing CRLF for maximum client compatibility.
  return lines.join('\r\n') + '\r\n'
}


const PGPKeyHandlers = ({ KeyUserId, PGPSubkey, PGPKey, KeyStats }) => ({
  add: async ({ keytext, mr }, ctx) => {
    if (mr) {
      ctx.response.headers["Content-Type"] = "text/plain"
    }
    // Parse and validate the PGP key
    const parseResult = await PGPOperations.parseKey(keytext)
    if (!parseResult.isValid) {
      if (mr) {
        return `error: Invalid PGP key: ${parseResult.error}`
      }
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
      if (mr) {
        return `error: Key validation failed: ${validation.errors.join(', ')}`
      }
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
      if (mr) {
        return `error: Key already exists on server\nkeyid: ${keyMetadata.keyid}`
      }
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

    if (mr) {
      return `success: Key successfully added to keyserver\nkeyid: ${keyMetadata.keyid}`
    }
    return {
      success: true,
      message: 'Key successfully added to keyserver',
      keyid: keyMetadata.keyid
    }
  },

  lookup: async ({ search, ...opts }, ctx) => {
    const {
      op = 'index',
      exact = false,
      fingerprint = false,
      mr = (opts.options === "mr"),
      limit = 20,
      offset = 0,
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

    // Handle machine-readable output if requested
    if (mr) {
      ctx.response.headers['Content-Type'] = "text/plain"
      if (op === 'index' || op === 'vindex') {
        // The calling context should set the Content-Type to text/plain.
        return formatMachineReadableLookup(keyResults, op)
      }
      if (op === 'get' && keyResults.length > 0) {
        // The calling context should set the Content-Type to application/pgp-keys.
        return keyResults[0].keydata
      }
    }


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


  },

  delete: async ({ keyid, token }, ctx) => {
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
  }
})

export default PGPKeyHandlers
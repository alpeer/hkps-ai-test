import * as openpgp from 'openpgp'
import { getAlgorithmName, getUsageFlags, parseUserIdString } from './pgp-utils.js'

/**
 * Parse and validate an ASCII-armored PGP key
 * @param {string} keytext - ASCII-armored PGP key block
 * @returns {Promise<{isValid: boolean, key?: object, error?: string}>}
 */
export const parseKey = async (keytext) => {
  try {
    // Clean and validate the key text
    const cleanKeytext = keytext.trim()

    if (!cleanKeytext.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
      return { isValid: false, error: 'Invalid PGP key format' }
    }

    // Parse the key using openpgp
    const key = await openpgp.readKey({ armoredKey: cleanKeytext })

    return { isValid: true, key }
  } catch (error) {
    return { isValid: false, error: error.message }
  }
}

/**
 * Extract key metadata for database storage
 * @param {object} key - Parsed OpenPGP key object
 * @returns {Promise<object>} Key metadata
 */
export const extractKeyMetadata = async (key) => {
  const primaryKey = key.getKeys()[0]
  const keyID = primaryKey.getKeyID()
  const fingerprint = primaryKey.getFingerprint()

  // Get algorithm info
  const algorithm = getAlgorithmName(primaryKey.algorithm)
  const keysize = primaryKey.getAlgorithmInfo().bits

  // Get dates
  const creationDate = primaryKey.created
  const expirationTime = await key.getExpirationTime()
  const expirationDate = expirationTime ? new Date(expirationTime) : null

  // Check status
  const isRevoked = await key.isRevoked()
  const isExpired = expirationDate ? new Date() > expirationDate : false

  return {
    keyid: keyID.toHex().toUpperCase(),
    fingerprint: fingerprint.toUpperCase(),
    algorithm,
    keysize,
    creation_date: creationDate,
    expiration_date: expirationDate,
    revoked: isRevoked,
    expired: isExpired
  }
}

/**
 * Extract user IDs from a PGP key
 * @param {object} key - Parsed OpenPGP key object
 * @returns {Promise<Array>} Array of user ID objects
 */
export const extractUserIds = async (key) => {
  const userIds = []

  for (const user of key.users) {
    const uidString = user.userID?.userID || ''

    // Parse the UID string (format: "Name (comment) <email>")
    const parsed = parseUserIdString(uidString)

    // Check if this UID is revoked
    const isRevoked = await user.isRevoked()

    userIds.push({
      uid_string: uidString,
      name: parsed.name,
      email: parsed.email,
      comment: parsed.comment,
      verified: false, // Would need signature verification
      revoked: isRevoked
    })
  }

  return userIds
}

/**
 * Extract subkeys from a PGP key
 * @param {object} key - Parsed OpenPGP key object
 * @returns {Promise<Array>} Array of subkey objects
 */
export const extractSubkeys = async (key) => {
  const subkeys = []

  for (const subkey of key.subkeys) {
    const subkeyPacket = subkey.keyPacket
    const keyID = subkeyPacket.getKeyID()
    const fingerprint = subkeyPacket.getFingerprint()

    // Get algorithm info
    const algorithm = getAlgorithmName(subkeyPacket.algorithm)
    const keysize = subkeyPacket.getAlgorithmInfo().bits

    // Get usage flags
    const usageFlags = getUsageFlags(subkey)

    // Get dates
    const creationDate = subkeyPacket.created
    const expirationTime = await subkey.getExpirationTime()
    const expirationDate = expirationTime ? new Date(expirationTime) : null

    // Check status
    const isRevoked = await subkey.isRevoked()
    const isExpired = expirationDate ? new Date() > expirationDate : false

    subkeys.push({
      keyid: keyID.toHex().toUpperCase(),
      fingerprint: fingerprint.toUpperCase(),
      algorithm,
      keysize,
      usage_flags: usageFlags,
      creation_date: creationDate,
      expiration_date: expirationDate,
      revoked: isRevoked,
      expired: isExpired
    })
  }

  return subkeys
}
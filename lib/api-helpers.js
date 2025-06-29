import { jwtVerify } from "jose/jwt/verify"
import { createHash } from 'node:crypto'

/**
 * Format key data for different output formats
 * @param {Array} keys - Array of key data
 * @param {string} format - Output format ('json', 'mr')
 * @returns {string} Formatted output
 */
export const formatKeyOutput = (keys, format = 'json') => {
  if (format === 'mr') {
    // Machine readable format
    return keys.map(key => {
      const lines = [
        `pub:${key.keyid}:${key.algorithm}:${key.keysize}:${key.creation_date}:${key.expiration_date || ''}:${key.revoked ? 'r' : ''}${key.expired ? 'e' : ''}:`
      ]

      if (key.uids) {
        key.uids.forEach(uid => {
          lines.push(`uid:${uid}:`)
        })
      }

      return lines.join('\n')
    }).join('\n')
  }

  return JSON.stringify(keys, null, 2)
}

/**
 * Generate statistics hash for caching
 * @param {object} stats - Statistics data
 * @returns {string} MD5 hash of stats
 */
export const generateStatsHash = (stats) => {
  const statsString = JSON.stringify(stats)
  return createHash('md5').update(statsString).digest('hex')
}
/**
 * Validate JWT token for admin operations
 * @param {string} token - JWT token
 * @param {string} secret - Secret key for verification
 * @returns {Promise<{isValid: boolean, payload?: object, error?: string}>}
 */
export const validateJWT = async (token, secret) => {
  try {
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey)

    // Check if token has admin privileges
    if (!payload.admin) {
      return { isValid: false, error: 'Insufficient privileges' }
    }

    return { isValid: true, payload }
  } catch (error) {
    return { isValid: false, error: error.message }
  }
}
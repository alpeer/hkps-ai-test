import * as openpgp from 'openpgp'

/**
 * Authoritative map of common OpenPGP public-key algorithm IDs to their names.
 * Based on RFC 4880 and later standards.
 */
export const PGP_ALGORITHM_MAP = {
  1: 'RSA',      // RSA (Encrypt or Sign)
  16: 'Elgamal', // Elgamal (Encrypt-Only)
  17: 'DSA',      // DSA (Sign-Only)
  18: 'ECDH',     // Elliptic Curve Diffie-Hellman
  19: 'ECDSA',    // ECDSA
  22: 'EdDSA'     // EdDSA
}

/**
 * Creates a reverse map from PGP_ALGORITHM_MAP.
 * e.g., { 1: 'RSA' } becomes { 'RSA': 1 }
 */
export const PGP_ALGORITHM_ID = Object.fromEntries(
  Object.entries(PGP_ALGORITHM_MAP).map(([key, value]) => [value, parseInt(key, 10)])
)

/**
 * Correctly gets the algorithm name from its ID.
 */
export const getAlgorithmName = (algorithmId) => {
  return PGP_ALGORITHM_MAP[algorithmId] || 'Unknown'
}


/**
 * Parse user ID string into components
 * @param {string} uidString - Full UID string
 * @returns {object} Parsed components
 */
export const parseUserIdString = (uidString) => {
  const result = { name: null, email: null, comment: null }

  // Extract email
  const emailMatch = uidString.match(/<([^>]+)>/)
  if (emailMatch) {
    result.email = emailMatch[1]
  }

  // Extract comment
  const commentMatch = uidString.match(/\(([^)]+)\)/)
  if (commentMatch) {
    result.comment = commentMatch[1]
  }

  // Extract name (everything before email/comment)
  let name = uidString
  if (emailMatch) {
    name = name.replace(emailMatch[0], '').trim()
  }
  if (commentMatch) {
    name = name.replace(commentMatch[0], '').trim()
  }

  if (name) {
    result.name = name
  }

  return result
}

/**
 * Get usage flags from subkey
 * @param {object} subkey - OpenPGP subkey object
 * @returns {string} Usage flags string
 */
export const getUsageFlags = (subkey) => {
  const flags = []

  if (subkey.keyPacket.algorithm === openpgp.enums.publicKey.rsaEncryptSign) {
    flags.push('E', 'S')
  }

  // This would need more detailed analysis of key usage flags
  // For now, return a default
  return flags.join('') || 'E'
}



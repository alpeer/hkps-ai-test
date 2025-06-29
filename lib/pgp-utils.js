import * as openpgp from 'openpgp'


/**
 * Convert OpenPGP algorithm constant to string
 * @param {number} algorithmId - OpenPGP algorithm ID
 * @returns {string} Algorithm name
 */
export const getAlgorithmName = (algorithmId) => {
  const algorithms = {
    1: 'RSA',
    16: 'DSA',
    18: 'ECDSA',
    22: 'EdDSA'
  }
  return algorithms[algorithmId] || 'Unknown'
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



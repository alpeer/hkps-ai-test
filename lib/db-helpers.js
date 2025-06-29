
/**
 * Normalize search terms for key lookup
 * @param {string} search - Search term
 * @returns {object} Normalized search criteria
 */
export const normalizeSearchTerm = (search) => {
  const term = search.trim()

  // Email pattern
  if (term.includes('@') && term.includes('.')) {
    return { type: 'email', value: term.toLowerCase() }
  }

  // Key ID pattern (8 or 16 hex characters)
  if (/^[0-9A-Fa-f]{8}$/.test(term) || /^[0-9A-Fa-f]{16}$/.test(term)) {
    return { type: 'keyid', value: term.toUpperCase() }
  }

  // Fingerprint pattern (40 hex characters)
  if (/^[0-9A-Fa-f]{40}$/.test(term)) {
    return { type: 'fingerprint', value: term.toUpperCase() }
  }

  // Default to name search
  return { type: 'name', value: term }
}

/**
 * Build database query conditions from search parameters
 * @param {object} searchParams - Search parameters from API
 * @returns {object} Query builder conditions
 */
export const buildSearchConditions = (searchParams) => {
  const {
    search,
    exact,
    algorithm,
    min_keysize,
    created_after,
    created_before,
    expires_after,
    expires_before,
    include_revoked,
    include_expired
  } = searchParams

  const conditions = {}
  const joins = []

  // Parse the main search term
  if (search) {
    const normalized = normalizeSearchTerm(search)

    switch (normalized.type) {
      case 'email':
        joins.push('userIds')
        conditions['userIds.email'] = exact
          ? normalized.value
          : { like: `%${normalized.value}%` }
        break
      case 'keyid':
        conditions.keyid = { like: `%${normalized.value}` }
        break
      case 'fingerprint':
        conditions.fingerprint = normalized.value
        break
      case 'name':
        joins.push('userIds')
        conditions['userIds.name'] = exact
          ? normalized.value
          : { like: `%${normalized.value}%` }
        break
    }
  }

  // Algorithm filter
  if (algorithm) {
    conditions.algorithm = algorithm
  }

  // Key size filter
  if (min_keysize) {
    conditions.keysize = { gte: min_keysize }
  }

  // Date filters
  if (created_after) {
    conditions.creation_date = { gte: new Date(created_after) }
  }
  if (created_before) {
    conditions.creation_date = {
      ...conditions.creation_date,
      lte: new Date(created_before)
    }
  }
  if (expires_after) {
    conditions.expiration_date = { gte: new Date(expires_after) }
  }
  if (expires_before) {
    conditions.expiration_date = {
      ...conditions.expiration_date,
      lte: new Date(expires_before)
    }
  }

  // Status filters
  if (!include_revoked) {
    conditions.revoked = false
  }
  if (!include_expired) {
    conditions.expired = false
  }

  return { conditions, joins }
}

/**
 * Validate key data before database insertion
 * @param {object} keyData - Key data to validate
 * @returns {object} Validation result
 */
export const validateKeyData = (keyData) => {
  const errors = []

  if (!keyData.keyid || !/^[0-9A-F]{16}$/.test(keyData.keyid)) {
    errors.push('Invalid key ID format')
  }

  if (!keyData.fingerprint || !/^[0-9A-F]{40}$/.test(keyData.fingerprint)) {
    errors.push('Invalid fingerprint format')
  }

  if (!['RSA', 'DSA', 'ECDSA', 'EdDSA'].includes(keyData.algorithm)) {
    errors.push('Unsupported algorithm')
  }

  if (!keyData.keysize || keyData.keysize < 512) {
    errors.push('Key size too small')
  }

  if (!keyData.creation_date || !(keyData.creation_date instanceof Date)) {
    errors.push('Invalid creation date')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
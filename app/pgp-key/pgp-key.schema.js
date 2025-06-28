const HKPSchema = {
  // Add a new public key to the keyserver
  add: {
    input: {
      type: "object",
      required: ["keytext"],
      properties: {
        keytext: {
          type: "string",
          description: "ASCII-armored PGP public key block"
        },
        mr: {
          type: "boolean",
          description: "Machine readable format response"
        }
      }
    },
    output: {
      type: "object",
      properties: {
        success: "boolean",
        message: "string",
        keyid: "string"
      }
    }
  },

  // Lookup/search keys by various criteria (unified endpoint)
  lookup: {
    input: {
      type: "object",
      required: ["search"],
      properties: {
        search: {
          type: "string",
          description: "Search term (email, keyid, fingerprint, or name)"
        },
        op: {
          type: "string",
          enum: ["get", "index", "vindex"],
          default: "index",
          description: "Operation: get (return key data), index (return key info), vindex (verbose index)"
        },
        exact: {
          type: "boolean",
          description: "Exact match only"
        },
        fingerprint: {
          type: "boolean",
          description: "Show fingerprints in index operations"
        },
        mr: {
          type: "boolean",
          description: "Machine readable format response"
        },
        // Advanced search filters
        algorithm: {
          type: "string",
          enum: ["RSA", "DSA", "ECDSA", "EdDSA"],
          description: "Key algorithm filter"
        },
        min_keysize: {
          type: "number",
          minimum: 512,
          description: "Minimum key size in bits"
        },
        created_after: {
          type: "string",
          format: "date-time",
          description: "ISO 8601 datetime - keys created after this date"
        },
        created_before: {
          type: "string",
          format: "date-time",
          description: "ISO 8601 datetime - keys created before this date"
        },
        expires_after: {
          type: "string",
          format: "date-time",
          description: "ISO 8601 datetime - keys expiring after this date"
        },
        expires_before: {
          type: "string",
          format: "date-time",
          description: "ISO 8601 datetime - keys expiring before this date"
        },
        include_revoked: {
          type: "boolean",
          default: false,
          description: "Include revoked keys in results"
        },
        include_expired: {
          type: "boolean",
          default: false,
          description: "Include expired keys in results"
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 100,
          default: 20,
          description: "Maximum number of results to return"
        },
        offset: {
          type: "number",
          minimum: 0,
          default: 0,
          description: "Number of results to skip for pagination"
        }
      }
    },
    output: {
      type: "object",
      properties: {
        keys: {
          type: "array",
          items: {
            type: "object",
            properties: {
              keyid: "string",
              fingerprint: "string",
              algorithm: "string",
              keysize: "number",
              creation_date: {
                type: "string",
                format: "date-time",
                description: "ISO 8601 datetime when key was created"
              },
              expiration_date: {
                type: "string",
                format: "date-time",
                description: "ISO 8601 datetime when key expires (null if no expiration)"
              },
              revoked: {
                type: "boolean",
                description: "True if key has been revoked"
              },
              expired: {
                type: "boolean",
                description: "True if key has passed expiration date"
              },
              uids: {
                type: "array",
                items: "string",
                description: "User IDs associated with this key"
              },
              keydata: {
                type: "string",
                description: "ASCII-armored key data (only present when op=get)"
              }
            }
          }
        },
        total: "number",
        offset: "number",
        limit: "number"
      }
    }
  },

  // Delete a key (admin operation)
  delete: {
    input: {
      type: "object",
      required: ["keyid", "token"],
      properties: {
        keyid: {
          type: "string",
          description: "Key ID or fingerprint to delete (hex format)"
        },
        token: {
          type: "string",
          format: "jwt",
          description: "Valid JWT authentication token"
        }
      }
    },
    output: {
      type: "object",
      properties: {
        success: "boolean",
        message: "string"
      }
    }
  }
}

export default HKPSchema
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
          oneOf: [
            { type: "boolean" },
            { type: "string", enum: ["on", "off"] }
          ],
          description: "Machine readable format response (boolean or 'on'/'off')"
        },
        options: {
          type: "string",
          enum: ["mr"],
          description: "Legacy HKP options parameter (use 'mr' for machine readable)"
        }
      }
    },
    output: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        keyid: { type: "string" }
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
          oneOf: [
            { type: "boolean" },
            { type: "string", enum: ["on", "off"] }
          ],
          description: "Exact match only (boolean or 'on'/'off')"
        },
        fingerprint: {
          oneOf: [
            { type: "boolean" },
            { type: "string", enum: ["on", "off"] }
          ],
          description: "Show fingerprints in index operations (boolean or 'on'/'off')"
        },
        mr: {
          oneOf: [
            { type: "boolean" },
            { type: "string", enum: ["on", "off"] }
          ],
          description: "Machine readable format response (boolean or 'on'/'off')"
        },
        options: {
          type: "string",
          enum: ["mr"],
          description: "Legacy HKP options parameter (use 'mr' for machine readable)"
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
          oneOf: [
            { type: "boolean" },
            { type: "string", enum: ["on", "off"] }
          ],
          default: false,
          description: "Include revoked keys in results (boolean or 'on'/'off')"
        },
        include_expired: {
          oneOf: [
            { type: "boolean" },
            { type: "string", enum: ["on", "off"] }
          ],
          default: false,
          description: "Include expired keys in results (boolean or 'on'/'off')"
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
      oneOf: [
        {
          "description": "Machine-readable plain text output. This format is returned when the 'mr' parameter is true. The specific content depends on the 'op' parameter ('get', 'index', or 'vindex').",
          "type": "string",
          // "example": "info:1:1\npub:24E1B3B76E23258D:1:2048:1640995200::\nuid:Example%20User%20%3Cuser%40example.com%3E:1640995200::"
        },
        {
          type: "object",
          properties: {
            keys: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  keyid: { type: "string" },
                  fingerprint: { type: "string" },
                  algorithm: { type: "string" },
                  keysize: { type: "number" },
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
                    items: {
                      type: "string"
                    },
                    description: "User IDs associated with this key"
                  },
                  keydata: {
                    type: "string",
                    description: "ASCII-armored key data (only present when op=get)"
                  }
                }
              }
            },
            total: { type: "number" },
            offset: { type: "number" },
            limit: { type: "number" }
          }
        }
      ]
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
        success: { type: "boolean" },
        message: { type: "string" }
      }
    }
  }
}

export default HKPSchema
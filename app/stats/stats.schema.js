export default {
  // Get server statistics and info
  stats: {
    input: {
      type: "object",
      properties: {
        mr: {
          type: "boolean",
          description: "Machine readable format response"
        }
      }
    },
    output: {
      type: "object",
      properties: {
        total_keys: "number",
        algorithm_counts: {
          type: "object",
          properties: {
            rsa: "number",
            dsa: "number",
            ecdsa: "number",
            eddsa: "number"
          }
        },
        status_counts: {
          type: "object",
          properties: {
            active: "number",
            revoked: "number",
            expired: "number"
          }
        },
        server_info: {
          type: "object",
          properties: {
            version: "string",
            software: "string",
            hostname: "string"
          }
        }
      }
    }
  }
}
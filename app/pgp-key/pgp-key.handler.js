// import * as PGPUtils from "../../lib/pgp-utils"
import * as DBHelpers from "../../lib/db-helpers"
import * as APIHelpers from "../../lib/api-helpers"
import * as PGPOperations from "../../lib/pgp-operations"

const PGPKeyHandlers = ({ KeyUserId, PGPSubkey, PGPKey, KeyStats }) => ({
  add: async ({ keytext, mr }, ctx) => {
    return { success, message, keyid }
  },
  lookup: async ({ search, ...opts }, ctx) => {
    // const { op, exact, fingerprint, mr, algorithm, min_keysize,
    //   created_after, created_before,
    //   expires_after, expires_before,
    //   include_revoked, include_expired,
    //   limit, offset } = opts
    return { keys, total, offset, limit }
  },
  delete: async ({ keyid, token }, ctx) => {

    return { success, message }
  }
})
export default PGPKeyHandlers
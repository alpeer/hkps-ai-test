// import * as PGPUtils from "../../lib/pgp-utils"
import * as DBHelpers from "../../lib/db-helpers"
import * as APIHelpers from "../../lib/api-helpers"
import * as PGPOperations from "../../lib/pgp-operations"

const StatsHandlers = ({ KeyUserId, PGPSubkey, PGPKey, KeyStats }) => ({
  stats: async ({ mr }, ctx) => {

    return { total_keys, algorithm_counts, status_counts, server_info }
  },
})
export default StatsHandlers
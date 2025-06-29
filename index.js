// this is a manual spin up. Remove when @cervice/cli is ready
import createCerviceApp from "@cervice/core"
import ajv from "@cervice/schema-ajv"
import createServer from "@cervice/express"
import classify from "@cervice/schema/classify"
import createDatasource from "@cervice/typeorm"
import typeormErrorHandler from "@cervice/typeorm/error-handler"

import KeyUserIdEntity from "./app/user/key-user-id.entity.js"
import KeyStatsEntity from "./app/stats/key-stats.entity.js"
import PGPKeyEntity from "./app/pgp-key/pgp-key.entity.js"
import PGPSubkeyEntity from "./app/pgp-key/pgp-subkey.entity.js"
import PGPKeyHandlers from "./app/pgp-key/pgp-key.handler.js"
import StatsHandlers from "./app/stats/stats.handler.js"
import PGPKeySchema from "./app/pgp-key/pgp-key.schema.js"
import PGPKeyRest from "./app/pgp-key/pgp-key.rest.js"
import StatsSchema from "./app/stats/stats.schema.js"
import StatsRest from "./app/stats/stats.rest.js"

const ajvValidator = ajv({ formats: {} })
const DB = createDatasource({ synchronize: true, entities: [KeyUserIdEntity, KeyStatsEntity, PGPKeyEntity, PGPSubkeyEntity], username: "postgres", database: "hkps" })

const app = createCerviceApp({
  name: "HKPS Service",
  version: "1.0.0",
  handlers: {
    ...PGPKeyHandlers(DB),
    ...StatsHandlers(DB)
  },
  guards: [],
  middlewares: [

  ],
  schemas: classify({ ...StatsSchema, ...PGPKeySchema }),
  config: {
    customValidator: ajvValidator
  }
})
const server = createServer(app, {
  declarations: { ...PGPKeyRest, ...StatsRest },
  errorHandlers: [typeormErrorHandler]
})
await DB.connect()
server.launch(11371)
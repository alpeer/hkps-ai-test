import logger from "./lib/logger.js"
import pkg from "./package.json" with {type: "json"}

export default {
  name: "HKPS API",
  version: pkg.version,
  swagger: {
    description: pkg.description,
  },
  ajv: {
    // formats: {}
  },
  middlewares: [ // S.A.F.E. middlewares eg. async (input, ctx)=>

  ],
  logger,
  express: {
    port: 3000 //process.env.APP_PORT
    // middlewares: [
    //   (req, res, next) => {

    //   }
    // ],
    // helmet: {},
    // json: {},
    // cookie: {
    //   secret: "",
    //   settings: {
    //     UserToken: {
    //       sameSite: "Lax",
    //       maxAge: time1day,
    //       httpOnly: true,
    //       priority: "High",
    //       path:"/"
    //     }
    //   }, 

    // },
    // cors: {},
    // urlencoded: {}
  },
  typeorm: {
    host: "localhost", // process.env.DB_HOST
    port: 5432, // process.env.DB_POST
    username: "postgres", // process.env.DB_USERNAME
    database: "hkp",// process.env.DB_DATABASE
  }
}
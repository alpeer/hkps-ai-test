// draft
import { NotAuthorizedError } from "@cervice/core/errors"

const ExampleGuard = (InjectedDependency) => (input, ctx) => {
  if (ctx.request.headers[]) {
    throw new NotAuthorizedError("Request")
  }
}

const PGPKeyGuards = (DB) => ({
  add: [ExampleGuard(DB)],
  lookup: [],
  delete: []
})
export default PGPKeyGuards
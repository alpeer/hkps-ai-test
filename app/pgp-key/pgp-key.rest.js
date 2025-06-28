export default {
  // Add a new public key to the keyserver
  add: 'POST /pks/add',

  // Lookup/search keys (unified endpoint for all search operations)
  // Supports op=get, op=index, op=vindex via query params
  lookup: 'GET /pks/lookup',

  // Delete a key (admin operation with JWT auth)
  delete: 'DELETE /pks/delete/:keyid',
}
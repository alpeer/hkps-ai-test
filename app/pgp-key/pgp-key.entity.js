
// Main PGP Key entity
const PGPKeyEntity = {
  name: 'PGPKey',
  tableName: 'pgp_keys',
  indices: [
    {
      name: 'IDX_KEY_KEYID',
      unique: true,
      columns: ['keyid']
    },
    {
      name: 'IDX_KEY_FINGERPRINT',
      unique: true,
      columns: ['fingerprint']
    },
    {
      name: 'IDX_KEY_ALGORITHM',
      columns: ['algorithm']
    },
    {
      name: 'IDX_KEY_STATUS',
      columns: ['revoked', 'expired']
    },
    {
      name: 'IDX_KEY_CREATION_DATE',
      columns: ['creation_date']
    },
    {
      name: 'IDX_KEY_EXPIRATION_DATE',
      columns: ['expiration_date']
    }
  ],
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    keyid: {
      type: 'varchar',
      length: 16,
      unique: true,
      comment: 'Short key ID (last 8 bytes of fingerprint)'
    },
    fingerprint: {
      type: 'varchar',
      length: 40,
      unique: true,
      comment: 'Full 20-byte fingerprint in hex'
    },
    algorithm: {
      type: 'enum',
      enum: ['RSA', 'DSA', 'ECDSA', 'EdDSA'],
      comment: 'Public key algorithm'
    },
    keysize: {
      type: 'int',
      comment: 'Key size in bits'
    },
    creation_date: {
      type: 'timestamp',
      comment: 'When the key was created'
    },
    expiration_date: {
      type: 'timestamp',
      nullable: true,
      comment: 'When the key expires (null if no expiration)'
    },
    revoked: {
      type: 'boolean',
      default: false,
      comment: 'Whether the key has been revoked'
    },
    expired: {
      type: 'boolean',
      default: false,
      comment: 'Whether the key has passed expiration date'
    },
    keydata: {
      type: 'text',
      comment: 'ASCII-armored PGP key block'
    },
    upload_date: {
      type: 'timestamp',
      createDate: true,
      comment: 'When the key was uploaded to this keyserver'
    },
    _modified: {
      type: 'timestamp',
      updateDate: true,
      nullable: true
    }
  },
  relations: {
    userIds: {
      target: 'KeyUserId',
      type: 'one-to-many',
      inverseSide: 'key',
      cascade: true
    },
    subkeys: {
      target: 'PGPSubkey',
      type: 'one-to-many',
      inverseSide: 'primaryKey',
      cascade: true
    }
  }
}

export default PGPKeyEntity
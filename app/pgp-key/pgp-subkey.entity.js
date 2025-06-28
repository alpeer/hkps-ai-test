
// Subkey entity for keys that have subkeys
const PGPSubkeyEntity = {
  name: 'PGPSubkey',
  tableName: 'pgp_subkeys',
  indices: [
    {
      name: 'IDX_SUBKEY_KEYID',
      columns: ['keyid']
    },
    {
      name: 'IDX_SUBKEY_PRIMARY_KEY',
      columns: ['primary_key_id']
    },
    {
      name: 'IDX_SUBKEY_FINGERPRINT',
      columns: ['fingerprint']
    }
  ],
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    primary_key_id: {
      type: 'uuid',
      comment: 'Foreign key to primary PGP key'
    },
    keyid: {
      type: 'varchar',
      length: 16,
      comment: 'Subkey ID'
    },
    fingerprint: {
      type: 'varchar',
      length: 40,
      comment: 'Subkey fingerprint'
    },
    algorithm: {
      type: 'enum',
      enum: ['RSA', 'DSA', 'ECDSA', 'EdDSA']
    },
    keysize: {
      type: 'int'
    },
    usage_flags: {
      type: 'varchar',
      length: 10,
      comment: 'Key usage flags (e.g., "ESC" for encrypt, sign, certify)'
    },
    creation_date: {
      type: 'timestamp'
    },
    expiration_date: {
      type: 'timestamp',
      nullable: true
    },
    revoked: {
      type: 'boolean',
      default: false
    },
    expired: {
      type: 'boolean',
      default: false
    },
    _created: {
      type: 'timestamp',
      createDate: true
    }
  },
  relations: {
    primaryKey: {
      target: 'PGPKey',
      type: 'many-to-one',
      joinColumn: {
        name: 'primary_key_id',
        referencedColumnName: 'id'
      }
    }
  }
}
export default PGPSubkeyEntity
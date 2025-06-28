
// User ID entity (emails, names associated with keys)
const KeyUserIdEntity = {
  name: 'KeyUserId',
  tableName: 'key_user_ids',
  indices: [
    {
      name: 'IDX_UID_EMAIL',
      columns: ['email']
    },
    {
      name: 'IDX_UID_NAME',
      columns: ['name']
    },
    {
      name: 'IDX_UID_KEY_ID',
      columns: ['key_id']
    }
  ],
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    key_id: {
      type: 'uuid',
      comment: 'Foreign key to PGP key'
    },
    uid_string: {
      type: 'varchar',
      length: 500,
      comment: 'Full UID string as it appears in the key'
    },
    name: {
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: 'Extracted name portion'
    },
    email: {
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: 'Extracted email portion'
    },
    comment: {
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: 'Extracted comment portion'
    },
    verified: {
      type: 'boolean',
      default: false,
      comment: 'Whether this UID has been verified'
    },
    revoked: {
      type: 'boolean',
      default: false,
      comment: 'Whether this UID has been revoked'
    },
    _created: {
      type: 'timestamp',
      createDate: true
    }
  },
  relations: {
    key: {
      target: 'PGPKey',
      type: 'many-to-one',
      joinColumn: {
        name: 'key_id',
        referencedColumnName: 'id'
      }
    }
  }
}
export default KeyUserIdEntity
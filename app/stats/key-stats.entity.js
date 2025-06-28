
// Key search/lookup statistics
const KeyStatsEntity = {
  name: 'KeyStats',
  tableName: 'key_stats',
  indices: [
    {
      name: 'IDX_STATS_DATE',
      columns: ['date']
    },
    {
      name: 'IDX_STATS_KEY_ID',
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
      nullable: true,
      comment: 'Specific key ID for key-specific stats'
    },
    date: {
      type: 'date',
      comment: 'Date for daily aggregated stats'
    },
    lookup_count: {
      type: 'int',
      default: 0,
      comment: 'Number of times key was looked up'
    },
    download_count: {
      type: 'int',
      default: 0,
      comment: 'Number of times key was downloaded'
    },
    _created: {
      type: 'timestamp',
      createDate: true
    },
    _modified: {
      type: 'timestamp',
      updateDate: true,
      nullable: true
    }
  },
  relations: {
    key: {
      target: 'PGPKey',
      type: 'many-to-one',
      joinColumn: {
        name: 'key_id',
        referencedColumnName: 'id'
      },
      nullable: true
    }
  }
}
export default KeyStatsEntity
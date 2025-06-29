import pkg from "../../package.json" with { type: "json" }
import os from 'os'

const StatsHandlers = ({ KeyUserId, PGPSubkey, PGPKey, KeyStats }) => ({
  stats: async ({ mr }, ctx) => {
    try {
      // Get total key count
      const totalKeys = await PGPKey.createQueryBuilder('key')
        .getCount()

      // Get algorithm counts
      const algorithmStats = await PGPKey.createQueryBuilder('key')
        .select('key.algorithm', 'algorithm')
        .addSelect('COUNT(*)', 'count')
        .groupBy('key.algorithm')
        .getRawMany()

      const algorithmCounts = {
        rsa: 0,
        dsa: 0,
        ecdsa: 0,
        eddsa: 0
      }

      algorithmStats.forEach(stat => {
        const algo = stat.algorithm.toLowerCase()
        if (algorithmCounts.hasOwnProperty(algo)) {
          algorithmCounts[algo] = parseInt(stat.count)
        }
      })

      // Get status counts
      const statusStats = await PGPKey.createQueryBuilder('key')
        .select([
          'SUM(CASE WHEN key.revoked = false AND key.expired = false THEN 1 ELSE 0 END) as active',
          'SUM(CASE WHEN key.revoked = true THEN 1 ELSE 0 END) as revoked',
          'SUM(CASE WHEN key.expired = true THEN 1 ELSE 0 END) as expired'
        ])
        .getRawOne()

      const statusCounts = {
        active: parseInt(statusStats.active) || 0,
        revoked: parseInt(statusStats.revoked) || 0,
        expired: parseInt(statusStats.expired) || 0
      }

      // Server information
      const serverInfo = {
        version: pkg.version,
        software: `${pkg.name} (Cervice Framework)`,
        hostname: os.hostname()
      }

      // Additional statistics for extended response
      const extendedStats = {
        total_user_ids: await KeyUserId.createQueryBuilder('uid').getCount(),
        total_subkeys: await PGPSubkey.createQueryBuilder('subkey').getCount(),

        // Key size distribution
        key_size_distribution: await PGPKey.createQueryBuilder('key')
          .select([
            'SUM(CASE WHEN key.keysize < 2048 THEN 1 ELSE 0 END) as weak',
            'SUM(CASE WHEN key.keysize >= 2048 AND key.keysize < 4096 THEN 1 ELSE 0 END) as medium',
            'SUM(CASE WHEN key.keysize >= 4096 THEN 1 ELSE 0 END) as strong'
          ])
          .getRawOne()
          .then(result => ({
            weak: parseInt(result.weak) || 0,
            medium: parseInt(result.medium) || 0,
            strong: parseInt(result.strong) || 0
          })),

        // Recent activity (last 30 days)
        recent_uploads: await PGPKey.createQueryBuilder('key')
          .where('key.upload_date >= :thirtyDaysAgo', {
            thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          })
          .getCount(),

        // Keys expiring soon (next 30 days)
        expiring_soon: await PGPKey.createQueryBuilder('key')
          .where('key.expiration_date IS NOT NULL')
          .andWhere('key.expiration_date <= :thirtyDaysFromNow', {
            thirtyDaysFromNow: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          })
          .andWhere('key.expiration_date > :now', {
            now: new Date()
          })
          .andWhere('key.expired = false')
          .andWhere('key.revoked = false')
          .getCount(),

        // Usage statistics (last 30 days)
        recent_lookups: await KeyStats.createQueryBuilder('stats')
          .where('stats.date >= :thirtyDaysAgo', {
            thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          })
          .select('SUM(stats.lookup_count)', 'total_lookups')
          .addSelect('SUM(stats.download_count)', 'total_downloads')
          .getRawOne()
          .then(result => ({
            total_lookups: parseInt(result.total_lookups) || 0,
            total_downloads: parseInt(result.total_downloads) || 0
          }))
      }

      // Resolve all extended stats promises
      const resolvedExtendedStats = {
        total_user_ids: extendedStats.total_user_ids,
        total_subkeys: extendedStats.total_subkeys,
        key_size_distribution: await extendedStats.key_size_distribution,
        recent_uploads: extendedStats.recent_uploads,
        expiring_soon: extendedStats.expiring_soon,
        recent_lookups: await extendedStats.recent_lookups
      }

      const statsData = {
        total_keys: totalKeys,
        algorithm_counts: algorithmCounts,
        status_counts: statusCounts,
        server_info: serverInfo,
        // Include extended stats for detailed monitoring
        extended_stats: resolvedExtendedStats,
        // Add timestamp for caching purposes
        generated_at: new Date().toISOString()
      }

      // If machine readable format is requested, format accordingly
      if (mr) {
        const mrOutput = [
          `info:version:${serverInfo.version}`,
          `info:software:${serverInfo.software}`,
          `info:hostname:${serverInfo.hostname}`,
          `count:total:${totalKeys}`,
          `count:rsa:${algorithmCounts.rsa}`,
          `count:dsa:${algorithmCounts.dsa}`,
          `count:ecdsa:${algorithmCounts.ecdsa}`,
          `count:eddsa:${algorithmCounts.eddsa}`,
          `status:active:${statusCounts.active}`,
          `status:revoked:${statusCounts.revoked}`,
          `status:expired:${statusCounts.expired}`,
          `extended:user_ids:${resolvedExtendedStats.total_user_ids}`,
          `extended:subkeys:${resolvedExtendedStats.total_subkeys}`,
          `extended:recent_uploads:${resolvedExtendedStats.recent_uploads}`,
          `extended:expiring_soon:${resolvedExtendedStats.expiring_soon}`,
          `extended:recent_lookups:${resolvedExtendedStats.recent_lookups.total_lookups}`,
          `extended:recent_downloads:${resolvedExtendedStats.recent_lookups.total_downloads}`,
          `generated:${statsData.generated_at}`
        ].join('\n')

        return mrOutput
      }

      return statsData

    } catch (error) {
      ctx.logger?.error('Error generating statistics:', error)

      // Return minimal stats on error
      return {
        total_keys: 0,
        algorithm_counts: { rsa: 0, dsa: 0, ecdsa: 0, eddsa: 0 },
        status_counts: { active: 0, revoked: 0, expired: 0 },
        server_info: {
          version: pkg.version,
          software: `${pkg.name} (Cervice Framework)`,
          hostname: os.hostname()
        },
        error: 'Failed to generate complete statistics'
      }
    }
  }
})

export default StatsHandlers
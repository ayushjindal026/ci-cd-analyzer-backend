
// ═══════════════════════════════════════════════════════════════════════════
// src/hooks/useAnalytics.js
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { repoApi, analyticsApi } from '@/api/client'

/**
 * If repoId provided → fetch that repo's metrics.
 * If null → fetch all repos and aggregate their metrics.
 *
 * Swagger: GET /api/v1/repositories/{id}/metrics
 */
export function useAnalytics(repoId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)

    const doFetch = repoId
      ? analyticsApi.metrics(repoId).then(r => r.data)
      : repoApi.list().then(async res => {
        const repos = res.data ?? []
        if (!repos.length) return null
        const all = await Promise.all(
          repos.map(r => analyticsApi.metrics(r.id)
            .then(m => m.data)
            .catch(() => null))
        )
        return aggregateMetrics(all.filter(Boolean))
      })

    doFetch
      .then(d => { setData(d); setError(null) })
      .catch(e => setError(e.response?.data?.message ?? 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [repoId])

  return { data, loading, error }
}

/** Merge per-repo metric objects into one dashboard-level object */
function aggregateMetrics(arr) {
  if (!arr.length) return null
  const total = arr.reduce((s, m) => s + (m.totalRuns ?? 0), 0)
  const totalFailed = arr.reduce((s, m) => s + (m.failedRuns ?? 0), 0)
  const totalSuccess = arr.reduce((s, m) => s + (m.successfulRuns ?? 0), 0)
  const avgDur = Math.round(arr.reduce((s, m) => s + (m.avgDuration ?? 0), 0) / arr.length)

  // Merge timeseries arrays (failureRate over time) if backend returns them
  const failureRate = arr.flatMap(m => m.failureRate ?? [])
    .sort((a, b) => a.date > b.date ? 1 : -1)
    .reduce((acc, cur) => {
      const existing = acc.find(x => x.date === cur.date)
      if (existing) {
        existing.failureRate = Math.round((existing.failureRate + cur.failureRate) / 2)
        existing.successRate = 100 - existing.failureRate
      } else {
        acc.push({ ...cur })
      }
      return acc
    }, [])

  return {
    totalRuns: total,
    failedRuns: totalFailed,
    successfulRuns: totalSuccess,
    successRate: total ? Math.round((totalSuccess / total) * 100) : 0,
    failureRate: total ? Math.round((totalFailed / total) * 100) : 0,
    avgDuration: avgDur,
    // passthrough sub-arrays if present on first repo
    durations: arr[0]?.stageDurations ?? arr[0]?.durations ?? [],
    topFailing: arr[0]?.statusBreakdown ?? arr[0]?.topFailing ?? [],
    trend: failureRate,
  }
}

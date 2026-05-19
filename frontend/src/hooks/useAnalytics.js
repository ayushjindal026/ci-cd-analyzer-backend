// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useAnalytics.js
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { repoApi, analyticsApi } from '@/api/client'

/**
 * Fetches metrics. If repositoryId → single repo metrics.
 * If null → fetches all repos and merges metrics into one dashboard object.
 *
 * Backend shape expected (flexible — handles many variants):
 * {
 *   totalRuns, successfulRuns, failedRuns,
 *   successRate, failureRate, avgDuration,
 *   stageDurations: [{ stage, avgDuration, maxDuration }],
 *   failureRateTrend: [{ date, failureRate, successRate }],
 *   statusBreakdown: [{ name, value }]
 * }
 */
export function useAnalytics(repositoryId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true); setError(null)

    const doFetch = repositoryId
      ? analyticsApi.metrics(repositoryId).then(r => r.data)
      : repoApi.list().then(async res => {
        const repos = Array.isArray(res.data) ? res.data : res.data?.content ?? []
        if (!repos.length) return null
        const results = await Promise.allSettled(
          repos.map(r => analyticsApi.metrics(r.id).then(m => m.data))
        )
        const valid = results.filter(r => r.status === 'fulfilled').map(r => r.value)
        return valid.length ? mergeMetrics(valid) : null
      })

    doFetch
      .then(d => setData(d))
      .catch(e => setError(e.response?.data?.message ?? 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [repositoryId])

  return { data, loading, error }
}

function mergeMetrics(arr) {
  const total = arr.reduce((s, m) => s + (m.totalRuns ?? 0), 0)
  const success = arr.reduce((s, m) => s + (m.successfulRuns ?? m.successCount ?? 0), 0)
  const failed = arr.reduce((s, m) => s + (m.failedRuns ?? m.failureCount ?? 0), 0)
  const avgDur = Math.round(arr.reduce((s, m) => s + (m.avgDuration ?? 0), 0) / arr.length)

  // Merge trend arrays by date (average across repos)
  const trendMap = {}
  arr.forEach(m => {
    const trend = m.failureRateTrend ?? m.failureRate ?? m.trend ?? []
    trend.forEach(pt => {
      if (!trendMap[pt.date]) trendMap[pt.date] = { ...pt, _count: 1 }
      else {
        trendMap[pt.date].failureRate = ((trendMap[pt.date].failureRate ?? 0) * trendMap[pt.date]._count + (pt.failureRate ?? 0)) / (trendMap[pt.date]._count + 1)
        trendMap[pt.date].successRate = ((trendMap[pt.date].successRate ?? 0) * trendMap[pt.date]._count + (pt.successRate ?? 0)) / (trendMap[pt.date]._count + 1)
        trendMap[pt.date]._count++
      }
    })
  })
  const trend = Object.values(trendMap)
    .sort((a, b) => a.date > b.date ? 1 : -1)
    .map(({ _count, ...pt }) => ({
      ...pt,
      failureRate: Math.round(pt.failureRate ?? 0),
      successRate: Math.round(pt.successRate ?? 100 - (pt.failureRate ?? 0)),
    }))

  // Use first repo's stage durations as base (or merge if all have it)
  const durations = arr[0]?.stageDurations ?? arr[0]?.durations ?? []

  return {
    totalRuns: total,
    successfulRuns: success,
    failedRuns: failed,
    successRate: total ? Math.round((success / total) * 100) : 0,
    failureRate: total ? Math.round((failed / total) * 100) : 0,
    avgDuration: avgDur,
    trend,
    durations,
    statusBreakdown: [
      { name: 'Success', value: success },
      { name: 'Failed', value: failed },
      { name: 'Running', value: arr.reduce((s, m) => s + (m.runningRuns ?? 0), 0) },
      { name: 'Pending', value: arr.reduce((s, m) => s + (m.pendingRuns ?? 0), 0) },
    ].filter(x => x.value > 0),
  }
}
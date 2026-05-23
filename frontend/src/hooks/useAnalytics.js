// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useAnalytics.js — FINAL, real API only
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { repoApi }             from '@/api/client'

export function useAnalytics(repoId) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    setLoading(true); setError(null)

    const doFetch = repoId
      ? repoApi.metrics(repoId).then(r => r.data)
      : repoApi.list().then(async res => {
          const repos = Array.isArray(res.data) ? res.data : res.data?.content ?? []
          if (!repos.length) return null

          const settled = await Promise.allSettled(
            repos.map(r => repoApi.metrics(r.id).then(m => m.data))
          )
          const valid = settled
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value)

          return valid.length ? mergeMetrics(valid) : null
        })

    doFetch
      .then(d  => setData(d))
      .catch(e => setError(e.response?.data?.message ?? 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [repoId])

  return { data, loading, error }
}

function mergeMetrics(arr) {
  const total   = arr.reduce((s, m) => s + (m.totalRuns     ?? 0), 0)
  const success = arr.reduce((s, m) => s + (m.successfulRuns ?? 0), 0)
  const failed  = arr.reduce((s, m) => s + (m.failedRuns    ?? 0), 0)
  const running = arr.reduce((s, m) => s + (m.runningRuns   ?? 0), 0)
  const pending = arr.reduce((s, m) => s + (m.pendingRuns   ?? 0), 0)
  const avgDur  = arr.length
    ? Math.round(arr.reduce((s, m) => s + (m.avgDuration ?? 0), 0) / arr.length)
    : 0

  // Merge daily trend arrays by date (average failureRate across repos)
  const trendMap = {}
  arr.forEach(m => {
    const trend = m.failureRateTrend ?? []
    trend.forEach(pt => {
      if (!trendMap[pt.date]) {
        trendMap[pt.date] = { ...pt, _n: 1 }
      } else {
        trendMap[pt.date].failureRate =
          Math.round(((trendMap[pt.date].failureRate * trendMap[pt.date]._n) + pt.failureRate)
            / (trendMap[pt.date]._n + 1))
        trendMap[pt.date].successRate = 100 - trendMap[pt.date].failureRate
        trendMap[pt.date]._n++
      }
    })
  })
  const trend = Object.values(trendMap)
    .sort((a, b) => a.date > b.date ? 1 : -1)
    .map(({ _n, ...pt }) => pt)

  return {
    totalRuns:      total,
    successfulRuns: success,
    failedRuns:     failed,
    runningRuns:    running,
    pendingRuns:    pending,
    successRate:    total ? Math.round((success / total) * 100) : 0,
    failureRate:    total ? Math.round((failed  / total) * 100) : 0,
    avgDuration:    avgDur,
    failureRateTrend: trend,
    stageDurations: arr[0]?.stageDurations ?? [],
    statusBreakdown: [
      { name: 'Success', value: success },
      { name: 'Failed',  value: failed  },
      { name: 'Running', value: running },
      { name: 'Pending', value: pending },
    ].filter(x => x.value > 0),
    flakyTestCount: arr.reduce((s, m) => s + (m.flakyTestCount ?? 0), 0),
    windowDays:     arr[0]?.windowDays ?? 14,
  }
}
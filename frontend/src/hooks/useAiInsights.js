
// ═══════════════════════════════════════════════════════════════════════════
// src/hooks/useAiInsights.js
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { repoApi, runApi } from '@/api/client'

/**
 * Fetch the latest AI analysis for each repo's most recent failed run.
 * Swagger: GET /api/v1/repositories/{repoId}/runs/{runId}/analysis
 */
export function useAiInsights(repoId) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)

    const doFetch = async () => {
      // 1. Get repos to analyse
      const reposRes = repoId
        ? { data: [{ id: repoId }] }
        : await repoApi.list()
      const repos = reposRes.data ?? []
      if (!repos.length) return []

      // 2. For each repo get latest runs, then analysis of latest failed run
      const all = await Promise.all(repos.slice(0, 4).map(async r => {
        try {
          const runsRes = await runApi.repoRuns(r.id, { size: 10 })
          const runs = runsRes.data?.content ?? runsRes.data ?? []
          const failedRun = runs.find(x => x.status === 'FAILED' || x.status === 'failed')
          if (!failedRun) return null
          const analysisRes = await runApi.analysis(r.id, failedRun.id)
          return { repoId: r.id, runId: failedRun.id, ...analysisRes.data }
        } catch {
          return null
        }
      }))
      return all.filter(Boolean)
    }

    doFetch()
      .then(d => { setInsights(d); setError(null) })
      .catch(e => setError(e.response?.data?.message ?? 'Failed to load AI insights'))
      .finally(() => setLoading(false))
  }, [repoId])

  // Trigger fresh analysis on a specific run
  const triggerAnalysis = async (repoId, runId) => {
    await runApi.analyse(repoId, runId)
    // re-run the hook
    setInsights(null)
    setLoading(true)
  }

  return { insights, loading, error, triggerAnalysis }
}
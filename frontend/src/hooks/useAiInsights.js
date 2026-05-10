// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useAiInsights.js
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { repoApi, runApi, aiApi } from '@/api/client'

/**
 * For each repo, finds its most recent FAILED run and fetches analysis.
 * Falls back gracefully if analysis doesn't exist yet.
 */
export function useAiInsights(repoId) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const reposRes = repoId
        ? { data: [{ id: repoId }] }
        : await repoApi.list()

      const repos = Array.isArray(reposRes.data) ? reposRes.data : reposRes.data?.content ?? []
      if (!repos.length) { setInsights([]); return }

      const results = await Promise.allSettled(
        repos.slice(0, 5).map(async repo => {
          // get latest runs
          const runsRes = await runApi.repoRuns(repo.id, { size: 10 })
          const runs = Array.isArray(runsRes.data) ? runsRes.data : runsRes.data?.content ?? []
          const failed = runs.find(r => ['FAILED', 'failed', 'failure'].includes(r.status))
          if (!failed) return null

          // get existing analysis (don't auto-trigger)
          const analysisRes = await aiApi.getAnalysis(repo.id, failed.id).catch(() => ({ data: null }))
          if (!analysisRes.data) return null

          return {
            repoId: repo.id,
            repoName: repo.fullName ?? repo.name,
            runId: failed.id,
            buildNumber: failed.buildNumber ?? failed.id,
            branch: failed.branch ?? 'main',
            ...analysisRes.data,
          }
        })
      )

      const valid = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value)

      setInsights(valid)
    } catch (e) {
      setError(e.response?.data?.message ?? 'Failed to load AI insights')
    } finally {
      setLoading(false)
    }
  }, [repoId])

  useEffect(() => { load() }, [load])

  const triggerAnalysis = async (repoId, runId) => {
    await aiApi.trigger(repoId, runId)
    setTimeout(() => load(), 2000)   // reload after short delay
  }

  return { insights, loading, error, refetch: load, triggerAnalysis }
}
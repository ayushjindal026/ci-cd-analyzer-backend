// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useAiInsights.js — FINAL, real API only
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { repoApi, aiApi } from '@/api/client'

export function useAiInsights(repoId) {
  const [insights, setInsights] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (repoId) {
        // Single repo — use axios client so token refresh works
        const res = await repoApi.analyses(repoId)
        const data = res.data?.data ?? res.data
        setInsights(Array.isArray(data) ? data : [])
      } else {
        // All repos — fetch list then analyses for each
        const reposRes = await repoApi.list()
        const repoPayload = reposRes.data?.data ?? reposRes.data
        const repos = Array.isArray(repoPayload)
          ? repoPayload
          : repoPayload?.content ?? []

        if (!repos.length) {
          setInsights([])
          return
        }

        const settled = await Promise.allSettled(
          repos.slice(0, 5).map(async r => {
            const res = await repoApi.analyses(r.id)
            const data = res.data?.data ?? res.data ?? []
            return (Array.isArray(data) ? data : []).map(a => ({
              ...a,
              repoName: r.repoName,
            }))
          })
        )

        const all = settled
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value)
          .sort((a, b) => new Date(b.analysedAt ?? 0) - new Date(a.analysedAt ?? 0))

        setInsights(all)
      }
    } catch (e) {
      setError(e.response?.data?.message ?? e.message ?? 'Failed to load AI insights')
    } finally {
      setLoading(false)
    }
  }, [repoId])

  useEffect(() => { load() }, [load])

  const triggerAnalysis = async (repoId, runId) => {
    await aiApi.trigger(repoId, runId)
    setTimeout(load, 3000)
  }

  return { insights, loading, error, refetch: load, triggerAnalysis }
}
// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useAiInsights.js — FINAL, real API only
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { repoApi, runApi, aiApi }           from '@/api/client'

export function useAiInsights(repoId) {
  const [insights, setInsights] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      if (repoId) {
        // Single repo — fetch /analyses endpoint directly
        const res = await fetch(`/api/v1/repositories/${repoId}/analyses`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('piq_access_token')}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setInsights(Array.isArray(data) ? data : [])
      } else {
        // All repos — fetch analyses for each
        const reposRes = await repoApi.list()
        const repos    = Array.isArray(reposRes.data)
          ? reposRes.data
          : reposRes.data?.content ?? []

        if (!repos.length) { setInsights([]); return }

        const settled = await Promise.allSettled(
          repos.slice(0, 5).map(async r => {
            const res = await fetch(`/api/v1/repositories/${r.id}/analyses`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('piq_access_token')}` },
            })
            if (!res.ok) return []
            const data = await res.json()
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
      setError(e.message ?? 'Failed to load AI insights')
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
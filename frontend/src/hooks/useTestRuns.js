
// ═══════════════════════════════════════════════════════════════════════════
// src/hooks/useTestRuns.js
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { repoApi, runApi } from '@/api/client'

/**
 * Fetch runs for a specific repo, or aggregate across all repos if no repoId.
 * Swagger: GET /api/v1/repositories/{id}/runs
 */
export function useRuns({ repoId, page = 0, size = 15, status } = {}) {
  const [runs,    setRuns]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(() => {
    setLoading(true)

    const doFetch = repoId
      ? runApi.repoRuns(repoId, { page, size, status })
      : // no repoId → fetch all repos then their runs
        repoApi.list().then(async reposRes => {
          const all = reposRes.data ?? []
          if (!all.length) return { data: [] }
          const results = await Promise.all(
            all.map(r => runApi.repoRuns(r.id, { page: 0, size: 5 })
              .then(res => (res.data?.content ?? res.data ?? []).map(run => ({
                ...run, repoName: r.fullName ?? r.name,
              })))
              .catch(() => [])
            )
          )
          const flat = results.flat().sort((a, b) =>
            new Date(b.startedAt ?? 0) - new Date(a.startedAt ?? 0)
          )
          return { data: flat }
        })

    doFetch
      .then(res => {
        const d = res.data
        if (Array.isArray(d)) {
          setRuns(d); setTotal(d.length)
        } else {
          setRuns(d.content ?? []); setTotal(d.totalElements ?? 0)
        }
        setError(null)
      })
      .catch(e => setError(e.response?.data?.message ?? 'Failed to load runs'))
      .finally(() => setLoading(false))
  }, [repoId, page, size, status])

  useEffect(() => { fetch() }, [fetch])

  return { runs, total, loading, error, refetch: fetch }
}

/**
 * Single run detail + its AI analysis
 * Swagger: GET /api/v1/repositories/{repoId}/runs/{runId}
 *          GET /api/v1/repositories/{repoId}/runs/{runId}/analysis
 */
export function useRunDetail(repoId, runId) {
  const [run,      setRun]      = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    if (!repoId || !runId) return
    setLoading(true)
    Promise.all([
      runApi.get(repoId, runId),
      runApi.analysis(repoId, runId).catch(() => ({ data: null })),
    ])
      .then(([r, a]) => { setRun(r.data); setAnalysis(a.data) })
      .catch(e => setError(e.response?.data?.message ?? 'Failed to load run'))
      .finally(() => setLoading(false))
  }, [repoId, runId])

  return { run, analysis, loading, error }
}


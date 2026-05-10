// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useRuns.js
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from 'react'
import { repoApi, runApi } from '@/api/client'

/**
 * Fetch runs. If repoId provided → single repo. Else → aggregate all repos (up to 5 latest each).
 */
export function useRuns({ repoId, page = 0, size = 15, status } = {}) {
    const [runs, setRuns] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const params = useMemo(() => ({
        page, size,
        ...(status && status !== 'all' ? { status } : {}),
    }), [page, size, status])

    const fetch = useCallback(() => {
        setLoading(true); setError(null)

        const doFetch = repoId
            ? runApi.repoRuns(repoId, params)
            : repoApi.list().then(async res => {
                const repos = Array.isArray(res.data) ? res.data : res.data?.content ?? []
                if (!repos.length) return { data: [] }
                const all = await Promise.allSettled(
                    repos.slice(0, 6).map(r =>
                        runApi.repoRuns(r.id, { page: 0, size: 8 })
                            .then(rr => {
                                const list = Array.isArray(rr.data) ? rr.data : rr.data?.content ?? []
                                return list.map(run => ({
                                    ...run,
                                    repoName: r.fullName ?? r.name,
                                    repositoryId: r.id,
                                }))
                            })
                    )
                )
                const merged = all
                    .filter(r => r.status === 'fulfilled')
                    .flatMap(r => r.value)
                    .sort((a, b) => new Date(b.startedAt ?? 0) - new Date(a.startedAt ?? 0))
                return { data: merged }
            })

        doFetch
            .then(res => {
                const d = res.data
                if (Array.isArray(d)) { setRuns(d); setTotal(d.length) }
                else { setRuns(d.content ?? []); setTotal(d.totalElements ?? 0) }
            })
            .catch(e => setError(e.response?.data?.message ?? 'Failed to load pipeline runs'))
            .finally(() => setLoading(false))
    }, [repoId, JSON.stringify(params)]) // eslint-disable-line

    useEffect(() => { fetch() }, [fetch])

    return { runs, total, loading, error, refetch: fetch }
}

/**
 * Single run detail + AI analysis.
 */
export function useRunDetail(repoId, runId) {
    const [run, setRun] = useState(null)
    const [analysis, setAnalysis] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!repoId || !runId) return
        setLoading(true); setError(null); setAnalysis(null)
        Promise.all([
            runApi.get(repoId, runId),
            runApi.analysis(repoId, runId).catch(() => ({ data: null })),
        ])
            .then(([r, a]) => { setRun(r.data); setAnalysis(a.data) })
            .catch(e => setError(e.response?.data?.message ?? 'Failed to load run details'))
            .finally(() => setLoading(false))
    }, [repoId, runId])

    return { run, analysis, loading, error }
}
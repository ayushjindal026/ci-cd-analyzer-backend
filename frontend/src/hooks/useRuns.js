// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useRuns.js
// Real API only — handles ApiResponse + paginated responses
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react'
import { repoApi, runApi } from '@/api/client'

export function useRuns({
    repositoryId,
    page = 0,
    size = 15,
    status,
} = {}) {
    const [runs, setRuns] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const params = useMemo(() => ({
        page,
        size,
        ...(status && status !== 'all' ? { status } : {}),
    }), [page, size, status])

    const fetchRuns = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            /*
             * Repository selected:
             * GET /api/v1/repositories/{repositoryId}/runs
             */
            if (repositoryId) {
                const res = await runApi.repoRuns(repositoryId, params)

                // Axios response:
                // res.data = ApiResponse
                //
                // ApiResponse:
                // {
                //   success: true,
                //   data: ...
                // }
                const payload = res.data?.data ?? res.data

                if (Array.isArray(payload)) {
                    setRuns(payload)
                    setTotal(payload.length)
                } else {
                    setRuns(payload?.content ?? [])
                    setTotal(payload?.totalElements ?? 0)
                }

                return
            }

            /*
             * No repository selected:
             * fetch repositories first, then aggregate their runs.
             */
            const reposRes = await repoApi.list()

            const repoPayload = reposRes.data?.data ?? reposRes.data

            const repos = Array.isArray(repoPayload)
                ? repoPayload
                : repoPayload?.content ?? []

            if (!repos.length) {
                setRuns([])
                setTotal(0)
                return
            }

            const settled = await Promise.allSettled(
                repos.slice(0, 6).map(async repo => {
                    const res = await runApi.repoRuns(repo.id, {
                        page: 0,
                        size: 100,
                    })

                    const payload = res.data?.data ?? res.data

                    const list = Array.isArray(payload)
                        ? payload
                        : payload?.content ?? []

                    return list.map(run => ({
                        ...run,
                        repoName: repo.repoName,
                        repositoryId: repo.id,
                    }))
                })
            )

            const merged = settled
                .filter(result => result.status === 'fulfilled')
                .flatMap(result => result.value)
                .sort(
                    (a, b) =>
                        new Date(b.startedAt ?? 0) -
                        new Date(a.startedAt ?? 0)
                )

            /*
             * Apply frontend pagination when aggregating multiple repositories.
             */
            const start = page * size
            const paginated = merged.slice(start, start + size)

            setRuns(paginated)
            setTotal(merged.length)

        } catch (e) {
            setError(
                e.response?.data?.message ??
                e.message ??
                'Failed to load runs'
            )
            setRuns([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }, [repositoryId, page, size, status, params])

    useEffect(() => {
        fetchRuns()
    }, [fetchRuns])

    return {
        runs,
        total,
        loading,
        error,
        refetch: fetchRuns,
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// Single run detail
// ═══════════════════════════════════════════════════════════════════════════════

export function useRunDetail(repositoryId, runId) {
    const [run, setRun] = useState(null)
    const [analysis, setAnalysis] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!repositoryId || !runId) return

        setLoading(true)
        setRun(null)
        setAnalysis(null)
        setError(null)

        Promise.all([
            runApi.get(repositoryId, runId),

            runApi
                .analysis(repositoryId, runId)
                .catch(() => ({ data: null })),
        ])
            .then(([runResponse, analysisResponse]) => {
                const runPayload =
                    runResponse.data?.data ?? runResponse.data

                const analysisPayload =
                    analysisResponse.data?.data ??
                    analysisResponse.data

                setRun(runPayload)
                setAnalysis(analysisPayload)
            })
            .catch(e => {
                setError(
                    e.response?.data?.message ??
                    e.message ??
                    'Failed to load run'
                )
            })
            .finally(() => {
                setLoading(false)
            })
    }, [repositoryId, runId])

    return {
        run,
        analysis,
        loading,
        error,
    }
}
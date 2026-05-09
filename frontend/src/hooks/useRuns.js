import { useState, useEffect, useCallback } from 'react'
import { runApi } from '@/api/client'

export function useRuns(params = {}) {
    const [runs, setRuns] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const key = JSON.stringify(params)

    const fetch = useCallback(() => {
        setLoading(true)
        runApi.list(params)
            .then(r => {
                // supports both paged { content, totalElements } and plain array
                if (Array.isArray(r.data)) {
                    setRuns(r.data); setTotal(r.data.length)
                } else {
                    setRuns(r.data.content ?? []); setTotal(r.data.totalElements ?? 0)
                }
                setError(null)
            })
            .catch(e => setError(e.response?.data?.message ?? 'Failed to load runs'))
            .finally(() => setLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    useEffect(() => { fetch() }, [fetch])

    return { runs, total, loading, error, refetch: fetch }
}

export function useRunDetail(id) {
    const [run, setRun] = useState(null)
    const [stages, setStages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!id) return
        setLoading(true)
        Promise.all([runApi.get(id), runApi.stages(id)])
            .then(([r, s]) => { setRun(r.data); setStages(s.data) })
            .catch(e => setError(e.response?.data?.message ?? 'Failed to load run'))
            .finally(() => setLoading(false))
    }, [id])

    return { run, stages, loading, error }
}
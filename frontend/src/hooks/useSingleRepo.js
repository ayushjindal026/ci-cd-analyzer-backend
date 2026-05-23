import { useState, useEffect, useCallback } from 'react'
import { repoApi } from '@/api/client'

/**
 * Fetches a single repository by ID.
 * Used in RepositoryDetails page.
 */
export function useSingleRepo(repoId) {
    const [repo, setRepo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetch = useCallback(() => {
        if (!repoId) { setLoading(false); return }
        setLoading(true); setError(null)
        repoApi.get(repoId)
            .then(r => setRepo(r.data))
            .catch(e => setError(e.response?.data?.message ?? 'Failed to load repository'))
            .finally(() => setLoading(false))
    }, [repoId])

    useEffect(() => { fetch() }, [fetch])

    return { repo, loading, error, refetch: fetch }
}
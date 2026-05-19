// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useSingleRepo.js  — useful in detail views
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { repoApi } from '@/api/client'

export function useSingleRepo(repositoryId) {
    const [repo, setRepo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!repositoryId) return
        setLoading(true)
        repoApi.get(repositoryId)
            .then(r => setRepo(r.data))
            .catch(e => setError(e.response?.data?.message ?? 'Failed to load repository'))
            .finally(() => setLoading(false))
    }, [repositoryId])

    return { repo, loading, error }
}
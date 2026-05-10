// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useSingleRepo.js  — useful in detail views
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { repoApi } from '@/api/client'

export function useSingleRepo(repoId) {
    const [repo, setRepo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!repoId) return
        setLoading(true)
        repoApi.get(repoId)
            .then(r => setRepo(r.data))
            .catch(e => setError(e.response?.data?.message ?? 'Failed to load repository'))
            .finally(() => setLoading(false))
    }, [repoId])

    return { repo, loading, error }
}
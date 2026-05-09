// ═══════════════════════════════════════════════════════════════════════════
// src/hooks/useRepositories.js
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { repoApi } from '@/api/client'

export function useRepositories() {
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(() => {
    setLoading(true)
    repoApi.list()
      .then(r => { setRepos(r.data ?? []); setError(null) })
      .catch(e => setError(e.response?.data?.message ?? 'Failed to load repositories'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const addRepo = async ({ repoUrl }) => {
    // Spring backend expects { repoUrl } — matches your POST /api/v1/repositories
    const res = await repoApi.add({ repoUrl })
    setRepos(prev => [...prev, res.data])
    return res.data
  }

  const removeRepo = async id => {
    await repoApi.remove(id)
    setRepos(prev => prev.filter(r => r.id !== id))
  }

  const syncRepo = async id => {
    await repoApi.sync(id)
    // re-fetch to get updated run counts / status
    fetch()
  }

  return { repos, loading, error, refetch: fetch, addRepo, removeRepo, syncRepo }
}
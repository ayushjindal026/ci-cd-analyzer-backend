// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useRepositories.js — FINAL, real API only
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { repoApi } from '@/api/client'

export function useRepositories() {
  const [repos,   setRepos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await repoApi.list()
      // axios wraps response in res.data
      // our ApiResponse wraps payload in res.data.data
      const payload = res.data?.data ?? res.data
      setRepos(Array.isArray(payload) ? payload : payload?.content ?? [])
    } catch (e) {
      setError(e.response?.data?.message ?? 'Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const addRepo = async (payload) => {
    const res = await repoApi.add(payload)
    const repo = res.data?.data ?? res.data
    setRepos(prev => [...prev, repo])
    return repo
  }

  const removeRepo = async (id) => {
    await repoApi.remove(id)
    setRepos(prev => prev.filter(r => r.id !== id))
  }

  const syncRepo = async (id) => {
    const res = await repoApi.sync(id)
    const repo = res.data?.data ?? res.data
    if (repo?.id) {
      setRepos(prev => prev.map(r => r.id === id ? { ...r, ...repo } : r))
    } else {
      fetch()
    }
  }

  return { repos, loading, error, refetch: fetch, addRepo, removeRepo, syncRepo }
}

// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useRepositories.js — FINAL, real API only
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { repoApi }                          from '@/api/client'

export function useRepositories() {
  const [repos,   setRepos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(() => {
    setLoading(true); setError(null)
    repoApi.list()
      .then(r => {
        const data = r.data
        setRepos(Array.isArray(data) ? data : data?.content ?? [])
      })
      .catch(e => setError(e.response?.data?.message ?? 'Failed to load repositories'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const addRepo = async (payload) => {
    const res = await repoApi.add(payload)
    setRepos(prev => [...prev, res.data])
    return res.data
  }

  const removeRepo = async (id) => {
    await repoApi.remove(id)
    setRepos(prev => prev.filter(r => r.id !== id))
  }

  const syncRepo = async (id) => {
    const res = await repoApi.sync(id)
    if (res?.data?.id) {
      setRepos(prev => prev.map(r => r.id === id ? { ...r, ...res.data } : r))
    } else {
      fetch()
    }
  }

  return { repos, loading, error, refetch: fetch, addRepo, removeRepo, syncRepo }
}

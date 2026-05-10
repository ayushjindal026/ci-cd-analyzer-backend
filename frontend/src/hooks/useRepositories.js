// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useRepositories.js
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { repoApi } from '@/api/client'

export function useRepositories() {
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(() => {
    setLoading(true); setError(null)
    repoApi.list()
      .then(r => setRepos(Array.isArray(r.data) ? r.data : r.data?.content ?? []))
      .catch(e => setError(e.response?.data?.message ?? 'Failed to load repositories'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const addRepo = async ({ repoUrl }) => {
    const res = await repoApi.add({ repoUrl })
    setRepos(prev => [...prev, res.data])
    return res.data
  }

  const removeRepo = async id => {
    await repoApi.remove(id)
    setRepos(prev => prev.filter(r => r.id !== id))
  }

  const syncRepo = async id => {
    const res = await repoApi.sync(id)
    // update single repo in state if backend returns updated object
    if (res?.data?.id) {
      setRepos(prev => prev.map(r => r.id === id ? { ...r, ...res.data } : r))
    } else {
      fetch()
    }
  }

  return { repos, loading, error, refetch: fetch, addRepo, removeRepo, syncRepo }
}

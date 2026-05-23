import { useState, useEffect, useCallback } from 'react'
import { settingsApi } from '@/api/settingsApi'

const LS_KEY = 'piq_settings'

const DEFAULTS = {
  emailOnFailure: true,
  emailOnRecovery: false,
  slackEnabled: false,
  slackWebhookUrl: '',
  emailAddress: '',
  failureOnly: true,
  aiDigest: true,
  failureRateThreshold: 20,
  buildTimeThreshold: 600,
  alertCooldown: 30,
  compactMode: false,
}

function fromLS() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') } }
  catch { return { ...DEFAULTS } }
}

export function useSettings() {
  const [prefs, setPrefs] = useState(fromLS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [dirty, setDirty] = useState(false)

  // Load from backend on mount — fall back to localStorage silently
  useEffect(() => {
    setLoading(true)
    settingsApi.getPrefs()
      .then(res => {
        const merged = { ...DEFAULTS, ...res.data }
        setPrefs(merged)
        localStorage.setItem(LS_KEY, JSON.stringify(merged))
      })
      .catch(() => {
        // Backend not wired yet — use localStorage values, no error shown
      })
      .finally(() => setLoading(false))
  }, [])

  const update = useCallback((patch) => {
    setPrefs(p => ({ ...p, ...patch }))
    setDirty(true)
  }, [])

  const save = useCallback(async () => {
    setSaving(true); setError(null)
    try {
      await settingsApi.savePrefs(prefs)
    } catch (e) {
      // 404 = endpoint not implemented yet → persist locally only
      if (e.response?.status && e.response.status !== 404) {
        setError(e.response?.data?.message ?? 'Failed to save settings')
        setSaving(false)
        throw e
      }
    } finally {
      // Always persist to localStorage so settings survive page reload
      localStorage.setItem(LS_KEY, JSON.stringify(prefs))
      setDirty(false)
      setSaving(false)
    }
  }, [prefs])

  const reset = useCallback(() => {
    setPrefs({ ...DEFAULTS })
    localStorage.removeItem(LS_KEY)
    setDirty(true)
  }, [])

  return { prefs, update, save, reset, loading, saving, dirty, error }
}
// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useSettings.js
// Loads + persists user settings, falls back to localStorage while backend
// is not yet wired.
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { settingsApi } from '@/api/settingsApi'

const LS_KEY = 'piq_settings'

const DEFAULTS = {
    // Notifications
    emailOnFailure: true,
    emailOnRecovery: false,
    slackEnabled: false,
    slackWebhookUrl: '',
    emailAddress: '',
    failureOnly: true,
    aiDigest: true,

    // Alert thresholds
    failureRateThreshold: 20,   // percent
    buildTimeThreshold: 600,  // seconds
    alertCooldown: 30,   // minutes between repeated alerts

    // Appearance (synced from ThemeContext separately)
    compactMode: false,
}

function fromLS() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') } }
    catch { return DEFAULTS }
}

export function useSettings() {
    const [prefs, setPrefs] = useState(fromLS)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [dirty, setDirty] = useState(false)

    // Load from backend on mount
    useEffect(() => {
        setLoading(true)
        settingsApi.getPrefs()
            .then(res => {
                const merged = { ...DEFAULTS, ...res.data }
                setPrefs(merged)
                localStorage.setItem(LS_KEY, JSON.stringify(merged))
            })
            .catch(() => { /* fallback to localStorage — already loaded */ })
            .finally(() => setLoading(false))
    }, [])

    const update = useCallback((patch) => {
        setPrefs(p => { const n = { ...p, ...patch }; return n })
        setDirty(true)
    }, [])

    const save = useCallback(async () => {
        setSaving(true); setError(null)
        try {
            await settingsApi.savePrefs(prefs)
            localStorage.setItem(LS_KEY, JSON.stringify(prefs))
            setDirty(false)
        } catch (e) {
            // Persist locally even if backend is unavailable
            localStorage.setItem(LS_KEY, JSON.stringify(prefs))
            setDirty(false)
            // Only surface error if it was a real server error (not 404 = not yet implemented)
            if (e.response?.status && e.response.status !== 404) {
                setError(e.response?.data?.message ?? 'Failed to save settings')
                throw e
            }
        } finally { setSaving(false) }
    }, [prefs])

    const reset = useCallback(() => {
        setPrefs(DEFAULTS)
        localStorage.removeItem(LS_KEY)
        setDirty(true)
    }, [])

    return { prefs, update, save, reset, loading, saving, dirty, error }
}
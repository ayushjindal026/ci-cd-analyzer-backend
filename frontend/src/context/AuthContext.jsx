import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

// ── Token storage ─────────────────────────────────────────────────────────────
// Access token: short-lived (15 min) — kept in memory + localStorage
// Refresh token: long-lived (7 days) — kept in localStorage
// In Phase 3: move refresh token to httpOnly cookie
export const tokenStorage = {
    getAccess: () => localStorage.getItem('piq_access_token'),
    setAccess: token => localStorage.setItem('piq_access_token', token),
    getRefresh: () => localStorage.getItem('piq_refresh_token'),
    setRefresh: token => localStorage.setItem('piq_refresh_token', token),
    set: token => localStorage.setItem('piq_access_token', token), // legacy compat
    get: () => localStorage.getItem('piq_access_token'),        // legacy compat
    clear: () => {
        localStorage.removeItem('piq_access_token')
        localStorage.removeItem('piq_refresh_token')
    },
    setBoth: (access, refresh) => {
        localStorage.setItem('piq_access_token', access)
        localStorage.setItem('piq_refresh_token', refresh)
    },
}

// Separate axios instance for auth calls — avoids interceptor loops
const authHttp = axios.create({
    baseURL:
        `${import.meta.env.VITE_API_URL}/api/v1`,
    timeout: 10000,
})

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const loadUser = useCallback(async () => {
        const token = tokenStorage.getAccess()
        if (!token) { setLoading(false); return }
        try {
            const res = await authHttp.get('/auth/me', {
                headers: { Authorization: `Bearer ${token}` },
            })
            setUser(res.data)
        } catch (err) {
            if (err.response?.status === 401) {
                // Try refresh before giving up
                const refreshed = await tryRefresh()
                if (refreshed) {
                    try {
                        const res2 = await authHttp.get('/auth/me', {
                            headers: { Authorization: `Bearer ${tokenStorage.getAccess()}` },
                        })
                        setUser(res2.data)
                    } catch {
                        tokenStorage.clear(); setUser(null)
                    }
                } else {
                    tokenStorage.clear(); setUser(null)
                }
            } else {
                tokenStorage.clear(); setUser(null)
            }
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {

        const token = tokenStorage.getAccess()

        if (!token) {
            setLoading(false)
            return
        }

        loadUser()

    }, [loadUser])

    const logout = async (logoutAll = false) => {
        try {
            await authHttp.post('/auth/logout',
                {
                    refreshToken: tokenStorage.getRefresh(),
                    logoutAll,
                },
                { headers: { Authorization: `Bearer ${tokenStorage.getAccess()}` } }
            )
        } catch { /* ignore — clear locally regardless */ }
        tokenStorage.clear()
        setUser(null)
        window.location.href = '/login'
    }

    return (
        <AuthContext.Provider value={{ user, loading, logout, reload: loadUser }}>
            {children}
        </AuthContext.Provider>
    )
}

// ── Refresh helper — used by both AuthProvider and api/client.js ──────────────
export async function tryRefresh() {

    const refreshToken = tokenStorage.getRefresh()

    if (!refreshToken) {
        return false
    }

    try {

        const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/v1/auth/refresh`,
            {
                refresh_token: refreshToken,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )

        // IMPORTANT:
        // backend returns camelCase

        tokenStorage.setBoth(
            res.data.access_token ?? res.data.accessToken,
            res.data.refresh_token ?? res.data.refreshToken
        )

        return true

    } catch (err) {

        tokenStorage.clear()

        return false
    }
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be inside AuthProvider')
    return ctx
}
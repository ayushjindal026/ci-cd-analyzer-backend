import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const authHttp = axios.create({ baseURL: '/api/v1', timeout: 10_000 })

// ── Token helpers ─────────────────────────────────────────────────────────────
export const tokenStorage = {
    get: () => localStorage.getItem('piq_token'),
    set: token => localStorage.setItem('piq_token', token),
    clear: () => localStorage.removeItem('piq_token'),
}

// ── Inject JWT into every request ─────────────────────────────────────────────
authHttp.interceptors.request.use(cfg => {
    const token = tokenStorage.get()
    if (token) cfg.headers['Authorization'] = `Bearer ${token}`
    return cfg
})

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const loadUser = useCallback(async () => {

        const token = tokenStorage.get()

        if (!token) {
            setUser(null)
            setLoading(false)
            return
        }

        try {

            const res = await authHttp.get('/auth/me')

            const userData = res.data.data || res.data

            console.log('AUTH USER:', userData)

            setUser(userData)

        } catch (error) {

            const msg = error?.response?.data?.message || ''

            if (
                error?.response?.status === 401 ||
                msg.toLowerCase().includes('jwt expired')
            ) {

                tokenStorage.clear()
                setUser(null)
            }

        } finally {
            setLoading(false)
        }

    }, [])

    useEffect(() => { loadUser() }, [loadUser])

    const logout = () => {
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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
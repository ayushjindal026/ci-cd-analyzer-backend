import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from 'react'

import { authApi } from '@/api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {

    const [user, setUser] = useState(null)

    const [loading, setLoading] = useState(true)

    const loadUser = useCallback(async () => {

        const token =
            localStorage.getItem('token')

        if (!token) {

            setLoading(false)

            return
        }

        try {

            const res =
                await authApi.me()

            setUser(res.data.data || res.data)

        } catch (error) {

            console.error(error)

            setUser(null)

        } finally {

            setLoading(false)
        }

    }, [])

    useEffect(() => {

        const token =
            localStorage.getItem('token')

        if (token) {

            loadUser()

        } else {

            setLoading(false)
        }

    }, [loadUser])

    const logout = () => {

        localStorage.removeItem('token')

        setUser(null)

        window.location.href = '/login' 
    }

    return (

        <AuthContext.Provider
            value={{
                user,
                loading,
                logout,
                reload: loadUser,
            }}
        >

            {children}

        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {

    const ctx = useContext(AuthContext)

    if (!ctx) {

        throw new Error(
            'useAuth must be used within AuthProvider'
        )
    }

    return ctx
}
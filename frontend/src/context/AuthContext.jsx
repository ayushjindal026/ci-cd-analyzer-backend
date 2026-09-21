import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

// ─────────────────────────────────────────────────────────────────────────────
// API base URL
// ─────────────────────────────────────────────────────────────────────────────
//
// Development:
//   VITE_API_URL=http://localhost:8081
//
// Production:
//   VITE_API_URL may be absent.
//   Nginx proxies /api/v1 → backend.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

// ─────────────────────────────────────────────────────────────────────────────
// Token Storage
// ─────────────────────────────────────────────────────────────────────────────

export const tokenStorage = {
  getAccess: () =>
    localStorage.getItem('piq_access_token'),

  setAccess: token =>
    localStorage.setItem(
      'piq_access_token',
      token
    ),

  getRefresh: () =>
    localStorage.getItem('piq_refresh_token'),

  setRefresh: token =>
    localStorage.setItem(
      'piq_refresh_token',
      token
    ),

  // Legacy compatibility
  set: token =>
    localStorage.setItem(
      'piq_access_token',
      token
    ),

  get: () =>
    localStorage.getItem(
      'piq_access_token'
    ),

  /**
   * Stores access and refresh tokens.
   */
  setBoth: (accessToken, refreshToken) => {
    if (!accessToken || !refreshToken) {
      throw new Error(
        'Both access and refresh tokens are required'
      )
    }

    localStorage.setItem(
      'piq_access_token',
      accessToken
    )

    localStorage.setItem(
      'piq_refresh_token',
      refreshToken
    )
  },

  /**
   * Clears the complete authentication session.
   */
  clear: () => {
    localStorage.removeItem(
      'piq_access_token'
    )

    localStorage.removeItem(
      'piq_refresh_token'
    )
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Dedicated Authentication HTTP Client
// ─────────────────────────────────────────────────────────────────────────────
//
// IMPORTANT:
// This client intentionally has NO response interceptor.
//
// Therefore:
//
//   /auth/refresh
//
// can never recursively trigger another refresh request.
// ─────────────────────────────────────────────────────────────────────────────

const authHttp = axios.create({
  baseURL: API_BASE_URL,

  timeout: 10000,

  headers: {
    'Content-Type': 'application/json',
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Shared Refresh Promise
// ─────────────────────────────────────────────────────────────────────────────
//
// Only ONE refresh request can be active at a time.
//
// Example:
//
//   Request A → /auth/me → 401
//                    ↓
//                 refresh
//
//   Request B → /auth/me → 401
//                    ↓
//              waits for same refresh
//
//   Request C → /auth/me → 401
//                    ↓
//              waits for same refresh
//
// This is especially important because refresh tokens are single-use.
// ─────────────────────────────────────────────────────────────────────────────

let refreshPromise = null

export async function tryRefresh() {
  const refreshToken =
    tokenStorage.getRefresh()

  if (!refreshToken) {
    return false
  }

  // Another refresh request is already running.
  // Wait for that exact same promise.
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const response = await authHttp.post(
        '/auth/refresh',
        {
          refresh_token: refreshToken,
        }
      )

      // Backend response envelope:
      //
      // {
      //   success: true,
      //   data: {
      //     access_token: "...",
      //     refresh_token: "..."
      //   }
      // }
      //
      // Also support a non-enveloped response.
      const data =
        response.data?.data ??
        response.data

      if (
        !data?.access_token ||
        !data?.refresh_token
      ) {
        throw new Error(
          'Invalid refresh response'
        )
      }

      // IMPORTANT:
      // Store BOTH rotated tokens.
      tokenStorage.setBoth(
        data.access_token,
        data.refresh_token
      )

      return true
    } catch (error) {
      console.error(
        'Token refresh failed:',
        error
      )

      tokenStorage.clear()

      return false
    } finally {
      // Allow a future refresh after this one
      // has completely finished.
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  // ───────────────────────────────────────────────────────────────────────────
  // Load authenticated user
  // ───────────────────────────────────────────────────────────────────────────

  const loadUser = useCallback(
    async () => {
      const accessToken =
        tokenStorage.getAccess()

      // No access token means there is no
      // authenticated session to restore.
      if (!accessToken) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        // ---------------------------------------------------------------
        // First attempt with the current access token.
        // ---------------------------------------------------------------

        const response =
          await authHttp.get(
            '/auth/me',
            {
              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
              },
            }
          )

        const data =
          response.data?.data ??
          response.data

        setUser(data)
      } catch (error) {
        const status =
          error.response?.status

        // ---------------------------------------------------------------
        // Access token is invalid/expired.
        //
        // Both 401 and 403 are handled because the current backend
        // may return either status for an invalid JWT.
        // ---------------------------------------------------------------

        if (
          [401, 403].includes(status)
        ) {
          const refreshed =
            await tryRefresh()

          // Refresh failed.
          if (!refreshed) {
            tokenStorage.clear()
            setUser(null)
            return
          }

          try {
            // -----------------------------------------------------------
            // Retry /auth/me with the NEW access token.
            // -----------------------------------------------------------

            const newAccessToken =
              tokenStorage.getAccess()

            if (!newAccessToken) {
              throw new Error(
                'Access token missing after refresh'
              )
            }

            const retryResponse =
              await authHttp.get(
                '/auth/me',
                {
                  headers: {
                    Authorization:
                      `Bearer ${newAccessToken}`,
                  },
                }
              )

            const retryData =
              retryResponse.data?.data ??
              retryResponse.data

            setUser(retryData)
          } catch (retryError) {
            console.error(
              'Failed to load user after token refresh:',
              retryError
            )

            tokenStorage.clear()
            setUser(null)
          }
        } else {
          // -------------------------------------------------------------
          // Unexpected server/network error.
          // -------------------------------------------------------------

          console.error(
            'Failed to load authenticated user:',
            error
          )

          tokenStorage.clear()
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Initial Authentication
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadUser()
  }, [loadUser])

  // ─────────────────────────────────────────────────────────────────────────────
  // Logout
  // ─────────────────────────────────────────────────────────────────────────────

  const logout = async (
    logoutAll = false
  ) => {
    try {
      await authHttp.post(
        '/auth/logout',
        {
          refreshToken:
            tokenStorage.getRefresh(),

          logoutAll,
        },
        {
          headers: {
            Authorization:
              `Bearer ${tokenStorage.getAccess()}`,
          },
        }
      )
    } catch {
      // Local logout must still happen
      // even if backend logout fails.
    }

    tokenStorage.clear()
    setUser(null)

    window.location.href = '/login'
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Context
  // ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// useAuth
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context =
    useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be inside AuthProvider'
    )
  }

  return context
}
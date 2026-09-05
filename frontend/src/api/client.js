import axios from 'axios'
import { tokenStorage, tryRefresh } from '@/context/AuthContext'

// ─────────────────────────────────────────────────────────────────────────────
// Axios Instance
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8081'

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Global Refresh / Redirect State
// ─────────────────────────────────────────────────────────────────────────────

let isRefreshing = false

let failedQueue = []

// ─────────────────────────────────────────────────────────────────────────────
// Queue Processor
// ─────────────────────────────────────────────────────────────────────────────

const processQueue = error => {

  failedQueue.forEach(promise => {

    if (error) {
      promise.reject(error)
    } else {
      promise.resolve()
    }
  })

  failedQueue = []
}

// ─────────────────────────────────────────────────────────────────────────────
// Inject JWT Access Token
// ─────────────────────────────────────────────────────────────────────────────

api.interceptors.request.use(

  config => {

    const token = tokenStorage.getAccess()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },

  error => Promise.reject(error)
)

// ─────────────────────────────────────────────────────────────────────────────
// Response Interceptor
// Handles:
// - 401 refresh flow
// - request queueing
// - retry prevention
// - redirect storm prevention
// ─────────────────────────────────────────────────────────────────────────────

api.interceptors.response.use(

  response => response,

  async error => {

    const originalRequest = error.config

    // ------------------------------------------------------------------------
    // No response (network/server down)
    // ------------------------------------------------------------------------

    if (!error.response) {
      return Promise.reject(error)
    }

    const requestUrl = originalRequest?.url || ''

    // ------------------------------------------------------------------------
    // Never intercept auth endpoints
    // Prevent infinite refresh recursion
    // ------------------------------------------------------------------------

    if (
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/github') ||
      requestUrl.includes('/auth/callback')
    ) {
      return Promise.reject(error)
    }

    // ------------------------------------------------------------------------
    // Only handle 401 once
    // ------------------------------------------------------------------------

    if (
      ![401, 403].includes(error.response.status) ||
      originalRequest._retry
    ) {
      return Promise.reject(error)
    }

    // ------------------------------------------------------------------------
    // Queue requests during token refresh
    // ------------------------------------------------------------------------

    if (isRefreshing) {

      return new Promise((resolve, reject) => {

        failedQueue.push({
          resolve,
          reject,
        })

      }).then(() => {

        originalRequest.headers.Authorization =
          `Bearer ${tokenStorage.getAccess()}`

        return api(originalRequest)

      }).catch(err => Promise.reject(err))
    }

    // ------------------------------------------------------------------------
    // Begin refresh flow
    // ------------------------------------------------------------------------

    originalRequest._retry = true

    isRefreshing = true

    try {

      // ----------------------------------------------------------------------
      // Ensure refresh token exists
      // ----------------------------------------------------------------------

      const refreshToken = tokenStorage.getRefresh()

      if (!refreshToken) {

        tokenStorage.clear()

        return Promise.reject(error)
      }

      // ----------------------------------------------------------------------
      // Refresh access token
      // ----------------------------------------------------------------------

      const refreshed = await tryRefresh()

      isRefreshing = false

      // ----------------------------------------------------------------------
      // Refresh successful
      // ----------------------------------------------------------------------

      if (refreshed) {

        processQueue(null)

        originalRequest.headers.Authorization =
          `Bearer ${tokenStorage.getAccess()}`

        return api(originalRequest)
      }

      // ----------------------------------------------------------------------
      // Refresh failed
      // ----------------------------------------------------------------------

      processQueue(new Error('Session expired'))

      tokenStorage.clear()

      return Promise.reject(error)

    } catch (refreshError) {

      isRefreshing = false

      processQueue(refreshError)

      tokenStorage.clear()

      return Promise.reject(error)
    }
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// AUTH APIs
// ─────────────────────────────────────────────────────────────────────────────

export const authApi = {

  me: () =>
    api.get('/auth/me'),

  refresh: refreshToken =>
    api.post('/auth/refresh', {
      refresh_token: refreshToken,
    }),

  logout: (body = {}) =>
    api.post('/auth/logout', body),

  logoutAll: () =>
    api.post('/auth/logout', {
      logoutAll: true,
    }),
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY APIs
// ─────────────────────────────────────────────────────────────────────────────

export const repoApi = {

  list: () =>
    api.get('/repositories'),

  get: id =>
    api.get(`/repositories/${id}`),

  add: data =>
    api.post('/repositories', data),

  remove: id =>
    api.delete(`/repositories/${id}`),

  sync: id =>
    api.post(`/repositories/${id}/sync`),

  runs: (id, params) =>
    api.get(`/repositories/${id}/runs`, {
      params,
    }),

  metrics: id =>
    api.get(`/repositories/${id}/metrics`),

  analyses: id =>
    api.get(`/repositories/${id}/analyses`)
}

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB APIs
// ─────────────────────────────────────────────────────────────────────────────

export const githubApi = {

  listUserRepos: (params = {}) =>
    api.get('/github/repos', {
      params,
    }),

  searchRepos: query =>
    api.get('/github/repos/search', {
      params: {
        q: query,
      },
    }),
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE RUN APIs
// ─────────────────────────────────────────────────────────────────────────────

export const runApi = {

  repoRuns: (repoId, params) =>
    api.get(`/repositories/${repoId}/runs`, {
      params,
    }),

  get: (repoId, runId) =>
    api.get(`/repositories/${repoId}/runs/${runId}`),

  analysis: (repoId, runId) =>
    api.get(`/repositories/${repoId}/runs/${runId}/analysis`),

  analyse: (repoId, runId) =>
    api.post(`/repositories/${repoId}/runs/${runId}/analysis`),
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS APIs
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsApi = {

  metrics: repoId =>
    api.get(`/repositories/${repoId}/metrics`),
}

// ─────────────────────────────────────────────────────────────────────────────
// AI APIs
// ─────────────────────────────────────────────────────────────────────────────

export const aiApi = {

  trigger: (repoId, runId) =>
    api.post(`/repositories/${repoId}/runs/${runId}/analysis`),

  getAnalysis: (repoId, runId) =>
    api.get(`/repositories/${repoId}/runs/${runId}/analysis`),
}

export default api
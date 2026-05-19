import axios from 'axios'
import { tokenStorage, tryRefresh } from '@/context/AuthContext'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
// 401 Handling + Refresh Token Rotation
// ─────────────────────────────────────────────────────────────────────────────

let isRefreshing = false

let failedQueue = []

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

api.interceptors.response.use(

  response => response,

  async error => {

    const originalRequest = error.config

    // ------------------------------------------------------------
    // Only handle 401 once
    // ------------------------------------------------------------

    if (
      error.response?.status !== 401 ||
      originalRequest._retry
    ) {
      return Promise.reject(error)
    }

    // ------------------------------------------------------------
    // Queue requests during refresh
    // ------------------------------------------------------------

    if (isRefreshing) {

      return new Promise((resolve, reject) => {

        failedQueue.push({ resolve, reject })

      }).then(() => {

        originalRequest.headers.Authorization =
          `Bearer ${tokenStorage.getAccess()}`

        return api(originalRequest)

      }).catch(err => Promise.reject(err))
    }

    originalRequest._retry = true

    isRefreshing = true

    try {

      const refreshed = await tryRefresh()

      isRefreshing = false

      if (refreshed) {

        processQueue(null)

        originalRequest.headers.Authorization =
          `Bearer ${tokenStorage.getAccess()}`

        return api(originalRequest)
      }

      // ----------------------------------------------------------
      // Refresh failed
      // ----------------------------------------------------------

      processQueue(new Error('Session expired'))

      tokenStorage.clear()

      window.location.href = '/login'

      return Promise.reject(error)

    } catch (refreshError) {

      isRefreshing = false

      processQueue(refreshError)

      tokenStorage.clear()

      window.location.href = '/login'

      return Promise.reject(refreshError)
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
      refreshToken,
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
    api.get(`/repositories/${id}/analyses`),
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
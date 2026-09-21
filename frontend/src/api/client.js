import axios from 'axios'

import {
  tokenStorage,
  tryRefresh,
} from '@/context/AuthContext'

// ─────────────────────────────────────────────────────────────────────────────
// API Base URL
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL =
  import.meta.env.VITE_API_URL || ''

// ─────────────────────────────────────────────────────────────────────────────
// Axios Instance
// ─────────────────────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,

  timeout: 20000,

  headers: {
    'Content-Type': 'application/json',
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Request Interceptor
//
// Automatically attaches the latest access token.
//
// This is important after refresh because tokenStorage now contains
// the newly rotated access token.
// ─────────────────────────────────────────────────────────────────────────────

api.interceptors.request.use(
  config => {
    const token =
      tokenStorage.getAccess()

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`
    }

    return config
  },

  error =>
    Promise.reject(error)
)

// ─────────────────────────────────────────────────────────────────────────────
// Response Interceptor
//
// Responsibilities:
//
//   1. Detect 401 / 403.
//   2. Ask the shared tryRefresh() function to refresh the session.
//   3. Wait if another refresh is already running.
//   4. Retry the original request once.
//   5. Never intercept authentication endpoints.
// ─────────────────────────────────────────────────────────────────────────────

api.interceptors.response.use(
  response => response,

  async error => {
    const originalRequest =
      error.config

    // ─────────────────────────────────────────────────────────────────────────
    // No HTTP response.
    //
    // Usually a network error, CORS error, connection failure, etc.
    // ─────────────────────────────────────────────────────────────────────────

    if (!error.response) {
      return Promise.reject(error)
    }

    const requestUrl =
      originalRequest?.url || ''

    // ─────────────────────────────────────────────────────────────────────────
    // Never intercept authentication endpoints.
    //
    // In particular, /auth/refresh must NEVER trigger another refresh.
    // ─────────────────────────────────────────────────────────────────────────

    if (
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/github') ||
      requestUrl.includes('/auth/callback')
    ) {
      return Promise.reject(error)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Only handle authentication failures.
    //
    // _retry prevents infinite retry loops.
    // ─────────────────────────────────────────────────────────────────────────

    if (
      ![401, 403].includes(
        error.response.status
      ) ||
      originalRequest?._retry
    ) {
      return Promise.reject(error)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mark this request as retried BEFORE refreshing.
    //
    // This guarantees that if the retry itself receives 401/403,
    // it will not start another refresh cycle.
    // ─────────────────────────────────────────────────────────────────────────

    originalRequest._retry = true

    // ─────────────────────────────────────────────────────────────────────────
    // Make sure a refresh token actually exists.
    // ─────────────────────────────────────────────────────────────────────────

    const refreshToken =
      tokenStorage.getRefresh()

    if (!refreshToken) {
      tokenStorage.clear()

      return Promise.reject(error)
    }

    try {
      // ───────────────────────────────────────────────────────────────────────
      // IMPORTANT:
      //
      // tryRefresh() has a shared promise.
      //
      // Therefore if multiple requests receive 401/403 at approximately
      // the same time, they all wait for ONE refresh operation.
      // ───────────────────────────────────────────────────────────────────────

      const refreshed =
        await tryRefresh()

      if (!refreshed) {
        tokenStorage.clear()

        return Promise.reject(error)
      }

      // ───────────────────────────────────────────────────────────────────────
      // Refresh succeeded.
      //
      // Get the NEW access token from storage.
      // ───────────────────────────────────────────────────────────────────────

      const newAccessToken =
        tokenStorage.getAccess()

      if (!newAccessToken) {
        tokenStorage.clear()

        return Promise.reject(error)
      }

      originalRequest.headers =
        originalRequest.headers || {}

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`

      // ───────────────────────────────────────────────────────────────────────
      // Retry the original request exactly once.
      // ───────────────────────────────────────────────────────────────────────

      return api(originalRequest)
    } catch (refreshError) {
      tokenStorage.clear()

      return Promise.reject(
        refreshError
      )
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
    api.post(
      '/auth/refresh',
      {
        refresh_token: refreshToken,
      }
    ),

  logout: (body = {}) =>
    api.post(
      '/auth/logout',
      body
    ),

  logoutAll: () =>
    api.post(
      '/auth/logout',
      {
        logoutAll: true,
      }
    ),
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY APIs
// ─────────────────────────────────────────────────────────────────────────────

export const repoApi = {
  list: () =>
    api.get('/repositories'),

  get: id =>
    api.get(
      `/repositories/${id}`
    ),

  add: data =>
    api.post(
      '/repositories',
      data
    ),

  remove: id =>
    api.delete(
      `/repositories/${id}`
    ),

  sync: id =>
    api.post(
      `/repositories/${id}/sync`
    ),

  runs: (id, params) =>
    api.get(
      `/repositories/${id}/runs`,
      {
        params,
      }
    ),

  metrics: id =>
    api.get(
      `/repositories/${id}/metrics`
    ),

  analyses: id =>
    api.get(
      `/repositories/${id}/analyses`
    ),
}

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB APIs
// ─────────────────────────────────────────────────────────────────────────────

export const githubApi = {
  listUserRepos: (params = {}) =>
    api.get(
      '/github/repos',
      {
        params,
      }
    ),

  searchRepos: query =>
    api.get(
      '/github/repos/search',
      {
        params: {
          q: query,
        },
      }
    ),
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE RUN APIs
// ─────────────────────────────────────────────────────────────────────────────

export const runApi = {
  repoRuns: (repoId, params) =>
    api.get(
      `/repositories/${repoId}/runs`,
      {
        params,
      }
    ),

  get: (repoId, runId) =>
    api.get(
      `/repositories/${repoId}/runs/${runId}`
    ),

  analysis: (repoId, runId) =>
    api.get(
      `/repositories/${repoId}/runs/${runId}/analysis`
    ),

  analyse: (repoId, runId) =>
    api.post(
      `/repositories/${repoId}/runs/${runId}/analysis`
    ),
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS APIs
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsApi = {
  metrics: repoId =>
    api.get(
      `/repositories/${repoId}/metrics`
    ),
}

// ─────────────────────────────────────────────────────────────────────────────
// AI APIs
// ─────────────────────────────────────────────────────────────────────────────

export const aiApi = {
  trigger: (repoId, runId) =>
    api.post(
      `/repositories/${repoId}/runs/${runId}/analysis`
    ),

  getAnalysis: (repoId, runId) =>
    api.get(
      `/repositories/${repoId}/runs/${runId}/analysis`
    ),
}

// ─────────────────────────────────────────────────────────────────────────────
// Default API Client
// ─────────────────────────────────────────────────────────────────────────────

export default api
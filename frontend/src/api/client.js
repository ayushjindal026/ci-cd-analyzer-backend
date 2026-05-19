import axios from 'axios'
import { tokenStorage, tryRefresh } from '@/context/AuthContext'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Inject access token ───────────────────────────────────────────────────────
api.interceptors.request.use(cfg => {
  const token = tokenStorage.getAccess()
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`
  return cfg
}, err => Promise.reject(err))

// ── 401 → try refresh once → retry original request ──────────────────────────
let isRefreshing = false
let failedQueue = []   // queued requests waiting for refresh

const processQueue = (error) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve())
  failedQueue = []
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config

    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err)
    }

    // Already refreshing — queue this request until refresh completes
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => {
        original.headers['Authorization'] = `Bearer ${tokenStorage.getAccess()}`
        return api(original)
      }).catch(e => Promise.reject(e))
    }

    original._retry = true
    isRefreshing = true

    const refreshed = await tryRefresh()

    isRefreshing = false

    if (refreshed) {
      processQueue(null)
      original.headers['Authorization'] = `Bearer ${tokenStorage.getAccess()}`
      return api(original)
    } else {
      processQueue(new Error('Session expired'))
      tokenStorage.clear()
      window.location.href = '/login'
      return Promise.reject(err)
    }
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
export const authApi = {
  me: () => api.get('/auth/me'),
  refresh: refreshToken => api.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: (body = {}) => api.post('/auth/logout', body).catch(() => { }),
  logoutAll: () => api.post('/auth/logout', { logout_all: true }).catch(() => { }),
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORIES
// ─────────────────────────────────────────────────────────────────────────────
export const repoApi = {
  list: () => api.get('/repositories'),
  get: id => api.get(`/repositories/${id}`),
  add: data => api.post('/repositories', data),
  remove: id => api.delete(`/repositories/${id}`),
  sync: id => api.post(`/repositories/${id}/sync`),
  runs: (id, p) => api.get(`/repositories/${id}/runs`, { params: p }),
  metrics: id => api.get(`/repositories/${id}/metrics`),
  analyses: id => api.get(`/repositories/${id}/analyses`),
}

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB — fetch repos from GitHub to populate the "Connect Repo" modal
// These calls go through our backend which proxies to GitHub using the user's token
// ─────────────────────────────────────────────────────────────────────────────
export const githubApi = {
  // GET /api/v1/github/repos — backend fetches from api.github.com/user/repos
  listUserRepos: (params = {}) => api.get('/github/repos', { params }),
  // GET /api/v1/github/repos/search?q=name — search user's repos
  searchRepos: (q) => api.get('/github/repos/search', { params: { q } }),
}

// ─────────────────────────────────────────────────────────────────────────────
// RUNS
// ─────────────────────────────────────────────────────────────────────────────
export const runApi = {
  repoRuns: (repoId, p) => api.get(`/repositories/${repoId}/runs`, { params: p }),
  get: (repoId, runId) => api.get(`/repositories/${repoId}/runs/${runId}`),
  analysis: (repoId, runId) => api.get(`/repositories/${repoId}/runs/${runId}/analysis`),
  analyse: (repoId, runId) => api.post(`/repositories/${repoId}/runs/${runId}/analyse`),
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
export const analyticsApi = {
  metrics: id => api.get(`/repositories/${id}/metrics`),
}

// ─────────────────────────────────────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────────────────────────────────────
export const aiApi = {
  trigger: (repoId, runId) => api.post(`/repositories/${repoId}/runs/${runId}/analyse`),
  getAnalysis: (repoId, runId) => api.get(`/repositories/${repoId}/runs/${runId}/analysis`),
}

export default api
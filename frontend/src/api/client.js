import axios from 'axios'
import { tokenStorage } from '@/context/AuthContext'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Inject JWT on every request ───────────────────────────────────────────────
api.interceptors.request.use(cfg => {
  const token = tokenStorage.get()
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`
  return cfg
}, err => Promise.reject(err))

// ── 401 → clear token + redirect to login ────────────────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      tokenStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
export const authApi = {
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout').catch(() => { }),
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORIES
//   GET    /api/v1/repositories
//   POST   /api/v1/repositories
//   GET    /api/v1/repositories/{id}
//   DELETE /api/v1/repositories/{id}
//   POST   /api/v1/repositories/{id}/sync
//   GET    /api/v1/repositories/{id}/runs
//   GET    /api/v1/repositories/{id}/metrics
// ─────────────────────────────────────────────────────────────────────────────
export const repoApi = {
  list: () => api.get('/repositories'),
  get: id => api.get(`/repositories/${id}`),
  add: data => api.post('/repositories', data),
  remove: id => api.delete(`/repositories/${id}`),
  sync: id => api.post(`/repositories/${id}/sync`),
  runs: (id, p) => api.get(`/repositories/${id}/runs`, { params: p }),
  metrics: id => api.get(`/repositories/${id}/metrics`),
}

// ─────────────────────────────────────────────────────────────────────────────
// RUNS
//   GET  /api/v1/repositories/{repoId}/runs/{runId}
//   GET  /api/v1/repositories/{repoId}/runs/{runId}/analysis
//   POST /api/v1/repositories/{repoId}/runs/{runId}/analyse
// ─────────────────────────────────────────────────────────────────────────────
export const runApi = {
  repoRuns: (repoId, p) => api.get(`/repositories/${repoId}/runs`, { params: p }),
  get: (repoId, runId) => api.get(`/repositories/${repoId}/runs/${runId}`),
  analysis: (repoId, runId) => api.get(`/repositories/${repoId}/runs/${runId}/analysis`),
  analyse: (repoId, runId) => api.post(`/repositories/${repoId}/runs/${runId}/analyse`),
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
//   GET /api/v1/repositories/{id}/metrics
// ─────────────────────────────────────────────────────────────────────────────
export const analyticsApi = {
  metrics: id => api.get(`/repositories/${id}/metrics`),
}

// ─────────────────────────────────────────────────────────────────────────────
// AI
//   POST /api/v1/repositories/{repoId}/runs/{runId}/analyse
//   GET  /api/v1/repositories/{repoId}/runs/{runId}/analysis
// ─────────────────────────────────────────────────────────────────────────────
export const aiApi = {
  trigger: (repoId, runId) => api.post(`/repositories/${repoId}/runs/${runId}/analyse`),
  getAnalysis: (repoId, runId) => api.get(`/repositories/${repoId}/runs/${runId}/analysis`),
}

export default api
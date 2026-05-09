import axios from 'axios'

// ─────────────────────────────────────────────────────────────────────────────
// AXIOS INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
    || 'http://localhost:8081/api/v1',

  headers: {
    'Content-Type': 'application/json',
  },

  timeout: 20000,
})

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST INTERCEPTOR
// ─────────────────────────────────────────────────────────────────────────────

api.interceptors.request.use(
  config => {

    const accessToken =
      localStorage.getItem('token')

    if (accessToken) {

      config.headers.Authorization =
        `Bearer ${accessToken}`
    }

    return config
  },

  error => Promise.reject(error)
)

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE INTERCEPTOR
// ─────────────────────────────────────────────────────────────────────────────

api.interceptors.response.use(

  response => {

    // DEV RESPONSE LOGGING
    if (import.meta.env.DEV) {
      console.log(
        `✅ ${response.status} ${response.config.url}`
      )
    }

    return response
  },

  error => {

    const status = error.response?.status

    // NETWORK ERROR
    if (!error.response) {

      console.error('🌐 Network error or backend unreachable')

      return Promise.reject({
        message: 'Backend server unreachable',
      })
    }

    // AUTHORIZATION ERRORS
    if (status === 401) {

      console.warn('🔒 Unauthorized request')
    }

    // FORBIDDEN
    if (status === 403) {

      console.warn('⛔ Forbidden request')
    }

    // NOT FOUND
    if (status === 404) {

      console.warn('📭 Resource not found')
    }

    // SERVER ERROR
    if (status >= 500) {

      console.error('💥 Internal server error')
    }

    return Promise.reject(error)
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// AUTH API
// ─────────────────────────────────────────────────────────────────────────────

export const authApi = {

  me: () =>
    api.get('/auth/me'),

  logout: () =>
    api.post('/auth/logout'),
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY API
// ─────────────────────────────────────────────────────────────────────────────

export const repoApi = {

  list: () =>
    api.get('/repositories'),

  get: id =>
    api.get(`/repositories/${id}`),

  add: data =>
    api.post('/repositories', data),

  update: (id, data) =>
    api.put(`/repositories/${id}`, data),

  remove: id =>
    api.delete(`/repositories/${id}`),

  sync: id =>
    api.post(`/repositories/${id}/sync`),

  branches: id =>
    api.get(`/repositories/${id}/branches`),

  workflows: id =>
    api.get(`/repositories/${id}/workflows`),
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE RUNS API
// ─────────────────────────────────────────────────────────────────────────────

export const runApi = {

  list: params =>
    api.get('/runs', { params }),

  get: id =>
    api.get(`/runs/${id}`),

  rerun: id =>
    api.post(`/runs/${id}/rerun`),

  cancel: id =>
    api.post(`/runs/${id}/cancel`),

  stages: id =>
    api.get(`/runs/${id}/stages`),

  logs: (id, stageId) =>
    api.get(`/runs/${id}/stages/${stageId}/logs`),

  artifacts: id =>
    api.get(`/runs/${id}/artifacts`),

  timeline: id =>
    api.get(`/runs/${id}/timeline`),
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS API
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsApi = {

  summary: repoId =>
    api.get('/analytics/summary', {
      params: { repoId },
    }),

  failureRate: repoId =>
    api.get('/analytics/failure-rate', {
      params: { repoId },
    }),

  durations: repoId =>
    api.get('/analytics/durations', {
      params: { repoId },
    }),

  topFailing: repoId =>
    api.get('/analytics/top-failing', {
      params: { repoId },
    }),

  heatmap: repoId =>
    api.get('/analytics/heatmap', {
      params: { repoId },
    }),

  trends: repoId =>
    api.get('/analytics/trends', {
      params: { repoId },
    }),

  deploymentFrequency: repoId =>
    api.get('/analytics/deployment-frequency', {
      params: { repoId },
    }),

  mttr: repoId =>
    api.get('/analytics/mttr', {
      params: { repoId },
    }),

  flakyPipelines: repoId =>
    api.get('/analytics/flaky-pipelines', {
      params: { repoId },
    }),
}

// ─────────────────────────────────────────────────────────────────────────────
// AI API
// ─────────────────────────────────────────────────────────────────────────────

export const aiApi = {

  diagnose: runId =>
    api.post(`/ai/diagnose/${runId}`),

  insights: repoId =>
    api.get('/ai/insights', {
      params: { repoId },
    }),

  predictScore: repoId =>
    api.get('/ai/predict', {
      params: { repoId },
    }),

  generateSummary: runId =>
    api.post(`/ai/generate-summary/${runId}`),

  rootCause: runId =>
    api.post(`/ai/root-cause/${runId}`),

  optimizationTips: repoId =>
    api.get('/ai/optimization-tips', {
      params: { repoId },
    }),

  anomalyDetection: repoId =>
    api.get('/ai/anomaly-detection', {
      params: { repoId },
    }),
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH API
// ─────────────────────────────────────────────────────────────────────────────

export const healthApi = {

  status: () =>
    api.get('/health'),

  metrics: () =>
    api.get('/actuator/metrics'),
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default api
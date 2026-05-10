// ═══════════════════════════════════════════════════════════════════════════════
// src/api/settingsApi.js
// All user-preference and alert-config calls to Spring Boot
// ═══════════════════════════════════════════════════════════════════════════════
import api from './client'

export const settingsApi = {
    // User notification preferences
    getPrefs: () => api.get('/settings/preferences'),
    savePrefs: data => api.put('/settings/preferences', data),

    // Alert thresholds
    getAlerts: () => api.get('/settings/alerts'),
    saveAlerts: data => api.put('/settings/alerts', data),

    // Slack integration
    testSlack: url => api.post('/settings/slack/test', { webhookUrl: url }),

    // Email integration
    testEmail: email => api.post('/settings/email/test', { email }),

    // Connected integrations list
    getIntegrations: () => api.get('/settings/integrations'),
}
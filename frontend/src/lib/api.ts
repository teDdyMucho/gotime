import axios from 'axios'
import { getAccessToken, supabase } from './auth'
import * as mock from './mockApi'

// ----------------------------------------------------------------
// Mock mode: active in dev when "Continue with local UI" was clicked
// ----------------------------------------------------------------
const isMockMode =
  typeof window !== 'undefined' &&
  localStorage.getItem('gotime-dev-bypass-auth') === '1'

// ----------------------------------------------------------------
// Real axios instance (only used when NOT in mock mode)
// ----------------------------------------------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-retry once on 401 with a force-refreshed token
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry && supabase) {
      original._retry = true
      const { data } = await supabase.auth.refreshSession()
      const token = data.session?.access_token
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
    }
    return Promise.reject(err)
  }
)

// ---- Real API objects ----

const realFacilitiesApi = {
  list: (params?: Record<string, string>) => api.get('/facilities', { params }),
  create: (data: unknown) => api.post('/facilities', data),
  update: (id: string, data: unknown) => api.patch(`/facilities/${id}`, data),
}

const realRequestorsApi = {
  list: (params?: Record<string, string>) => api.get('/requestors', { params }),
  create: (data: unknown) => api.post('/requestors', data),
  update: (id: string, data: unknown) => api.patch(`/requestors/${id}`, data),
}

const realClientsApi = {
  list: (params?: Record<string, string>) => api.get('/clients', { params }),
  get: (id: string) => api.get(`/clients/${id}`),
  create: (data: unknown) => api.post('/clients', data),
  update: (id: string, data: unknown) => api.patch(`/clients/${id}`, data),
}

const realPaySourcesApi = {
  list: (params?: Record<string, string>) => api.get('/pay-sources', { params }),
  create: (data: unknown) => api.post('/pay-sources', data),
  update: (id: string, data: unknown) => api.patch(`/pay-sources/${id}`, data),
}

const realTripsApi = {
  list: (params?: Record<string, string>) => api.get('/trips', { params }),
  get: (id: string) => api.get(`/trips/${id}`),
  create: (data: unknown) => api.post('/trips', data),
  review: (id: string, data: { action: string; decline_reason?: string; clarification_reason?: string; review_notes?: string }) =>
    api.patch(`/trips/${id}/review`, data),
  cancel: (id: string, data: { cancellation_reason: string; review_notes?: string }) =>
    api.patch(`/trips/${id}/cancel`, data),
  notify: (id: string, data: { message_type: string; recipient_ids?: string[] }) =>
    api.post(`/trips/${id}/notify`, data),
  export: (params?: Record<string, string>) =>
    api.get('/trips/export', { params, responseType: 'blob' }),
}

const realMetricsApi = {
  summary:     (params?: Record<string, string>) => api.get('/metrics/summary',       { params }),
  byFacility:  (params?: Record<string, string>) => api.get('/metrics/by-facility',   { params }),
  byPaySource: (params?: Record<string, string>) => api.get('/metrics/by-pay-source', { params }),
  revenue:     (params?: Record<string, string>) => api.get('/metrics/revenue',       { params }),
  quality:     (params?: Record<string, string>) => api.get('/metrics/quality',       { params }),
}

const realAuditApi = {
  list: (params?: Record<string, string>) => api.get('/audit-log', { params }),
}

const realNotificationsApi = {
  list: (params?: Record<string, string>) => api.get('/notifications', { params }),
}

// ----------------------------------------------------------------
// Exports — mock or real depending on mode
// ----------------------------------------------------------------
export const facilitiesApi    = isMockMode ? mock.facilitiesApi    : realFacilitiesApi
export const requestorsApi    = isMockMode ? mock.requestorsApi    : realRequestorsApi
export const clientsApi       = isMockMode ? mock.clientsApi       : realClientsApi
export const paySourcesApi    = isMockMode ? mock.paySourcesApi    : realPaySourcesApi
export const tripsApi         = isMockMode ? mock.tripsApi         : realTripsApi
export const metricsApi       = isMockMode ? mock.metricsApi       : realMetricsApi
export const auditApi         = isMockMode ? mock.auditApi         : realAuditApi
export const notificationsApi = isMockMode ? mock.notificationsApi : realNotificationsApi

export default api

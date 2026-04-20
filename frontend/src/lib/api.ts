import axios from 'axios'
import { getAccessToken, supabase } from './auth'

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
    // Suppress expected conflict/not-found errors from browser console
    if (err.response?.status === 409 || err.response?.status === 404) {
      return Promise.reject(err)
    }
    return Promise.reject(err)
  }
)

export const facilitiesApi = {
  list: (params?: Record<string, string>) => api.get('/facilities', { params }),
  create: (data: unknown) => api.post('/facilities', data),
  update: (id: string, data: unknown) => api.patch(`/facilities/${id}`, data),
  delete: (id: string) => api.delete(`/facilities/${id}`),
}

export const requestorsApi = {
  list: (params?: Record<string, string>) => api.get('/requestors', { params }),
  create: (data: unknown) => api.post('/requestors', data),
  update: (id: string, data: unknown) => api.patch(`/requestors/${id}`, data),
  delete: (id: string) => api.delete(`/requestors/${id}`),
}

export const clientsApi = {
  list: (params?: Record<string, string>) => api.get('/clients', { params }),
  get: (id: string) => api.get(`/clients/${id}`),
  create: (data: unknown) => api.post('/clients', data),
  update: (id: string, data: unknown) => api.patch(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
}

export const paySourcesApi = {
  list: (params?: Record<string, string>) => api.get('/pay-sources', { params }),
  create: (data: unknown) => api.post('/pay-sources', data),
  update: (id: string, data: unknown) => api.patch(`/pay-sources/${id}`, data),
  delete: (id: string) => api.delete(`/pay-sources/${id}`),
}

export const tripsApi = {
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

export const metricsApi = {
  summary:     (params?: Record<string, string>) => api.get('/metrics/summary',       { params }),
  byFacility:  (params?: Record<string, string>) => api.get('/metrics/by-facility',   { params }),
  byPaySource: (params?: Record<string, string>) => api.get('/metrics/by-pay-source', { params }),
  revenue:     (params?: Record<string, string>) => api.get('/metrics/revenue',       { params }),
  quality:     (params?: Record<string, string>) => api.get('/metrics/quality',       { params }),
}

export const auditApi = {
  list: (params?: Record<string, string>) => api.get('/audit-log', { params }),
}

export const notificationsApi = {
  list: (params?: Record<string, string>) => api.get('/notifications', { params }),
}

export default api

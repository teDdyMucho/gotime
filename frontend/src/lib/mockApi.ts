// ============================================================
// Mock API — same interface as api.ts, backed by mockStore
// Used when dev bypass auth is active (no backend needed)
// ============================================================

import {
  paySourcesStore,
  facilitiesStore,
  requestorsStore,
  clientsStore,
  tripsStore,
  getAuditLog,
  addAuditEntry,
  getMetricsSummary,
  getMetricsByFacility,
  getMetricsByPaySource,
  getMetricsRevenue,
  getMetricsQuality,
  getNotificationLog,
  addNotificationEntry,
} from './mockStore'
import type { ReviewState, OutcomeCategory, DeclineReason, CancellationReason } from './types'

// Wraps data to match axios response shape: { data: T }
function ok<T>(data: T): { data: T } {
  return { data }
}

// Simulate async (tiny delay so spinners briefly appear)
function delay<T>(data: T): Promise<{ data: T }> {
  return new Promise((res) => setTimeout(() => res(ok(data)), 120))
}

// ---- Facilities ----
export const facilitiesApi = {
  list: (params?: Record<string, string>) => {
    let items = facilitiesStore.list()
    if (params?.status) items = items.filter((f) => f.status === params.status)
    return delay(items)
  },
  create: (data: unknown) => {
    const item = facilitiesStore.create(data as Parameters<typeof facilitiesStore.create>[0])
    return delay(item)
  },
  update: (id: string, data: unknown) => {
    const item = facilitiesStore.update(id, data as Parameters<typeof facilitiesStore.update>[1])
    return delay(item)
  },
}

// ---- Requestors ----
export const requestorsApi = {
  list: (params?: Record<string, string>) => {
    let items = requestorsStore.list()
    if (params?.facility_id) items = items.filter((r) => r.facility_id === params.facility_id)
    if (params?.status)      items = items.filter((r) => r.status === params.status)
    if (params?.search) {
      const q = params.search.toLowerCase()
      items = items.filter((r) => r.name.toLowerCase().includes(q))
    }
    return delay(items)
  },
  create: (data: unknown) => delay(requestorsStore.create(data as Parameters<typeof requestorsStore.create>[0])),
  update: (id: string, data: unknown) => delay(requestorsStore.update(id, data as Parameters<typeof requestorsStore.update>[1])),
}

// ---- Clients ----
export const clientsApi = {
  list: (params?: Record<string, string>) => {
    let items = clientsStore.list()
    if (params?.search) {
      const q = params.search.toLowerCase()
      items = items.filter((c) => c.full_name.toLowerCase().includes(q) || c.phone?.includes(q))
    }
    return delay(items)
  },
  get: (id: string) => {
    const item = clientsStore.get(id)
    if (!item) return Promise.reject(new Error('Client not found'))
    return delay(item)
  },
  create: (data: unknown) => delay(clientsStore.create(data as Parameters<typeof clientsStore.create>[0])),
  update: (id: string, data: unknown) => delay(clientsStore.update(id, data as Parameters<typeof clientsStore.update>[1])),
}

// ---- Pay Sources ----
export const paySourcesApi = {
  list: (params?: Record<string, string>) => {
    let items = paySourcesStore.list()
    if (params?.status) items = items.filter((p) => p.status === params.status)
    return delay(items)
  },
  create: (data: unknown) => delay(paySourcesStore.create(data as Parameters<typeof paySourcesStore.create>[0])),
}

// ---- Trips ----
export const tripsApi = {
  list: (params?: Record<string, string>) => {
    let items = tripsStore.list()
    if (params?.review_state)     items = items.filter((t) => t.review_state === params.review_state)
    if (params?.facility_id)      items = items.filter((t) => t.facility_id === params.facility_id)
    if (params?.pay_source_id)    items = items.filter((t) => t.pay_source_id === params.pay_source_id)
    if (params?.urgency_level)    items = items.filter((t) => t.urgency_level === params.urgency_level)
    if (params?.missing_info_flag) items = items.filter((t) => t.missing_info_flag === (params.missing_info_flag === 'true'))
    if (params?.trip_date)        items = items.filter((t) => t.trip_date === params.trip_date)
    // Sort: pending first, then by trip_date
    items.sort((a, b) => {
      if (a.review_state === 'pending' && b.review_state !== 'pending') return -1
      if (b.review_state === 'pending' && a.review_state !== 'pending') return 1
      return a.trip_date.localeCompare(b.trip_date)
    })
    return delay(items)
  },
  get: (id: string) => {
    const item = tripsStore.get(id)
    if (!item) return Promise.reject(new Error('Trip not found'))
    return delay(item)
  },
  create: (data: unknown) => {
    const d = data as Record<string, unknown>
    const item = tripsStore.create({
      ...d,
      intake_date: new Date().toISOString().split('T')[0],
      intake_staff_user_id: 'local-dev-user',
      review_state: 'pending' as ReviewState,
      escort_needed: d.escort_needed ?? false,
      will_call: d.will_call ?? false,
      missing_info_flag: d.missing_info_flag ?? false,
    } as Parameters<typeof tripsStore.create>[0])
    addAuditEntry({ entity_type: 'trip', entity_id: item.id, action: 'create', user_id: 'local-dev-user' })
    return delay(item)
  },
  review: (id: string, data: { action: string; decline_reason?: string; clarification_reason?: string; review_notes?: string }) => {
    const stateMap: Record<string, ReviewState> = {
      accept:  'accepted',
      decline: 'declined',
      return:  'returned',
    }
    const outcomeMap: Record<string, OutcomeCategory> = {
      accept:  'accepted',
      decline: 'declined',
    }
    const updates: Record<string, unknown> = {
      review_state:  stateMap[data.action] ?? 'pending',
      reviewed_by:   'local-dev-user',
      reviewed_at:   new Date().toISOString(),
      review_notes:  data.review_notes,
    }
    if (data.action === 'decline') {
      updates.decline_reason    = data.decline_reason as DeclineReason
      updates.outcome_category  = outcomeMap[data.action]
    }
    if (data.action === 'return') {
      updates.clarification_reason = data.clarification_reason
    }
    if (data.action === 'accept') {
      updates.outcome_category = outcomeMap[data.action]
    }
    const item = tripsStore.update(id, updates as Parameters<typeof tripsStore.update>[1])
    addAuditEntry({ entity_type: 'trip', entity_id: id, action: `review_${data.action}`, user_id: 'local-dev-user', changed_fields: Object.keys(updates) })
    return delay(item)
  },
  cancel: (id: string, data: { cancellation_reason: string; review_notes?: string }) => {
    const trip = tripsStore.get(id)
    const newState: ReviewState = data.cancellation_reason === 'arrived_cancel' ? 'arrived_canceled' : 'canceled'
    const item = tripsStore.update(id, {
      review_state:         newState,
      cancellation_reason:  data.cancellation_reason as CancellationReason,
      review_notes:         data.review_notes,
      outcome_category:     newState === 'arrived_canceled' ? 'arrived_canceled' : 'canceled' as OutcomeCategory,
      reviewed_by:          'local-dev-user',
      reviewed_at:          new Date().toISOString(),
    } as Parameters<typeof tripsStore.update>[1])
    void trip
    addAuditEntry({ entity_type: 'trip', entity_id: id, action: 'cancel', user_id: 'local-dev-user', changed_fields: ['review_state', 'cancellation_reason'] })
    return delay(item)
  },
  notify: (id: string, data: { message_type: string; method?: string; message_preview?: string; requestor_id?: string }) => {
    const trip = tripsStore.get(id)
    if (trip && data.requestor_id) {
      addNotificationEntry({
        trip_id: id,
        requestor_id: data.requestor_id,
        notification_type: (data.message_type as 'accepted' | 'declined' | 'returned' | 'canceled' | 'completed' | 'general') ?? 'general',
        method: (data.method as 'sms' | 'email' | 'both') ?? 'email',
        status: 'sent',
        message_preview: data.message_preview,
        sent_by: 'local-dev-user',
      })
    }
    return delay({ status: 'sent', message: 'Notification triggered (mock)' })
  },
}

// ---- Metrics ----
export const metricsApi = {
  summary:     (params?: Record<string, string>) => delay(getMetricsSummary(params ?? {})),
  byFacility:  (_params?: Record<string, string>) => delay(getMetricsByFacility()),
  byPaySource: (_params?: Record<string, string>) => delay(getMetricsByPaySource()),
  revenue:     (_params?: Record<string, string>) => delay(getMetricsRevenue()),
  quality:     (_params?: Record<string, string>) => delay(getMetricsQuality()),
}

// ---- Audit ----
export const auditApi = {
  list: (params?: Record<string, string>) => delay(getAuditLog(params ?? {})),
}

// ---- Notifications ----
export const notificationsApi = {
  list: (params?: Record<string, string>) => delay(getNotificationLog(params ?? {})),
}

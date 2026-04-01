// ============================================================
// In-memory mock store — mirrors the seed.sql data
// All mutations persist for the browser session (no backend needed)
// ============================================================

import type {
  PaySource, Facility, Requestor, Client, TripRequest,
  ReviewState, DeclineReason, OutcomeCategory,
  NotificationLog,
} from './types'

// ---- Seed Data ----

const paySources: PaySource[] = [
  { id: 'ps-001', name: 'Medicaid',            status: 'active', notes: 'Standard Medicaid transport', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'ps-002', name: 'Medicare',             status: 'active', notes: 'Medicare Part B',             created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'ps-003', name: 'Private Pay',          status: 'active', notes: 'Direct patient billing',      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'ps-004', name: 'BlueCross BlueShield', status: 'active',                                        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'ps-005', name: 'United Healthcare',    status: 'active',                                        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'ps-006', name: 'Aetna',                status: 'active',                                        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'ps-007', name: 'VA Benefits',          status: 'active',                                        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
]

const facilities: Facility[] = [
  { id: 'fac-001', name: "St. Mary's Medical Center",       facility_type: 'hospital',    address: '1200 Medical Blvd, Springfield, ST 00001', phone: '(555) 100-1000', email: 'transport@stmarys.test',          status: 'active', default_pay_source_id: 'ps-001', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'fac-002', name: 'Riverside Dialysis Center',       facility_type: 'clinic',      address: '450 River Rd, Springfield, ST 00002',      phone: '(555) 200-2000', email: 'intake@riverside-dialysis.test', status: 'active', default_pay_source_id: 'ps-002', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'fac-003', name: 'Sunrise Skilled Nursing Facility', facility_type: 'SNF',        address: '300 Sunrise Way, Springfield, ST 00003',   phone: '(555) 300-3000',                                           status: 'active', default_pay_source_id: 'ps-001', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'fac-004', name: 'Valley Home Health Agency',       facility_type: 'home_health', address: '88 Valley Ln, Springfield, ST 00004',      phone: '(555) 400-4000',                                           status: 'active', default_pay_source_id: 'ps-003', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'fac-005', name: 'Metro Cancer & Oncology Clinic',  facility_type: 'clinic',      address: '700 Hope St, Springfield, ST 00005',       phone: '(555) 500-5000', email: 'schedule@metrocancer.test',      status: 'active', default_pay_source_id: 'ps-004', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
]

const requestors: Requestor[] = [
  { id: 'req-001', name: 'Maria Santos',  title_department: 'Discharge Planning',    phone: '(555) 101-1001', email: 'm.santos@stmarys.test',          preferred_notification_method: 'email', facility_id: 'fac-001', status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'req-002', name: 'James Reyes',   title_department: 'Social Work',           phone: '(555) 101-1002', email: 'j.reyes@stmarys.test',           preferred_notification_method: 'both',  facility_id: 'fac-001', status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'req-003', name: 'Linda Chen',    title_department: 'Dialysis Coordinator',  phone: '(555) 201-2001', email: 'l.chen@riverside-dialysis.test', preferred_notification_method: 'sms',   facility_id: 'fac-002', status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'req-004', name: 'Robert Kim',    title_department: 'Nursing Supervisor',    phone: '(555) 301-3001',                                          preferred_notification_method: 'email', facility_id: 'fac-003', status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'req-005', name: 'Angela Torres', title_department: 'Oncology Nurse Nav.',   phone: '(555) 501-5001', email: 'a.torres@metrocancer.test',      preferred_notification_method: 'email', facility_id: 'fac-005', status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
]

const clients: Client[] = [
  { id: 'cli-001', full_name: 'John Doe',        date_of_birth: '1945-03-15', phone: '(555) 111-1111', primary_address: '10 Oak St, Springfield, ST 00001',      mobility_level: 'ambulatory', default_pay_source_id: 'ps-001', primary_facility_id: 'fac-001', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'cli-002', full_name: 'Jane Smith',       date_of_birth: '1938-07-22', phone: '(555) 222-2222', primary_address: '25 Elm Ave, Springfield, ST 00002',     mobility_level: 'wheelchair',  default_pay_source_id: 'ps-002', primary_facility_id: 'fac-002', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'cli-003', full_name: 'Robert Johnson',   date_of_birth: '1952-11-08', phone: '(555) 333-3333', primary_address: '88 Maple Dr, Springfield, ST 00003',    mobility_level: 'ambulatory', default_pay_source_id: 'ps-001', primary_facility_id: 'fac-003', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'cli-004', full_name: 'Mary Williams',    date_of_birth: '1960-05-30', phone: '(555) 444-4444', primary_address: '200 Pine Rd, Springfield, ST 00004',    mobility_level: 'stretcher',   default_pay_source_id: 'ps-001', primary_facility_id: 'fac-001', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'cli-005', full_name: 'Carlos Rivera',    date_of_birth: '1948-09-17', phone: '(555) 555-5555', primary_address: '55 Cedar Blvd, Springfield, ST 00005',  mobility_level: 'wheelchair',  default_pay_source_id: 'ps-004', primary_facility_id: 'fac-005', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'cli-006', full_name: 'Patricia Lee',     date_of_birth: '1935-12-01', phone: '(555) 666-6666', primary_address: '77 Birch Ln, Springfield, ST 00006',    mobility_level: 'ambulatory', default_pay_source_id: 'ps-002', primary_facility_id: 'fac-002', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'cli-007', full_name: 'David Nguyen',     date_of_birth: '1955-04-12', phone: '(555) 777-7777', primary_address: '33 Willow St, Springfield, ST 00007',   mobility_level: 'ambulatory', default_pay_source_id: 'ps-003', primary_facility_id: 'fac-001', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'cli-008', full_name: 'Susan Martinez',   date_of_birth: '1942-08-25', phone: '(555) 888-8888', primary_address: '90 Spruce Ave, Springfield, ST 00008',  mobility_level: 'wheelchair',  default_pay_source_id: 'ps-002', primary_facility_id: 'fac-002', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
]

const trips: TripRequest[] = [
  {
    id: 'trip-001', intake_channel: 'phone', intake_date: '2026-04-02',
    requestor_id: 'req-001', facility_id: 'fac-001', client_id: 'cli-001',
    pickup_address: '10 Oak St, Springfield, ST 00001', dropoff_address: '1200 Medical Blvd, Springfield, ST 00001',
    mobility_level: 'ambulatory', escort_needed: false, trip_date: '2026-04-05',
    appointment_time: '09:00', requested_pickup_time: '08:30', will_call: false,
    trip_type: 'one_way', urgency_level: 'standard', appointment_type: 'Follow-up Visit',
    pay_source_id: 'ps-001', expected_revenue: 45, review_state: 'pending',
    intake_notes: 'Patient needs help checking in at desk.', missing_info_flag: false,
    created_at: '2026-04-02T08:00:00Z', updated_at: '2026-04-02T08:00:00Z',
  },
  {
    id: 'trip-002', intake_channel: 'fax', intake_date: '2026-04-02',
    requestor_id: 'req-003', facility_id: 'fac-002', client_id: 'cli-002',
    pickup_address: '25 Elm Ave, Springfield, ST 00002', dropoff_address: '450 River Rd, Springfield, ST 00002',
    mobility_level: 'wheelchair', escort_needed: false, trip_date: '2026-04-03',
    appointment_time: '07:00', requested_pickup_time: '06:15', will_call: false,
    trip_type: 'round_trip', urgency_level: 'standard', appointment_type: 'Dialysis',
    pay_source_id: 'ps-002', expected_revenue: 90, review_state: 'pending',
    intake_notes: 'Recurring dialysis Mon/Wed/Fri.', missing_info_flag: false,
    created_at: '2026-04-02T08:30:00Z', updated_at: '2026-04-02T08:30:00Z',
  },
  {
    id: 'trip-003', intake_channel: 'phone', intake_date: '2026-04-02',
    requestor_id: 'req-005', facility_id: 'fac-005', client_id: 'cli-005',
    pickup_address: '55 Cedar Blvd, Springfield, ST 00005', dropoff_address: '700 Hope St, Springfield, ST 00005',
    mobility_level: 'wheelchair', escort_needed: true, trip_date: '2026-04-04',
    appointment_time: '10:30', requested_pickup_time: '09:45', will_call: false,
    trip_type: 'one_way', urgency_level: 'urgent', appointment_type: 'Chemotherapy',
    pay_source_id: 'ps-004', expected_revenue: 65, review_state: 'pending',
    intake_notes: 'Escort required. Patient weak after last treatment.', missing_info_flag: false,
    internal_warning: 'Requires 15-min early pickup window.',
    created_at: '2026-04-02T09:00:00Z', updated_at: '2026-04-02T09:00:00Z',
  },
  {
    id: 'trip-004', intake_channel: 'email', intake_date: '2026-04-01',
    requestor_id: 'req-002', facility_id: 'fac-001', client_id: 'cli-003',
    pickup_address: '88 Maple Dr, Springfield, ST 00003', dropoff_address: '1200 Medical Blvd, Springfield, ST 00001',
    mobility_level: 'ambulatory', escort_needed: false, trip_date: '2026-04-05',
    appointment_time: '14:00', requested_pickup_time: '13:30', will_call: false,
    trip_type: 'one_way', urgency_level: 'standard', appointment_type: 'Cardiology Consult',
    pay_source_id: 'ps-001', expected_revenue: 50, review_state: 'accepted',
    outcome_category: 'accepted', review_notes: 'Confirmed with driver team.',
    reviewed_at: '2026-04-01T11:00:00Z', missing_info_flag: false,
    created_at: '2026-04-01T09:00:00Z', updated_at: '2026-04-01T11:00:00Z',
  },
  {
    id: 'trip-005', intake_channel: 'phone', intake_date: '2026-04-01',
    requestor_id: 'req-001', facility_id: 'fac-001', client_id: 'cli-004',
    pickup_address: '200 Pine Rd, Springfield, ST 00004', dropoff_address: '1200 Medical Blvd, Springfield, ST 00001',
    mobility_level: 'stretcher', escort_needed: false, trip_date: '2026-04-02',
    appointment_time: '08:00', requested_pickup_time: '07:00', will_call: false,
    trip_type: 'one_way', urgency_level: 'emergency', appointment_type: 'Emergency Consult',
    pay_source_id: 'ps-001', expected_revenue: 120, review_state: 'declined',
    outcome_category: 'declined', decline_reason: 'no_availability' as DeclineReason,
    review_notes: 'No stretcher-capable vehicles available same-day. Advised to reschedule.',
    reviewed_at: '2026-04-01T10:00:00Z', missing_info_flag: false,
    created_at: '2026-04-01T09:30:00Z', updated_at: '2026-04-01T10:00:00Z',
  },
  {
    id: 'trip-006', intake_channel: 'phone', intake_date: '2026-03-28',
    requestor_id: 'req-003', facility_id: 'fac-002', client_id: 'cli-006',
    pickup_address: '77 Birch Ln, Springfield, ST 00006', dropoff_address: '450 River Rd, Springfield, ST 00002',
    mobility_level: 'ambulatory', escort_needed: false, trip_date: '2026-03-31',
    appointment_time: '07:00', requested_pickup_time: '06:30', will_call: false,
    trip_type: 'round_trip', urgency_level: 'standard', appointment_type: 'Dialysis',
    pay_source_id: 'ps-002', expected_revenue: 90, review_state: 'completed',
    outcome_category: 'completed' as OutcomeCategory, final_revenue: 90,
    reviewed_at: '2026-03-28T10:00:00Z', missing_info_flag: false,
    created_at: '2026-03-28T08:00:00Z', updated_at: '2026-03-31T12:00:00Z',
  },
  {
    id: 'trip-007', intake_channel: 'portal', intake_date: '2026-04-02',
    requestor_id: 'req-004', facility_id: 'fac-003', client_id: 'cli-007',
    pickup_address: '33 Willow St, Springfield, ST 00007', dropoff_address: '300 Sunrise Way, Springfield, ST 00003',
    mobility_level: 'ambulatory', escort_needed: false, trip_date: '2026-04-06',
    appointment_time: '11:00', requested_pickup_time: '10:15', will_call: false,
    trip_type: 'one_way', urgency_level: 'standard', appointment_type: 'Wound Care',
    pay_source_id: 'ps-001', expected_revenue: 40, review_state: 'returned',
    review_notes: 'Missing authorization number from facility. Please resend.',
    reviewed_at: '2026-04-02T10:30:00Z', missing_info_flag: true,
    created_at: '2026-04-02T09:45:00Z', updated_at: '2026-04-02T10:30:00Z',
  },
  {
    id: 'trip-008', intake_channel: 'phone', intake_date: '2026-04-02',
    requestor_id: 'req-003', facility_id: 'fac-002', client_id: 'cli-008',
    pickup_address: '90 Spruce Ave, Springfield, ST 00008', dropoff_address: '450 River Rd, Springfield, ST 00002',
    mobility_level: 'wheelchair', escort_needed: false, trip_date: '2026-04-03',
    appointment_time: '07:00', requested_pickup_time: '06:15', will_call: false,
    trip_type: 'round_trip', urgency_level: 'standard', appointment_type: 'Dialysis',
    pay_source_id: 'ps-002', expected_revenue: 90, review_state: 'pending',
    missing_info_flag: false, callback_phone: '(555) 888-8888',
    created_at: '2026-04-02T10:00:00Z', updated_at: '2026-04-02T10:00:00Z',
  },
]

// ---- Mutable in-memory store ----

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function uuid(): string {
  return 'mock-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now()
}

function now(): string {
  return new Date().toISOString()
}

class Store<T extends { id: string; updated_at?: string }> {
  private items: T[]

  constructor(seed: T[]) {
    this.items = deepClone(seed)
  }

  list(filter?: Partial<T>): T[] {
    if (!filter) return deepClone(this.items)
    return deepClone(
      this.items.filter((item) =>
        Object.entries(filter).every(([k, v]) => v === undefined || (item as Record<string, unknown>)[k] === v)
      )
    )
  }

  get(id: string): T | undefined {
    const item = this.items.find((i) => i.id === id)
    return item ? deepClone(item) : undefined
  }

  create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): T {
    const item = {
      id: uuid(),
      created_at: now(),
      updated_at: now(),
      ...data,
    } as unknown as T
    this.items.push(item)
    return deepClone(item)
  }

  update(id: string, data: Partial<T>): T {
    const idx = this.items.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error(`Not found: ${id}`)
    this.items[idx] = { ...this.items[idx], ...data, updated_at: now() }
    return deepClone(this.items[idx])
  }
}

export const paySourcesStore  = new Store(paySources)
export const facilitiesStore   = new Store(facilities)
export const requestorsStore   = new Store(requestors)
export const clientsStore      = new Store(clients)
export const tripsStore        = new Store(trips)

// Audit log (append-only)
interface AuditEntry {
  id: string
  entity_type: string
  entity_id: string
  action: string
  user_id: string
  ip_address?: string
  changed_fields?: string[]
  created_at: string
}

const auditEntries: AuditEntry[] = [
  { id: 'audit-001', entity_type: 'trip', entity_id: 'trip-004', action: 'review_accept',  user_id: 'local-dev-user', changed_fields: ['review_state', 'reviewed_at'], created_at: '2026-04-01T11:00:00Z' },
  { id: 'audit-002', entity_type: 'trip', entity_id: 'trip-005', action: 'review_decline', user_id: 'local-dev-user', changed_fields: ['review_state', 'decline_reason', 'reviewed_at'], created_at: '2026-04-01T10:00:00Z' },
  { id: 'audit-003', entity_type: 'trip', entity_id: 'trip-006', action: 'complete',       user_id: 'local-dev-user', changed_fields: ['review_state', 'final_revenue'], created_at: '2026-03-31T12:00:00Z' },
  { id: 'audit-004', entity_type: 'trip', entity_id: 'trip-007', action: 'review_return',  user_id: 'local-dev-user', changed_fields: ['review_state', 'review_notes'], created_at: '2026-04-02T10:30:00Z' },
]

export function getAuditLog(params: Record<string, string>): AuditEntry[] {
  const limit  = Number(params.limit ?? 50)
  const offset = Number(params.offset ?? 0)
  let result = [...auditEntries].reverse()
  if (params.entity_type) result = result.filter((e) => e.entity_type === params.entity_type)
  return result.slice(offset, offset + limit)
}

export function addAuditEntry(entry: Omit<AuditEntry, 'id' | 'created_at'>): void {
  auditEntries.push({ id: uuid(), created_at: now(), ...entry })
}

// ---- Metrics helpers ----

export function getMetricsSummary(params: Record<string, string> = {}) {
  const all = tripsStore.list()
  const filtered = params.facility_id
    ? all.filter((t) => t.facility_id === params.facility_id)
    : all

  const count = (state: ReviewState) => filtered.filter((t) => t.review_state === state).length

  return {
    total: filtered.length,
    pending:          count('pending'),
    accepted:         count('accepted'),
    declined:         count('declined'),
    completed:        count('completed'),
    canceled:         count('canceled'),
    arrived_canceled: count('arrived_canceled'),
    returned:         count('returned'),
  }
}

export function getMetricsByFacility() {
  const all = tripsStore.list()
  return facilitiesStore.list().map((f) => {
    const fTrips = all.filter((t) => t.facility_id === f.id)
    return {
      facility_id:   f.id,
      facility_name: f.name,
      total:         fTrips.length,
      accepted:      fTrips.filter((t) => t.review_state === 'accepted').length,
      declined:      fTrips.filter((t) => t.review_state === 'declined').length,
      completed:     fTrips.filter((t) => t.review_state === 'completed').length,
      canceled:      fTrips.filter((t) => t.review_state === 'canceled').length,
    }
  }).filter((r) => r.total > 0)
}

export function getMetricsByPaySource() {
  const all = tripsStore.list()
  return paySourcesStore.list().map((p) => {
    const pTrips = all.filter((t) => t.pay_source_id === p.id)
    return {
      pay_source_id:   p.id,
      pay_source_name: p.name,
      total:           pTrips.length,
      accepted:        pTrips.filter((t) => t.review_state === 'accepted').length,
      declined:        pTrips.filter((t) => t.review_state === 'declined').length,
      completed_revenue: pTrips
        .filter((t) => t.review_state === 'completed')
        .reduce((sum, t) => sum + (t.final_revenue ?? 0), 0),
    }
  }).filter((r) => r.total > 0)
}

export function getMetricsQuality() {
  const all = tripsStore.list()
  const total = all.length

  const declineMap: Record<string, number> = {}
  all.filter((t) => t.decline_reason).forEach((t) => {
    const r = t.decline_reason as string
    declineMap[r] = (declineMap[r] ?? 0) + 1
  })
  const decline_reasons = Object.entries(declineMap)
    .map(([reason, count]) => ({ reason: reason.replace(/_/g, ' '), count }))
    .sort((a, b) => b.count - a.count)

  const cancelMap: Record<string, number> = {}
  all.filter((t) => t.cancellation_reason).forEach((t) => {
    const r = t.cancellation_reason as string
    cancelMap[r] = (cancelMap[r] ?? 0) + 1
  })
  const cancellation_reasons = Object.entries(cancelMap)
    .map(([reason, count]) => ({ reason: reason.replace(/_/g, ' '), count }))
    .sort((a, b) => b.count - a.count)

  const missing_info_count = all.filter((t) => t.missing_info_flag).length
  const returned_count = all.filter((t) => t.review_state === 'returned').length

  return {
    decline_reasons,
    cancellation_reasons,
    missing_info_rate: total > 0 ? Math.round((missing_info_count / total) * 100) : 0,
    missing_info_count,
    return_rate: total > 0 ? Math.round((returned_count / total) * 100) : 0,
    returned_count,
  }
}

export function getMetricsRevenue() {
  const all = tripsStore.list()
  return {
    expected_total:       all.reduce((s, t) => s + (t.expected_revenue ?? 0), 0),
    accepted_revenue:     all.filter((t) => t.review_state === 'accepted').reduce((s, t) => s + (t.expected_revenue ?? 0), 0),
    completed_revenue:    all.filter((t) => t.review_state === 'completed').reduce((s, t) => s + (t.final_revenue ?? 0), 0),
    declined_opportunity: all.filter((t) => t.review_state === 'declined').reduce((s, t) => s + (t.expected_revenue ?? 0), 0),
    canceled_revenue:     all.filter((t) => ['canceled', 'arrived_canceled'].includes(t.review_state)).reduce((s, t) => s + (t.expected_revenue ?? 0), 0),
  }
}

// ---- Notification Log ----

const notificationLogs: NotificationLog[] = [
  {
    id: 'notif-001', trip_id: 'trip-004', requestor_id: 'req-002',
    notification_type: 'accepted', method: 'email', status: 'sent',
    message_preview: 'Your trip request for Robert Johnson on Apr 5 has been ACCEPTED.',
    sent_by: 'local-dev-user', created_at: '2026-04-01T11:05:00Z',
  },
  {
    id: 'notif-002', trip_id: 'trip-005', requestor_id: 'req-001',
    notification_type: 'declined', method: 'email', status: 'sent',
    message_preview: 'Your trip request for Mary Williams on Apr 2 has been DECLINED: No availability.',
    sent_by: 'local-dev-user', created_at: '2026-04-01T10:05:00Z',
  },
  {
    id: 'notif-003', trip_id: 'trip-006', requestor_id: 'req-003',
    notification_type: 'completed', method: 'sms', status: 'sent',
    message_preview: 'Trip for Patricia Lee on Mar 31 has been marked COMPLETED.',
    sent_by: 'local-dev-user', created_at: '2026-03-31T12:05:00Z',
  },
  {
    id: 'notif-004', trip_id: 'trip-007', requestor_id: 'req-004',
    notification_type: 'returned', method: 'email', status: 'sent',
    message_preview: 'Trip request for David Nguyen on Apr 6 has been RETURNED. Missing: authorization number.',
    sent_by: 'local-dev-user', created_at: '2026-04-02T10:35:00Z',
  },
  {
    id: 'notif-005', trip_id: 'trip-003', requestor_id: 'req-005',
    notification_type: 'general', method: 'email', status: 'sent',
    message_preview: 'Reminder: Trip for Carlos Rivera on Apr 4 (Chemotherapy) is scheduled for 10:30 AM.',
    sent_by: 'local-dev-user', created_at: '2026-04-02T09:15:00Z',
  },
]

export function getNotificationLog(params: Record<string, string> = {}): NotificationLog[] {
  const limit  = Number(params.limit ?? 50)
  const offset = Number(params.offset ?? 0)
  let result = [...notificationLogs].reverse()
  if (params.trip_id) result = result.filter((n) => n.trip_id === params.trip_id)
  if (params.requestor_id) result = result.filter((n) => n.requestor_id === params.requestor_id)
  return result.slice(offset, offset + limit)
}

export function addNotificationEntry(entry: Omit<NotificationLog, 'id' | 'created_at'>): NotificationLog {
  const n: NotificationLog = { id: uuid(), created_at: now(), ...entry }
  notificationLogs.push(n)
  return n
}

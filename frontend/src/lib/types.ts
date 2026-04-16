// ============================================================
// GO TIME TRANSPORTATION — Core TypeScript Types
// ============================================================

export type Role = 'intake_staff' | 'senior_dispatcher' | 'admin'
export type ReviewState = 'pending' | 'accepted' | 'declined' | 'returned' | 'canceled' | 'completed' | 'arrived_canceled'
export type TripType = 'one_way' | 'round_trip' | 'multi_trip'
export type UrgencyLevel = 'standard' | 'urgent' | 'emergency'
export type NotificationMethod = 'sms' | 'email' | 'both'
export type MobilityLevel = 'ambulatory' | 'wheelchair' | 'stretcher' | 'other'
export type IntakeChannel = 'phone' | 'email' | 'fax' | 'portal' | 'internal'
export type FacilityType = 'hospital' | 'clinic' | 'SNF' | 'home_health' | 'other'
export type FacilityStatus = 'active' | 'inactive'

export type DeclineReason =
  | 'outside_service_area' | 'no_availability' | 'insufficient_notice'
  | 'missing_authorization' | 'unsupported_mobility' | 'pay_source_issue'
  | 'duplicate_request' | 'request_incomplete' | 'requestor_unreachable'
  | 'not_operationally_feasible' | 'other'

export type CancellationReason =
  | 'facility_canceled' | 'requestor_canceled' | 'client_canceled'
  | 'no_show' | 'appointment_changed' | 'authorization_issue'
  | 'duplicate_booking' | 'operational_issue' | 'arrived_cancel'
  | 'inclement_weather' | 'other'

export type OutcomeCategory = 'accepted' | 'declined' | 'completed' | 'canceled' | 'arrived_canceled'

// ---- Entities ----

export interface PaySource {
  id: string
  name: string
  status: 'active' | 'inactive'
  notes?: string
  created_at: string
  updated_at: string
}

export interface Facility {
  id: string
  name: string
  facility_type?: FacilityType
  address?: string
  phone?: string
  email?: string
  status: FacilityStatus
  default_pay_source_id?: string
  internal_notes?: string
  account_notes?: string
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface Requestor {
  id: string
  name: string
  title_department?: string
  phone?: string
  email?: string
  preferred_notification_method: NotificationMethod
  facility_id?: string
  status: 'active' | 'inactive'
  notes?: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  full_name: string
  first_name?: string
  last_name?: string
  date_of_birth?: string
  phone?: string
  primary_address?: string
  mobility_level?: MobilityLevel
  special_assistance_notes?: string
  default_pay_source_id?: string
  primary_facility_id?: string
  recurring_notes?: string
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface TripRequest {
  id: string
  intake_channel: IntakeChannel
  intake_date: string
  intake_staff_user_id?: string
  requestor_id: string
  facility_id?: string
  callback_phone?: string
  reply_email?: string
  client_id: string
  pickup_address?: string
  dropoff_address?: string
  dropoff_location_name?: string
  dropoff_notes?: string
  mobility_level?: MobilityLevel
  escort_needed: boolean
  special_notes?: string
  trip_date: string
  appointment_time?: string
  requested_pickup_time?: string
  will_call: boolean
  trip_type: TripType
  return_time?: string
  return_details?: string
  trip_legs?: unknown[]
  urgency_level: UrgencyLevel
  appointment_type?: string
  pay_source_id?: string
  expected_revenue?: number
  trip_order_id?: string
  billing_notes?: string
  intake_notes?: string
  missing_info_flag: boolean
  internal_warning?: string
  review_state: ReviewState
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  decline_reason?: DeclineReason
  clarification_reason?: string
  cancellation_reason?: CancellationReason
  outcome_category?: OutcomeCategory
  final_revenue?: number
  created_at: string
  updated_at: string
}

export interface AuthUser {
  user_id: string
  email: string
  role: Role
}

export interface MetricsSummary {
  total: number
  pending: number
  accepted: number
  declined: number
  completed: number
  canceled: number
  arrived_canceled: number
  returned: number
}

export interface RevenueMetrics {
  expected_total: number
  accepted_revenue: number
  completed_revenue: number
  declined_opportunity: number
  canceled_revenue: number
}

export interface NotificationLog {
  id: string
  trip_id: string
  requestor_id: string
  notification_type: 'accepted' | 'declined' | 'returned' | 'canceled' | 'completed' | 'general'
  method: 'sms' | 'email' | 'both'
  status: 'sent' | 'failed' | 'pending'
  message_preview?: string
  sent_by: string
  created_at: string
}

export interface QualityMetrics {
  decline_reasons: { reason: string; count: number }[]
  cancellation_reasons: { reason: string; count: number }[]
  missing_info_rate: number
  missing_info_count: number
  return_rate: number
  returned_count: number
  avg_turnaround_hours: number
}

// ---- Form types ----

export interface TripCreateForm {
  intake_channel: IntakeChannel
  requestor_id: string
  facility_id: string
  callback_phone?: string
  reply_email?: string
  client_id: string
  pickup_address?: string
  dropoff_address?: string
  mobility_level?: MobilityLevel
  escort_needed: boolean
  special_notes?: string
  trip_date: string
  appointment_time?: string
  requested_pickup_time?: string
  will_call: boolean
  trip_type: TripType
  return_details?: string
  urgency_level: UrgencyLevel
  appointment_type?: string
  pay_source_id?: string
  expected_revenue?: number
  trip_order_id?: string
  billing_notes?: string
  priority_category?: string
  intake_notes?: string
  missing_info_flag: boolean
  internal_warning?: string
}

-- ============================================================
-- 005 — Trip Requests   (core entity, contains PHI)
-- ============================================================

create table if not exists trip_requests (
  id                      uuid primary key default gen_random_uuid(),

  -- Intake metadata
  intake_channel          text not null check (intake_channel in ('phone','email','fax','portal','internal')),
  intake_date             date not null default current_date,
  intake_staff_user_id    uuid,

  -- Relationships
  requestor_id            uuid not null references requestors(id) on delete restrict,
  facility_id             uuid not null references facilities(id) on delete restrict,
  client_id               uuid not null references clients(id) on delete restrict,
  pay_source_id           uuid references pay_sources(id) on delete set null,

  -- Contact overrides
  callback_phone          text,   -- PHI
  reply_email             text,

  -- Trip logistics  (PHI: pickup/dropoff addresses)
  pickup_address          text,   -- PHI
  dropoff_address         text,   -- PHI
  mobility_level          text check (mobility_level in ('ambulatory','wheelchair','stretcher','other')),
  escort_needed           boolean not null default false,
  special_notes           text,

  -- Schedule
  trip_date               date not null,
  appointment_time        time,
  requested_pickup_time   time,
  will_call               boolean not null default false,
  trip_type               text not null check (trip_type in ('one_way','round_trip','multi_trip')),
  return_details          text,

  -- Clinical / service context
  urgency_level           text not null default 'standard' check (urgency_level in ('standard','urgent','emergency')),
  appointment_type        text,   -- PHI (indirectly)

  -- Billing
  expected_revenue        numeric(10,2),
  trip_order_id           text,
  billing_notes           text,
  priority_category       text,

  -- Internal
  intake_notes            text,
  missing_info_flag       boolean not null default false,
  internal_warning        text,

  -- Workflow state
  review_state            text not null default 'pending'
                            check (review_state in ('pending','accepted','declined','returned','canceled','completed','arrived_canceled')),
  reviewed_by             uuid,
  reviewed_at             timestamptz,
  review_notes            text,
  decline_reason          text check (decline_reason in (
                            'outside_service_area','no_availability','insufficient_notice',
                            'missing_authorization','unsupported_mobility','pay_source_issue',
                            'duplicate_request','request_incomplete','requestor_unreachable',
                            'not_operationally_feasible','other'
                          )),
  clarification_reason    text,
  cancellation_reason     text check (cancellation_reason in (
                            'facility_canceled','requestor_canceled','client_canceled',
                            'no_show','appointment_changed','authorization_issue',
                            'duplicate_booking','operational_issue','arrived_cancel',
                            'inclement_weather','other'
                          )),
  outcome_category        text check (outcome_category in ('accepted','declined','completed','canceled','arrived_canceled')),
  final_revenue           numeric(10,2),

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Useful indexes
create index trip_requests_review_state_idx   on trip_requests(review_state);
create index trip_requests_trip_date_idx       on trip_requests(trip_date);
create index trip_requests_facility_idx        on trip_requests(facility_id);
create index trip_requests_client_idx          on trip_requests(client_id);
create index trip_requests_pay_source_idx      on trip_requests(pay_source_id);

alter table trip_requests enable row level security;

create policy "trip_requests_read" on trip_requests
  for select using (auth.role() = 'authenticated');

create policy "trip_requests_write" on trip_requests
  for all using (auth.role() = 'service_role');

create trigger trip_requests_updated_at
  before update on trip_requests
  for each row execute function set_updated_at();

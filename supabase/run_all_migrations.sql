-- ============================================================
-- GoTime — Combined Migrations Script
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qmublulpbgcaujtbepru/sql/new
--
-- Order: 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009
-- ============================================================

-- ============================================================
-- 001 — Pay Sources
-- ============================================================

create table if not exists pay_sources (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  status            text not null default 'active' check (status in ('active', 'inactive')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- RLS
alter table pay_sources enable row level security;

-- All authenticated users can read pay sources
create policy "pay_sources_read" on pay_sources
  for select using (auth.role() = 'authenticated');

-- Only service role can insert/update (backend only)
create policy "pay_sources_write" on pay_sources
  for all using (auth.role() = 'service_role');

-- Updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pay_sources_updated_at
  before update on pay_sources
  for each row execute function set_updated_at();

-- ============================================================
-- 002 — Facilities
-- ============================================================

create table if not exists facilities (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  facility_type           text check (facility_type in ('hospital','clinic','SNF','home_health','other')),
  address                 text,
  phone                   text,
  email                   text,
  status                  text not null default 'active' check (status in ('active','inactive')),
  default_pay_source_id   uuid references pay_sources(id) on delete set null,
  internal_notes          text,
  account_notes           text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid,
  updated_by              uuid
);

alter table facilities enable row level security;

create policy "facilities_read" on facilities
  for select using (auth.role() = 'authenticated');

create policy "facilities_write" on facilities
  for all using (auth.role() = 'service_role');

create trigger facilities_updated_at
  before update on facilities
  for each row execute function set_updated_at();

-- ============================================================
-- 003 — Requestors
-- ============================================================

create table if not exists requestors (
  id                              uuid primary key default gen_random_uuid(),
  name                            text not null,
  title_department                text,
  phone                           text,
  email                           text,
  preferred_notification_method   text not null default 'email'
                                    check (preferred_notification_method in ('sms','email','both')),
  facility_id                     uuid not null references facilities(id) on delete restrict,
  status                          text not null default 'active' check (status in ('active','inactive')),
  notes                           text,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

create index requestors_facility_idx on requestors(facility_id);

alter table requestors enable row level security;

create policy "requestors_read" on requestors
  for select using (auth.role() = 'authenticated');

create policy "requestors_write" on requestors
  for all using (auth.role() = 'service_role');

create trigger requestors_updated_at
  before update on requestors
  for each row execute function set_updated_at();

-- ============================================================
-- 004 — Clients   (contains PHI — RLS enforced)
-- ============================================================

create table if not exists clients (
  id                          uuid primary key default gen_random_uuid(),
  -- PHI fields
  full_name                   text not null,                 -- PHI
  date_of_birth               date,                          -- PHI
  phone                       text,                          -- PHI
  primary_address             text,                          -- PHI
  special_assistance_notes    text,                          -- PHI

  mobility_level              text check (mobility_level in ('ambulatory','wheelchair','stretcher','other')),
  default_pay_source_id       uuid references pay_sources(id) on delete set null,
  primary_facility_id         uuid references facilities(id) on delete set null,
  recurring_notes             text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  created_by                  uuid,
  updated_by                  uuid
);

alter table clients enable row level security;

-- Authenticated users can read clients
create policy "clients_read" on clients
  for select using (auth.role() = 'authenticated');

-- Only service role can write
create policy "clients_write" on clients
  for all using (auth.role() = 'service_role');

create trigger clients_updated_at
  before update on clients
  for each row execute function set_updated_at();

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

-- ============================================================
-- 006 — Notification Log
-- ============================================================

create table if not exists notification_log (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references trip_requests(id) on delete cascade,
  message_type    text not null,   -- e.g. trip_decision, trip_canceled, manual_alert
  channel         text not null check (channel in ('sms','email','both')),
  recipient_ids   uuid[],
  status          text not null default 'sent' check (status in ('sent','failed','pending')),
  error_detail    text,
  triggered_by    uuid,            -- user_id who triggered
  created_at      timestamptz not null default now()
);

create index notification_log_trip_idx on notification_log(trip_id);

alter table notification_log enable row level security;

create policy "notification_log_read" on notification_log
  for select using (auth.role() = 'authenticated');

create policy "notification_log_write" on notification_log
  for all using (auth.role() = 'service_role');

-- ============================================================
-- 007 — Audit Log   (append-only, HIPAA requirement)
-- ============================================================

create table if not exists audit_log (
  id              uuid primary key default gen_random_uuid(),
  entity_type     text not null,   -- e.g. trip, client, facility
  entity_id       uuid not null,
  action          text not null,   -- e.g. create, update, read_phi, review_accept
  user_id         uuid not null,
  ip_address      text,
  old_value       jsonb,
  new_value       jsonb,
  changed_fields  text[],
  created_at      timestamptz not null default now()
);

-- Prevent any row from being updated or deleted
create or replace rule audit_log_no_update as
  on update to audit_log do instead nothing;

create or replace rule audit_log_no_delete as
  on delete to audit_log do instead nothing;

create index audit_log_entity_idx    on audit_log(entity_type, entity_id);
create index audit_log_user_idx      on audit_log(user_id);
create index audit_log_created_idx   on audit_log(created_at desc);

alter table audit_log enable row level security;

-- Only admins (service role) can read audit log via API
create policy "audit_log_read" on audit_log
  for select using (auth.role() = 'service_role');

create policy "audit_log_insert" on audit_log
  for insert with check (auth.role() = 'service_role');

-- ============================================================
-- 008 — Metrics Views
-- ============================================================

-- Summary counts by review_state
create or replace view v_metrics_summary as
select
  count(*)                                              as total,
  count(*) filter (where review_state = 'pending')      as pending,
  count(*) filter (where review_state = 'accepted')     as accepted,
  count(*) filter (where review_state = 'declined')     as declined,
  count(*) filter (where review_state = 'completed')    as completed,
  count(*) filter (where review_state = 'canceled')     as canceled,
  count(*) filter (where review_state = 'arrived_canceled') as arrived_canceled,
  count(*) filter (where review_state = 'returned')     as returned
from trip_requests;

-- Counts grouped by facility
create or replace view v_metrics_by_facility as
select
  f.id                                                           as facility_id,
  f.name                                                         as facility_name,
  count(t.id)                                                    as total,
  count(t.id) filter (where t.review_state = 'accepted')        as accepted,
  count(t.id) filter (where t.review_state = 'declined')        as declined,
  count(t.id) filter (where t.review_state = 'completed')       as completed,
  count(t.id) filter (where t.review_state = 'canceled')        as canceled
from facilities f
left join trip_requests t on t.facility_id = f.id
group by f.id, f.name
order by total desc;

-- Revenue rollup
create or replace view v_metrics_revenue as
select
  coalesce(sum(expected_revenue), 0)                              as expected_total,
  coalesce(sum(expected_revenue) filter (where review_state = 'accepted'), 0)  as accepted_revenue,
  coalesce(sum(final_revenue) filter (where review_state = 'completed'), 0)    as completed_revenue,
  coalesce(sum(expected_revenue) filter (where review_state = 'declined'), 0)  as declined_opportunity,
  coalesce(sum(expected_revenue) filter (where review_state in ('canceled','arrived_canceled')), 0) as canceled_revenue
from trip_requests;

-- Pay source breakdown
create or replace view v_metrics_by_pay_source as
select
  ps.id                                                           as pay_source_id,
  ps.name                                                         as pay_source_name,
  count(t.id)                                                     as total,
  count(t.id) filter (where t.review_state = 'accepted')         as accepted,
  count(t.id) filter (where t.review_state = 'declined')         as declined,
  coalesce(sum(t.final_revenue) filter (where t.review_state = 'completed'), 0) as completed_revenue
from pay_sources ps
left join trip_requests t on t.pay_source_id = ps.id
group by ps.id, ps.name
order by total desc;

-- ============================================================
-- 009 — User Role Setup
-- ============================================================

-- Helper: get role from the current JWT claims (used by RLS or API layer)
create or replace function get_my_role()
returns text
language sql stable
as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'intake_staff'
  );
$$;

-- View for admin: list all users with their roles
-- (Only accessible via service role)
create or replace view v_users_with_roles as
select
  id                                          as user_id,
  email,
  raw_user_meta_data ->> 'role'               as role,
  created_at,
  last_sign_in_at
from auth.users;

-- Grant read access to service role only
revoke all on v_users_with_roles from public, anon, authenticated;

comment on view v_users_with_roles is
  'Admin-only view of Supabase auth users with their assigned role. Access via service role only.';

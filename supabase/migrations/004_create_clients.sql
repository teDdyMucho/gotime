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

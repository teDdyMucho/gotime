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

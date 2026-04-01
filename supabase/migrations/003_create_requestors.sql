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

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

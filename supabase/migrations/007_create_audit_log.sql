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

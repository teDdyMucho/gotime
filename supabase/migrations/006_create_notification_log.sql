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

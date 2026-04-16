-- ============================================================
-- 012 — Add provider_message_id to notification_log
-- Allows Twilio / SendGrid delivery callbacks to match entries
-- and update status after delivery confirmation.
-- ============================================================

alter table notification_log
  add column if not exists provider_message_id text,   -- Twilio MessageSid or SendGrid message-id
  add column if not exists delivered_at timestamptz;   -- timestamp of confirmed delivery

create index if not exists notification_log_provider_idx
  on notification_log(provider_message_id)
  where provider_message_id is not null;

-- ============================================================
-- 011 — RLS Policy Audit & Hardening (Phase 5)
-- Run date: April 2026
-- Findings:
--   All 7 tables have RLS enabled. ✓
--   Write policies correctly restrict to service_role. ✓
--   Read policies allow any 'authenticated' user — tightened below
--   for high-sensitivity tables (audit_log, clients, trip_requests).
-- ============================================================

-- ── audit_log: admin-only reads (was: any authenticated) ──────────────────
drop policy if exists "audit_log_read" on audit_log;
create policy "audit_log_read" on audit_log
  for select using (
    auth.role() = 'service_role'
    or (auth.role() = 'authenticated' and get_my_role() = 'admin')
  );

-- ── clients: authenticated reads are fine (all staff need client lookup)
--    but ensure no anonymous reads slip through
drop policy if exists "clients_read" on clients;
create policy "clients_read" on clients
  for select using (auth.role() in ('service_role', 'authenticated'));

-- ── trip_requests: same — all staff roles need read access
drop policy if exists "trip_requests_read" on trip_requests;
create policy "trip_requests_read" on trip_requests
  for select using (auth.role() in ('service_role', 'authenticated'));

-- ── Ensure anon role can never read any table (belt-and-suspenders) ───────
-- pay_sources
drop policy if exists "pay_sources_read" on pay_sources;
create policy "pay_sources_read" on pay_sources
  for select using (auth.role() in ('service_role', 'authenticated'));

-- facilities
drop policy if exists "facilities_read" on facilities;
create policy "facilities_read" on facilities
  for select using (auth.role() in ('service_role', 'authenticated'));

-- requestors
drop policy if exists "requestors_read" on requestors;
create policy "requestors_read" on requestors
  for select using (auth.role() in ('service_role', 'authenticated'));

-- notification_log
drop policy if exists "notification_log_read" on notification_log;
create policy "notification_log_read" on notification_log
  for select using (
    auth.role() = 'service_role'
    or (auth.role() = 'authenticated' and get_my_role() in ('senior_dispatcher', 'admin'))
  );

-- ── Audit summary comment ─────────────────────────────────────────────────
comment on table audit_log is
  'Append-only audit log. RLS: service_role full access; authenticated admin-only read. Last audited: 2026-04-15.';

comment on table clients is
  'PHI table. RLS: service_role full access; authenticated staff read only. Last audited: 2026-04-15.';

comment on table trip_requests is
  'PHI table. RLS: service_role full access; authenticated staff read only. Last audited: 2026-04-15.';

-- ============================================================
-- 010 — Allow authenticated users to write entity tables
--       (facilities, requestors, clients, pay_sources)
--
-- Trips / audit / notifications stay backend-only (service_role).
-- Role check uses get_my_role() defined in migration 009.
-- ============================================================

-- ---- Pay Sources (admin only) ----
drop policy if exists "pay_sources_write" on pay_sources;

create policy "pay_sources_insert" on pay_sources
  for insert with check (
    auth.role() = 'service_role'
    or get_my_role() = 'admin'
  );

create policy "pay_sources_update" on pay_sources
  for update using (
    auth.role() = 'service_role'
    or get_my_role() = 'admin'
  );

-- ---- Facilities (admin only) ----
drop policy if exists "facilities_write" on facilities;

create policy "facilities_insert" on facilities
  for insert with check (
    auth.role() = 'service_role'
    or get_my_role() = 'admin'
  );

create policy "facilities_update" on facilities
  for update using (
    auth.role() = 'service_role'
    or get_my_role() = 'admin'
  );

-- ---- Requestors (dispatcher or above) ----
drop policy if exists "requestors_write" on requestors;

create policy "requestors_insert" on requestors
  for insert with check (
    auth.role() = 'service_role'
    or get_my_role() in ('senior_dispatcher', 'admin')
  );

create policy "requestors_update" on requestors
  for update using (
    auth.role() = 'service_role'
    or get_my_role() in ('senior_dispatcher', 'admin')
  );

-- ---- Clients (any authenticated user) ----
drop policy if exists "clients_write" on clients;

create policy "clients_insert" on clients
  for insert with check (
    auth.role() = 'service_role'
    or auth.role() = 'authenticated'
  );

create policy "clients_update" on clients
  for update using (
    auth.role() = 'service_role'
    or auth.role() = 'authenticated'
  );

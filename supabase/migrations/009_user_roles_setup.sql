-- ============================================================
-- 009 — User Role Setup
-- Notes:
--   Roles are stored in auth.users.raw_user_meta_data->>'role'
--   Set via Supabase dashboard or admin API.
--   This migration creates a helper function for the backend
--   to validate role claims from the JWT.
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

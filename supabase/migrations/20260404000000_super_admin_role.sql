-- =============================================================================
-- Chamama Hackathon System - Super Admin Role
-- Migration: 20260404000000
--
-- Adds support for role = 'super-admin' and treats it as admin-equivalent
-- in the RLS helper function used across policies.
-- =============================================================================

-- Expand users.role check to include super-admin (and absent, used by roster).
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'admin', 'super-admin', 'absent'));

-- Admin-equivalent roles for RLS checks.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'super-admin')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;


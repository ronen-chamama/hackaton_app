-- =============================================================================
-- Chamama Hackathon System — Group Member Visibility
-- Migration: 20260402000001
--
-- Problem: the initial migration only lets a user SELECT their own row from
-- public.users.  The student runtime needs to display the names of every
-- member who shares the same group_id (the "group info" panel).
--
-- Solution: add a permissive SELECT policy that allows a user to read the
-- rows of other users who are in the same non-null group.  We intentionally
-- scope it to the users table only; no extra columns are exposed beyond what
-- the client query requests.
--
-- The helper function user_group_id() is SECURITY DEFINER (defined in
-- migration 20260402000000) so it reads the caller's group without
-- triggering this very policy recursively.
-- =============================================================================

-- Allow every authenticated user to SELECT rows for other users who belong
-- to the same group.  Combined with the existing "users_select_self" policy
-- (permissive policies are OR-ed), a user can now read all rows where the
-- group_id matches their own assigned group_id.
--
-- NULL group_id is excluded on both sides so unassigned users (e.g. freshly
-- invited accounts) cannot inadvertently match each other.
CREATE POLICY "users_select_same_group"
    ON public.users FOR SELECT
    USING (
        group_id IS NOT NULL
        AND group_id = public.user_group_id()
    );

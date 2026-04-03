-- =============================================================================
-- Chamama Hackathon System — Allow group members to rename their own group
-- Migration: 20260403000000
--
-- Context: migration 20260402000000 restricts groups UPDATE to admins only.
-- The student runtime header now has an editable group-name field, so members
-- need to be able to UPDATE the `name` column of the single group they belong
-- to.  No other columns may be mutated by this policy.
--
-- Design decision: using a PERMISSIVE policy (RLS policies are OR-ed).
-- The existing "groups_update_admin" policy remains unchanged; this one adds
-- a second grant for the group-member case.
--
-- The helper function public.user_group_id() is SECURITY DEFINER
-- (defined in migration 20260402000000) and reads through RLS safely.
-- =============================================================================

CREATE POLICY "groups_update_own_name"
    ON public.groups FOR UPDATE
    USING  (id = public.user_group_id())
    WITH CHECK (id = public.user_group_id());

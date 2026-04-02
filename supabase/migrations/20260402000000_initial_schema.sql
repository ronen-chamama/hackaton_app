-- =============================================================================
-- Chamama Hackathon System — Initial Schema
-- Migration: 20260402000000
--
-- Creates: users, groups, hackathons, group_values
-- Enables: RLS on all tables
-- Defines: helper functions (is_admin, user_group_id) used by RLS policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- users: the whitelist of people allowed into the system.
-- Populated by admins (CSV import or manual insert).
-- id mirrors auth.users.id so RLS can match via auth.uid().
CREATE TABLE IF NOT EXISTS public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL DEFAULT '',
    role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    group_id    UUID
);

-- groups: a named team assigned to a hackathon.
CREATE TABLE IF NOT EXISTS public.groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    hackathon_id    UUID NOT NULL
);

-- hackathons: the top-level hackathon record.
-- `definition` holds the full Stage/Container/Column/Element JSON tree.
-- `theme` holds the selected theme token overrides.
CREATE TABLE IF NOT EXISTS public.hackathons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL DEFAULT '',
    definition  JSONB NOT NULL DEFAULT '{}',
    is_active   BOOLEAN NOT NULL DEFAULT FALSE,
    theme       JSONB NOT NULL DEFAULT '{}'
);

-- group_values: stores per-group user input for every element.
-- One row per (hackathon_id, group_id, element_id) triple.
CREATE TABLE IF NOT EXISTS public.group_values (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id    UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
    group_id        UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    element_id      TEXT NOT NULL,
    value           JSONB,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,

    UNIQUE (hackathon_id, group_id, element_id)
);

-- Add the foreign key from users.group_id to groups now that groups exists.
ALTER TABLE public.users
    ADD CONSTRAINT users_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;

-- Add the foreign key from groups.hackathon_id to hackathons.
ALTER TABLE public.groups
    ADD CONSTRAINT groups_hackathon_id_fkey
    FOREIGN KEY (hackathon_id) REFERENCES public.hackathons(id) ON DELETE CASCADE;


-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_group_values_group_id
    ON public.group_values (group_id);

CREATE INDEX IF NOT EXISTS idx_group_values_hackathon_id
    ON public.group_values (hackathon_id);

CREATE INDEX IF NOT EXISTS idx_group_values_lookup
    ON public.group_values (hackathon_id, group_id, element_id);

CREATE INDEX IF NOT EXISTS idx_users_email
    ON public.users (email);

CREATE INDEX IF NOT EXISTS idx_hackathons_active
    ON public.hackathons (is_active)
    WHERE is_active = TRUE;


-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_values_updated_at
    BEFORE UPDATE ON public.group_values
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- RLS helper functions
-- These run as SECURITY DEFINER (owner privileges) so they bypass RLS when
-- reading the users table, preventing infinite recursion in policies.
-- ---------------------------------------------------------------------------

-- Returns TRUE if the currently authenticated user has role = 'admin'.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Returns the group_id of the currently authenticated user.
-- Returns NULL if the user has no group assigned.
CREATE OR REPLACE FUNCTION public.user_group_id()
RETURNS UUID AS $$
    SELECT group_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;


-- ---------------------------------------------------------------------------
-- Enable Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_values   ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- RLS Policies: users
--
-- Rules:
--   - A user may read their own record (needed for middleware whitelist check).
--   - Admins have full access.
-- ---------------------------------------------------------------------------

-- Users can read their own record.
CREATE POLICY "users_select_self"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Admins can read all user records.
CREATE POLICY "users_select_admin"
    ON public.users FOR SELECT
    USING (public.is_admin());

-- Only admins can insert new users (CSV import or manual).
CREATE POLICY "users_insert_admin"
    ON public.users FOR INSERT
    WITH CHECK (public.is_admin());

-- Only admins can update user records.
CREATE POLICY "users_update_admin"
    ON public.users FOR UPDATE
    USING (public.is_admin());

-- Only admins can delete user records.
CREATE POLICY "users_delete_admin"
    ON public.users FOR DELETE
    USING (public.is_admin());


-- ---------------------------------------------------------------------------
-- RLS Policies: groups
--
-- Rules:
--   - All authenticated users can read groups (needed to display group name).
--   - Only admins can mutate groups.
-- ---------------------------------------------------------------------------

CREATE POLICY "groups_select_authenticated"
    ON public.groups FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "groups_insert_admin"
    ON public.groups FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "groups_update_admin"
    ON public.groups FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "groups_delete_admin"
    ON public.groups FOR DELETE
    USING (public.is_admin());


-- ---------------------------------------------------------------------------
-- RLS Policies: hackathons
--
-- Rules:
--   - All authenticated users can read hackathons (needed to render the active one).
--   - Only admins can mutate hackathons.
-- ---------------------------------------------------------------------------

CREATE POLICY "hackathons_select_authenticated"
    ON public.hackathons FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "hackathons_insert_admin"
    ON public.hackathons FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "hackathons_update_admin"
    ON public.hackathons FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "hackathons_delete_admin"
    ON public.hackathons FOR DELETE
    USING (public.is_admin());


-- ---------------------------------------------------------------------------
-- RLS Policies: group_values
--
-- Rules:
--   - Users can read/write values ONLY for their own group_id.
--   - Admins have full access (read/write/delete any group's values).
-- ---------------------------------------------------------------------------

-- SELECT: own group or admin.
CREATE POLICY "group_values_select_own_group"
    ON public.group_values FOR SELECT
    USING (
        group_id = public.user_group_id()
        OR public.is_admin()
    );

-- INSERT: own group or admin.
CREATE POLICY "group_values_insert_own_group"
    ON public.group_values FOR INSERT
    WITH CHECK (
        group_id = public.user_group_id()
        OR public.is_admin()
    );

-- UPDATE: own group or admin.
CREATE POLICY "group_values_update_own_group"
    ON public.group_values FOR UPDATE
    USING (
        group_id = public.user_group_id()
        OR public.is_admin()
    )
    WITH CHECK (
        group_id = public.user_group_id()
        OR public.is_admin()
    );

-- DELETE: admins only. Regular users never delete group values.
CREATE POLICY "group_values_delete_admin"
    ON public.group_values FOR DELETE
    USING (public.is_admin());


-- ---------------------------------------------------------------------------
-- Supabase Realtime
-- Enable realtime broadcasts for group_values so the student app can
-- subscribe to live changes from teammates.
-- (Run AFTER the table exists.)
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE public.group_values;


-- ---------------------------------------------------------------------------
-- Constraints: only one active hackathon at a time.
-- Enforced via a partial unique index rather than a trigger for simplicity.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS hackathons_one_active
    ON public.hackathons (is_active)
    WHERE is_active = TRUE;

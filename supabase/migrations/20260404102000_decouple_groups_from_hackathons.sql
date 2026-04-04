-- =============================================================================
-- Chamama Hackathon System — Decouple Global Groups from Hackathons
-- Migration: 20260404102000
--
-- Goals:
-- 1) Groups become global entities (not tied to a specific hackathon row).
-- 2) Add hackathon_protocols as the runtime intersection point:
--    one workspace row per (hackathon_id, group_id).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Decouple groups from hackathons
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.groups
  DROP CONSTRAINT IF EXISTS groups_hackathon_id_fkey;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'groups'
      AND column_name = 'hackathon_id'
  ) THEN
    ALTER TABLE public.groups
      ALTER COLUMN hackathon_id DROP NOT NULL;
  END IF;
END
$$;


-- ---------------------------------------------------------------------------
-- Runtime workspace intersection table (hackathon + group)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hackathon_protocols (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id  UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  group_id      UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hackathon_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_protocols_hackathon_id
  ON public.hackathon_protocols (hackathon_id);

CREATE INDEX IF NOT EXISTS idx_hackathon_protocols_group_id
  ON public.hackathon_protocols (group_id);

CREATE INDEX IF NOT EXISTS idx_hackathon_protocols_lookup
  ON public.hackathon_protocols (hackathon_id, group_id);

DROP TRIGGER IF EXISTS hackathon_protocols_updated_at ON public.hackathon_protocols;
CREATE TRIGGER hackathon_protocols_updated_at
  BEFORE UPDATE ON public.hackathon_protocols
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.hackathon_protocols ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hackathon_protocols'
      AND policyname = 'hackathon_protocols_select_own_group'
  ) THEN
    CREATE POLICY "hackathon_protocols_select_own_group"
      ON public.hackathon_protocols FOR SELECT
      USING (
        group_id = public.user_group_id()
        OR public.is_admin()
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hackathon_protocols'
      AND policyname = 'hackathon_protocols_insert_own_group'
  ) THEN
    CREATE POLICY "hackathon_protocols_insert_own_group"
      ON public.hackathon_protocols FOR INSERT
      WITH CHECK (
        group_id = public.user_group_id()
        OR public.is_admin()
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hackathon_protocols'
      AND policyname = 'hackathon_protocols_update_own_group'
  ) THEN
    CREATE POLICY "hackathon_protocols_update_own_group"
      ON public.hackathon_protocols FOR UPDATE
      USING (
        group_id = public.user_group_id()
        OR public.is_admin()
      )
      WITH CHECK (
        group_id = public.user_group_id()
        OR public.is_admin()
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hackathon_protocols'
      AND policyname = 'hackathon_protocols_delete_admin'
  ) THEN
    CREATE POLICY "hackathon_protocols_delete_admin"
      ON public.hackathon_protocols FOR DELETE
      USING (public.is_admin());
  END IF;
END
$$;

-- =============================================================================
-- Chamama Hackathon System - Login Settings + Assets Storage
-- Migration: 20260404000001
--
-- Adds a single-row table for global login-page settings and configures
-- storage bucket/policies for uploaded login hero images.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.login_settings (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  message     TEXT NOT NULL DEFAULT '',
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.login_settings (id, message, image_url)
VALUES (1, '', NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.login_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_settings_select_public" ON public.login_settings;
CREATE POLICY "login_settings_select_public"
  ON public.login_settings
  FOR SELECT
  TO public
  USING (TRUE);

DROP POLICY IF EXISTS "login_settings_insert_admin" ON public.login_settings;
CREATE POLICY "login_settings_insert_admin"
  ON public.login_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "login_settings_update_admin" ON public.login_settings;
CREATE POLICY "login_settings_update_admin"
  ON public.login_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS login_settings_updated_at ON public.login_settings;
CREATE TRIGGER login_settings_updated_at
  BEFORE UPDATE ON public.login_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', TRUE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "assets_public_read" ON storage.objects;
CREATE POLICY "assets_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'assets');

DROP POLICY IF EXISTS "assets_admin_insert" ON storage.objects;
CREATE POLICY "assets_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assets'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "assets_admin_update" ON storage.objects;
CREATE POLICY "assets_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'assets'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'assets'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "assets_admin_delete" ON storage.objects;
CREATE POLICY "assets_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'assets'
    AND public.is_admin()
  );

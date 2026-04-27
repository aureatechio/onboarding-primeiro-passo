-- Dashboard user activity: app-specific login and last-seen tracking.
--
-- Supabase Auth `auth.users.last_sign_in_at` is project-wide. This table
-- records activity specifically for this dashboard app, so `/users` can show
-- "ultimo login no app" without mixing other apps that share the same Auth
-- project.

CREATE TABLE IF NOT EXISTS public.dashboard_user_activity (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_login_at timestamptz,
  last_seen_at timestamptz,
  login_count integer NOT NULL DEFAULT 0 CHECK (login_count >= 0),
  last_login_user_agent text,
  last_seen_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dashboard_user_activity_last_login_idx
  ON public.dashboard_user_activity (last_login_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS dashboard_user_activity_last_seen_idx
  ON public.dashboard_user_activity (last_seen_at DESC NULLS LAST);

COMMENT ON TABLE public.dashboard_user_activity IS
  'App-specific dashboard login and last-seen tracking. Separate from auth.users.last_sign_in_at, which is project-wide.';

COMMENT ON COLUMN public.dashboard_user_activity.last_login_at IS
  'Last successful login recorded by this dashboard app.';

COMMENT ON COLUMN public.dashboard_user_activity.last_seen_at IS
  'Last authenticated activity recorded by this dashboard app.';

COMMENT ON COLUMN public.dashboard_user_activity.login_count IS
  'Number of successful login events recorded by this dashboard app.';

DROP TRIGGER IF EXISTS trg_dashboard_user_activity_touch_updated_at
  ON public.dashboard_user_activity;

CREATE TRIGGER trg_dashboard_user_activity_touch_updated_at
  BEFORE UPDATE ON public.dashboard_user_activity
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.dashboard_user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashboard_user_activity_select_self_or_admin
  ON public.dashboard_user_activity;

CREATE POLICY dashboard_user_activity_select_self_or_admin
  ON public.dashboard_user_activity
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

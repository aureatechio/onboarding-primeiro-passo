-- User Management: RBAC (admin/operator/viewer) + profiles + auto-provisioning trigger.
--
-- Esta migration tambem normaliza schemas legados que ja tenham public.profiles
-- e public.user_roles com id proprio + user_id. O contrato final usado pelo
-- dashboard e: profiles.id = auth.users.id e user_roles.user_id unico.

-- =====================================================================
-- 1. ENUMs
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('active', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- 2. Tabela profiles
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  status public.user_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status public.user_status NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'active';

UPDATE public.profiles
SET user_id = COALESCE(user_id, id),
    full_name = COALESCE(NULLIF(full_name, ''), NULLIF(name, ''), ''),
    name = COALESCE(NULLIF(name, ''), NULLIF(full_name, ''), email, ''),
    status = COALESCE(status, 'active'::public.user_status);

UPDATE public.profiles p
SET id = p.user_id
WHERE p.user_id IS NOT NULL
  AND p.id IS DISTINCT FROM p.user_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles existing
    WHERE existing.id = p.user_id
      AND existing.ctid <> p.ctid
  );

ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN name SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN name SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_id_auth_users_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_auth_users_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- 3. Tabela user_roles
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS assigned_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.user_roles ALTER COLUMN assigned_at SET DEFAULT now();
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'viewer';

WITH ranked_roles AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE role::text
          WHEN 'admin' THEN 1
          WHEN 'operator' THEN 2
          WHEN 'viewer' THEN 3
          WHEN 'supervisor' THEN 4
          WHEN 'agent' THEN 5
          ELSE 6
        END,
        created_at DESC NULLS LAST
    ) AS row_number
  FROM public.user_roles
)
DELETE FROM public.user_roles roles
USING ranked_roles ranked
WHERE roles.ctid = ranked.ctid
  AND ranked.row_number > 1;

UPDATE public.user_roles
SET role = CASE role::text
  WHEN 'supervisor' THEN 'operator'::public.app_role
  WHEN 'agent' THEN 'viewer'::public.app_role
  ELSE role
END,
assigned_at = COALESCE(assigned_at, created_at, now());

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_roles'::regclass
      AND conname = 'user_roles_user_id_key'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);

-- =====================================================================
-- 4. Helpers SECURITY DEFINER (evitam recursao em RLS)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.user_roles WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_operator()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'operator')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND status = 'active'
  );
$$;

-- =====================================================================
-- 5. Trigger handle_new_user: popula profile + role default
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_name text := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, user_id, email, name, full_name)
    VALUES (NEW.id, NEW.id, NEW.email, resolved_name, resolved_name)
    ON CONFLICT (user_id) DO UPDATE
      SET id = EXCLUDED.id,
          email = EXCLUDED.email,
          name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
          full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
          updated_at = now();

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'viewer')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    UPDATE public.profiles
    SET email = NEW.email,
        updated_at = now()
    WHERE id = NEW.id OR user_id = NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_user_update failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_user_update ON auth.users;
CREATE TRIGGER trg_handle_user_update
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- =====================================================================
-- 6. Row Level Security
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles
  FOR SELECT
  USING (id = auth.uid() OR user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid() OR user_id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "user_roles_select_self_or_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
CREATE POLICY "user_roles_update_admin" ON public.user_roles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;
CREATE POLICY "user_roles_delete_admin" ON public.user_roles
  FOR DELETE
  USING (public.is_admin());

-- =====================================================================
-- 7. Backfill: profiles + user_roles para usuarios existentes
-- =====================================================================

INSERT INTO public.profiles (id, user_id, email, name, full_name)
SELECT
  u.id,
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
FROM auth.users u
ON CONFLICT (user_id) DO UPDATE
  SET id = EXCLUDED.id,
      email = EXCLUDED.email,
      name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
      updated_at = now();

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'viewer'::public.app_role
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.user_roles
SET role = 'admin', assigned_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'anderson.domingos@aureatech.io' LIMIT 1
);

-- =====================================================================
-- 8. Grants (clients authenticated interagem via RLS)
-- =====================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_operator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

COMMENT ON TABLE public.profiles IS 'Perfil publico do usuario (1:1 com auth.users em id/user_id).';
COMMENT ON TABLE public.user_roles IS 'RBAC: admin/operator/viewer. Default viewer via trigger handle_new_user.';
COMMENT ON FUNCTION public.is_admin() IS 'Retorna true se auth.uid() tem role admin. SECURITY DEFINER para uso seguro em policies.';

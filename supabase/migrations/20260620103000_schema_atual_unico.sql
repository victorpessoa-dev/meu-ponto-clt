CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text,
  birth_date date,
  company_name text,
  job_title text,
  avatar_icon text NOT NULL DEFAULT 'user',
  is_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  schedule integer[] NOT NULL DEFAULT ARRAY[0, 480, 480, 480, 480, 480, 240],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS avatar_icon text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS schedule integer[] NOT NULL DEFAULT ARRAY[0, 480, 480, 480, 480, 480, 240];

UPDATE users
SET name = COALESCE(name, split_part(email, '@', 1))
WHERE name IS NULL;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_active_user() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result boolean;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_active
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result boolean;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_admin AND is_active
  ) INTO result;
  RETURN result;
END;
$$;

DROP POLICY IF EXISTS "authenticated_select_users" ON users;
CREATE POLICY "authenticated_select_users" ON users FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin_user());

DROP POLICY IF EXISTS "authenticated_insert_users" ON users;
CREATE POLICY "authenticated_insert_users" ON users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id OR public.is_admin_user());

DROP POLICY IF EXISTS "authenticated_update_users" ON users;
CREATE POLICY "authenticated_update_users" ON users FOR UPDATE
  TO authenticated USING ((auth.uid() = id AND public.is_active_user()) OR public.is_admin_user())
  WITH CHECK ((auth.uid() = id AND public.is_active_user()) OR public.is_admin_user());

DROP POLICY IF EXISTS "authenticated_delete_users" ON users;
CREATE POLICY "authenticated_delete_users" ON users FOR DELETE
  TO authenticated USING (public.is_admin_user());

CREATE OR REPLACE FUNCTION public.protect_user_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_admin := false;
    NEW.is_active := true;
    NEW.avatar_icon := COALESCE(NULLIF(NEW.avatar_icon, ''), 'user');
    NEW.schedule := COALESCE(NEW.schedule, ARRAY[0, 480, 480, 480, 480, 480, 240]);
    RETURN NEW;
  END IF;

  NEW.is_admin := OLD.is_admin;
  NEW.is_active := OLD.is_active;
  NEW.schedule := OLD.schedule;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_profile_fields_trigger ON users;
CREATE TRIGGER protect_user_profile_fields_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_profile_fields();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, birth_date, company_name, job_title, avatar_icon, is_admin, is_active, schedule)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'birth_date', '')::date,
    NULLIF(NEW.raw_user_meta_data->>'company_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'job_title', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'avatar_icon', ''), 'user'),
    false,
    true,
    ARRAY[0, 480, 480, 480, 480, 480, 240]
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(public.users.name, EXCLUDED.name),
    birth_date = COALESCE(public.users.birth_date, EXCLUDED.birth_date),
    company_name = COALESCE(public.users.company_name, EXCLUDED.company_name),
    job_title = COALESCE(public.users.job_title, EXCLUDED.job_title),
    avatar_icon = COALESCE(NULLIF(public.users.avatar_icon, ''), EXCLUDED.avatar_icon, 'user');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE TABLE IF NOT EXISTS time_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  entry_time time,
  break_time time,
  return_time time,
  exit_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_time_records_user_id ON time_records(user_id);
CREATE INDEX IF NOT EXISTS idx_time_records_date ON time_records(date);

ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_time_records" ON time_records;
CREATE POLICY "authenticated_select_time_records" ON time_records FOR SELECT
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

DROP POLICY IF EXISTS "authenticated_insert_time_records" ON time_records;
CREATE POLICY "authenticated_insert_time_records" ON time_records FOR INSERT
  TO authenticated WITH CHECK ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

DROP POLICY IF EXISTS "authenticated_update_time_records" ON time_records;
CREATE POLICY "authenticated_update_time_records" ON time_records FOR UPDATE
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user())
  WITH CHECK ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

DROP POLICY IF EXISTS "authenticated_delete_time_records" ON time_records;
CREATE POLICY "authenticated_delete_time_records" ON time_records FOR DELETE
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

CREATE TABLE IF NOT EXISTS justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  type text NOT NULL DEFAULT 'outro',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_justifications_user_id ON justifications(user_id);
CREATE INDEX IF NOT EXISTS idx_justifications_date ON justifications(date);

ALTER TABLE justifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_justifications" ON justifications;
CREATE POLICY "authenticated_select_justifications" ON justifications FOR SELECT
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

DROP POLICY IF EXISTS "authenticated_insert_justifications" ON justifications;
CREATE POLICY "authenticated_insert_justifications" ON justifications FOR INSERT
  TO authenticated WITH CHECK ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

DROP POLICY IF EXISTS "authenticated_update_justifications" ON justifications;
CREATE POLICY "authenticated_update_justifications" ON justifications FOR UPDATE
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user())
  WITH CHECK ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

DROP POLICY IF EXISTS "authenticated_delete_justifications" ON justifications;
CREATE POLICY "authenticated_delete_justifications" ON justifications FOR DELETE
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  level text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'app',
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_logs" ON logs;
CREATE POLICY "public_insert_logs" ON logs FOR INSERT TO public WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "authenticated_insert_logs" ON logs;
CREATE POLICY "authenticated_insert_logs" ON logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());

DROP POLICY IF EXISTS "authenticated_select_logs" ON logs;
CREATE POLICY "authenticated_select_logs" ON logs FOR SELECT
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

CREATE TABLE IF NOT EXISTS errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  error_code text,
  context text,
  message text NOT NULL,
  detail text,
  hint text,
  stack text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_errors_user_id ON errors(user_id);
CREATE INDEX IF NOT EXISTS idx_errors_created_at ON errors(created_at);

ALTER TABLE errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_errors" ON errors;
CREATE POLICY "public_insert_errors" ON errors FOR INSERT TO public WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "authenticated_insert_errors" ON errors;
CREATE POLICY "authenticated_insert_errors" ON errors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());

DROP POLICY IF EXISTS "authenticated_select_errors" ON errors;
CREATE POLICY "authenticated_select_errors" ON errors FOR SELECT
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

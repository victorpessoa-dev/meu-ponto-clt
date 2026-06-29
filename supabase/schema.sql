-- Meu Ponto CLT - schema inicial completo
-- Use este arquivo para criar o banco do zero pelo SQL Editor do Supabase.
-- Ele nao e uma migration incremental.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text,
  birth_date date,
  company_name text,
  job_title text,
  avatar_icon text NOT NULL DEFAULT 'user',
  is_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  schedule integer[] NOT NULL DEFAULT ARRAY[0, 480, 480, 480, 480, 480, 240],
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_avatar_icon_check CHECK (
    avatar_icon IN (
      'user',
      'briefcase',
      'laptop',
      'code',
      'finance',
      'sales',
      'marketing',
      'support',
      'logistics',
      'operations',
      'maintenance',
      'health',
      'education',
      'legal',
      'design',
      'shield',
      'handshake',
      'clock',
      'coffee',
      'sparkles'
    )
  ),
  CONSTRAINT users_schedule_length_check CHECK (array_length(schedule, 1) = 7)
);

CREATE INDEX idx_users_email ON public.users(email);

CREATE TABLE public.time_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  entry_time time,
  break_time time,
  return_time time,
  exit_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX idx_time_records_user_id ON public.time_records(user_id);
CREATE INDEX idx_time_records_date ON public.time_records(date);

CREATE TABLE public.justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  type text NOT NULL DEFAULT 'falta',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date),
  CONSTRAINT justifications_type_check CHECK (type IN ('falta', 'atestado', 'ferias', 'folga', 'abono'))
);

CREATE INDEX idx_justifications_user_id ON public.justifications(user_id);
CREATE INDEX idx_justifications_date ON public.justifications(date);

CREATE TABLE public.logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  level text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'app',
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_logs_user_id ON public.logs(user_id);
CREATE INDEX idx_logs_created_at ON public.logs(created_at);

CREATE TABLE public.errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  error_code text,
  context text,
  message text NOT NULL,
  detail text,
  hint text,
  stack text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_errors_user_id ON public.errors(user_id);
CREATE INDEX idx_errors_created_at ON public.errors(created_at);

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION public.protect_user_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_user() THEN
    NEW.avatar_icon := COALESCE(NULLIF(NEW.avatar_icon, ''), 'user');
    NEW.schedule := COALESCE(NEW.schedule, ARRAY[0, 480, 480, 480, 480, 480, 240]);
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
  NEW.avatar_icon := COALESCE(NULLIF(NEW.avatar_icon, ''), OLD.avatar_icon, 'user');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    birth_date,
    company_name,
    job_title,
    avatar_icon,
    is_admin,
    is_active,
    schedule
  )
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

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_profile_fields_trigger ON public.users;
CREATE TRIGGER protect_user_profile_fields_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_profile_fields();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

DROP TRIGGER IF EXISTS touch_time_records_updated_at ON public.time_records;
CREATE TRIGGER touch_time_records_updated_at
  BEFORE UPDATE ON public.time_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_users ON public.users FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin_user());

CREATE POLICY authenticated_insert_users ON public.users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id OR public.is_admin_user());

CREATE POLICY authenticated_update_users ON public.users FOR UPDATE
  TO authenticated USING ((auth.uid() = id AND public.is_active_user()) OR public.is_admin_user())
  WITH CHECK ((auth.uid() = id AND public.is_active_user()) OR public.is_admin_user());

CREATE POLICY authenticated_delete_users ON public.users FOR DELETE
  TO authenticated USING (public.is_admin_user());

CREATE POLICY authenticated_select_time_records ON public.time_records FOR SELECT
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

CREATE POLICY authenticated_insert_time_records ON public.time_records FOR INSERT
  TO authenticated WITH CHECK ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

CREATE POLICY authenticated_update_time_records ON public.time_records FOR UPDATE
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user())
  WITH CHECK ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

CREATE POLICY authenticated_delete_time_records ON public.time_records FOR DELETE
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

CREATE POLICY authenticated_select_justifications ON public.justifications FOR SELECT
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

CREATE POLICY authenticated_insert_justifications ON public.justifications FOR INSERT
  TO authenticated WITH CHECK ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

CREATE POLICY authenticated_update_justifications ON public.justifications FOR UPDATE
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user())
  WITH CHECK ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

CREATE POLICY authenticated_delete_justifications ON public.justifications FOR DELETE
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

CREATE POLICY public_insert_logs ON public.logs FOR INSERT
  TO public WITH CHECK (user_id IS NULL);

CREATE POLICY authenticated_insert_logs ON public.logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_active_user());

CREATE POLICY authenticated_select_logs ON public.logs FOR SELECT
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

CREATE POLICY public_insert_errors ON public.errors FOR INSERT
  TO public WITH CHECK (user_id IS NULL);

CREATE POLICY authenticated_insert_errors ON public.errors FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_active_user());

CREATE POLICY authenticated_select_errors ON public.errors FOR SELECT
  TO authenticated USING ((auth.uid() = user_id AND public.is_active_user()) OR public.is_admin_user());

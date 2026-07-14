-- Meu Ponto CLT - schema completo para uma instalacao nova do Supabase.
-- Execute este arquivo uma unica vez no SQL Editor de um projeto vazio.
-- Este modelo nao possui perfil, coluna, funcao ou politica de administrador.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text,
  birth_date date,
  company_name text,
  job_title text,
  avatar_icon text NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT true,
  schedule integer[] NOT NULL DEFAULT ARRAY[0, 480, 480, 480, 480, 480, 240],
  punch_fields jsonb NOT NULL DEFAULT '[[], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "exit"]]'::jsonb,
  clock_offset_minutes integer NOT NULL DEFAULT 0,
  clock_offset_seconds integer NOT NULL DEFAULT 0,
  onboarding_state smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_punch_fields_array_check
    CHECK (jsonb_typeof(punch_fields) = 'array' AND jsonb_array_length(punch_fields) = 7),
  CONSTRAINT users_clock_offset_minutes_check
    CHECK (clock_offset_minutes BETWEEN -720 AND 720),
  CONSTRAINT users_clock_offset_seconds_check
    CHECK (clock_offset_seconds BETWEEN -43200 AND 43200),
  CONSTRAINT users_onboarding_state_check
    CHECK (onboarding_state IN (0, 1, 2))
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
  CONSTRAINT time_records_user_date_key UNIQUE (user_id, date)
);

CREATE INDEX idx_time_records_user_id ON public.time_records(user_id);
CREATE INDEX idx_time_records_date ON public.time_records(date);

CREATE TABLE public.justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  type text NOT NULL DEFAULT 'justificada',
  reason text,
  start_time time,
  end_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT justifications_user_date_key UNIQUE (user_id, date),
  CONSTRAINT justifications_type_check
    CHECK (type IN ('falta', 'justificada', 'atestado', 'feriado', 'ferias', 'folga', 'abono')),
  CONSTRAINT justifications_abono_times_check CHECK (
    type <> 'abono'
    OR start_time IS NULL
    OR end_time IS NULL
    OR end_time > start_time
  )
);

CREATE INDEX idx_justifications_user_id ON public.justifications(user_id);
CREATE INDEX idx_justifications_date ON public.justifications(date);

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
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid() AND is_active
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
  IF TG_OP = 'INSERT' THEN
    NEW.is_active := true;
    NEW.avatar_icon := COALESCE(NULLIF(NEW.avatar_icon, ''), 'user');
    NEW.schedule := COALESCE(NEW.schedule, ARRAY[0, 480, 480, 480, 480, 480, 240]);
    NEW.punch_fields := COALESCE(
      NEW.punch_fields,
      '[[], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "exit"]]'::jsonb
    );
    NEW.clock_offset_minutes := COALESCE(NEW.clock_offset_minutes, 0);
    NEW.clock_offset_seconds := COALESCE(NEW.clock_offset_seconds, NEW.clock_offset_minutes * 60, 0);
    RETURN NEW;
  END IF;

  NEW.is_active := OLD.is_active;
  NEW.clock_offset_minutes := COALESCE(NEW.clock_offset_minutes, 0);
  NEW.clock_offset_seconds := COALESCE(NEW.clock_offset_seconds, NEW.clock_offset_minutes * 60, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_user_profile_fields_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_profile_fields();

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
    avatar_icon
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'birth_date', '')::date,
    NULLIF(NEW.raw_user_meta_data->>'company_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'job_title', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'avatar_icon', ''), 'user')
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justifications ENABLE ROW LEVEL SECURITY;

-- O papel autenticado recebe acesso SQL; as politicas abaixo limitam cada
-- operacao exclusivamente aos dados do proprio usuario.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.justifications TO authenticated;

CREATE POLICY "authenticated_select_users" ON public.users FOR SELECT
  TO authenticated USING (auth.uid() = id);
CREATE POLICY "authenticated_insert_users" ON public.users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "authenticated_update_users" ON public.users FOR UPDATE
  TO authenticated USING (auth.uid() = id AND public.is_active_user())
  WITH CHECK (auth.uid() = id AND public.is_active_user());
CREATE POLICY "authenticated_delete_users" ON public.users FOR DELETE
  TO authenticated USING (auth.uid() = id AND public.is_active_user());

CREATE POLICY "authenticated_select_time_records" ON public.time_records FOR SELECT
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY "authenticated_insert_time_records" ON public.time_records FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY "authenticated_update_time_records" ON public.time_records FOR UPDATE
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user())
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY "authenticated_delete_time_records" ON public.time_records FOR DELETE
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user());

CREATE POLICY "authenticated_select_justifications" ON public.justifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY "authenticated_insert_justifications" ON public.justifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY "authenticated_update_justifications" ON public.justifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user())
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY "authenticated_delete_justifications" ON public.justifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user());

REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

-- Garante que a API reconheca imediatamente tabelas, funcoes e politicas.
NOTIFY pgrst, 'reload schema';

COMMIT;

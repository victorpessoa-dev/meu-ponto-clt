ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS clock_offset_minutes integer NOT NULL DEFAULT 0;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS clock_offset_seconds integer NOT NULL DEFAULT 0;

DROP TABLE IF EXISTS public.errors;

ALTER TABLE public.justifications
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_clock_offset_minutes_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_clock_offset_minutes_check
  CHECK (clock_offset_minutes BETWEEN -720 AND 720);

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_clock_offset_seconds_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_clock_offset_seconds_check
  CHECK (clock_offset_seconds BETWEEN -43200 AND 43200);

UPDATE public.users
SET clock_offset_seconds = clock_offset_minutes * 60
WHERE clock_offset_seconds = 0
  AND clock_offset_minutes <> 0;

ALTER TABLE public.justifications
  DROP CONSTRAINT IF EXISTS justifications_abono_times_check;

ALTER TABLE public.justifications
  ADD CONSTRAINT justifications_abono_times_check
  CHECK (
    type <> 'abono'
    OR start_time IS NULL
    OR end_time IS NULL
    OR end_time > start_time
  );

UPDATE public.justifications
SET type = 'justificada'
WHERE type = 'falta';

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
    NEW.punch_fields := COALESCE(
      NEW.punch_fields,
      '[[], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "exit"]]'::jsonb
    );
    NEW.clock_offset_minutes := COALESCE(NEW.clock_offset_minutes, 0);
    NEW.clock_offset_seconds := COALESCE(NEW.clock_offset_seconds, NEW.clock_offset_minutes * 60, 0);
    RETURN NEW;
  END IF;

  NEW.is_admin := OLD.is_admin;
  NEW.is_active := OLD.is_active;
  RETURN NEW;
END;
$$;

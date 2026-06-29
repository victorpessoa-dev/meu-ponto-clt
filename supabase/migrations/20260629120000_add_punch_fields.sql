ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS punch_fields jsonb NOT NULL DEFAULT '[[], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "exit"]]'::jsonb;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_punch_fields_array_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_punch_fields_array_check
  CHECK (jsonb_typeof(punch_fields) = 'array' AND jsonb_array_length(punch_fields) = 7);

UPDATE public.users
SET punch_fields = '[[], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "breakTime", "returnTime", "exit"], ["entry", "exit"]]'::jsonb
WHERE punch_fields IS NULL;

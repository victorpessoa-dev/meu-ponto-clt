ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_avatar_icon_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_avatar_icon_check CHECK (
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
  );

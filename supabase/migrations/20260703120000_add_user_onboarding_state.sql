ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_state smallint NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD CONSTRAINT users_onboarding_state_check
  CHECK (onboarding_state IN (0, 1, 2));

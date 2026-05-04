-- 008: per-user UI language preference.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'pt-BR';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_locale_check;

ALTER TABLE users
  ADD CONSTRAINT users_locale_check CHECK (locale IN ('pt-BR', 'en'));

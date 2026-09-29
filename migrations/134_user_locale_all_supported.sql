-- users.locale follows LOCALES in lib/locale-negotiation.js.
-- 008 only allowed pt-BR/en, so saving pt-PT/es-* from the profile failed.
-- Closed domain stays a CHECK (not a lookup table): the set is code-owned and
-- every value needs a UI catalog shipped with the app anyway.
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_locale_check;

ALTER TABLE users
  ADD CONSTRAINT users_locale_check
  CHECK (locale IN ('pt-BR', 'pt-PT', 'en', 'es-419', 'es-ES', 'fr-FR', 'de-DE'));

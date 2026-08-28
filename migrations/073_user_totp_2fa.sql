-- 2FA TOTP opcional para gestores (admin/direction/hr) — lib/manager-2fa.js.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ;

COMMENT ON COLUMN users.totp_secret IS 'Secret Base32 TOTP; preenchido no setup, limpo ao desativar 2FA';
COMMENT ON COLUMN users.totp_enabled_at IS 'Quando NULL, 2FA inativo; senão login exige código TOTP (admin/direction)';

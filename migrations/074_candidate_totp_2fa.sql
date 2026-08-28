-- 2FA TOTP opcional para colaboradores (candidates com employment_status = employee) — lib/employee-2fa.js.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ;

COMMENT ON COLUMN candidates.totp_secret IS 'Secret Base32 TOTP; preenchido no setup, limpo ao desativar 2FA';
COMMENT ON COLUMN candidates.totp_enabled_at IS 'Quando NULL, 2FA inativo; senão login exige código TOTP (colaborador)';

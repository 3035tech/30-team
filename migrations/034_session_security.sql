-- 034: sessão revogável + expiração de convite Enneagrama por e-mail.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN users.session_version IS
  'Incrementado em logout, troca de senha, desativação ou mudança sensível — invalida JWTs antigos (claim sv).';

ALTER TABLE candidate_invites
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Convites existentes: 30 dias a partir do envio (ou agora se sent_at nulo).
UPDATE candidate_invites
SET expires_at = COALESCE(sent_at, NOW()) + INTERVAL '30 days'
WHERE expires_at IS NULL;

ALTER TABLE candidate_invites
  ALTER COLUMN expires_at SET NOT NULL;

ALTER TABLE candidate_invites
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '30 days');

CREATE INDEX IF NOT EXISTS idx_candidate_invites_expires
  ON candidate_invites (expires_at)
  WHERE status IN ('sent', 'opened');

INSERT INTO schema_migrations (name) VALUES ('034_session_security.sql')
ON CONFLICT (name) DO NOTHING;

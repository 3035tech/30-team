-- Enriquece audit_log: ator colaborador, tenant, contexto HTTP (lib/audit.js).

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS actor_kind TEXT NOT NULL DEFAULT 'manager',
  ADD COLUMN IF NOT EXISTS actor_candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_path TEXT,
  ADD COLUMN IF NOT EXISTS request_ip TEXT;

COMMENT ON COLUMN audit_log.actor_kind IS 'manager | employee | system | public';
COMMENT ON COLUMN audit_log.actor_candidate_id IS 'Colaborador quando actor_kind = employee';
COMMENT ON COLUMN audit_log.company_id IS 'Tenant quando aplicável; NULL = ação global';
COMMENT ON COLUMN audit_log.request_path IS 'Path da API/rota no momento do evento';
COMMENT ON COLUMN audit_log.request_ip IS 'IP do cliente (best-effort)';

CREATE INDEX IF NOT EXISTS idx_audit_log_company_created
  ON audit_log (company_id, created_at DESC)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_action_created
  ON audit_log (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_kind_created
  ON audit_log (actor_kind, created_at DESC);

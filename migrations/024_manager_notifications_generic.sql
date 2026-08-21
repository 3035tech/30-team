-- 024: notificações genéricas (catálogo aberto) + dedupe por time RH

-- Remove CHECK restrito a assessments (tipos novos: prazo/fechamento de vaga, etc.)
ALTER TABLE manager_notifications
  DROP CONSTRAINT IF EXISTS manager_notifications_type_check;

ALTER TABLE manager_notifications
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id BIGINT,
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

COMMENT ON COLUMN manager_notifications.type IS
  'Catalog key (app-defined): enneagram_completed, motivators_completed, vacancy_deadline_approaching, vacancy_closed, …';
COMMENT ON COLUMN manager_notifications.entity_type IS
  'Optional entity kind: candidate | vacancy | assessment | attempt | …';
COMMENT ON COLUMN manager_notifications.entity_id IS
  'Optional entity id for deep-link / grouping';
COMMENT ON COLUMN manager_notifications.dedupe_key IS
  'Stable key per recipient to avoid duplicate team alerts (e.g. vacancy_deadline:123:2026-08-28)';

-- Uma notificação por destinatário + chave (time RH recebe 1 cada; cron não reenvia)
CREATE UNIQUE INDEX IF NOT EXISTS idx_manager_notifications_dedupe
  ON manager_notifications (recipient_user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_manager_notifications_entity
  ON manager_notifications (company_id, entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

COMMENT ON TABLE manager_notifications IS
  'In-app inbox for company managers (hr/direction/admin with company_id). Generic event types; fan-out per user on the RH team.';

INSERT INTO schema_migrations (name) VALUES ('024_manager_notifications_generic.sql')
ON CONFLICT (name) DO NOTHING;

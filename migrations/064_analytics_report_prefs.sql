-- 064: preferências de relatório Analytics agendado (B-1107 polish)
-- Por empresa: frequência, destinatários opcionais, anexo PDF.

CREATE TABLE IF NOT EXISTS company_analytics_report_prefs (
  company_id BIGINT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'weekly'
    CHECK (frequency IN ('weekly', 'monthly', 'off')),
  -- user ids da mesma empresa; vazio = direction + admin (default)
  recipient_user_ids BIGINT[] NOT NULL DEFAULT '{}',
  attach_pdf BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE company_analytics_report_prefs IS
  'B-1107: frequência/destinatários/PDF do relatório Analytics agendado por empresa';

CREATE INDEX IF NOT EXISTS idx_analytics_report_prefs_freq
  ON company_analytics_report_prefs (frequency)
  WHERE frequency <> 'off';

INSERT INTO schema_migrations (name) VALUES ('064_analytics_report_prefs.sql')
ON CONFLICT DO NOTHING;

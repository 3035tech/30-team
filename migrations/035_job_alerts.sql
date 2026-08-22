-- 035: job alerts (avisos de novas vagas por e-mail).

CREATE TABLE IF NOT EXISTS job_alerts (
  id                  BIGSERIAL PRIMARY KEY,
  email               TEXT NOT NULL,
  name                TEXT,
  filters             JSONB NOT NULL DEFAULT '{}'::jsonb,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribe_token   TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_alerts_email_lower
  ON job_alerts (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_alerts_unsubscribe_token
  ON job_alerts (unsubscribe_token);

CREATE INDEX IF NOT EXISTS idx_job_alerts_active_created
  ON job_alerts (active, created_at DESC)
  WHERE active = TRUE;

INSERT INTO schema_migrations (name) VALUES ('035_job_alerts.sql')
ON CONFLICT (name) DO NOTHING;

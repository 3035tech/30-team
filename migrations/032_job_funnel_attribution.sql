-- 032 — atribuição UTM + eventos de funil de vagas públicas
-- Sem IP / PII nos eventos. Detalhe fino no assessment; candidates.source continua enum grosso.

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS attr_source TEXT,
  ADD COLUMN IF NOT EXISTS attr_medium TEXT,
  ADD COLUMN IF NOT EXISTS attr_campaign TEXT,
  ADD COLUMN IF NOT EXISTS attr_content TEXT,
  ADD COLUMN IF NOT EXISTS attr_term TEXT,
  ADD COLUMN IF NOT EXISTS attr_ref TEXT,
  ADD COLUMN IF NOT EXISTS attr_landing TEXT,
  ADD COLUMN IF NOT EXISTS attr_session_id TEXT;

COMMENT ON COLUMN assessments.attr_source IS 'utm_source na candidatura (sem PII)';
COMMENT ON COLUMN assessments.attr_medium IS 'utm_medium';
COMMENT ON COLUMN assessments.attr_campaign IS 'utm_campaign';
COMMENT ON COLUMN assessments.attr_content IS 'utm_content';
COMMENT ON COLUMN assessments.attr_term IS 'utm_term';
COMMENT ON COLUMN assessments.attr_ref IS 'Código referral ?ref=';
COMMENT ON COLUMN assessments.attr_landing IS 'Path de landing (ex. /vagas/…)';
COMMENT ON COLUMN assessments.attr_session_id IS 'Session id first-party (cookie), não PII';

CREATE TABLE IF NOT EXISTS job_funnel_events (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  vacancy_id BIGINT NOT NULL REFERENCES vacancies(id),
  candidate_id BIGINT REFERENCES candidates(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  session_id TEXT,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  referral_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT job_funnel_events_type_check CHECK (
    event_type IN (
      'job_view',
      'apply_start',
      'apply_complete',
      'screening',
      'interview',
      'hired',
      'rejected'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_job_funnel_vacancy_created
  ON job_funnel_events (vacancy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_funnel_company_type_created
  ON job_funnel_events (company_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_funnel_source
  ON job_funnel_events (vacancy_id, source)
  WHERE source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_funnel_session_view
  ON job_funnel_events (vacancy_id, session_id, event_type)
  WHERE event_type = 'job_view';

COMMENT ON TABLE job_funnel_events IS
  'Funil público da vaga (view → apply → pipeline). Sem IP; session_id opaco.';

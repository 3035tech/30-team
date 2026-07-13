-- 018: performance indexes for vacancy funnel, overview, and invite attention.
-- Safe to re-run (IF NOT EXISTS).

-- Ranking / hire-close / overview vacancy aggregates
CREATE INDEX IF NOT EXISTS idx_assessments_vacancy_created
  ON assessments (vacancy_id, created_at DESC)
  WHERE vacancy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_vacancy_pipeline
  ON assessments (vacancy_id, pipeline_stage)
  WHERE vacancy_id IS NOT NULL;

-- Overview: pending enneagram invites by company
CREATE INDEX IF NOT EXISTS idx_candidate_invites_company_status_sent
  ON candidate_invites (company_id, status, sent_at)
  WHERE status IN ('sent', 'opened');

-- Optional: accelerate ILIKE '%name%' candidate search (requires pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_candidates_fullname_trgm
  ON candidates USING gin (full_name gin_trgm_ops);

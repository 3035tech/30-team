-- Per-link flag: when true, POST /api/results rejects submissions without email.
ALTER TABLE company_links
  ADD COLUMN IF NOT EXISTS require_candidate_email BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE vacancy_links
  ADD COLUMN IF NOT EXISTS require_candidate_email BOOLEAN NOT NULL DEFAULT FALSE;

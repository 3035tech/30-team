-- Migration 079: trigram index for employee name search (ILIKE %needle%).
-- Requires pg_trgm (usually available on RDS / local Postgres).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_candidates_full_name_trgm
  ON candidates USING gin (full_name gin_trgm_ops);

-- 019: HR notes on candidates (interview / screening free text).

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS hr_notes TEXT;

COMMENT ON COLUMN candidates.hr_notes IS 'Free-text notes from HR (screening / interview)';

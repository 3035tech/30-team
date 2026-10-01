-- 139: First-access welcome card on /employee (one per collaborator identity = candidates row).
-- Timestamp on the identity row: 1:1 with the collaborator, no history needed, per company
-- (multi-company people have one candidates row per company, each with its own modules).

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS employee_welcome_dismissed_at TIMESTAMPTZ;

COMMENT ON COLUMN candidates.employee_welcome_dismissed_at IS
  'When the collaborator dismissed the /employee first-access welcome card; NULL = still shown';

-- Collaborators who already set a portal password have used /employee: skip the welcome for them.
UPDATE candidates
SET employee_welcome_dismissed_at = NOW()
WHERE password_hash IS NOT NULL
  AND employee_welcome_dismissed_at IS NULL;

-- 140: Per-collaborator time clock control.
-- Default follows candidates.work_format (clt/intern/unset = on; pj/cooperative = off).
-- Tri-state on the identity row (1:1 with the collaborator, per company):
-- NULL = follow work format, TRUE = HR forced on, FALSE = HR forced off. Changes are audited.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS time_clock_override BOOLEAN;

COMMENT ON COLUMN candidates.time_clock_override IS
  'Time clock per collaborator: NULL = follow work_format (pj/cooperative off), TRUE/FALSE = HR exception';

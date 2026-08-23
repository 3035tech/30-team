-- 047 — B-600 polish: employee portal prep flag + note to manager

ALTER TABLE employee_portal_tokens
  ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS note_to_manager TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_portal_tokens_note_len'
  ) THEN
    ALTER TABLE employee_portal_tokens DROP CONSTRAINT employee_portal_tokens_note_len;
  END IF;
END $$;

ALTER TABLE employee_portal_tokens
  ADD CONSTRAINT employee_portal_tokens_note_len
  CHECK (char_length(note_to_manager) <= 2000);

COMMENT ON COLUMN employee_portal_tokens.prepared_at IS
  'Employee marked 1:1 prep done on /e/{token} (B-604 polish).';
COMMENT ON COLUMN employee_portal_tokens.note_to_manager IS
  'Optional short note from employee to manager via token link.';

INSERT INTO schema_migrations (name) VALUES ('047_employee_portal_prep.sql')
ON CONFLICT (name) DO NOTHING;

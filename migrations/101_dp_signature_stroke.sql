-- 101: B-2724 store drawn signature stroke (PNG data URL) with typed-name ack.
-- Still internal acknowledgment — not ICP-Brasil / partner e-sign.

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signer_stroke_png TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_dp_documents_stroke_png_len'
  ) THEN
    ALTER TABLE employee_dp_documents
      ADD CONSTRAINT employee_dp_documents_stroke_png_len
      CHECK (char_length(signer_stroke_png) <= 200000);
  END IF;
END $$;

COMMENT ON COLUMN employee_dp_documents.signer_stroke_png IS
  'B-2724: PNG data URL of drawn stroke (mouse/touch). Cap 200k chars. Not ICP.';

INSERT INTO schema_migrations (name) VALUES ('101_dp_signature_stroke.sql')
ON CONFLICT (name) DO NOTHING;

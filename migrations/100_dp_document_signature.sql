-- 100: B-2724 admission document acknowledgment / internal e-sign (not ICP / provider GED).
-- Typed-name consent + audit fields on employee_dp_documents.

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signature_status TEXT NOT NULL DEFAULT 'none';

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signature_requested_at TIMESTAMPTZ;

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signature_requested_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signer_name TEXT NOT NULL DEFAULT '';

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signer_ip TEXT;

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signer_user_agent TEXT;

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signature_consent_version TEXT NOT NULL DEFAULT '';

ALTER TABLE employee_dp_documents
  ADD COLUMN IF NOT EXISTS signature_file_key TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_dp_documents_sig_status_chk'
  ) THEN
    ALTER TABLE employee_dp_documents
      ADD CONSTRAINT employee_dp_documents_sig_status_chk
      CHECK (signature_status IN ('none', 'requested', 'signed', 'waived'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_dp_documents_signer_name_len'
  ) THEN
    ALTER TABLE employee_dp_documents
      ADD CONSTRAINT employee_dp_documents_signer_name_len
      CHECK (char_length(signer_name) <= 120);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_dp_documents_sig_consent_len'
  ) THEN
    ALTER TABLE employee_dp_documents
      ADD CONSTRAINT employee_dp_documents_sig_consent_len
      CHECK (char_length(signature_consent_version) <= 40);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employee_dp_docs_sig_pending
  ON employee_dp_documents (company_id, signature_status, updated_at DESC)
  WHERE signature_status = 'requested';

COMMENT ON COLUMN employee_dp_documents.signature_status IS
  'B-2724: none|requested|signed|waived. Internal typed-name acknowledgment — not ICP-Brasil / partner e-sign.';

INSERT INTO schema_migrations (name) VALUES ('100_dp_document_signature.sql')
ON CONFLICT (name) DO NOTHING;

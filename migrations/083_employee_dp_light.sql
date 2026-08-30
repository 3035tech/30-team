-- 083: Lightweight DP — profile, document checklist, leave requests (not payroll / eSocial / time clock).

CREATE TABLE IF NOT EXISTS candidate_dp_profiles (
  candidate_id         BIGINT PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  emergency_name       TEXT NOT NULL DEFAULT '',
  emergency_phone      TEXT NOT NULL DEFAULT '',
  emergency_relation   TEXT NOT NULL DEFAULT '',
  address_line         TEXT NOT NULL DEFAULT '',
  address_city         TEXT NOT NULL DEFAULT '',
  address_state        TEXT NOT NULL DEFAULT '',
  address_postal       TEXT NOT NULL DEFAULT '',
  internal_notes       TEXT NOT NULL DEFAULT '',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT candidate_dp_profiles_emergency_name_len CHECK (char_length(emergency_name) <= 120),
  CONSTRAINT candidate_dp_profiles_emergency_phone_len CHECK (char_length(emergency_phone) <= 40),
  CONSTRAINT candidate_dp_profiles_emergency_relation_len CHECK (char_length(emergency_relation) <= 80),
  CONSTRAINT candidate_dp_profiles_address_line_len CHECK (char_length(address_line) <= 240),
  CONSTRAINT candidate_dp_profiles_address_city_len CHECK (char_length(address_city) <= 120),
  CONSTRAINT candidate_dp_profiles_address_state_len CHECK (char_length(address_state) <= 2),
  CONSTRAINT candidate_dp_profiles_address_postal_len CHECK (char_length(address_postal) <= 16),
  CONSTRAINT candidate_dp_profiles_notes_len CHECK (char_length(internal_notes) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_candidate_dp_profiles_company
  ON candidate_dp_profiles (company_id);

CREATE TABLE IF NOT EXISTS employee_dp_documents (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  doc_key              TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending',
  notes                TEXT NOT NULL DEFAULT '',
  file_url             TEXT,
  file_key             TEXT,
  file_name            TEXT NOT NULL DEFAULT '',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT employee_dp_documents_key_chk
    CHECK (doc_key IN ('id_document', 'contract', 'aso', 'address_proof', 'bank_data', 'dependents', 'other')),
  CONSTRAINT employee_dp_documents_status_chk
    CHECK (status IN ('pending', 'received', 'waived')),
  CONSTRAINT employee_dp_documents_notes_len CHECK (char_length(notes) <= 2000),
  CONSTRAINT employee_dp_documents_file_name_len CHECK (char_length(file_name) <= 200),
  CONSTRAINT employee_dp_documents_candidate_key_uq UNIQUE (candidate_id, doc_key)
);

CREATE INDEX IF NOT EXISTS idx_employee_dp_documents_company_status
  ON employee_dp_documents (company_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_dp_documents_candidate
  ON employee_dp_documents (candidate_id, doc_key);

CREATE TABLE IF NOT EXISTS employee_leave_requests (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  leave_type           TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'requested',
  starts_on            DATE NOT NULL,
  ends_on              DATE NOT NULL,
  reason               TEXT NOT NULL DEFAULT '',
  manager_notes        TEXT NOT NULL DEFAULT '',
  requested_by         TEXT NOT NULL DEFAULT 'manager',
  decided_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  decided_at           TIMESTAMPTZ,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_leave_type_chk
    CHECK (leave_type IN ('vacation', 'sick', 'parental', 'unpaid', 'other')),
  CONSTRAINT employee_leave_status_chk
    CHECK (status IN ('requested', 'approved', 'rejected', 'cancelled', 'taken')),
  CONSTRAINT employee_leave_requested_by_chk
    CHECK (requested_by IN ('manager', 'employee')),
  CONSTRAINT employee_leave_dates_chk CHECK (ends_on >= starts_on),
  CONSTRAINT employee_leave_reason_len CHECK (char_length(reason) <= 2000),
  CONSTRAINT employee_leave_manager_notes_len CHECK (char_length(manager_notes) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_employee_leave_company_status_dates
  ON employee_leave_requests (company_id, status, starts_on ASC);

CREATE INDEX IF NOT EXISTS idx_employee_leave_candidate_dates
  ON employee_leave_requests (candidate_id, starts_on DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_employee_leave_company_range
  ON employee_leave_requests (company_id, starts_on, ends_on)
  WHERE status IN ('approved', 'taken', 'requested');

COMMENT ON TABLE candidate_dp_profiles IS
  'Light DP profile (emergency contact + address). Not eSocial.';
COMMENT ON TABLE employee_dp_documents IS
  'Admission document checklist with optional S3 attachment. Not legal GED.';
COMMENT ON TABLE employee_leave_requests IS
  'Vacation / leave requests for light DP. Not payroll time-off engine.';

INSERT INTO schema_migrations (name) VALUES ('083_employee_dp_light.sql')
ON CONFLICT (name) DO NOTHING;

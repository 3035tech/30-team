-- 115: expand-only foundation for one manager identity across multiple companies.
-- Legacy users.company_id and users.role remain the source of truth in this phase.

CREATE TABLE IF NOT EXISTS user_company_memberships (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  role TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_company_memberships_user_company_unique UNIQUE (user_id, company_id),
  CONSTRAINT user_company_memberships_role_check
    CHECK (role IN ('admin', 'direction', 'hr')),
  CONSTRAINT user_company_memberships_lifecycle_check
    CHECK (deleted = FALSE OR active = FALSE)
);

COMMENT ON TABLE user_company_memberships IS
  'Expand-only manager-to-company associations. Legacy users.company_id/role remain authoritative until a later gated migration.';
COMMENT ON COLUMN user_company_memberships.role IS
  'Manager role inside this company; may differ across memberships for the same identity.';

CREATE INDEX IF NOT EXISTS idx_user_company_memberships_company_active
  ON user_company_memberships (company_id, role, user_id)
  WHERE active = TRUE AND deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_user_company_memberships_user_active
  ON user_company_memberships (user_id, company_id)
  WHERE active = TRUE AND deleted = FALSE;

-- Idempotent preservation backfill. Do not overwrite an existing membership:
-- a retry after future dual-write must not clobber newer per-company state.
INSERT INTO user_company_memberships (
  user_id,
  company_id,
  role,
  active,
  deleted
)
SELECT
  u.id,
  u.company_id,
  u.role,
  (u.active = TRUE AND u.deleted = FALSE),
  u.deleted
FROM users u
WHERE u.company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('115_user_company_memberships.sql')
ON CONFLICT (name) DO NOTHING;

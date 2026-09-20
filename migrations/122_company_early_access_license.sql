-- Informational only: no authentication, module or employee access gates.
CREATE TABLE IF NOT EXISTS company_licenses (
  company_id INTEGER PRIMARY KEY REFERENCES companies(id),
  license_number BIGSERIAL NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'early_access' CHECK (plan = 'early_access'),
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > starts_at)
);

-- Database-owned issuance also covers old application instances during rollout.
-- UNIQUE company_id makes concurrent registrations safe; sequence gaps are normal.
CREATE OR REPLACE FUNCTION issue_company_early_access_license() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.signup_source = 'early_access' AND NEW.company_id IS NOT NULL THEN
    INSERT INTO company_licenses(company_id, starts_at, expires_at)
    VALUES (NEW.company_id, NEW.created_at,
      ((NEW.created_at AT TIME ZONE 'UTC') + interval '1 year') AT TIME ZONE 'UTC')
    ON CONFLICT (company_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS users_issue_early_access_license ON users;
CREATE TRIGGER users_issue_early_access_license
AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION issue_company_early_access_license();

-- Preserve the original first registration, even if that manager was deactivated.
-- Never extend or overwrite a license on migration retries.
INSERT INTO company_licenses(company_id, starts_at, expires_at)
SELECT company_id, min(created_at),
       ((min(created_at) AT TIME ZONE 'UTC') + interval '1 year') AT TIME ZONE 'UTC'
FROM users
WHERE signup_source = 'early_access' AND company_id IS NOT NULL
GROUP BY company_id
ORDER BY min(created_at), company_id
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO schema_migrations(name) VALUES ('122_company_early_access_license.sql') ON CONFLICT (name) DO NOTHING;

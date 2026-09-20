-- Additive: existing employees remain unassigned; managers and roles are unchanged.
CREATE TABLE IF NOT EXISTS org_units (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  name VARCHAR(100) NOT NULL CHECK (length(btrim(name)) > 0),
  parent_id INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, company_id),
  FOREIGN KEY (parent_id, company_id) REFERENCES org_units(id, company_id),
  CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE UNIQUE INDEX IF NOT EXISTS org_units_active_name_idx
  ON org_units(company_id, COALESCE(parent_id, 0), lower(btrim(name))) WHERE active;
CREATE INDEX IF NOT EXISTS org_units_parent_idx ON org_units(company_id, parent_id) WHERE active;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS org_unit_id INTEGER;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'candidates_org_unit_tenant_fk') THEN
    ALTER TABLE candidates ADD CONSTRAINT candidates_org_unit_tenant_fk
      FOREIGN KEY (org_unit_id, company_id) REFERENCES org_units(id, company_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS candidates_org_unit_idx ON candidates(company_id, org_unit_id);
INSERT INTO schema_migrations(name) VALUES ('121_organization_units.sql') ON CONFLICT (name) DO NOTHING;

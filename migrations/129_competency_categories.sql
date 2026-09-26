-- Additive tenant-owned categories. Roll back the application first; retain data.
CREATE TABLE IF NOT EXISTS competency_categories (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, company_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS competency_categories_name_unique
  ON competency_categories (company_id, lower(btrim(name)));
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_competencies' AND column_name = 'category_id') THEN
    ALTER TABLE company_competencies ADD COLUMN category_id BIGINT;
    -- One-time preservation of values from the earlier local P1 draft.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_competencies' AND column_name = 'category') THEN
      INSERT INTO competency_categories (company_id, name)
        SELECT company_id, min(btrim(category)) FROM company_competencies
        WHERE btrim(category) <> '' GROUP BY company_id, lower(btrim(category))
        ON CONFLICT DO NOTHING;
      UPDATE company_competencies c SET category_id = cat.id
        FROM competency_categories cat WHERE c.category_id IS NULL AND cat.company_id = c.company_id
        AND lower(btrim(cat.name)) = lower(btrim(c.category));
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_competencies_category_tenant_fk') THEN
    ALTER TABLE company_competencies ADD CONSTRAINT company_competencies_category_tenant_fk
      FOREIGN KEY (category_id, company_id) REFERENCES competency_categories(id, company_id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS company_competencies_category_idx ON company_competencies(company_id, category_id);

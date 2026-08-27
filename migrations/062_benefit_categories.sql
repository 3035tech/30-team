-- 062 — Benefit categories catalog (company-scoped) + FK on company_benefits
-- Substitui category TEXT livre por vínculo a benefit_categories.
-- Backfill: cria categorias a partir de textos distintos já usados.

CREATE TABLE IF NOT EXISTS benefit_categories (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT benefit_categories_name_len
    CHECK (char_length(btrim(name)) >= 1 AND char_length(name) <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_benefit_categories_company_name_lower
  ON benefit_categories (company_id, LOWER(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_benefit_categories_company_active
  ON benefit_categories (company_id, active, updated_at DESC)
  WHERE active = TRUE;

COMMENT ON TABLE benefit_categories IS
  'Catálogo de categorias de benefícios por empresa. Benefícios apontam via category_id.';

ALTER TABLE company_benefits
  ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES benefit_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_company_benefits_category_id
  ON company_benefits (company_id, category_id)
  WHERE category_id IS NOT NULL AND active = TRUE;

COMMENT ON COLUMN company_benefits.category_id IS
  'FK opcional para benefit_categories. Preferir em vez de category TEXT legado.';

-- Backfill: uma categoria por (company_id, category text) distinta
INSERT INTO benefit_categories (company_id, name, active)
SELECT DISTINCT b.company_id, btrim(b.category), TRUE
FROM company_benefits b
WHERE b.category IS NOT NULL
  AND btrim(b.category) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM benefit_categories c
    WHERE c.company_id = b.company_id
      AND LOWER(btrim(c.name)) = LOWER(btrim(b.category))
  );

UPDATE company_benefits b
SET category_id = c.id
FROM benefit_categories c
WHERE b.category_id IS NULL
  AND b.category IS NOT NULL
  AND btrim(b.category) <> ''
  AND c.company_id = b.company_id
  AND LOWER(btrim(c.name)) = LOWER(btrim(b.category));

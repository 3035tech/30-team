-- 060 — Company benefits catalog (B-1009, Epic B-1000)
-- Lista de benefícios da empresa para contexto de retenção/oferta.
-- Sem adesão, sem desconto em folha, sem "clube" — apenas catálogo informativo.

-- Catálogo de benefícios da empresa (company-scoped)
CREATE TABLE IF NOT EXISTS company_benefits (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  category             TEXT,
  benefit_type         TEXT NOT NULL DEFAULT 'other',
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_benefits_name_len CHECK (char_length(btrim(name)) >= 1 AND char_length(name) <= 200),
  CONSTRAINT company_benefits_description_len CHECK (char_length(description) <= 2000),
  CONSTRAINT company_benefits_category_len CHECK (category IS NULL OR char_length(category) <= 100),
  CONSTRAINT company_benefits_type_chk CHECK (benefit_type IN (
    'health', 'dental', 'vision', 'life_insurance', 'retirement',
    'vacation', 'flexible_hours', 'remote_work', 'gym', 'meal_voucher',
    'transport_voucher', 'education', 'daycare', 'other'
  ))
);

CREATE INDEX IF NOT EXISTS idx_company_benefits_company
  ON company_benefits (company_id, active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_benefits_category
  ON company_benefits (company_id, category)
  WHERE active = TRUE AND category IS NOT NULL;

COMMENT ON TABLE company_benefits IS
  'Catálogo de benefícios da empresa para contexto de retenção/oferta. Sem adesão, sem folha, sem clube — apenas lista informativa.';

COMMENT ON COLUMN company_benefits.category IS
  'Categoria livre do benefício (ex: Saúde, Financeiro, Qualidade de Vida). Sem taxonomia rígida.';

COMMENT ON COLUMN company_benefits.benefit_type IS
  'Tipo indicativo: health | dental | vision | life_insurance | retirement | vacation | flexible_hours | remote_work | gym | meal_voucher | transport_voucher | education | daycare | other. Não gera comportamento diferente.';

COMMENT ON COLUMN company_benefits.active IS
  'TRUE = benefício ativo/oferecido; FALSE = descontinuado. Soft delete para histórico.';

-- 057 — Plano de sucessão (B-1005, Epic B-1000)
-- Papéis críticos + sucessor(es) + prontidão. Reusa HR Score e leadership potential.

-- Papéis críticos da empresa (company-scoped)
CREATE TABLE IF NOT EXISTS critical_roles (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  area_key             TEXT,
  impact_level         TEXT NOT NULL DEFAULT 'high',
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT critical_roles_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200),
  CONSTRAINT critical_roles_description_len CHECK (char_length(description) <= 2000),
  CONSTRAINT critical_roles_impact_chk CHECK (impact_level IN ('high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_critical_roles_company
  ON critical_roles (company_id, active, updated_at DESC);

COMMENT ON TABLE critical_roles IS
  'Papéis críticos da empresa para planejamento de sucessão (company-scoped). Não é org chart completo.';

COMMENT ON COLUMN critical_roles.impact_level IS
  'high = importante; critical = essencial para operação';

-- Planos de sucessão (sucessor por papel crítico)
CREATE TABLE IF NOT EXISTS succession_plans (
  id                   BIGSERIAL PRIMARY KEY,
  critical_role_id     BIGINT NOT NULL REFERENCES critical_roles(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  successor_candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  readiness            TEXT NOT NULL DEFAULT 'developing',
  notes                TEXT NOT NULL DEFAULT '',
  target_date          DATE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (critical_role_id, successor_candidate_id),
  CONSTRAINT succession_plans_notes_len CHECK (char_length(notes) <= 4000),
  CONSTRAINT succession_plans_readiness_chk CHECK (readiness IN ('not_ready', 'developing', 'ready', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_succession_plans_role
  ON succession_plans (critical_role_id, readiness, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_succession_plans_successor
  ON succession_plans (successor_candidate_id, company_id);

COMMENT ON TABLE succession_plans IS
  'Sucessores para papéis críticos + prontidão. Um papel pode ter vários sucessores.';

COMMENT ON COLUMN succession_plans.readiness IS
  'not_ready = não pronto; developing = desenvolvendo; ready = pronto em 6-12m; now = pronto agora';

COMMENT ON COLUMN succession_plans.notes IS
  'Notas de desenvolvimento, gaps, ações. Hedging: "tende a precisar de...".';

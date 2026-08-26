-- 056 — Performance reviews + goals → PDI (B-1004, Epic B-1000)
-- Ciclo leve (gestor → colaborador; não 360). Metas no ciclo.
-- Gap/outcome `develop` gera item PDI automaticamente.

-- Ciclos de avaliação (company-wide)
CREATE TABLE IF NOT EXISTS performance_cycles (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'draft',
  period_start         DATE,
  period_end           DATE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT performance_cycles_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 200),
  CONSTRAINT performance_cycles_description_len CHECK (char_length(description) <= 4000),
  CONSTRAINT performance_cycles_status_chk CHECK (status IN ('draft', 'active', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_performance_cycles_company
  ON performance_cycles (company_id, status, updated_at DESC);

COMMENT ON TABLE performance_cycles IS
  'Ciclos de avaliação de desempenho (company-wide). Ciclo leve: gestor → colaborador, não 360.';

-- Metas de desempenho para um candidato em um ciclo
CREATE TABLE IF NOT EXISTS performance_goals (
  id                   BIGSERIAL PRIMARY KEY,
  cycle_id             BIGINT NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  weight               INT NOT NULL DEFAULT 100,
  sort_order           INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT performance_goals_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT performance_goals_description_len CHECK (char_length(description) <= 2000),
  CONSTRAINT performance_goals_weight_chk CHECK (weight >= 0 AND weight <= 100)
);

CREATE INDEX IF NOT EXISTS idx_performance_goals_cycle_candidate
  ON performance_goals (cycle_id, candidate_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_performance_goals_candidate
  ON performance_goals (candidate_id, cycle_id);

COMMENT ON TABLE performance_goals IS
  'Metas de desempenho para um candidato em um ciclo. Weight = peso da meta no ciclo (soma pode ser != 100).';

-- Avaliações de desempenho (review) por candidato em um ciclo
CREATE TABLE IF NOT EXISTS performance_reviews (
  id                   BIGSERIAL PRIMARY KEY,
  cycle_id             BIGINT NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  reviewer_user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  outcomes             JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_notes        TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'draft',
  submitted_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, candidate_id),
  CONSTRAINT performance_reviews_overall_notes_len CHECK (char_length(overall_notes) <= 4000),
  CONSTRAINT performance_reviews_status_chk CHECK (status IN ('draft', 'submitted'))
);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle
  ON performance_reviews (cycle_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_candidate
  ON performance_reviews (candidate_id, cycle_id);

COMMENT ON TABLE performance_reviews IS
  'Avaliação de desempenho de um candidato em um ciclo. outcomes = { "goalId": { "outcome": "met|exceeded|develop|not_met", "notes": "..." }, ... }';

COMMENT ON COLUMN performance_reviews.outcomes IS
  'JSONB: { "<goal_id>": { "outcome": "met|exceeded|develop|not_met", "notes": "..." }, ... }. Outcome "develop" gera item PDI automaticamente.';

-- Estender constraint de source em development_plan_items para incluir performance_review
ALTER TABLE development_plan_items
  DROP CONSTRAINT IF EXISTS development_plan_items_source_chk;

ALTER TABLE development_plan_items
  ADD CONSTRAINT development_plan_items_source_chk
  CHECK (source IN ('manual', 'synthesis', 'one_on_one', 'retention', 'onboarding', 'performance_review'));

COMMENT ON COLUMN development_plan_items.source IS
  'Origem do item PDI: manual | synthesis | one_on_one | retention | onboarding | performance_review. Auto-gerado quando outcome é "develop".';

-- Adicionar goal_id ao item PDI para rastrear origem de performance_review
ALTER TABLE development_plan_items
  ADD COLUMN IF NOT EXISTS performance_goal_id BIGINT REFERENCES performance_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_development_plan_items_goal
  ON development_plan_items (performance_goal_id)
  WHERE performance_goal_id IS NOT NULL;

COMMENT ON COLUMN development_plan_items.performance_goal_id IS
  'FK para performance_goals quando source = "performance_review". Rastreia meta que originou o item PDI.';

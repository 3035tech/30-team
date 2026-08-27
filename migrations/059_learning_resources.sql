-- 059 — Learning resources (B-1008, Epic B-1000)
-- Catálogo leve de ações/trilhas de desenvolvimento. Sem LMS, sem player, sem SCORM.
-- PDI pode apontar para recursos do catálogo.

-- Catálogo de recursos de aprendizagem (company-scoped)
CREATE TABLE IF NOT EXISTS learning_resources (
  id                   BIGSERIAL PRIMARY KEY,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  theme                TEXT,
  resource_type        TEXT NOT NULL DEFAULT 'course',
  url                  TEXT,
  duration_hours       INT,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT learning_resources_title_len CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 300),
  CONSTRAINT learning_resources_description_len CHECK (char_length(description) <= 2000),
  CONSTRAINT learning_resources_theme_len CHECK (theme IS NULL OR char_length(theme) <= 100),
  CONSTRAINT learning_resources_type_chk CHECK (resource_type IN ('course', 'article', 'video', 'book', 'workshop', 'mentoring', 'other')),
  CONSTRAINT learning_resources_duration_chk CHECK (duration_hours IS NULL OR (duration_hours >= 1 AND duration_hours <= 1000))
);

CREATE INDEX IF NOT EXISTS idx_learning_resources_company
  ON learning_resources (company_id, active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_resources_theme
  ON learning_resources (company_id, theme)
  WHERE active = TRUE AND theme IS NOT NULL;

COMMENT ON TABLE learning_resources IS
  'Catálogo leve de recursos de aprendizagem (ações/trilhas) que o PDI pode apontar. Sem LMS, sem player, sem SCORM.';

COMMENT ON COLUMN learning_resources.theme IS
  'Tema/área do recurso (ex: Liderança, Comunicação, Técnico). Livre, sem taxonomia rígida.';

COMMENT ON COLUMN learning_resources.resource_type IS
  'course | article | video | book | workshop | mentoring | other. Indicativo, não gera comportamento diferente.';

COMMENT ON COLUMN learning_resources.url IS
  'URL externa do recurso (plataforma de curso, artigo, etc.). Opcional.';

COMMENT ON COLUMN learning_resources.duration_hours IS
  'Duração estimada em horas (1-1000). Opcional, só para contexto no PDI.';

-- Opcional: link explícito entre PDI item e recurso (muitos-para-muitos)
-- Se preferir simplicidade, PDI pode só referenciar no texto/notes
CREATE TABLE IF NOT EXISTS development_plan_resource_links (
  id                   BIGSERIAL PRIMARY KEY,
  plan_item_id         BIGINT NOT NULL REFERENCES development_plan_items(id) ON DELETE CASCADE,
  resource_id          BIGINT NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_item_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_dev_plan_resource_links_item
  ON development_plan_resource_links (plan_item_id);

CREATE INDEX IF NOT EXISTS idx_dev_plan_resource_links_resource
  ON development_plan_resource_links (resource_id);

COMMENT ON TABLE development_plan_resource_links IS
  'Link opcional PDI item → recurso de aprendizagem. Permite sugerir ações concretas no plano.';

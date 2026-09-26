-- Relation plus frozen wording: a snapshot does not require JSONB storage.
-- Additive transition: retain the old draft column on already-migrated databases.
CREATE UNIQUE INDEX IF NOT EXISTS formal_review_cycles_tenant_identity ON formal_review_cycles(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS company_competencies_tenant_identity ON company_competencies(id, company_id);
DO $$ BEGIN
  IF to_regclass('public.formal_cycle_competencies') IS NOT NULL THEN RETURN; END IF;
CREATE TABLE formal_cycle_competencies (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id BIGINT NOT NULL,
  competency_id BIGINT NOT NULL,
  label TEXT NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 200),
  description TEXT NOT NULL DEFAULT '',
  self_description TEXT NOT NULL DEFAULT '',
  sort_order SMALLINT NOT NULL CHECK (sort_order BETWEEN 0 AND 29),
  FOREIGN KEY (cycle_id, company_id) REFERENCES formal_review_cycles(id, company_id) ON DELETE CASCADE,
  FOREIGN KEY (competency_id, company_id) REFERENCES company_competencies(id, company_id) ON DELETE RESTRICT,
  UNIQUE (cycle_id, competency_id),
  UNIQUE (cycle_id, sort_order)
);
CREATE INDEX IF NOT EXISTS formal_cycle_competencies_catalog_idx ON formal_cycle_competencies(company_id, competency_id);
-- Compatibility only for the previous local migration 128 draft. Never overwrite rows.
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'formal_review_cycles' AND column_name = 'questionnaire') THEN
    INSERT INTO formal_cycle_competencies(company_id, cycle_id, competency_id, label, description, self_description, sort_order)
    SELECT c.company_id, c.id, (q.item->>'competencyId')::bigint,
           q.item->>'label', COALESCE(q.item->>'description', ''), COALESCE(q.item->>'selfDescription', ''), (q.ordinality - 1)::smallint
    FROM formal_review_cycles c
    CROSS JOIN LATERAL jsonb_array_elements(c.questionnaire) WITH ORDINALITY q(item, ordinality)
    WHERE NOT EXISTS (SELECT 1 FROM formal_cycle_competencies existing WHERE existing.cycle_id = c.id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
-- Roll back application before database changes; retain both data representations.

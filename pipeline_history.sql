-- Histórico de mudanças de estágio no pipeline de candidatos.
-- Rodar diretamente no pgAdmin antes de deployar o código.

CREATE TABLE IF NOT EXISTS assessment_pipeline_history (
    id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    from_stage TEXT,
    to_stage   TEXT NOT NULL,
    changed_by_user_id BIGINT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_history_assessment
    ON assessment_pipeline_history(assessment_id, changed_at DESC);

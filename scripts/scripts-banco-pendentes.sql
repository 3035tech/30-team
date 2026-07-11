-- Telemetria de integridade do teste de eneagrama (duração + cópias na tela).
-- Visível apenas para role admin na API/UI.
-- Execute este arquivo no banco da aplicação (pgAdmin / psql).

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS fill_duration_ms INTEGER;

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS copy_event_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assessments_fill_duration_ms_check'
  ) THEN
    ALTER TABLE assessments
      ADD CONSTRAINT assessments_fill_duration_ms_check
      CHECK (fill_duration_ms IS NULL OR fill_duration_ms >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assessments_copy_event_count_check'
  ) THEN
    ALTER TABLE assessments
      ADD CONSTRAINT assessments_copy_event_count_check
      CHECK (copy_event_count >= 0);
  END IF;
END $$;

COMMENT ON COLUMN assessments.fill_duration_ms IS
  'Tempo (ms) entre início do teste e envio — sinal soft de preenchimento rápido/IA';
COMMENT ON COLUMN assessments.copy_event_count IS
  'Quantidade de eventos copy/cut na tela do teste (ex.: Ctrl+C nas perguntas)';

INSERT INTO schema_migrations (name) VALUES ('013_assessment_integrity.sql')
ON CONFLICT (name) DO NOTHING;

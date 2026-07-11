-- Telemetria de integridade do teste de eneagrama (duração + cópias na tela).
-- Visível apenas para role admin na API/UI.

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS fill_duration_ms INTEGER
    CHECK (fill_duration_ms IS NULL OR fill_duration_ms >= 0),
  ADD COLUMN IF NOT EXISTS copy_event_count INTEGER NOT NULL DEFAULT 0
    CHECK (copy_event_count >= 0);

COMMENT ON COLUMN assessments.fill_duration_ms IS
  'Tempo (ms) entre início do teste e envio — sinal soft de preenchimento rápido/IA';
COMMENT ON COLUMN assessments.copy_event_count IS
  'Quantidade de eventos copy/cut na tela do teste (ex.: Ctrl+C nas perguntas)';

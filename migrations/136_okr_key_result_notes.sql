-- 136: Observação livre no resultado-chave.
--
-- Modelagem: texto rico (HTML sanitizado por lib/sanitize-html.js) editável do próprio KR
-- (contexto, premissas, fonte do dado). Limite de 2000 caracteres de texto na aplicação;
-- o CHECK cobre o HTML gerado (tags inclusas).
-- Uma observação por KR, sem histórico próprio → coluna TEXT com limite de tamanho.
-- Comentários de medição continuam em okr_key_result_checkins.note (histórico por evento).

ALTER TABLE okr_key_results
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

ALTER TABLE okr_key_results
  DROP CONSTRAINT IF EXISTS okr_key_results_notes_len_chk;
ALTER TABLE okr_key_results
  ADD CONSTRAINT okr_key_results_notes_len_chk CHECK (char_length(notes) <= 8000);

COMMENT ON COLUMN okr_key_results.notes IS
  'Observação do resultado-chave em HTML sanitizado (até 2000 caracteres de texto, 8000 de HTML). Comentários de check-in ficam em okr_key_result_checkins.note.';

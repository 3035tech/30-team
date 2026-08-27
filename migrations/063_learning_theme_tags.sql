-- 063 — learning_resources.theme supports multiple tags (comma-separated)
-- UI shows chips; storage remains TEXT. Bumps length for several tags.

ALTER TABLE learning_resources
  DROP CONSTRAINT IF EXISTS learning_resources_theme_len;

ALTER TABLE learning_resources
  ADD CONSTRAINT learning_resources_theme_len
  CHECK (theme IS NULL OR char_length(theme) <= 400);

COMMENT ON COLUMN learning_resources.theme IS
  'Temas/tags do recurso, separados por vírgula (ex: "Liderança, Comunicação"). UI: chips; filtro casa um token.';

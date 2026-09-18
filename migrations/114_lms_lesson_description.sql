-- Descrição opcional por aula, compartilhada pelos fluxos de link/vídeo e PDF.
ALTER TABLE lms_lessons
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN lms_lessons.description IS
  'Optional sanitized lesson description shown with the lesson content.';

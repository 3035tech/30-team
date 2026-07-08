-- Adiciona coluna de notas de RH na tabela candidates.
-- Rodar diretamente no pgAdmin antes de deployar o código.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS hr_notes TEXT;

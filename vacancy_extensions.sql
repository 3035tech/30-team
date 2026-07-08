-- Campos de planejamento de vagas: número de posições e data-alvo de encerramento.
-- Rodar diretamente no pgAdmin antes de deployar o código.

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS positions_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS target_date DATE;

-- 016: descrição e faixa salarial da vaga (cadastro RH)

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS salary_min TEXT,
  ADD COLUMN IF NOT EXISTS salary_max TEXT;

COMMENT ON COLUMN vacancies.description IS 'Descrição / pontos importantes da vaga (HTML do editor rico)';
COMMENT ON COLUMN vacancies.salary_min IS 'Faixa salarial mínima (ex.: 3500.00, sem máscara)';
COMMENT ON COLUMN vacancies.salary_max IS 'Faixa salarial máxima (ex.: 8000.00, sem máscara)';

-- 015: perfil ampliado do candidato (contato + contexto RH)
-- Sem currículo. Campos opcionais; preenchimento principal na entrevista.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS salary_expectation TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT;

COMMENT ON COLUMN candidates.phone IS 'Telefone / WhatsApp';
COMMENT ON COLUMN candidates.linkedin_url IS 'URL do perfil LinkedIn';
COMMENT ON COLUMN candidates.city IS 'Cidade';
COMMENT ON COLUMN candidates.state IS 'UF / estado (ex.: SP)';
COMMENT ON COLUMN candidates.salary_expectation IS 'Pretensão ou faixa salarial (texto livre)';
COMMENT ON COLUMN candidates.availability IS 'Disponibilidade: immediate | 15_days | 30_days | 60_days | other';
COMMENT ON COLUMN candidates.source IS 'Fonte: linkedin | referral | agency | job_board | other';

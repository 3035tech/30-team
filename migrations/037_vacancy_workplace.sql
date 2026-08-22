-- Local / modalidade da vaga (base para agregadores SEO futuros — B-119)
ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS workplace_modality TEXT,
  ADD COLUMN IF NOT EXISTS workplace_city TEXT,
  ADD COLUMN IF NOT EXISTS workplace_state TEXT;

COMMENT ON COLUMN vacancies.workplace_modality IS
  'onsite | hybrid | remote | NULL';
COMMENT ON COLUMN vacancies.workplace_city IS
  'Cidade do local de trabalho (texto livre; opcional se remote)';
COMMENT ON COLUMN vacancies.workplace_state IS
  'UF brasileira (2 letras) do local; opcional';

CREATE INDEX IF NOT EXISTS idx_vacancies_public_workplace_modality
  ON vacancies (workplace_modality)
  WHERE deleted = FALSE
    AND public_page_enabled = TRUE
    AND status = 'open'
    AND workplace_modality IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vacancies_public_workplace_city
  ON vacancies (LOWER(workplace_city))
  WHERE deleted = FALSE
    AND public_page_enabled = TRUE
    AND status = 'open'
    AND workplace_city IS NOT NULL
    AND btrim(workplace_city) <> '';

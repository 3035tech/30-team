-- 030: perfil público da empresa + página indexável da vaga (/vaga/…)
-- URL estável por slug (não o token /v que expira) para SEO / Google for Jobs / crawlers de IA.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS about_html TEXT;

COMMENT ON COLUMN companies.website IS
  'URL do site institucional (https://…). Usada no hiringOrganization do JobPosting quando a vaga permite.';
COMMENT ON COLUMN companies.about_html IS
  'Texto institucional em HTML sanitizado para a página pública da vaga (quando public_show_company_info).';

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS public_page_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_allow_index BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_show_company_info BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_show_salary BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN vacancies.public_page_enabled IS
  'Se TRUE, a página pública /vaga/{companySlug}/{vacancySlug} fica acessível.';
COMMENT ON COLUMN vacancies.public_allow_index IS
  'Se TRUE (e página habilitada + vaga open), robots index/follow + JSON-LD JobPosting para buscadores/IA.';
COMMENT ON COLUMN vacancies.public_show_company_info IS
  'Se TRUE, a página pública exibe nome/site/sobre da empresa.';
COMMENT ON COLUMN vacancies.public_show_salary IS
  'Se TRUE, a página pública exibe a faixa salarial da vaga (não pretensão do candidato).';

-- Lookup estável company.slug + vacancy.slug (soft-delete filtrado na query)
CREATE INDEX IF NOT EXISTS idx_vacancies_company_slug_public
  ON vacancies (company_id, LOWER(slug))
  WHERE deleted = FALSE AND public_page_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_vacancies_public_open_created
  ON vacancies (created_at DESC)
  WHERE deleted = FALSE
    AND public_page_enabled = TRUE
    AND public_allow_index = TRUE
    AND status = 'open';

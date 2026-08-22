-- 031: indexação pública da vaga ligada por padrão em novas vagas
-- (página pública ainda precisa de public_page_enabled = TRUE)

ALTER TABLE vacancies
  ALTER COLUMN public_allow_index SET DEFAULT TRUE;

COMMENT ON COLUMN vacancies.public_allow_index IS
  'Se TRUE (e página habilitada + vaga open), robots index/follow + JSON-LD JobPosting para buscadores/IA. Default TRUE em novas vagas; o gestor pode desligar.';

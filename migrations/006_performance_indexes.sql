-- 006: índices para listagens e filtros frequentes (dashboard, export, candidatos).
-- Orçamento Postgres: réplicas_app × PG_POOL_MAX × (1 + read_replica_pool) ≤ max_connections.

-- Vagas ativas por empresa (WHERE deleted = FALSE nas listagens)
CREATE INDEX IF NOT EXISTS idx_vacancies_company_created_active
  ON vacancies (company_id, created_at DESC)
  WHERE deleted = FALSE;

-- Filtro por enneagrama (top_type) dentro da empresa
CREATE INDEX IF NOT EXISTS idx_assessments_company_top_created
  ON assessments (company_id, top_type, created_at DESC);

-- Candidatos: upsert/lookup por nome na mesma empresa (email vazio)
CREATE INDEX IF NOT EXISTS idx_candidates_company_lower_name
  ON candidates (company_id, (LOWER(full_name)));

-- Auditoria por ator
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created
  ON audit_log (actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;

/**
 * DTOV extension for public /jobs page + company profile (migration 030).
 * Exemplar do padrão: feature nova → fixture que enriquece o baseline.
 */

/**
 * @param {import('pg').Client} client
 */
export async function seed(client) {
  const company = await client.query(
    `SELECT id FROM companies WHERE slug = 'todos-os-dados-demo' AND deleted = FALSE LIMIT 1`
  );
  if (!company.rowCount) {
    throw new Error('public-vacancy-page fixture requires baseline company todos-os-dados-demo');
  }
  const companyId = company.rows[0].id;

  await client.query(
    `UPDATE companies
     SET website = $2,
         about_html = $3,
         public_profile_enabled = TRUE
     WHERE id = $1 AND deleted = FALSE`,
    [
      companyId,
      'https://todos-os-dados.demo',
      '<p>Empresa demo do 30Team — dados completos para validação de fluxos de RH.</p>',
    ]
  );

  // Vaga aberta: página pública + indexação + empresa + salário + local (agregadores B-119)
  await client.query(
    `UPDATE vacancies
     SET employment_type = COALESCE(employment_type, 'clt'),
         public_page_enabled = TRUE,
         public_allow_index = TRUE,
         public_show_company_info = TRUE,
         public_show_salary = TRUE,
         workplace_modality = COALESCE(workplace_modality, 'remote'),
         workplace_city = COALESCE(NULLIF(btrim(workplace_city), ''), 'São Paulo'),
         workplace_state = COALESCE(NULLIF(btrim(workplace_state), ''), 'SP')
     WHERE company_id = $1
       AND slug = 'engenheiro-fullstack-plataforma'
       AND deleted = FALSE`,
    [companyId]
  );

  // Massa mínima para agregadores: outras vagas open+indexáveis da demo → remoto/SP
  await client.query(
    `UPDATE vacancies
     SET workplace_modality = COALESCE(workplace_modality, 'remote'),
         workplace_city = COALESCE(NULLIF(btrim(workplace_city), ''), 'São Paulo'),
         workplace_state = COALESCE(NULLIF(btrim(workplace_state), ''), 'SP'),
         public_page_enabled = TRUE,
         public_allow_index = TRUE
     WHERE company_id = $1
       AND deleted = FALSE
       AND status = 'open'
       AND slug <> 'analista-dados-encerrada'
       AND id IN (
         SELECT id FROM vacancies
         WHERE company_id = $1 AND deleted = FALSE AND status = 'open'
         ORDER BY id
         LIMIT 3
       )`,
    [companyId]
  );

  // Vaga fechada: página ainda acessível (agradecimento + outras vagas), sem index
  await client.query(
    `UPDATE vacancies
     SET employment_type = COALESCE(employment_type, 'pj'),
         public_page_enabled = TRUE,
         public_allow_index = FALSE,
         public_show_company_info = TRUE,
         public_show_salary = FALSE
     WHERE company_id = $1
       AND slug = 'analista-dados-encerrada'
       AND deleted = FALSE`,
    [companyId]
  );

  const openVac = await client.query(
    `SELECT id FROM vacancies
     WHERE company_id = $1 AND slug = 'engenheiro-fullstack-plataforma' AND deleted = FALSE
     LIMIT 1`,
    [companyId]
  );
  if (openVac.rowCount) {
    const vacancyId = openVac.rows[0].id;
    await client.query(
      `INSERT INTO referral_codes (company_id, vacancy_id, code, label, active)
       SELECT $1, $2, 'DTOVREF', 'DTOV demo referral', TRUE
       WHERE NOT EXISTS (
         SELECT 1 FROM referral_codes WHERE LOWER(code) = LOWER('DTOVREF')
       )`,
      [companyId, vacancyId]
    );
    await client.query(
      `INSERT INTO job_funnel_events (
         company_id, vacancy_id, event_type, session_id, source, medium, campaign, referral_code
       ) VALUES
         ($1, $2, 'job_view', 'dtov-session-a', 'referral', 'referral', 'dtov-ref', 'DTOVREF'),
         ($1, $2, 'job_view', 'dtov-session-b', 'referral', 'referral', 'dtov-ref', 'DTOVREF'),
         ($1, $2, 'apply_start', 'dtov-session-a', 'referral', 'referral', 'dtov-ref', 'DTOVREF'),
         ($1, $2, 'apply_complete', 'dtov-session-a', 'referral', 'referral', 'dtov-ref', 'DTOVREF'),
         ($1, $2, 'interview', 'dtov-session-a', 'referral', 'referral', 'dtov-ref', 'DTOVREF'),
         ($1, $2, 'hired', 'dtov-session-a', 'referral', 'referral', 'dtov-ref', 'DTOVREF')`,
      [companyId, vacancyId]
    );
  }
}

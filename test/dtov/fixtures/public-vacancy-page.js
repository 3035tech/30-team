/**
 * Extensão DTOV para página pública /vaga + perfil de empresa (migration 030).
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
         about_html = $3
     WHERE id = $1 AND deleted = FALSE`,
    [
      companyId,
      'https://todos-os-dados.demo',
      '<p>Empresa demo do 30Team — dados completos para validação de fluxos de RH.</p>',
    ]
  );

  // Vaga aberta: página pública + indexação + empresa + salário
  await client.query(
    `UPDATE vacancies
     SET employment_type = COALESCE(employment_type, 'clt'),
         public_page_enabled = TRUE,
         public_allow_index = TRUE,
         public_show_company_info = TRUE,
         public_show_salary = TRUE
     WHERE company_id = $1
       AND slug = 'engenheiro-fullstack-plataforma'
       AND deleted = FALSE`,
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
      `INSERT INTO job_funnel_events (
         company_id, vacancy_id, event_type, session_id, source, medium, campaign
       ) VALUES
         ($1, $2, 'job_view', 'dtov-session-a', 'linkedin', 'social', 'share-bar'),
         ($1, $2, 'job_view', 'dtov-session-b', 'linkedin', 'social', 'share-bar'),
         ($1, $2, 'apply_start', 'dtov-session-a', 'linkedin', 'social', 'share-bar'),
         ($1, $2, 'apply_complete', 'dtov-session-a', 'linkedin', 'social', 'share-bar')`,
      [companyId, vacancyId]
    );
  }
}

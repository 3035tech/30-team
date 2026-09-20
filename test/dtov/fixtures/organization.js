export async function seed(client) {
  const { rows: [company] } = await client.query("SELECT id FROM companies WHERE slug='todos-os-dados-demo' AND deleted=FALSE");
  if (!company) throw new Error('organization fixture requires baseline');
  const { rows: [root] } = await client.query(`INSERT INTO org_units(company_id,name) VALUES($1,'Operações DTOV')
    ON CONFLICT DO NOTHING RETURNING id`, [company.id]);
  const rootId = root?.id || (await client.query("SELECT id FROM org_units WHERE company_id=$1 AND name='Operações DTOV' AND parent_id IS NULL AND active", [company.id])).rows[0].id;
  await client.query("INSERT INTO org_units(company_id,name,parent_id) VALUES($1,'Produto DTOV',$2) ON CONFLICT DO NOTHING", [company.id, rootId]);
  await client.query("UPDATE candidates SET org_unit_id=$1 WHERE company_id=$2 AND email='colaborador@todos-os-dados.demo' AND employment_status='employee'", [rootId, company.id]);
}

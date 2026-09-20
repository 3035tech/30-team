export async function seed(client) {
  await client.query(`UPDATE candidate_dp_profiles p SET address_number='30A'
    FROM candidates c WHERE c.id=p.candidate_id AND c.company_id=p.company_id
    AND c.email='colaborador@todos-os-dados.demo'`);
}

export async function seed(client) {
  // Baseline is test-only; retain a real early access origin for migration proof.
  await client.query("UPDATE users SET signup_source='early_access' WHERE email='direction@todos-os-dados.demo'");
  await client.query(`INSERT INTO company_licenses(company_id, starts_at, expires_at)
    SELECT company_id, created_at, ((created_at AT TIME ZONE 'UTC') + interval '1 year') AT TIME ZONE 'UTC'
    FROM users WHERE email='direction@todos-os-dados.demo'
    ON CONFLICT(company_id) DO NOTHING`);
}

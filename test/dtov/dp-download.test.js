/** Local-only integration: real web handlers + DTOV SQL, S3 bytes served by a local fake. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import pg from 'pg';
import { dtovEnv, assertDtovTarget } from './harness.js';

const base = 'http://127.0.0.1:3010';
const env = dtovEnv({
  JWT_SECRET: 'dtov-smoke-jwt-secret-min-32-chars-long',
  COOKIE_SECURE: 'false', PORT: '3010', HOSTNAME: '127.0.0.1',
  NEXT_PUBLIC_APP_URL: base, NODE_ENV: 'production', NEXT_DIST_DIR: '.next-polish-build',
  S3_BUCKET: 'dtov-private', S3_REGION: 'us-east-1', S3_ENDPOINT: 'http://127.0.0.1:3059',
  S3_FORCE_PATH_STYLE: 'true', S3_ACCESS_KEY_ID: 'dtov-only', S3_SECRET_ACCESS_KEY: 'dtov-only',
});
assertDtovTarget(env);
const client = new pg.Client({ host: env.POSTGRES_HOST, port: Number(env.POSTGRES_PORT), database: env.POSTGRES_DB, user: env.POSTGRES_USER, password: env.POSTGRES_PASSWORD, ssl: false });
let server;
let s3Reads = 0;
let unavailable = false;
const bytes = Buffer.from('%PDF-1.4\nSynthetic private attachment\n%%EOF');
const storage = createServer((req, res) => {
  s3Reads++;
  if (unavailable) {
    res.writeHead(403, { 'content-type': 'application/xml' });
    res.end('<Error><Code>AccessDenied</Code><Message>Simulated denial</Message></Error>');
    return;
  }
  res.writeHead(200, { 'content-type': 'application/pdf', 'content-length': bytes.length });
  res.end(bytes);
});
const request = (path, cookie = '', options = {}) => fetch(base + path, {
  ...options, redirect: 'manual', signal: AbortSignal.timeout(15000),
  headers: { cookie, 'content-type': 'application/json', ...options.headers },
});
async function login(path, email) {
  const response = await request(path, '', { method: 'POST', body: JSON.stringify({ email, password: 'DemoTodosDados!2026', locale: 'pt-BR' }) });
  assert.equal(response.status, 200, `login ${path}: ${await response.clone().text()}`);
  return response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
}
let checks = 0;
async function download(path, cookie) {
  const response = await request(path, cookie);
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-disposition'), /^attachment;/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  checks++;
}
async function denied(path, cookie, status) {
  const reads = s3Reads;
  const response = await request(path, cookie);
  assert.equal(response.status, status, `${path}: ${await response.clone().text()}`);
  assert.equal(s3Reads, reads, 'denied request must not access storage');
  checks++;
}
try {
  await client.connect();
  const { rows: [employee] } = await client.query("SELECT id, company_id FROM candidates WHERE email = 'colaborador@todos-os-dados.demo' AND employment_status = 'employee'");
  assert.ok(employee, 'seed employee required');
  const cid = employee.company_id;
  const candidateId = employee.id;
  const docKey = `companies/${cid}/dp-docs/${candidateId}/address_proof/test.pdf`;
  await client.query(`INSERT INTO employee_dp_documents (company_id,candidate_id,doc_key,status,file_key,file_name,file_url)
    VALUES ($1,$2,'address_proof','received',$3,'Comprovante.pdf','https://private.invalid/test.pdf')
    ON CONFLICT (candidate_id,doc_key) DO UPDATE SET file_key=$3,file_name='Comprovante.pdf',status='received',signature_status='none'`, [cid,candidateId,docKey]);
  const { rows: [leave] } = await client.query(`INSERT INTO employee_leave_requests
    (company_id,candidate_id,leave_type,starts_on,ends_on) VALUES ($1,$2,'sick','2026-09-20','2026-09-20') RETURNING id`, [cid,candidateId]);
  await client.query('UPDATE employee_leave_requests SET file_key=$1,file_name=$2 WHERE id=$3', [`companies/${cid}/dp-leave/${candidateId}/${leave.id}/test.pdf`,'Atestado.pdf',leave.id]);
  const { rows: [foreignCompany] } = await client.query("INSERT INTO companies (name,slug) VALUES ('DP isolation test','dp-isolation-' || gen_random_uuid()) RETURNING id");
  const { rows: [foreignEmployee] } = await client.query("INSERT INTO candidates (company_id,full_name,employment_status) VALUES ($1,'Synthetic employee','employee') RETURNING id", [foreignCompany.id]);
  const { rows: [foreignLeave] } = await client.query("INSERT INTO employee_leave_requests (company_id,candidate_id,leave_type,starts_on,ends_on) VALUES ($1,$2,'sick','2026-09-20','2026-09-20') RETURNING id", [foreignCompany.id,foreignEmployee.id]);
  storage.listen(3059, '127.0.0.1');
  await once(storage, 'listening');
  server = spawn(process.execPath, ['.next-polish-build/standalone/server.js'], { env, stdio: 'inherit' });
  const deadline = Date.now() + 30000;
  let ready = false;
  while (Date.now() < deadline) {
    try { if ((await request('/login')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  assert.ok(ready, 'compiled server ready');
  const empCookie = await login('/api/auth/employee/login', 'colaborador@todos-os-dados.demo');
  const hrCookie = await login('/api/auth/login', 'hr@todos-os-dados.demo');
  const empDoc = '/api/employee/dp/documents/address_proof/file';
  const empLeave = `/api/employee/dp/leave/${leave.id}/file`;
  const hrDoc = `/api/admin/candidates/${candidateId}/dp/documents/address_proof/file`;
  const hrLeave = `/api/admin/dp/leave/${leave.id}/file?companyId=${cid}`;
  for (const [path,cookie] of [[empDoc,empCookie],[empLeave,empCookie],[hrDoc,hrCookie],[hrLeave,hrCookie]]) await download(path,cookie);
  for (const path of [empDoc,empLeave,hrDoc,hrLeave]) await denied(path,'',401);
  await denied(`/api/employee/dp/leave/${foreignLeave.id}/file`,empCookie,404);
  await denied(`/api/admin/candidates/${foreignEmployee.id}/dp/documents/address_proof/file`,hrCookie,404);
  await denied(`/api/admin/dp/leave/${foreignLeave.id}/file?companyId=${foreignCompany.id}`,hrCookie,404);
  await client.query("UPDATE employee_dp_documents SET file_key=$1 WHERE candidate_id=$2 AND doc_key='address_proof'", [`companies/${foreignCompany.id}/dp-docs/${foreignEmployee.id}/address_proof/test.pdf`,candidateId]);
  await denied(empDoc,empCookie,401);
  await client.query("UPDATE employee_dp_documents SET file_key=$1,signature_status='signed' WHERE candidate_id=$2 AND doc_key='address_proof'", [docKey,candidateId]);
  await download(empDoc,empCookie);
  const locked = await request(empDoc,empCookie,{ method:'DELETE' });
  assert.equal((await locked.json()).errorCode, 'DP_SIGNATURE_LOCKED');
  checks++;
  unavailable = true;
  const failure = await request(empDoc,empCookie);
  assert.equal(failure.status,500);
  assert.equal((await failure.json()).errorCode,'INTERNAL');
  checks++;
  console.log(`DP download integration: ${checks} checks passed (real SQL/handlers; local fake S3).`);
} finally {
  if (server) { server.kill('SIGTERM'); await once(server,'exit'); }
  storage.closeAllConnections();
  if (storage.listening) await new Promise(resolve => storage.close(resolve));
  await client.end();
  const down = spawnSync(process.execPath, ['test/dtov/harness.js','down'], { env, stdio:'inherit' });
  if (down.status !== 0) process.exitCode = 1;
}

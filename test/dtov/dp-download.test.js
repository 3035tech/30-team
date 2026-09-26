/** Local-only integration: real web handlers + DTOV SQL, S3 bytes served by a local fake. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import pg from 'pg';
import { dtovEnv, assertDtovTarget } from './harness.js';

const base = 'http://127.0.0.1:3010';
const buildDir = process.env.DTOV_BUILD_DIR || '.next-polish-build';
const env = dtovEnv({
  JWT_SECRET: 'dtov-smoke-jwt-secret-min-32-chars-long',
  COOKIE_SECURE: 'false', PORT: '3010', HOSTNAME: '127.0.0.1',
  NEXT_PUBLIC_APP_URL: base, NODE_ENV: 'production', NEXT_DIST_DIR: buildDir,
  S3_BUCKET: 'dtov-private', S3_REGION: 'us-east-1', S3_ENDPOINT: 'http://127.0.0.1:3059',
  S3_FORCE_PATH_STYLE: 'true', S3_ACCESS_KEY_ID: 'dtov-only', S3_SECRET_ACCESS_KEY: 'dtov-only',
});
assertDtovTarget(env);
const client = new pg.Client({ host: env.POSTGRES_HOST, port: Number(env.POSTGRES_PORT), database: env.POSTGRES_DB, user: env.POSTGRES_USER, password: env.POSTGRES_PASSWORD, ssl: false });
let server;
let browser;
let s3Reads = 0;
let unavailable = false;
const bytes = Buffer.from('%PDF-1.4\nSynthetic private attachment\n%%EOF');
const storedObjects = new Map();
const storage = createServer(async (req, res) => {
  s3Reads++;
  if (unavailable) {
    res.writeHead(403, { 'content-type': 'application/xml' });
    res.end('<Error><Code>AccessDenied</Code><Message>Simulated denial</Message></Error>');
    return;
  }
  const key = req.url.split('?')[0];
  if (req.method === 'PUT') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    storedObjects.set(key, { bytes: Buffer.concat(chunks), type: req.headers['content-type'] });
    res.writeHead(200); res.end(); return;
  }
  if (req.method === 'DELETE') { storedObjects.delete(key); res.writeHead(204); res.end(); return; }
  const object = storedObjects.get(key) || { bytes, type: 'application/pdf' };
  res.writeHead(200, { 'content-type': object.type, 'content-length': object.bytes.length });
  res.end(object.bytes);
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
async function download(path, cookie, expected = bytes) {
  const response = await request(path, cookie);
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-disposition'), /^attachment;/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected);
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
  server = spawn(process.execPath, [`${buildDir}/standalone/server.js`], { env, stdio: 'inherit' });
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
  unavailable = false;
  await client.query("UPDATE employee_dp_documents SET signature_status='none' WHERE candidate_id=$1 AND doc_key='address_proof'", [candidateId]);
  const auditStart = new Date();
  browser = await chromium.launch({ headless: true });
  const imagePage = await browser.newPage({ viewport: { width: 2, height: 2 } });
  const jpeg = await imagePage.screenshot({ type: 'jpeg' });
  await imagePage.close();
  const pdf = await readFile('public/demo/lms-guide.pdf');
  const fixtures = [['Synthetic.pdf', 'application/pdf', pdf], ['Synthetic.jpg', 'image/jpeg', jpeg], ['Synthetic.jpeg', 'image/jpeg', jpeg]];
  for (const [path, cookie] of [[hrDoc, hrCookie], [empDoc, empCookie]]) {
    for (const [name, mime, content] of fixtures) {
    const form = new FormData();
    form.set('file', new Blob([content], { type: mime }), name);
    const uploaded = await fetch(base + path, { method: 'POST', headers: { cookie }, body: form, signal: AbortSignal.timeout(15000) });
    assert.equal(uploaded.status, 200, `upload ${path}: ${await uploaded.clone().text()}`);
    const item = (await uploaded.json()).item;
    assert.equal(item.fileName, name);
    await download(path, cookie, content);
    const reloaded = await request(path === hrDoc ? `/api/admin/candidates/${candidateId}/dp` : '/api/employee/dp', cookie);
    assert.equal(reloaded.status, 200);
    const listing = await reloaded.json();
    assert.ok(listing.documents.some(doc => doc.docKey === 'address_proof' && doc.fileName === name), 'fresh API read preserves uploaded name');
    const snapshot = await client.query('SELECT file_key,file_name,status FROM employee_dp_documents WHERE candidate_id=$1 AND doc_key=$2', [candidateId,'address_proof']);
    for (const [badBytes, errorCode] of [[Buffer.from('not a PDF'), 'INVALID_CV_FILE_TYPE'], [Buffer.alloc(5*1024*1024+1), 'INVALID_CV_FILE_SIZE']]) {
      const invalid = new FormData();
      invalid.set('file', new Blob([badBytes], {type:'application/pdf'}), 'bad.pdf');
      const rejected = await fetch(base + path, {method:'POST',headers:{cookie},body:invalid});
      assert.equal(rejected.status,400);
      assert.equal((await rejected.json()).errorCode,errorCode);
      const after = await client.query('SELECT file_key,file_name,status FROM employee_dp_documents WHERE candidate_id=$1 AND doc_key=$2', [candidateId,'address_proof']);
      assert.deepEqual(after.rows,snapshot.rows,'failed upload preserves existing file association');
      checks++;
    }
    checks++;
    const removed = await request(path, cookie, { method: 'DELETE' });
    assert.equal(removed.status, 200, `delete ${path}: ${await removed.clone().text()}`);
    checks++;
    }
  }
  const { rows: audits } = await client.query(`SELECT action, actor_kind, actor_user_id, actor_candidate_id, metadata
    FROM audit_log WHERE company_id=$1 AND target_id=$2 AND created_at >= $3
    AND action IN ('dp.document.file_uploaded','dp.document.file_removed')`, [cid,String(candidateId),auditStart]);
  assert.equal(audits.length,12, 'all successful document mutations must be audited');
  assert.equal(audits.filter(row => row.actor_kind === 'employee' && Number(row.actor_candidate_id) === Number(candidateId)).length,6);
  assert.equal(audits.filter(row => row.actor_kind === 'manager' && row.actor_user_id).length,6);
  for (const row of audits) assert.deepEqual(row.metadata, { docKey: 'address_proof' });
  checks++;
  const context = await browser.newContext();
  await context.addCookies(empCookie.split('; ').map(pair => ({ name: pair.slice(0,pair.indexOf('=')), value: pair.slice(pair.indexOf('=')+1), url: base })));
  const page = await context.newPage();
  await page.goto(base + '/employee/dp');
  const row = page.locator('li').filter({ hasText: 'Comprovante de endereço' }).first();
  let uploadRequests = 0;
  page.on('request', req => { if (req.method() === 'POST' && req.url().includes('/documents/')) uploadRequests++; });
  for (const [name, mimeType, buffer, message] of [
    ['bad.exe','application/octet-stream',Buffer.from('bad'),/PDF, JPG, JPEG ou PNG/],
    ['large.pdf','application/pdf',Buffer.alloc(5*1024*1024+1),/até 5 MB/],
  ]) {
    const chooserPromise = page.waitForEvent('filechooser');
    await row.getByRole('button', { name: /anexar arquivo/i }).click();
    await (await chooserPromise).setFiles({name,mimeType,buffer});
    await expect(page.getByText(message)).toBeVisible();
  }
  assert.equal(uploadRequests,0,'invalid files must be stopped before HTTP');
  for (const [name,mimeType,buffer] of fixtures) {
    const chooserPromise = page.waitForEvent('filechooser');
    await row.getByRole('button', { name: /anexar arquivo/i }).click();
    await (await chooserPromise).setFiles({name,mimeType,buffer});
    await expect(row.getByText(name, { exact:true })).toBeVisible();
    await page.reload();
    await expect(row.getByText(name, { exact:true })).toBeVisible();
    await expect(row.getByText(/Atualizado em/)).toBeVisible();
    checks++;
  }
  await context.close();
  await client.query('UPDATE candidates SET session_version=session_version+1 WHERE id=$1 AND company_id=$2', [candidateId,cid]);
  await denied(empDoc,empCookie,401);
  await client.query("UPDATE users SET session_version=session_version+1 WHERE email='hr@todos-os-dados.demo' AND company_id=$1", [cid]);
  await denied(hrDoc,hrCookie,401);
  console.log(`DP download integration: ${checks} checks passed (real SQL/handlers; local fake S3).`);
} finally {
  if (browser) await browser.close();
  if (server) { server.kill('SIGTERM'); await once(server,'exit'); }
  storage.closeAllConnections();
  if (storage.listening) await new Promise(resolve => storage.close(resolve));
  await client.end();
  const down = spawnSync(process.execPath, ['test/dtov/harness.js','down'], { env, stdio:'inherit' });
  if (down.status !== 0) process.exitCode = 1;
}

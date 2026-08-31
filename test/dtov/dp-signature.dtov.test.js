/**
 * DTOV: B-2724 document signature request → sign → lock.
 */
import assert from 'node:assert/strict';
import { query } from '../../lib/db.js';
import {
  DP_DOCUMENT_KEY,
  DP_DOCUMENT_SIGNATURE_STATUS,
} from '../../lib/domain-status.js';
import {
  clearDpDocumentFile,
  ensureDpDocuments,
  requestDpDocumentSignature,
  signDpDocument,
  waiveDpDocumentSignature,
} from '../../lib/people/employee-dp.js';
import { ERR } from '../../lib/api-error-codes.js';

async function main() {
  const co = await query(
    `SELECT id FROM companies WHERE deleted = FALSE AND slug = 'todos-os-dados-demo' LIMIT 1`
  );
  assert.ok(co.rowCount, 'demo company missing — run dtov:reset');
  const companyId = co.rows[0].id;

  const emp = await query(
    `SELECT id FROM candidates
     WHERE company_id = $1 AND email = 'colaborador@todos-os-dados.demo'
     LIMIT 1`,
    [companyId]
  );
  assert.ok(emp.rowCount, 'demo collaborator missing');
  const candidateId = emp.rows[0].id;

  const hr = await query(
    `SELECT id AS "userId" FROM users
     WHERE company_id = $1 AND email = 'hr@todos-os-dados.demo' AND deleted = FALSE
     LIMIT 1`,
    [companyId]
  );
  const userId = hr.rows[0]?.userId || null;

  await ensureDpDocuments({ query }, { companyId, candidateId });

  // Reset contract signature + fake file keys (no S3 needed for signature path)
  const tinyStroke =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  await query(
    `UPDATE employee_dp_documents
     SET file_url = 'https://example.test/contract.pdf',
         file_key = 'demo/contract.pdf',
         file_name = 'contract.pdf',
         status = 'received',
         signature_status = 'none',
         signature_requested_at = NULL,
         signed_at = NULL,
         signer_name = '',
         signer_stroke_png = '',
         signature_consent_version = '',
         signature_file_key = NULL
     WHERE company_id = $1 AND candidate_id = $2 AND doc_key = $3`,
    [companyId, candidateId, DP_DOCUMENT_KEY.CONTRACT]
  );

  const noFile = await requestDpDocumentSignature({ query }, {
    companyId,
    candidateId,
    docKey: DP_DOCUMENT_KEY.ASO,
    requestedByUserId: userId,
  });
  // ASO may have no file
  await query(
    `UPDATE employee_dp_documents
     SET file_url = NULL, file_key = NULL, file_name = '', signature_status = 'none'
     WHERE company_id = $1 AND candidate_id = $2 AND doc_key = $3`,
    [companyId, candidateId, DP_DOCUMENT_KEY.ASO]
  );
  const noFile2 = await requestDpDocumentSignature({ query }, {
    companyId,
    candidateId,
    docKey: DP_DOCUMENT_KEY.ASO,
    requestedByUserId: userId,
  });
  assert.equal(noFile2.ok, false);
  assert.equal(noFile2.errorCode, ERR.DP_SIGNATURE_NO_FILE);
  void noFile;

  const req = await requestDpDocumentSignature({ query }, {
    companyId,
    candidateId,
    docKey: DP_DOCUMENT_KEY.CONTRACT,
    requestedByUserId: userId,
  });
  assert.equal(req.ok, true, req.errorCode);
  assert.equal(req.item.signatureStatus, DP_DOCUMENT_SIGNATURE_STATUS.REQUESTED);

  const badConsent = await signDpDocument({ query }, {
    companyId,
    candidateId,
    docKey: DP_DOCUMENT_KEY.CONTRACT,
    signerName: 'Maria Demo',
    consent: false,
    strokePng: tinyStroke,
  });
  assert.equal(badConsent.ok, false);
  assert.equal(badConsent.errorCode, ERR.DP_SIGNATURE_CONSENT_REQUIRED);

  const noStroke = await signDpDocument({ query }, {
    companyId,
    candidateId,
    docKey: DP_DOCUMENT_KEY.CONTRACT,
    signerName: 'Maria Demo',
    consent: true,
    strokePng: '',
  });
  assert.equal(noStroke.ok, false);
  assert.equal(noStroke.errorCode, ERR.DP_SIGNATURE_STROKE_REQUIRED);

  const signed = await signDpDocument({ query }, {
    companyId,
    candidateId,
    docKey: DP_DOCUMENT_KEY.CONTRACT,
    signerName: 'Maria Demo',
    consent: true,
    strokePng: tinyStroke,
    signerIp: '127.0.0.1',
    signerUserAgent: 'dtov-test',
  });
  assert.equal(signed.ok, true, signed.errorCode);
  assert.equal(signed.item.signatureStatus, DP_DOCUMENT_SIGNATURE_STATUS.SIGNED);
  assert.equal(signed.item.signerName, 'Maria Demo');
  assert.ok(String(signed.item.signerStrokePng || '').startsWith('data:image/png;base64,'));

  const lockedClear = await clearDpDocumentFile({ query }, {
    companyId,
    candidateId,
    docKey: DP_DOCUMENT_KEY.CONTRACT,
    userId,
  });
  assert.equal(lockedClear.ok, false);
  assert.equal(lockedClear.errorCode, ERR.DP_SIGNATURE_LOCKED);

  const waiveLocked = await waiveDpDocumentSignature({ query }, {
    companyId,
    candidateId,
    docKey: DP_DOCUMENT_KEY.CONTRACT,
    waivedByUserId: userId,
  });
  assert.equal(waiveLocked.ok, false);
  assert.equal(waiveLocked.errorCode, ERR.DP_SIGNATURE_LOCKED);

  console.log('dp-signature.dtov.test.js OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

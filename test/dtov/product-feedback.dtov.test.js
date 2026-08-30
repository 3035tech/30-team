/**
 * DTOV proof — product feedback create/list/update (super-admin inbox).
 */
import assert from 'node:assert/strict';
import { query, pool } from '../../lib/db.js';
import {
  PRODUCT_FEEDBACK_KIND,
  PRODUCT_FEEDBACK_STATUS,
} from '../../lib/domain-status.js';
import {
  createProductFeedback,
  listProductFeedback,
  parseProductFeedbackListParams,
  updateProductFeedback,
} from '../../lib/product-feedback.js';

async function main() {
  const parsed = parseProductFeedbackListParams({
    page: '2',
    pageSize: '10',
    status: 'new',
    kind: 'idea',
    q: 'radar',
  });
  assert.equal(parsed.page, 2);
  assert.equal(parsed.pageSize, 10);
  assert.equal(parsed.status, 'new');
  assert.equal(parsed.kind, 'idea');
  assert.equal(parsed.q, 'radar');

  const hr = await query(
    `SELECT u.id AS "userId", u.company_id AS "companyId"
     FROM users u
     WHERE u.email = 'hr@todos-os-dados.demo' AND u.deleted = FALSE
     LIMIT 1`
  );
  assert.ok(hr.rowCount > 0, 'need demo HR user');
  const { userId, companyId } = hr.rows[0];

  const created = await createProductFeedback({ query }, {
    companyId,
    userId,
    kind: PRODUCT_FEEDBACK_KIND.IDEA,
    message: 'DTOV: gostaria de exportar o radar de turnover em CSV.',
    activeTab: 'overview',
    activeSection: null,
    contactOk: true,
  });
  assert.equal(created.ok, true, created.errorCode);
  assert.ok(created.id);

  const short = await createProductFeedback({ query }, {
    companyId,
    userId,
    kind: PRODUCT_FEEDBACK_KIND.BUG,
    message: 'curto',
  });
  assert.equal(short.ok, false);

  const listed = await listProductFeedback({ query }, {
    status: PRODUCT_FEEDBACK_STATUS.NEW,
    kind: PRODUCT_FEEDBACK_KIND.IDEA,
    q: 'DTOV',
    page: 1,
    pageSize: 20,
  });
  assert.ok(listed.total >= 1);
  assert.ok(listed.items.some((r) => r.id === created.id));

  const updated = await updateProductFeedback({ query }, {
    id: created.id,
    status: PRODUCT_FEEDBACK_STATUS.REVIEWING,
    adminNotes: 'Priorizar no próximo ciclo',
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.item.status, PRODUCT_FEEDBACK_STATUS.REVIEWING);

  console.log('product-feedback.dtov.test.js OK');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });

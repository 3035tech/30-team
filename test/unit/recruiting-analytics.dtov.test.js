import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { pool, query } from '../../lib/db.js';
import { getRecruitingUxMetrics } from '../../lib/recruiting-ux-metrics.js';
import { getVacancyFunnelAnalytics } from '../../lib/job-funnel.js';

const dtov = process.env.DTOV === '1';

after(async () => {
  await pool.end();
});

describe('recruiting analytics (DTOV)', { skip: !dtov }, () => {
  it('returns tenant-scoped stage and UX metrics', async () => {
    const vacancy = await query(
      `SELECT id, company_id FROM vacancies WHERE deleted = FALSE ORDER BY id LIMIT 1`
    );
    assert.equal(vacancy.rowCount, 1);
    const vacancyId = Number(vacancy.rows[0].id);
    const companyId = Number(vacancy.rows[0].company_id);

    const funnel = await getVacancyFunnelAnalytics({ vacancyId, companyId, isAdmin: false });
    assert.equal(funnel.ok, true);
    assert.ok(Array.isArray(funnel.stagePerformance));

    await query(
      `INSERT INTO audit_log (company_id, action, metadata)
       VALUES ($1, 'recruiting.ux.vacancy_create_opened', '{}'::jsonb),
              ($1, 'recruiting.ux.vacancy_create_completed', '{"elapsedMs": 120000}'::jsonb)`,
      [companyId]
    );
    const metrics = await getRecruitingUxMetrics(companyId);
    assert.ok(metrics.opened >= 1);
    assert.ok(metrics.completed >= 1);
    assert.equal(metrics.avgElapsedMs, 120000);

    const crossTenant = await getRecruitingUxMetrics(companyId + 99999);
    assert.equal(crossTenant.opened, 0);
  });
});

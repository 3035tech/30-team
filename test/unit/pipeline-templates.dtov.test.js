import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { pool, query } from '../../lib/db.js';
import {
  applyPipelineTemplateToVacancy,
  createPipelineTemplateFromVacancy,
  listPipelineTemplates,
  listVacancyPipelineStages,
} from '../../lib/pipeline-templates.js';

const dtov = process.env.DTOV === '1';

after(async () => {
  await pool.end();
});

describe('vacancy pipeline templates (DTOV)', { skip: !dtov }, () => {
  it('seeds a tenant default, snapshots it to a vacancy and saves a reusable model', async () => {
    const vacancyResult = await query(
      `SELECT id, company_id FROM vacancies WHERE deleted = FALSE ORDER BY id ASC LIMIT 1`
    );
    assert.equal(vacancyResult.rowCount, 1);
    const vacancyId = Number(vacancyResult.rows[0].id);
    const companyId = Number(vacancyResult.rows[0].company_id);

    const templates = await listPipelineTemplates(companyId);
    assert.ok(templates.length >= 1);
    assert.equal(templates.filter((item) => item.isDefault).length, 1);

    await query(`DELETE FROM vacancy_pipeline_stages WHERE vacancy_id = $1`, [vacancyId]);
    const legacyFallbackStages = await listVacancyPipelineStages({ companyId, vacancyId });
    assert.ok(legacyFallbackStages.length >= 5, 'legacy vacancy should receive a lazy snapshot');

    const applied = await applyPipelineTemplateToVacancy({
      companyId,
      vacancyId,
      templateId: templates[0].id,
    });
    assert.equal(applied.ok, true);

    const stages = await listVacancyPipelineStages({ companyId, vacancyId });
    assert.ok(stages.length >= 5);
    assert.equal(stages[0].companyId, companyId);

    const saved = await createPipelineTemplateFromVacancy({
      companyId,
      vacancyId,
      name: `Tecnologia DTOV ${vacancyId}-${Date.now()}`,
      isDefault: false,
    });
    assert.equal(saved.ok, true);

    const otherTenantStages = await listVacancyPipelineStages({ companyId: companyId + 99999, vacancyId });
    assert.deepEqual(otherTenantStages, []);
  });
});

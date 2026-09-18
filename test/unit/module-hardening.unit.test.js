import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function source(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('module hardening', () => {
  it('gates compensation surfaces with dedicated capabilities', () => {
    assert.match(source('app/api/admin/compensation/route.js'), /CAP\.COMPENSATION_VIEW/);
    assert.match(source('app/api/admin/candidates/[id]/compensation/route.js'), /CAP\.COMPENSATION_MANAGE/);
    assert.doesNotMatch(source('app/api/admin/compensation/route.js'), /CAP\.TEAM_VIEW/);
  });

  it('uses the canonical admin API wrapper on the migrated performance route', () => {
    const route = source('app/api/admin/performance-reviews/route.js');
    assert.match(route, /withAdminApi/);
    assert.match(route, /companyFrom: 'query'/);
    assert.match(route, /companyFrom: 'body'/);
  });

  it('ships the compatibility migration and template management endpoint', () => {
    assert.match(source('migrations/112_compensation_module_entitlement.sql'), /array_append/);
    const route = source('app/api/admin/pipeline-templates/[id]/route.js');
    assert.match(route, /export const PATCH/);
    assert.match(route, /export const DELETE/);
  });

  it('lets tenant managers use pipeline templates without a client-supplied company id', () => {
    const manager = source('app/dashboard/vacancies/PipelineTemplatesManager.jsx');
    assert.doesNotMatch(manager, /if \(!companyId \|\| !template\?\.id\)/);
    assert.match(manager, /companyId \? \{ companyId: Number\(companyId\) \} : \{\}/);
  });

  it('keeps recruiting UX telemetry tenant-scoped and free of vacancy copy', () => {
    const route = source('app/api/admin/recruiting-ux-event/route.js');
    assert.match(route, /CAP\.VACANCIES_MANAGE/);
    assert.match(route, /companyFrom: 'body'/);
    assert.doesNotMatch(route, /description|salary|candidate/i);
  });
});

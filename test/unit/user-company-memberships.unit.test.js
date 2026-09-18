import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function source(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('user company memberships expand migration', () => {
  it('adds an idempotent membership table without contracting legacy users', () => {
    const migration = source('migrations/115_user_company_memberships.sql');

    assert.match(migration, /CREATE TABLE IF NOT EXISTS user_company_memberships/);
    assert.match(migration, /UNIQUE \(user_id, company_id\)/);
    assert.match(migration, /ON CONFLICT \(user_id, company_id\) DO NOTHING/);
    assert.match(migration, /WHERE u\.company_id IS NOT NULL/);
    assert.doesNotMatch(migration, /DROP COLUMN|ALTER COLUMN .* SET NOT NULL/);
  });

  it('keeps operator and bootstrap bundles aligned with migration 115', () => {
    for (const path of [
      'scripts/scripts-banco-pendentes.sql',
      'scripts/rds-bootstrap-completo.sql',
    ]) {
      const sql = source(path);
      assert.match(sql, /CREATE TABLE IF NOT EXISTS user_company_memberships/);
      assert.match(sql, /115_user_company_memberships\.sql/);
      assert.match(sql, /ON CONFLICT \(user_id, company_id\) DO NOTHING/);
    }
  });
});

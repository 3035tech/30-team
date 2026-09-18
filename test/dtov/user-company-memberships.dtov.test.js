/**
 * DTOV proof — expand-only employer memberships and preservation backfill.
 */
import assert from 'node:assert/strict';
import { pool, query } from '../../lib/db.js';

async function main() {
  await query(`
    INSERT INTO user_company_memberships (user_id, company_id, role, active, deleted)
    SELECT id, company_id, role, (active = TRUE AND deleted = FALSE), deleted
    FROM users
    WHERE company_id IS NOT NULL
    ON CONFLICT (user_id, company_id) DO NOTHING
  `);

  const preservation = await query(`
    SELECT
      COUNT(*) FILTER (WHERE u.company_id IS NOT NULL)::int AS "legacyCount",
      COUNT(m.id)::int AS "membershipCount",
      COUNT(*) FILTER (
        WHERE u.company_id IS NOT NULL
          AND (
            m.id IS NULL
            OR m.role IS DISTINCT FROM u.role
            OR m.active IS DISTINCT FROM (u.active = TRUE AND u.deleted = FALSE)
            OR m.deleted IS DISTINCT FROM u.deleted
          )
      )::int AS "mismatchCount"
    FROM users u
    LEFT JOIN user_company_memberships m
      ON m.user_id = u.id
     AND m.company_id = u.company_id
  `);
  assert.equal(preservation.rows[0].membershipCount, preservation.rows[0].legacyCount);
  assert.equal(preservation.rows[0].mismatchCount, 0);

  const duplicates = await query(`
    SELECT user_id, company_id, COUNT(*)::int AS n
    FROM user_company_memberships
    GROUP BY user_id, company_id
    HAVING COUNT(*) > 1
  `);
  assert.equal(duplicates.rowCount, 0);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const legacy = await client.query(`
      SELECT id, company_id AS "companyId", role
      FROM users
      WHERE company_id IS NOT NULL AND deleted = FALSE
      ORDER BY id ASC
      LIMIT 1
    `);
    assert.equal(legacy.rowCount, 1, 'need one tenant-scoped DTOV manager');
    const user = legacy.rows[0];

    const company = await client.query(`
      INSERT INTO companies (name, slug, active)
      VALUES ('DTOV Membership Company', 'dtov-membership-company', TRUE)
      RETURNING id
    `);
    const secondCompanyId = company.rows[0].id;

    await client.query(
      `INSERT INTO user_company_memberships (user_id, company_id, role)
       VALUES ($1, $2, 'direction')`,
      [user.id, secondCompanyId]
    );

    const memberships = await client.query(
      `SELECT company_id AS "companyId", role
       FROM user_company_memberships
       WHERE user_id = $1 AND active = TRUE AND deleted = FALSE
       ORDER BY company_id ASC`,
      [user.id]
    );
    assert.equal(memberships.rowCount, 2);
    assert.ok(memberships.rows.some((row) => row.role === user.role));
    assert.ok(memberships.rows.some((row) => row.role === 'direction'));

    await client.query('SAVEPOINT duplicate_membership');
    await assert.rejects(
      client.query(
        `INSERT INTO user_company_memberships (user_id, company_id, role)
         VALUES ($1, $2, 'hr')`,
        [user.id, secondCompanyId]
      ),
      (error) => error?.code === '23505'
    );
    await client.query('ROLLBACK TO SAVEPOINT duplicate_membership');

    const beforeRetry = await client.query(
      `SELECT COUNT(*)::int AS n FROM user_company_memberships WHERE user_id = $1`,
      [user.id]
    );
    await client.query(`
      INSERT INTO user_company_memberships (user_id, company_id, role, active, deleted)
      SELECT id, company_id, role, (active = TRUE AND deleted = FALSE), deleted
      FROM users
      WHERE company_id IS NOT NULL
      ON CONFLICT (user_id, company_id) DO NOTHING
    `);
    const afterRetry = await client.query(
      `SELECT COUNT(*)::int AS n FROM user_company_memberships WHERE user_id = $1`,
      [user.id]
    );
    assert.equal(afterRetry.rows[0].n, beforeRetry.rows[0].n);

    const unchanged = await client.query(
      `SELECT company_id AS "companyId", role FROM users WHERE id = $1`,
      [user.id]
    );
    assert.equal(Number(unchanged.rows[0].companyId), Number(user.companyId));
    assert.equal(unchanged.rows[0].role, user.role);

    await client.query('ROLLBACK');
    await client.query('BEGIN');
    await client.query('DROP TABLE user_company_memberships');
    const legacyUsersAfterDrop = await client.query(
      `SELECT COUNT(*)::int AS n FROM users WHERE company_id IS NOT NULL`
    );
    assert.ok(legacyUsersAfterDrop.rows[0].n > 0);
    await client.query('ROLLBACK');

    const restored = await client.query(
      `SELECT to_regclass('public.user_company_memberships') AS name`
    );
    assert.equal(restored.rows[0].name, 'user_company_memberships');
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    await pool.end().catch(() => {});
  }

  console.log('user-company-memberships.dtov.test.js OK');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/**
 * Unit proof — AdminListPager page window (ellipsis).
 */
import assert from 'node:assert/strict';
import { buildAdminPagerPages } from '../../lib/admin-list-pager.js';

function main() {
  assert.deepEqual(buildAdminPagerPages(1, 1), [1]);
  assert.deepEqual(buildAdminPagerPages(2, 5), [1, 2, 3, 4, 5]);

  const mid = buildAdminPagerPages(10, 40);
  assert.equal(mid[0], 1);
  assert.equal(mid[mid.length - 1], 40);
  assert.ok(mid.includes(10));
  assert.ok(mid.includes('ellipsis'));
  assert.ok(mid.filter((x) => x === 'ellipsis').length >= 1);

  const early = buildAdminPagerPages(2, 40);
  assert.equal(early[0], 1);
  assert.ok(!early.includes(20));

  const late = buildAdminPagerPages(39, 40);
  assert.equal(late[late.length - 1], 40);
  assert.ok(late.includes(39));

  console.log('admin-list-pager.unit.test.js OK');
}

main();

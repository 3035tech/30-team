/**
 * Page-number window for AdminListPager (ellipsis when many pages).
 * Pure helper — safe for client and unit tests.
 *
 * @param {number} page current (1-based)
 * @param {number} totalPages
 * @param {{ siblingCount?: number, boundaryCount?: number }} [opts]
 * @returns {Array<number|'ellipsis'>}
 */
export function buildAdminPagerPages(page, totalPages, opts = {}) {
  const siblingCount = Math.max(0, Number(opts.siblingCount) || 1);
  const boundaryCount = Math.max(1, Number(opts.boundaryCount) || 1);
  const total = Math.max(1, Math.floor(Number(totalPages) || 1));
  const current = Math.min(Math.max(1, Math.floor(Number(page) || 1)), total);

  const totalNumbers = siblingCount * 2 + 3 + boundaryCount * 2;
  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const siblingsStart = Math.max(
    Math.min(current - siblingCount, total - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2
  );
  const siblingsEnd = Math.min(
    Math.max(current + siblingCount, boundaryCount + siblingCount * 2 + 2),
    total - boundaryCount - 1
  );

  /** @type {Array<number|'ellipsis'>} */
  const items = [];
  for (let i = 1; i <= boundaryCount; i += 1) items.push(i);

  if (siblingsStart > boundaryCount + 2) {
    items.push('ellipsis');
  } else if (siblingsStart === boundaryCount + 2) {
    items.push(boundaryCount + 1);
  }

  for (let i = siblingsStart; i <= siblingsEnd; i += 1) items.push(i);

  if (siblingsEnd < total - boundaryCount - 1) {
    items.push('ellipsis');
  } else if (siblingsEnd === total - boundaryCount - 1) {
    items.push(total - boundaryCount);
  }

  for (let i = total - boundaryCount + 1; i <= total; i += 1) items.push(i);
  return items;
}

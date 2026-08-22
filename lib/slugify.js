/**
 * Normalize free text into a URL-safe slug (vacancies, companies, public job keys).
 * @param {unknown} input
 * @param {{ maxLength?: number }} [opts]
 */
export function slugify(input, opts = {}) {
  const maxRaw = Number(opts.maxLength);
  const maxLength = Number.isFinite(maxRaw) && maxRaw > 0 ? Math.floor(maxRaw) : 64;
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
}

/**
 * Normalize free text into a URL-safe slug (vacancies, companies, public job keys).
 * Strips diacritics (NFD) so “São Paulo” → “sao-paulo”, not “s-o-paulo”.
 * @param {unknown} input
 * @param {{ maxLength?: number }} [opts]
 */
export function slugify(input, opts = {}) {
  const maxRaw = Number(opts.maxLength);
  const maxLength = Number.isFinite(maxRaw) && maxRaw > 0 ? Math.floor(maxRaw) : 64;
  return String(input || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
}

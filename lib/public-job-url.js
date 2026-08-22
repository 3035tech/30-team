/**
 * Paths canônicos públicos — sem DB (seguro para client components).
 * Prefixo curto e neutro (pt/en), alinhado a `/t` `/v` `/r`.
 */

function appBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

/** Prefixo canônico da página pública de vaga (neutro entre idiomas). */
export const PUBLIC_JOB_PATH_PREFIX = '/j';

/** Prefixo canônico do perfil público da empresa (neutro: company). */
export const PUBLIC_COMPANY_PATH_PREFIX = '/c';

/**
 * Path canônico: `/j/{slug}-{id}` (id = vacancies.id).
 * Aceita objeto `{ vacancySlug|slug, vacancyId|id }` ou args legados
 * `(companySlug, vacancySlug, vacancyId)` — companySlug é ignorado na URL nova.
 */
export function publicVacancyPath(a, b, c) {
  let vacancySlug = '';
  let vacancyId = null;
  if (a != null && typeof a === 'object' && !Array.isArray(a)) {
    vacancySlug = String(a.vacancySlug ?? a.slug ?? '').trim();
    vacancyId = Number(a.vacancyId ?? a.id);
  } else if (c != null || (b != null && /^\d+$/.test(String(b)))) {
    if (c != null) {
      vacancySlug = String(b || '').trim();
      vacancyId = Number(c);
    } else {
      vacancySlug = String(a || '').trim();
      vacancyId = Number(b);
    }
  } else {
    vacancySlug = String(b || a || '').trim();
    vacancyId = NaN;
  }
  if (!Number.isFinite(vacancyId) || vacancyId <= 0) return PUBLIC_JOB_PATH_PREFIX;
  const slugPart = vacancySlug || 'role';
  return `${PUBLIC_JOB_PATH_PREFIX}/${encodeURIComponent(slugPart)}-${vacancyId}`;
}

export function publicVacancyAbsoluteUrl(a, b, c) {
  const base = appBaseUrl();
  const path = publicVacancyPath(a, b, c);
  return base ? `${base}${path}` : path;
}

/** Path canônico: `/c/{companySlug}`. */
export function publicCompanyPath(companySlug) {
  const slug = String(companySlug || '').trim();
  if (!slug) return PUBLIC_COMPANY_PATH_PREFIX;
  return `${PUBLIC_COMPANY_PATH_PREFIX}/${encodeURIComponent(slug)}`;
}

export function publicCompanyAbsoluteUrl(companySlug) {
  const base = appBaseUrl();
  const path = publicCompanyPath(companySlug);
  return base ? `${base}${path}` : path;
}

/** URL antiga (bookmarks / redirect). */
export function legacyPublicVacancyPath(companySlug, vacancySlug) {
  const c = encodeURIComponent(String(companySlug || '').trim());
  const v = encodeURIComponent(String(vacancySlug || '').trim());
  return `/vaga/${c}/${v}`;
}

/**
 * Parse `/j/{slug}-{id}` segment (ou só `{id}`).
 * @returns {{ slug: string, id: number } | null}
 */
export function parsePublicJobKey(jobKey) {
  const raw = decodeURIComponent(String(jobKey || '').trim());
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return null;
    return { slug: '', id };
  }
  const m = raw.match(/^(.*)-(\d+)$/);
  if (!m) return null;
  const id = Number(m[2]);
  if (!Number.isFinite(id) || id <= 0) return null;
  return { slug: String(m[1] || '').trim(), id };
}

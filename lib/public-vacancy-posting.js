/**
 * Página pública da vaga (/vaga/{companySlug}/{vacancySlug}) — resolve + SEO JobPosting.
 */

import { queryRead } from './db.js';
import { htmlToPlainText } from './sanitize-html.js';
import { normalizeLocale } from './i18n.js';
import { salaryAmountNumber } from './br-masks.js';
import { normalizeEmploymentType } from './vacancy-employment-type.js';
import { cache } from 'react';
function appBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

export function publicVacancyPath(companySlug, vacancySlug) {
  const c = encodeURIComponent(String(companySlug || '').trim());
  const v = encodeURIComponent(String(vacancySlug || '').trim());
  return `/vaga/${c}/${v}`;
}

export function publicVacancyAbsoluteUrl(companySlug, vacancySlug) {
  const base = appBaseUrl();
  const path = publicVacancyPath(companySlug, vacancySlug);
  return base ? `${base}${path}` : path;
}

/** Schema.org / Google for Jobs employmentType */
export function schemaEmploymentType(employmentType) {
  const v = normalizeEmploymentType(employmentType);
  if (v === 'internship') return 'INTERN';
  if (v === 'pj') return 'CONTRACTOR';
  if (v === 'cooperative') return 'OTHER';
  if (v === 'clt') return 'FULL_TIME';
  return null;
}

function clipPlain(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

/**
 * @returns {Promise<
 *   | { ok: true, posting: object }
 *   | { ok: false, errorCode: string, status?: number }
 * >}
 */
async function resolvePublicVacancyPostingUncached(companySlug, vacancySlug) {
  const cSlug = String(companySlug || '').trim();
  const vSlug = String(vacancySlug || '').trim();
  if (!cSlug || !vSlug) return { ok: false, errorCode: 'NOT_FOUND', status: 404 };

  const r = await queryRead(
    `SELECT
       v.id AS "vacancyId",
       v.title,
       v.slug AS "vacancySlug",
       v.status,
       v.description,
       v.salary_min AS "salaryMin",
       v.salary_max AS "salaryMax",
       v.employment_type AS "employmentType",
       v.target_date AS "targetDate",
       v.created_at AS "createdAt",
       v.public_page_enabled AS "publicPageEnabled",
       v.public_allow_index AS "publicAllowIndex",
       v.public_show_company_info AS "publicShowCompanyInfo",
       v.public_show_salary AS "publicShowSalary",
       c.id AS "companyId",
       c.name AS "companyName",
       c.slug AS "companySlug",
       c.website AS "companyWebsite",
       c.about_html AS "companyAboutHtml",
       vl.token AS "applyToken",
       vl.expires_at AS "applyTokenExpiresAt"
     FROM vacancies v
     JOIN companies c ON c.id = v.company_id
     LEFT JOIN LATERAL (
       SELECT token, expires_at
       FROM vacancy_links
       WHERE vacancy_id = v.id AND active = TRUE AND expires_at > NOW()
       ORDER BY expires_at DESC NULLS LAST
       LIMIT 1
     ) vl ON TRUE
     WHERE LOWER(c.slug) = LOWER($1)
       AND LOWER(v.slug) = LOWER($2)
       AND v.deleted = FALSE
       AND c.deleted = FALSE
       AND c.active = TRUE
       AND v.public_page_enabled = TRUE
     LIMIT 1`,
    [cSlug, vSlug]
  );

  if (r.rowCount === 0) return { ok: false, errorCode: 'NOT_FOUND', status: 404 };

  const row = r.rows[0];
  const showCompany = Boolean(row.publicShowCompanyInfo);
  const showSalary = Boolean(row.publicShowSalary);
  const allowIndex = Boolean(row.publicAllowIndex) && String(row.status) === 'open';
  const applyPath = row.applyToken ? `/v/${row.applyToken}` : null;
  const applyUrl = applyPath && appBaseUrl() ? `${appBaseUrl()}${applyPath}` : applyPath;
  const pageUrl = publicVacancyAbsoluteUrl(row.companySlug, row.vacancySlug);

  const posting = {
    vacancyId: row.vacancyId,
    title: row.title,
    vacancySlug: row.vacancySlug,
    status: row.status,
    description: row.description || '',
    employmentType: row.employmentType || null,
    targetDate: row.targetDate || null,
    createdAt: row.createdAt,
    publicAllowIndex: allowIndex,
    showCompany,
    showSalary,
    salaryMin: showSalary ? row.salaryMin : null,
    salaryMax: showSalary ? row.salaryMax : null,
    company: showCompany
      ? {
          id: row.companyId,
          name: row.companyName,
          slug: row.companySlug,
          website: row.companyWebsite || null,
          aboutHtml: row.companyAboutHtml || '',
        }
      : {
          id: row.companyId,
          name: null,
          slug: row.companySlug,
          website: null,
          aboutHtml: '',
        },
    companySlug: row.companySlug,
    companyId: row.companyId,
    pageUrl,
    applyUrl,
    applyPath,
  };

  return { ok: true, posting };
}

/** Dedupa generateMetadata + page no mesmo request. */
export const resolvePublicVacancyPosting = cache(resolvePublicVacancyPostingUncached);

const PUBLIC_LIST_CAP = 48;

/**
 * Vagas abertas com página pública habilitada (para /vagas e “outras vagas”).
 * @param {{ companyId?: number|null, excludeVacancyId?: number|null, limit?: number }} [opts]
 */
export async function listOpenPublicVacancies(opts = {}) {
  const limitRaw = Number(opts.limit);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(PUBLIC_LIST_CAP, Math.max(1, Math.floor(limitRaw)))
    : 12;
  const companyId =
    opts.companyId != null && Number.isFinite(Number(opts.companyId))
      ? Number(opts.companyId)
      : null;
  const excludeId =
    opts.excludeVacancyId != null && Number.isFinite(Number(opts.excludeVacancyId))
      ? Number(opts.excludeVacancyId)
      : null;

  const params = [];
  const where = [
    'v.deleted = FALSE',
    'c.deleted = FALSE',
    'c.active = TRUE',
    'v.public_page_enabled = TRUE',
    'v.public_allow_index = TRUE',
    `v.status = 'open'`,
  ];

  if (excludeId != null) {
    params.push(excludeId);
    where.push(`v.id <> $${params.length}`);
  }

  // Prefer same company first when companyId is set (related on closed page).
  const orderParts = [];
  if (companyId != null) {
    params.push(companyId);
    orderParts.push(`CASE WHEN v.company_id = $${params.length} THEN 0 ELSE 1 END`);
  }
  orderParts.push('v.created_at DESC');

  params.push(limit);
  const limI = params.length;

  const r = await queryRead(
    `SELECT
       v.id AS "vacancyId",
       v.title,
       v.slug AS "vacancySlug",
       v.employment_type AS "employmentType",
       v.public_show_company_info AS "publicShowCompanyInfo",
       c.id AS "companyId",
       c.name AS "companyName",
       c.slug AS "companySlug"
     FROM vacancies v
     JOIN companies c ON c.id = v.company_id
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderParts.join(', ')}
     LIMIT $${limI}`,
    params
  );

  return (r.rows || []).map((row) => {
    const showCompany = Boolean(row.publicShowCompanyInfo);
    return {
      vacancyId: row.vacancyId,
      title: row.title,
      vacancySlug: row.vacancySlug,
      employmentType: row.employmentType || null,
      path: publicVacancyPath(row.companySlug, row.vacancySlug),
      url: publicVacancyAbsoluteUrl(row.companySlug, row.vacancySlug),
      companyName: showCompany ? row.companyName : null,
      companySlug: row.companySlug,
    };
  });
}

/**
 * Meta description (plain text) a partir do HTML da vaga.
 */
export function postingMetaDescription(posting, locale = 'pt-BR') {
  const en = normalizeLocale(locale) === 'en';
  const fromDesc = clipPlain(htmlToPlainText(posting?.description || ''), 155);
  if (fromDesc) return fromDesc;
  const title = posting?.title || (en ? 'Open role' : 'Vaga aberta');
  const company = posting?.showCompany && posting?.company?.name ? posting.company.name : null;
  if (company) {
    return en ? `${title} at ${company}. Apply now.` : `${title} na ${company}. Candidate-se.`;
  }
  return en ? `${title}. Apply now.` : `${title}. Candidate-se.`;
}

/**
 * JSON-LD JobPosting (Google for Jobs + crawlers de IA).
 * Só incluir campos autorizados pelas flags; sem inventar localização.
 */
export function buildJobPostingJsonLd(posting, locale = 'pt-BR') {
  if (!posting) return null;
  // Vaga fechada: não publicar JobPosting (Google for Jobs / crawlers).
  if (String(posting.status || '') !== 'open' || !posting.publicAllowIndex) return null;
  const en = normalizeLocale(locale) === 'en';
  const descriptionHtml = String(posting.description || '').trim();
  const descriptionPlain = clipPlain(htmlToPlainText(descriptionHtml), 5000) || posting.title;

  const orgName =
    posting.showCompany && posting.company?.name
      ? posting.company.name
      : en
        ? 'Hiring company'
        : 'Empresa contratante';

  const hiringOrganization = {
    '@type': 'Organization',
    name: orgName,
  };
  if (posting.showCompany && posting.company?.website) {
    hiringOrganization.sameAs = posting.company.website;
    hiringOrganization.url = posting.company.website;
  }

  const emp = schemaEmploymentType(posting.employmentType);
  const datePosted = posting.createdAt
    ? new Date(posting.createdAt).toISOString().slice(0, 10)
    : undefined;
  let validThrough;
  if (posting.targetDate) {
    const raw = posting.targetDate;
    let d = '';
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
      d = raw.toISOString().slice(0, 10);
    } else {
      const s = String(raw).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) d = s.slice(0, 10);
      else {
        const parsed = new Date(s);
        if (!Number.isNaN(parsed.getTime())) d = parsed.toISOString().slice(0, 10);
      }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) validThrough = `${d}T23:59:59-03:00`;
  }

  const json = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: posting.title,
    description: descriptionHtml || descriptionPlain,
    datePosted,
    hiringOrganization,
    identifier: {
      '@type': 'PropertyValue',
      name: orgName,
      value: String(posting.vacancyId),
    },
    url: posting.pageUrl || undefined,
    directApply: Boolean(posting.applyUrl),
  };

  if (validThrough) json.validThrough = validThrough;
  if (emp) json.employmentType = emp;

  // Sem cidade cadastrada: país BR + TELECOMMUTE opcional é ambíguo.
  // Usamos Country (Brasil) como applicantLocationRequirements — padrão do produto.
  json.applicantLocationRequirements = {
    '@type': 'Country',
    name: en ? 'Brazil' : 'Brasil',
  };
  json.jobLocationType = 'TELECOMMUTE';

  if (posting.showSalary && (posting.salaryMin || posting.salaryMax)) {
    const min = salaryAmountNumber(posting.salaryMin);
    const max = salaryAmountNumber(posting.salaryMax);
    if (min != null || max != null) {
      const value = { '@type': 'QuantitativeValue', unitText: 'MONTH' };
      if (min != null) value.minValue = min;
      if (max != null) value.maxValue = max;
      if (min != null && max == null) value.value = min;
      json.baseSalary = {
        '@type': 'MonetaryAmount',
        currency: 'BRL',
        value,
      };
    }
  }

  return json;
}

/** Escape seguro para embutir JSON-LD em <script> (evita fechar a tag). */
export function serializeJsonLdForScript(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

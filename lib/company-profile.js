/**
 * Campos de perfil público da empresa (site + sobre).
 */

import { sanitizeInterviewNotesHtml } from './sanitize-html.js';

const WEBSITE_MAX = 500;
const ABOUT_MAX = 50_000;

/**
 * Valida e normaliza URL http(s). Vazio → null. Inválido → lança INVALID_WEBSITE.
 */
export function normalizeCompanyWebsite(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (s.length > WEBSITE_MAX) {
    const err = new Error('INVALID_WEBSITE');
    err.code = 'INVALID_WEBSITE';
    throw err;
  }
  let url;
  try {
    url = new URL(s.includes('://') ? s : `https://${s}`);
  } catch {
    const err = new Error('INVALID_WEBSITE');
    err.code = 'INVALID_WEBSITE';
    throw err;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    const err = new Error('INVALID_WEBSITE');
    err.code = 'INVALID_WEBSITE';
    throw err;
  }
  return url.toString().replace(/\/$/, '') === `${url.origin}` ? url.origin : url.toString();
}

export function cleanCompanyAboutHtml(raw) {
  if (raw == null || raw === '') return null;
  const html = sanitizeInterviewNotesHtml(raw, ABOUT_MAX);
  return html || null;
}

/**
 * Extrai website / aboutHtml do body.
 * Omitidos → undefined (PATCH não atualiza). forCreate: omitidos → null.
 */
export function parseCompanyProfileFromBody(body = {}, { forCreate = false } = {}) {
  const hasWebsite = body.website !== undefined;
  const hasAbout =
    body.aboutHtml !== undefined || body.about_html !== undefined || body.about !== undefined;

  let website;
  if (forCreate) {
    website = hasWebsite ? normalizeCompanyWebsite(body.website) : null;
  } else if (hasWebsite) {
    website = normalizeCompanyWebsite(body.website);
  } else {
    website = undefined;
  }

  let aboutHtml;
  if (forCreate) {
    aboutHtml = hasAbout
      ? cleanCompanyAboutHtml(body.aboutHtml ?? body.about_html ?? body.about)
      : null;
  } else if (hasAbout) {
    aboutHtml = cleanCompanyAboutHtml(body.aboutHtml ?? body.about_html ?? body.about);
  } else {
    aboutHtml = undefined;
  }

  return { website, aboutHtml };
}

export const COMPANY_PROFILE_SQL_SELECT = `
  c.website,
  c.about_html AS "aboutHtml"`.trim();

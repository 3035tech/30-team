/** Campos de perfil do candidato (contato + contexto RH). Sem currículo. */

export const AVAILABILITY_VALUES = ['immediate', '15_days', '30_days', '60_days', 'other'];
export const SOURCE_VALUES = ['linkedin', 'referral', 'agency', 'job_board', 'other'];

function cleanText(v, max) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function cleanLinkedIn(v) {
  const s = cleanText(v, 500);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/linkedin\.com\//i.test(s)) return `https://${s.replace(/^\/+/, '')}`;
  if (/^[\w-]+\/?$/i.test(s)) return `https://www.linkedin.com/in/${s.replace(/\/$/, '')}`;
  return s;
}

function cleanState(v) {
  const s = cleanText(v, 32);
  if (!s) return null;
  if (s.length === 2) return s.toUpperCase();
  return s;
}

function cleanEnum(v, allowed) {
  const s = cleanText(v, 40);
  if (!s) return null;
  return allowed.includes(s) ? s : s;
}

/**
 * Normaliza payload de perfil a partir do body da API / formulário.
 * @returns {{ phone, linkedinUrl, city, state, salaryExpectation, availability, source }}
 */
export function normalizeCandidateProfile(input = {}) {
  return {
    phone: cleanText(input.phone ?? input.telefone, 40),
    linkedinUrl: cleanLinkedIn(input.linkedinUrl ?? input.linkedin ?? input.linkedin_url),
    city: cleanText(input.city ?? input.cidade, 120),
    state: cleanState(input.state ?? input.uf),
    salaryExpectation: cleanText(input.salaryExpectation ?? input.salary ?? input.pretensao, 120),
    availability: cleanEnum(input.availability ?? input.disponibilidade, AVAILABILITY_VALUES),
    source: cleanEnum(input.source ?? input.fonte, SOURCE_VALUES),
  };
}

/** Fragmentos SQL para INSERT/UPDATE (valores já normalizados). */
export function profileToSqlParams(profile) {
  return [
    profile.phone,
    profile.linkedinUrl,
    profile.city,
    profile.state,
    profile.salaryExpectation,
    profile.availability,
    profile.source,
  ];
}

export const PROFILE_SQL_COLS = `
  phone, linkedin_url, city, state, salary_expectation, availability, source`.trim();

export const PROFILE_SQL_SELECT = `
  phone,
  linkedin_url AS "linkedinUrl",
  city,
  state,
  salary_expectation AS "salaryExpectation",
  availability,
  source`.trim();

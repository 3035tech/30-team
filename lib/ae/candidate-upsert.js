import { query } from '../db';
import { normalizeCandidateProfile, profileToSqlParams } from '../candidate-profile';
import { titleCasePersonName } from '../person-name';

export function normalizeEmail(email) {
  const e = (email || '').trim();
  return e.length ? e.toLowerCase() : null;
}

function profileUpdateFragment() {
  const cols = [
    'phone',
    'linkedin_url',
    'city',
    'state',
    'salary_expectation',
    'availability',
    'source',
  ];
  return cols.map((c) => `${c} = COALESCE(EXCLUDED.${c}, candidates.${c})`).join(', ');
}

/** Upsert candidato por e-mail ou nome (mesmo padrão do Eneagrama). */
export async function upsertCandidate({ companyId, fullName, email, profile: profileInput }) {
  const safeName = titleCasePersonName(fullName).slice(0, 200);
  const safeEmail = normalizeEmail(email);
  const profile = normalizeCandidateProfile(profileInput || {});
  const p = profileToSqlParams(profile);

  if (!safeName || !companyId) {
    return { ok: false, errorCode: 'NAME_AND_COMPANY_REQUIRED' };
  }

  if (safeEmail) {
    const up = await query(
      `INSERT INTO candidates (
         company_id, full_name, email, consent_at,
         phone, linkedin_url, city, state, salary_expectation, availability, source
       ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (company_id, LOWER(email)) WHERE email IS NOT NULL
       DO UPDATE SET
         full_name = EXCLUDED.full_name,
         consent_at = NOW(),
         ${profileUpdateFragment()}
       RETURNING id`,
      [companyId, safeName, safeEmail, ...p]
    );
    return { ok: true, candidateId: up.rows[0].id };
  }

  const existing = await query(
    `SELECT id FROM candidates
     WHERE company_id = $1 AND LOWER(full_name) = LOWER($2) AND (email IS NULL OR email = '')
     ORDER BY created_at DESC LIMIT 1`,
    [companyId, safeName]
  );
  if (existing.rowCount > 0) {
    const id = existing.rows[0].id;
    await query(
      `UPDATE candidates SET
         phone = COALESCE($2, phone),
         linkedin_url = COALESCE($3, linkedin_url),
         city = COALESCE($4, city),
         state = COALESCE($5, state),
         salary_expectation = COALESCE($6, salary_expectation),
         availability = COALESCE($7, availability),
         source = COALESCE($8, source)
       WHERE id = $1`,
      [id, ...p]
    );
    return { ok: true, candidateId: id };
  }

  const ins = await query(
    `INSERT INTO candidates (
       company_id, full_name, consent_at,
       phone, linkedin_url, city, state, salary_expectation, availability, source
     ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [companyId, safeName, ...p]
  );
  return { ok: true, candidateId: ins.rows[0].id };
}

/**
 * Pré-cadastro na entrevista: cria/atualiza por email sem marcar consentimento LGPD
 * (consentimento vem no formulário do teste).
 */
export async function upsertCandidatePreInterview({ companyId, fullName, email, profile: profileInput }) {
  const safeName = titleCasePersonName(fullName).slice(0, 200);
  const safeEmail = normalizeEmail(email);
  const profile = normalizeCandidateProfile(profileInput || {});
  const p = profileToSqlParams(profile);

  if (!safeName || !companyId) {
    return { ok: false, errorCode: 'NAME_AND_COMPANY_REQUIRED' };
  }
  if (!safeEmail) {
    return { ok: false, errorCode: 'EMAIL_REQUIRED' };
  }

  const up = await query(
    `INSERT INTO candidates (
       company_id, full_name, email, consent_at,
       phone, linkedin_url, city, state, salary_expectation, availability, source
     ) VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (company_id, LOWER(email)) WHERE email IS NOT NULL
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       ${profileUpdateFragment()}
     RETURNING id, email, full_name AS "fullName",
               phone, linkedin_url AS "linkedinUrl", city, state,
               salary_expectation AS "salaryExpectation", availability, source`,
    [companyId, safeName, safeEmail, ...p]
  );
  const row = up.rows[0];
  return {
    ok: true,
    candidateId: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    linkedinUrl: row.linkedinUrl,
    city: row.city,
    state: row.state,
    salaryExpectation: row.salaryExpectation,
    availability: row.availability,
    source: row.source,
  };
}

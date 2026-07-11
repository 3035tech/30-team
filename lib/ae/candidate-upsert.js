import { query } from '../db';

export function normalizeEmail(email) {
  const e = (email || '').trim();
  return e.length ? e.toLowerCase() : null;
}

/** Upsert candidato por e-mail ou nome (mesmo padrão do Eneagrama). */
export async function upsertCandidate({ companyId, fullName, email }) {
  const safeName = String(fullName || '').trim();
  const safeEmail = normalizeEmail(email);

  if (!safeName || !companyId) {
    return { ok: false, error: 'Nome e empresa são obrigatórios.' };
  }

  if (safeEmail) {
    const up = await query(
      `INSERT INTO candidates (company_id, full_name, email, consent_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (company_id, LOWER(email)) WHERE email IS NOT NULL
       DO UPDATE SET full_name = EXCLUDED.full_name, consent_at = NOW()
       RETURNING id`,
      [companyId, safeName, safeEmail]
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
    return { ok: true, candidateId: existing.rows[0].id };
  }

  const ins = await query(
    `INSERT INTO candidates (company_id, full_name, consent_at) VALUES ($1, $2, NOW()) RETURNING id`,
    [companyId, safeName]
  );
  return { ok: true, candidateId: ins.rows[0].id };
}

/**
 * Pré-cadastro na entrevista: cria/atualiza por email sem marcar consentimento LGPD
 * (consentimento vem no formulário do teste).
 */
export async function upsertCandidatePreInterview({ companyId, fullName, email }) {
  const safeName = String(fullName || '').trim();
  const safeEmail = normalizeEmail(email);

  if (!safeName || !companyId) {
    return { ok: false, error: 'Nome e empresa são obrigatórios.' };
  }
  if (!safeEmail) {
    return { ok: false, error: 'E-mail é obrigatório.' };
  }

  const up = await query(
    `INSERT INTO candidates (company_id, full_name, email, consent_at)
     VALUES ($1, $2, $3, NULL)
     ON CONFLICT (company_id, LOWER(email)) WHERE email IS NOT NULL
     DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id, email, full_name AS "fullName"`,
    [companyId, safeName, safeEmail]
  );
  return {
    ok: true,
    candidateId: up.rows[0].id,
    email: up.rows[0].email,
    fullName: up.rows[0].fullName,
  };
}

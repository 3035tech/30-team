import crypto from 'node:crypto';
import { query, queryRead } from './db';

/** Garante token ativo e não expirado para a vaga (cria uma linha em vacancy_links se precisar). */
export async function ensureActiveVacancyLinkToken(vacancyId) {
  const existing = await queryRead(
    `SELECT token
     FROM vacancy_links
     WHERE vacancy_id = $1 AND active = TRUE AND expires_at > NOW()
     LIMIT 1`,
    [vacancyId]
  );
  if (existing.rowCount > 0) return existing.rows[0].token;
  const token = crypto.randomBytes(24).toString('hex');
  await query(
    `INSERT INTO vacancy_links (vacancy_id, token, active, expires_at)
     VALUES ($1, $2, TRUE, NOW() + INTERVAL '7 days')`,
    [vacancyId, token]
  );
  return token;
}

/**
 * Weekly manager digest — retention watches + stale 1:1s (B-405).
 */

import { asDb } from './ae/as-db.js';
import { notifyCompanyManagers, NOTIF } from './manager-notifications.js';
import { sendTransactionalMail, isMailConfigured } from './mail.js';

const COMPANIES_CAP = 80;
const SIGNALS_CAP = 8;
const STALE_CAP = 8;

function isoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * @returns {Promise<{ companies: number, notified: number, emailed: number }>}
 */
export async function runManagerWeeklyDigest(dbOrQuery, {
  retentionDays = 7,
  staleOneOnOneDays = 21,
  sendEmail = true,
} = {}) {
  const db = asDb(dbOrQuery);
  const retDays = Math.min(30, Math.max(1, Number(retentionDays) || 7));
  const staleDays = Math.min(90, Math.max(7, Number(staleOneOnOneDays) || 21));
  const weekKey = isoWeekKey();

  const companies = await db.query(
    `SELECT c.id
     FROM companies c
     WHERE c.deleted = FALSE
       AND EXISTS (
         SELECT 1 FROM users u
         WHERE u.company_id = c.id
           AND u.deleted = FALSE AND u.active = TRUE
           AND u.role IN ('hr', 'direction', 'admin')
       )
     ORDER BY c.id
     LIMIT $1`,
    [COMPANIES_CAP]
  );

  let notified = 0;
  let emailed = 0;

  for (const { id: companyId } of companies.rows) {
    const retention = await db.query(
      `SELECT DISTINCT ON (n.entity_id)
         n.entity_id AS "candidateId",
         n.payload->>'candidateName' AS "candidateName",
         n.payload->>'signalLabels' AS "signalLabels",
         n.created_at AS "createdAt"
       FROM manager_notifications n
       WHERE n.company_id = $1
         AND n.type = 'retention_watch'
         AND n.created_at >= NOW() - ($2::int * INTERVAL '1 day')
         AND n.entity_id IS NOT NULL
       ORDER BY n.entity_id, n.created_at DESC
       LIMIT $3`,
      [companyId, retDays, SIGNALS_CAP]
    );

    const stale = await db.query(
      `SELECT c.id AS "candidateId", c.full_name AS "candidateName",
              (
                SELECT MAX(o.meeting_date)
                FROM one_on_ones o
                WHERE o.candidate_id = c.id AND o.company_id = $1
              ) AS "lastMeeting"
       FROM candidates c
       WHERE c.company_id = $1
         AND c.employment_status IN ('employee', 'alumni')
         AND NOT EXISTS (
           SELECT 1 FROM one_on_ones o
           WHERE o.candidate_id = c.id
             AND o.company_id = $1
             AND o.meeting_date >= (CURRENT_DATE - ($2::int))
         )
       ORDER BY "lastMeeting" NULLS FIRST, c.full_name ASC
       LIMIT $3`,
      [companyId, staleDays, STALE_CAP]
    );

    const retentionCount = retention.rowCount || 0;
    const staleCount = stale.rowCount || 0;
    if (retentionCount === 0 && staleCount === 0) continue;

    const retentionNames = retention.rows
      .map((r) => r.candidateName || `#${r.candidateId}`)
      .filter(Boolean)
      .slice(0, 5)
      .join(', ');
    const staleNames = stale.rows
      .map((r) => r.candidateName || `#${r.candidateId}`)
      .filter(Boolean)
      .slice(0, 5)
      .join(', ');

    const r = await notifyCompanyManagers(db, {
      companyId,
      type: NOTIF.MANAGER_WEEKLY_DIGEST,
      entityType: 'company',
      entityId: companyId,
      dedupeKey: `weekly_digest:${companyId}:${weekKey}`,
      payload: {
        weekKey,
        retentionCount,
        staleCount,
        retentionNames: retentionNames || '—',
        staleNames: staleNames || '—',
        staleDays,
      },
    });
    notified += r.inserted || 0;

    if (sendEmail && isMailConfigured() && (r.inserted || 0) > 0) {
      const managers = await db.query(
        `SELECT email, display_name AS "displayName"
         FROM users
         WHERE company_id = $1
           AND deleted = FALSE AND active = TRUE
           AND role IN ('hr', 'direction', 'admin')
           AND email IS NOT NULL AND btrim(email) <> ''
         LIMIT 40`,
        [companyId]
      );
      const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
      const teamUrl = base ? `${base}/dashboard?tab=team` : '/dashboard?tab=team';
      for (const m of managers.rows) {
        try {
          const subject = `30Team — resumo semanal (${retentionCount} retenção, ${staleCount} 1:1)`;
          const text = [
            'Resumo semanal 30Team',
            '',
            retentionCount
              ? `Atenção de retenção (últimos ${retDays} dias): ${retentionCount} — ${retentionNames || '—'}`
              : `Sem alertas de retenção nos últimos ${retDays} dias.`,
            staleCount
              ? `1:1 em atraso (>${staleDays} dias ou nunca): ${staleCount} — ${staleNames || '—'}`
              : `Nenhum 1:1 em atraso (>${staleDays} dias).`,
            '',
            `Abrir Equipe: ${teamUrl}`,
          ].join('\n');
          await sendTransactionalMail({ to: m.email, subject, text });
          emailed += 1;
        } catch {
          /* continue */
        }
      }
    }
  }

  return { companies: companies.rowCount, notified, emailed, weekKey };
}

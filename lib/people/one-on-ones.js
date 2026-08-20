import { asDb } from '../ae/as-db.js';
import { isRichTextEmpty, sanitizeRichTextHtml } from '../sanitize-html.js';

const NOTES_MAX = 8000;
const NEXT_STEPS_MAX = 4000;

function trimRichOrNull(value, max) {
  const safe = sanitizeRichTextHtml(value, max);
  if (!safe || isRichTextEmpty(safe)) return null;
  return safe;
}

/**
 * @param {{ query: Function } | Function} dbOrQuery
 * @param {{ candidateId: string|number, companyId?: string|number|null, isAdmin?: boolean }} scope
 */
export async function listOneOnOnes(dbOrQuery, { candidateId, companyId = null, isAdmin = false }) {
  const db = asDb(dbOrQuery);
  const params = [candidateId];
  let companyClause = '';
  if (!isAdmin) {
    if (companyId == null) return [];
    companyClause = 'AND o.company_id = $2';
    params.push(companyId);
  }
  const res = await db.query(
    `SELECT o.id, o.company_id AS "companyId", o.candidate_id AS "candidateId",
            o.meeting_date AS "meetingDate", o.notes, o.next_steps AS "nextSteps",
            o.created_by_user_id AS "createdByUserId",
            o.created_at AS "createdAt", o.updated_at AS "updatedAt",
            u.email AS "createdByName"
     FROM one_on_ones o
     LEFT JOIN users u ON u.id = o.created_by_user_id
     WHERE o.candidate_id = $1 ${companyClause}
     ORDER BY o.meeting_date DESC, o.id DESC
     LIMIT 50`,
    params
  );
  return res.rows;
}

/**
 * @param {{ query: Function } | Function} dbOrQuery
 */
export async function createOneOnOne(dbOrQuery, {
  companyId,
  candidateId,
  meetingDate,
  notes,
  nextSteps,
  createdByUserId,
}) {
  const db = asDb(dbOrQuery);
  const safeNotes = trimRichOrNull(notes, NOTES_MAX);
  if (!safeNotes) return { ok: false, errorCode: 'NOTES_REQUIRED' };

  const dateStr = meetingDate ? String(meetingDate).slice(0, 10) : null;
  const res = await db.query(
    `INSERT INTO one_on_ones (
       company_id, candidate_id, meeting_date, notes, next_steps, created_by_user_id
     ) VALUES (
       $1, $2,
       COALESCE($3::date, CURRENT_DATE),
       $4, $5, $6
     )
     RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
               meeting_date AS "meetingDate", notes, next_steps AS "nextSteps",
               created_by_user_id AS "createdByUserId",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      companyId,
      candidateId,
      dateStr,
      safeNotes,
      trimRichOrNull(nextSteps, NEXT_STEPS_MAX),
      createdByUserId || null,
    ]
  );
  return { ok: true, item: res.rows[0] };
}

/**
 * @param {{ query: Function } | Function} dbOrQuery
 */
export async function updateOneOnOne(dbOrQuery, {
  id,
  companyId,
  isAdmin,
  meetingDate,
  notes,
  nextSteps,
}) {
  const db = asDb(dbOrQuery);
  const owned = await db.query(
    `SELECT id, company_id AS "companyId" FROM one_on_ones WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (owned.rowCount === 0) return { ok: false, errorCode: 'NOT_FOUND' };
  if (!isAdmin && String(owned.rows[0].companyId) !== String(companyId)) {
    return { ok: false, errorCode: 'UNAUTHORIZED' };
  }

  const sets = [];
  const params = [id];
  let n = 2;

  if (meetingDate !== undefined) {
    sets.push(`meeting_date = $${n++}::date`);
    params.push(String(meetingDate).slice(0, 10));
  }
  if (notes !== undefined) {
    const safeNotes = trimRichOrNull(notes, NOTES_MAX);
    if (!safeNotes) return { ok: false, errorCode: 'NOTES_REQUIRED' };
    sets.push(`notes = $${n++}`);
    params.push(safeNotes);
  }
  if (nextSteps !== undefined) {
    sets.push(`next_steps = $${n++}`);
    params.push(trimRichOrNull(nextSteps, NEXT_STEPS_MAX));
  }
  if (sets.length === 0) return { ok: false, errorCode: 'NO_FIELDS_TO_UPDATE' };

  sets.push('updated_at = NOW()');
  const res = await db.query(
    `UPDATE one_on_ones SET ${sets.join(', ')}
     WHERE id = $1
     RETURNING id, company_id AS "companyId", candidate_id AS "candidateId",
               meeting_date AS "meetingDate", notes, next_steps AS "nextSteps",
               created_by_user_id AS "createdByUserId",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    params
  );
  return { ok: true, item: res.rows[0] };
}

/**
 * @param {{ query: Function } | Function} dbOrQuery
 */
export async function deleteOneOnOne(dbOrQuery, { id, companyId, isAdmin }) {
  const db = asDb(dbOrQuery);
  const owned = await db.query(
    `SELECT id, company_id AS "companyId" FROM one_on_ones WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (owned.rowCount === 0) return { ok: false, errorCode: 'NOT_FOUND' };
  if (!isAdmin && String(owned.rows[0].companyId) !== String(companyId)) {
    return { ok: false, errorCode: 'UNAUTHORIZED' };
  }
  await db.query(`DELETE FROM one_on_ones WHERE id = $1`, [id]);
  return { ok: true };
}

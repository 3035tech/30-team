import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../../lib/auth';
import { query } from '../../../../../lib/db';
import { audit } from '../../../../../lib/audit';

function requireAdmin(payload) {
  return payload?.role === 'admin';
}

export async function POST(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireAdmin(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const body = await request.json().catch(() => ({}));

  const days =
    parseInt(searchParams.get('days') || body.days || process.env.RETENTION_DAYS || '', 10) || 0;

  if (days <= 0) {
    return NextResponse.json({ error: 'RETENTION_DAYS inválido' }, { status: 400 });
  }

  const cutoff = await query(`SELECT NOW() - ($1::text || ' days')::interval AS cutoff`, [String(days)]);
  const cutoffTs = cutoff.rows[0].cutoff;

  const delAssess = await query(
    `DELETE FROM assessments WHERE created_at < $1 RETURNING id`,
    [cutoffTs]
  );

  const delCandidates = await query(
    `DELETE FROM candidates c
     WHERE NOT EXISTS (SELECT 1 FROM assessments a WHERE a.candidate_id = c.id)
     RETURNING id`,
    []
  );

  await audit({
    actorUserId: payload.userId || null,
    action: 'retention.purge',
    targetType: 'retention',
    targetId: String(days),
    metadata: { days, cutoff: cutoffTs, deletedAssessments: delAssess.rowCount, deletedCandidates: delCandidates.rowCount },
  });

  return NextResponse.json({
    ok: true,
    days,
    cutoff: cutoffTs,
    deletedAssessments: delAssess.rowCount,
    deletedCandidates: delCandidates.rowCount,
  });
}


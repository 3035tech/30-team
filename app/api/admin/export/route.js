import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import { audit } from '../../../../lib/audit';

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  const allowed = payload?.role === 'admin' || payload?.role === 'direction' || payload?.role === 'hr';
  if (!allowed) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const isAdmin = payload?.role === 'admin';
  const companyId = payload?.companyId ?? null;
  if (!isAdmin && !companyId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const area = (searchParams.get('area') || 'all').toString();

  const whereParts = [];
  const params = [];
  if (!isAdmin) {
    params.push(companyId);
    whereParts.push(`ass.company_id = $${params.length}`);
  }
  if (area !== 'all') {
    params.push(area);
    whereParts.push(`ar.key = $${params.length}`);
  }
  const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  const r = await query(
    `SELECT
       ass.id AS assessment_id,
       c.full_name AS candidate_name,
       c.email AS candidate_email,
       ar.key AS area_key,
       ar.label AS area_label,
       ass.top_type,
       ass.scores,
       ass.created_at
     FROM assessments ass
     JOIN candidates c ON c.id = ass.candidate_id
     JOIN areas ar ON ar.id = ass.area_id
     ${where}
     ORDER BY ass.created_at DESC`,
    params
  );

  const header = [
    'assessment_id',
    'candidate_name',
    'candidate_email',
    'area_key',
    'area_label',
    'top_type',
    'scores_json',
    'created_at',
  ];

  const lines = [header.join(',')];
  for (const row of r.rows) {
    lines.push(
      [
        row.assessment_id,
        csvEscape(row.candidate_name),
        csvEscape(row.candidate_email || ''),
        row.area_key,
        csvEscape(row.area_label),
        row.top_type,
        csvEscape(JSON.stringify(row.scores)),
        row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      ].join(',')
    );
  }

  const csv = lines.join('\n');
  await audit({
    actorUserId: payload.userId || null,
    action: 'admin.export_csv',
    targetType: 'assessments',
    targetId: area,
    metadata: { area },
  });
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="candidatos_${area}.csv"`,
    },
  });
}


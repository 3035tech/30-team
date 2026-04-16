import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import crypto from 'node:crypto';

function requireAdmin(payload) {
  return payload?.role === 'admin';
}

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

async function ensureActiveLink(companyId) {
  const existing = await query(
    `SELECT token FROM company_links WHERE company_id = $1 AND active = TRUE AND expires_at > NOW() LIMIT 1`,
    [companyId]
  );
  if (existing.rowCount > 0) return existing.rows[0].token;
  const token = crypto.randomBytes(24).toString('hex');
  await query(
    `INSERT INTO company_links (company_id, token, active, expires_at)
     VALUES ($1, $2, TRUE, NOW() + INTERVAL '7 days')`,
    [companyId, token]
  );
  return token;
}

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireAdmin(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const r = await query(
    `SELECT id, name, slug, active, created_at AS "createdAt"
     FROM companies
     WHERE deleted = FALSE
     ORDER BY created_at DESC`
  );

  const out = [];
  for (const c of r.rows) {
    const t = await query(
      `SELECT token, expires_at AS "expiresAt", created_at AS "createdAt", rotated_at AS "rotatedAt"
       FROM company_links
       WHERE company_id = $1 AND active = TRUE
       LIMIT 1`,
      [c.id]
    );
    out.push({ ...c, activeToken: t.rows?.[0]?.token || null, activeTokenExpiresAt: t.rows?.[0]?.expiresAt || null });
  }
  return NextResponse.json(out);
}

export async function POST(request) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!requireAdmin(payload)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const slug = slugify(body.slug || name);
  if (!name || !slug) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

  const ins = await query(
    `INSERT INTO companies (name, slug, active)
     VALUES ($1, $2, TRUE)
     RETURNING id, name, slug, active, created_at AS "createdAt"`,
    [name, slug]
  );

  const linkToken = await ensureActiveLink(ins.rows[0].id);
  return NextResponse.json({ ...ins.rows[0], activeToken: linkToken }, { status: 201 });
}


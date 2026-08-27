import { NextResponse } from 'next/server';
import { verifySessionWithCapabilities } from '../../../../../lib/user-capabilities';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '../../../../../lib/auth';
import { query } from '../../../../../lib/db';
import { audit } from '../../../../../lib/audit';
import { apiError, ERR } from '../../../../../lib/api-error';
import { CAP, requireCapability } from '../../../../../lib/permissions';
import { parseCompanyProfileFromBody } from '../../../../../lib/company-profile';
import { slugify as slugifyRaw } from '../../../../../lib/slugify';

function slugify(input) {
  return slugifyRaw(input, { maxLength: 48 });
}

export async function PATCH(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.COMPANIES_MANAGE)) return apiError(request, ERR.UNAUTHORIZED, 401);

  const raw = params?.id;
  const companyId = raw ? parseInt(String(raw), 10) : NaN;
  if (!Number.isFinite(companyId)) return apiError(request, ERR.INVALID_COMPANY, 400);

  const current = await query(
    `SELECT id, name, slug, active, website, about_html AS "aboutHtml",
            public_profile_enabled AS "publicProfileEnabled",
            anniversary_date AS "anniversaryDate",
            logo_url AS "logoUrl"
     FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`,
    [companyId]
  );
  if (current.rowCount === 0) return apiError(request, ERR.NOT_FOUND, 404);

  const body = await request.json().catch(() => ({}));
  const name = body.name != null ? String(body.name || '').trim() : null;
  const slug = body.slug != null ? slugify(body.slug || '') : null;
  const active = body.active != null ? Boolean(body.active) : null;

  if (name !== null && !name) return apiError(request, ERR.NAME_REQUIRED, 400);
  if (slug !== null && !slug) return apiError(request, ERR.INVALID_SLUG, 400);

  let profile;
  try {
    profile = parseCompanyProfileFromBody(body, { forCreate: false });
  } catch (e) {
    if (e?.code === 'INVALID_WEBSITE') return apiError(request, ERR.INVALID_WEBSITE, 400);
    if (e?.code === 'INVALID_DATE') return apiError(request, ERR.INVALID_DATE, 400);
    throw e;
  }

  const nextName = name !== null ? name : current.rows[0].name;
  const nextSlug = slug !== null ? slug : current.rows[0].slug;
  const nextActive = active !== null ? active : current.rows[0].active;
  const nextWebsite =
    profile.website !== undefined ? profile.website : current.rows[0].website ?? null;
  const nextAbout =
    profile.aboutHtml !== undefined ? profile.aboutHtml : current.rows[0].aboutHtml ?? null;
  const nextPublicProfile =
    profile.publicProfileEnabled !== undefined
      ? profile.publicProfileEnabled
      : Boolean(current.rows[0].publicProfileEnabled);
  const nextAnniversary =
    profile.anniversaryDate !== undefined
      ? profile.anniversaryDate
      : current.rows[0].anniversaryDate ?? null;

  const up = await query(
    `UPDATE companies
     SET name = $2, slug = $3, active = $4, website = $5, about_html = $6,
         public_profile_enabled = $7, anniversary_date = $8
     WHERE id = $1 AND deleted = FALSE
     RETURNING id, name, slug, active, website, about_html AS "aboutHtml",
               public_profile_enabled AS "publicProfileEnabled",
               anniversary_date AS "anniversaryDate",
               logo_url AS "logoUrl", created_at AS "createdAt"`,
    [
      companyId,
      nextName,
      nextSlug,
      nextActive,
      nextWebsite,
      nextAbout,
      nextPublicProfile,
      nextAnniversary,
    ]
  );

  await audit({
    actorUserId: payload.userId || null,
    action: 'company.update',
    targetType: 'company',
    targetId: String(companyId),
  });

  return NextResponse.json(up.rows[0]);
}

/** Exclusão lógica: empresa some das listagens; vagas somem; candidatos/avaliações permanecem. */
export async function DELETE(request, { params }) {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = await verifySessionWithCapabilities(token);
  if (!requireCapability(payload, CAP.COMPANIES_MANAGE)) return apiError(request, ERR.UNAUTHORIZED, 401);

  const raw = params?.id;
  const companyId = raw ? parseInt(String(raw), 10) : NaN;
  if (!Number.isFinite(companyId)) return apiError(request, ERR.INVALID_COMPANY, 400);

  const cur = await query(`SELECT id FROM companies WHERE id = $1 AND deleted = FALSE LIMIT 1`, [companyId]);
  if (cur.rowCount === 0) return apiError(request, ERR.NOT_FOUND, 404);

  await query(
    `UPDATE company_links SET active = FALSE, rotated_at = NOW() WHERE company_id = $1 AND active = TRUE`,
    [companyId]
  );
  await query(
    `UPDATE vacancy_links vl
     SET active = FALSE, rotated_at = NOW()
     FROM vacancies v
     WHERE vl.vacancy_id = v.id AND v.company_id = $1 AND vl.active = TRUE`,
    [companyId]
  );
  await query(`UPDATE vacancies SET deleted = TRUE WHERE company_id = $1 AND deleted = FALSE`, [companyId]);
  await query(
    `UPDATE companies SET deleted = TRUE, active = FALSE WHERE id = $1 AND deleted = FALSE RETURNING id`,
    [companyId]
  );

  await audit({
    actorUserId: payload.userId || null,
    action: 'company.soft_delete',
    targetType: 'company',
    targetId: String(companyId),
  });

  return NextResponse.json({ ok: true });
}

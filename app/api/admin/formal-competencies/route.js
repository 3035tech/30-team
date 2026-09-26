import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../lib/admin-api.js';
import { CAP } from '../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../lib/api-error.js';
import { z, zPositiveInt, zQueryBool } from '../../../../lib/validate.js';
import {
  listCompanyCompetencies,
  createCompanyCompetency,
  updateCompanyCompetency,
} from '../../../../lib/people/formal-competency-reviews.js';
import { audit } from '../../../../lib/audit.js';
import { withTransaction } from '../../../../lib/db.js';
import { RH_DEFAULT_COMPETENCIES } from '../../../../lib/people/default-competencies.js';

const listQuerySchema = z.object({
  companyId: zPositiveInt.optional(),
  includeInactive: zQueryBool,
  limit: z.coerce.number().int().min(1).max(40).optional().default(40),
});

const createBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  categoryId: zPositiveInt.nullable().optional(),
  selfDescription: z.string().trim().max(2000).optional(),
}).strict();

/** GET /api/admin/formal-competencies */
export const GET = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    query: listQuerySchema,
    companyFrom: 'query',
    logLabel: 'formal-competencies GET',
  },
  async ({ companyId, query }) => {
    const competencies = await listCompanyCompetencies(null, {
      companyId,
      includeInactive: query.includeInactive,
      limit: query.limit,
    });
    return NextResponse.json({ ok: true, competencies });
  }
);

/** POST /api/admin/formal-competencies */
export const POST = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    body: createBodySchema,
    companyFrom: 'body',
    logLabel: 'formal-competencies POST',
  },
  async ({ request, payload, companyId, body }) => {
    const result = await withTransaction(db => createCompanyCompetency(db, {
      companyId,
      name: body.name,
      description: body.description || '',
      categoryId: body.categoryId,
      selfDescription: body.selfDescription,
    }));
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.CREATE_FAILED });
    }
    await audit({
      action: 'formal_competency_create',
      actorUserId: payload.userId,
      targetType: 'company_competency',
      targetId: result.competency.id,
      metadata: { companyId, name: result.competency.name },
    });
    return NextResponse.json({ ok: true, competency: result.competency }, { status: 201 });
  }
);

export const PATCH = withAdminApi(
  { cap: CAP.PERFORMANCE_VIEW, body: createBodySchema.partial().extend({ id: zPositiveInt, active: z.boolean().optional() }), companyFrom: 'body', logLabel: 'formal-competencies PATCH' },
  async ({ request, payload, companyId, body }) => {
    const result = await withTransaction(db => updateCompanyCompetency(db, { ...body, companyId }));
    if (!result.ok) return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    await audit({ action: 'formal_competency_update', actorUserId: payload.userId, targetType: 'company_competency', targetId: body.id, metadata: { companyId } });
    return NextResponse.json(result);
  }
);

export const PUT = withAdminApi(
  { cap: CAP.PERFORMANCE_VIEW, body: z.object({ companyId: zPositiveInt.optional() }), companyFrom: 'body', logLabel: 'formal-competencies defaults' },
  async ({ companyId, payload }) => {
    const added = await withTransaction(async (db) => {
      await db.query('SELECT pg_advisory_xact_lock($1::bigint)', [companyId]);
      let count = 0;
      for (const item of RH_DEFAULT_COMPETENCIES) {
        const result = await db.query(
          `INSERT INTO company_competencies (company_id, name, description)
           SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT 1 FROM company_competencies WHERE company_id = $1 AND lower(btrim(name)) = lower($2))
           ON CONFLICT DO NOTHING RETURNING id`, [companyId, item.name, item.description]
        );
        count += result.rowCount;
      }
      return count;
    });
    await audit({ action: 'formal_competency_defaults', actorUserId: payload.userId, targetType: 'company', targetId: companyId, metadata: { added } });
    return NextResponse.json({ ok: true, added });
  }
);

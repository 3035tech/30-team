import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../../lib/admin-api.js';
import { CAP } from '../../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../../../lib/validate.js';
import {
  listFormalReviews,
  createFormalReview,
} from '../../../../../../lib/people/formal-competency-reviews.js';
import { audit } from '../../../../../../lib/audit.js';

const listQuerySchema = z.object({
  companyId: zPositiveInt.optional(),
  limit: z.coerce.number().int().min(1).max(40).optional().default(40),
});

const createBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  subjectCandidateId: zPositiveInt,
  managerUserId: zPositiveInt.optional().nullable(),
  jobRoleId: zPositiveInt.optional().nullable(),
  externalName: z.string().trim().max(200).optional().nullable(),
  externalEmail: z.string().trim().max(320).optional().nullable(),
  externalTitle: z.string().trim().max(200).optional().nullable(),
});

/** GET /api/admin/formal-review-cycles/[id]/reviews */
export const GET = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    query: listQuerySchema,
    companyFrom: 'query',
    logLabel: 'formal-cycle-reviews GET',
  },
  async ({ companyId, query, params }) => {
    const cycleId = Number(params?.id);
    if (!Number.isFinite(cycleId) || cycleId <= 0) {
      return NextResponse.json({ ok: false, errorCode: ERR.INVALID_ID }, { status: 400 });
    }
    const reviews = await listFormalReviews(null, {
      companyId,
      cycleId,
      limit: query.limit,
    });
    return NextResponse.json({ ok: true, reviews });
  }
);

/** POST /api/admin/formal-review-cycles/[id]/reviews */
export const POST = withAdminApi(
  {
    cap: CAP.PERFORMANCE_VIEW,
    body: createBodySchema,
    companyFrom: 'body',
    logLabel: 'formal-cycle-reviews POST',
  },
  async ({ request, payload, companyId, body, params }) => {
    const cycleId = Number(params?.id);
    if (!Number.isFinite(cycleId) || cycleId <= 0) {
      return apiErrorFromResult(request, { ok: false, errorCode: ERR.INVALID_ID });
    }
    const result = await createFormalReview(null, {
      companyId,
      cycleId,
      subjectCandidateId: body.subjectCandidateId,
      managerUserId: body.managerUserId || payload.userId,
      jobRoleId: body.jobRoleId,
      externalName: body.externalName || '',
      externalEmail: body.externalEmail || '',
      externalTitle: body.externalTitle || '',
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.CREATE_FAILED });
    }
    await audit({
      action: 'formal_review_create',
      actorUserId: payload.userId,
      targetType: 'formal_review',
      targetId: result.review.id,
      metadata: {
        companyId,
        cycleId,
        subjectCandidateId: body.subjectCandidateId,
      },
    });
    return NextResponse.json({ ok: true, review: result.review }, { status: 201 });
  }
);

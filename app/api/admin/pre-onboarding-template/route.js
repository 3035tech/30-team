import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../lib/admin-api.js';
import { CAP } from '../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../lib/validate.js';
import {
  ensureCompanyPreOnboardingTemplate,
  listCompanyPreOnboardingTemplate,
  setCompanyPreOnboardingTemplate,
} from '../../../../lib/people/pre-onboarding-template.js';
import { audit } from '../../../../lib/audit.js';

const putBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  items: z
    .array(
      z.object({
        itemKey: z.string().trim().min(2).max(41),
        labelPt: z.string().trim().max(120).optional(),
        labelEn: z.string().trim().max(120).optional(),
        ownerRole: z.enum(['rh', 'manager', 'it', 'security', 'employee']).optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
        active: z.boolean().optional(),
        dueOffsetDays: z.number().int().min(0).max(90).optional(),
        requireMeet: z.boolean().optional(),
      })
    )
    .min(1)
    .max(30),
});

/** GET /api/admin/pre-onboarding-template */
export const GET = withAdminApi(
  {
    cap: CAP.TEAM_VIEW,
    companyFrom: 'query',
    logLabel: 'pre-onboarding template GET',
  },
  async ({ request, companyId }) => {
    await ensureCompanyPreOnboardingTemplate(null, { companyId });
    const result = await listCompanyPreOnboardingTemplate(null, {
      companyId,
      includeInactive: true,
    });
    if (!result.ok) return apiErrorFromResult(request, result);
    return NextResponse.json({ ok: true, items: result.items });
  }
);

/** PUT /api/admin/pre-onboarding-template */
export const PUT = withAdminApi(
  {
    cap: CAP.TEAM_VIEW,
    body: putBodySchema,
    companyFrom: 'body',
    logLabel: 'pre-onboarding template PUT',
  },
  async ({ request, companyId, body, payload }) => {
    const result = await setCompanyPreOnboardingTemplate(null, {
      companyId,
      items: body.items || [],
    });
    if (!result.ok) return apiErrorFromResult(request, result);
    await audit({
      actorUserId: payload?.userId || null,
      companyId,
      action: 'pre_onboarding.template.set',
      targetType: 'company',
      targetId: companyId,
      metadata: { count: result.items?.length || 0 },
    }).catch(() => {});
    return NextResponse.json({ ok: true, items: result.items });
  }
);

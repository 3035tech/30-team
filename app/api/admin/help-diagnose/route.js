import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminApi } from '../../../../lib/admin-api.js';
import { apiError, ERR } from '../../../../lib/api-error.js';
import { CAP } from '../../../../lib/permissions.js';
import { ROSTER_SCOPE, ROSTER_SCOPE_SET } from '../../../../lib/domain-status.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../lib/rate-limit.js';
import { audit, auditRequestContext } from '../../../../lib/audit.js';
import {
  ABSENCE_DIAG_Q_MAX,
  diagnoseListAbsence,
} from '../../../../lib/people/list-absence-diagnostics.js';

const bodySchema = z.object({
  q: z.string().trim().min(1).max(ABSENCE_DIAG_Q_MAX),
  roster: z.string().trim().max(32).optional(),
  listFilter: z.string().trim().max(64).nullable().optional(),
  pipeline: z.string().trim().max(32).nullable().optional(),
  companyId: z.coerce.number().int().positive().optional(),
});

/**
 * POST /api/admin/help-diagnose
 * B-2601 MVP: why a person may be missing from Equipe search.
 * Depth: app/api/admin/help-diagnose → 4× ../ até lib/
 */
export const POST = withAdminApi(
  {
    cap: CAP.TEAM_VIEW,
    body: bodySchema,
    requireCompany: true,
    companyFrom: 'body',
    logLabel: 'help-diagnose POST',
  },
  async ({ request, payload, companyId, body }) => {
    const ip = clientIpFromRequest(request);
    const rl = await checkRateLimit(
      `help-diagnose:${payload.userId || ip}`,
      30,
      15 * 60 * 1000
    );
    if (!rl.ok) {
      return apiError(request, ERR.RATE_LIMIT, 429, {}, {
        headers: { 'Retry-After': String(rl.retryAfterSec) },
      });
    }

    const rosterRaw = String(body.roster || ROSTER_SCOPE.INTERNAL).trim();
    const rosterScope = ROSTER_SCOPE_SET.has(rosterRaw) ? rosterRaw : ROSTER_SCOPE.INTERNAL;

    const result = await diagnoseListAbsence({
      companyId,
      q: body.q,
      rosterScope,
      listFilter: body.listFilter || null,
      pipelineStage: body.pipeline || null,
    });

    await audit({
      actorUserId: payload.userId ?? null,
      companyId,
      action: 'help.diagnose_absence',
      targetType: 'company',
      targetId: companyId,
      metadata: {
        qLen: String(body.q || '').length,
        roster: rosterScope,
        reasonCodes: (result.reasons || []).map((r) => r.code),
        candidateCount: (result.candidates || []).length,
      },
      ...auditRequestContext(request),
    });

    return NextResponse.json(
      {
        ok: true,
        reasons: result.reasons,
        suggestions: result.suggestions,
        candidates: result.candidates,
        query: result.query,
        roster: result.roster,
      },
      { status: 200 }
    );
  }
);

/**
 * GET /api/admin/compensation/salary-map — analytic map by job role (+ optional raise sim)
 */

import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../lib/admin-api.js';
import { CAP } from '../../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../../lib/api-error.js';
import { z, zPositiveInt } from '../../../../../lib/validate.js';
import {
  listSalaryMapByJobRole,
  simulateRaiseImpact,
} from '../../../../../lib/people/salary-map.js';

const listQuerySchema = z.object({
  companyId: zPositiveInt.optional(),
  simulate: z.string().optional(),
  mode: z.enum(['pct', 'amount']).optional(),
  value: z.coerce.number().optional(),
  jobRoleId: zPositiveInt.optional(),
  limit: z.coerce.number().int().min(1).max(80).optional(),
});

/** GET salary map (+ optional simulate=1) */
export const GET = withAdminApi(
  {
    cap: CAP.TEAM_VIEW,
    query: listQuerySchema,
    companyFrom: 'query',
    logLabel: 'compensation salary-map GET',
  },
  async ({ request, companyId, query }) => {
    const result = await listSalaryMapByJobRole(null, {
      companyId,
      limit: query.limit,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.COMPANY_REQUIRED });
    }

    const wantSim =
      query.simulate === '1' ||
      query.simulate === 'true' ||
      String(query.simulate || '').toLowerCase() === 'yes';

    let simulation = null;
    if (wantSim) {
      const sim = simulateRaiseImpact({
        items: result.items,
        jobRoleId: query.jobRoleId ?? null,
        mode: query.mode || 'pct',
        value: query.value != null ? Number(query.value) : 0,
      });
      if (!sim.ok) {
        return apiErrorFromResult(request, sim, { fallbackCode: ERR.INVALID_DATA });
      }
      simulation = sim;
    }

    return NextResponse.json({ ...result, simulation });
  }
);

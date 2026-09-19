import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../lib/admin-api.js';
import { CAP } from '../../../../../lib/ae/require-admin.js';
import { z, zPositiveInt } from '../../../../../lib/validate.js';
import { getExitInsights } from '../../../../../lib/exit-analysis.js';

const querySchema = z.object({
  companyId: zPositiveInt.optional(),
});

/**
 * GET /api/admin/exit-analysis/insights — Overview intel (overview.view)
 */
export const GET = withAdminApi(
  {
    cap: CAP.OVERVIEW_VIEW,
    query: querySchema,
    companyFrom: 'query',
    logLabel: 'exit-analysis insights',
  },
  async ({ companyId }) => {
    const data = await getExitInsights(null, { companyId });
    return NextResponse.json({ ok: true, ...data }, { status: 200 });
  }
);

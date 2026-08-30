import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../lib/admin-api.js';
import { query } from '../../../../../lib/db.js';
import { CAP } from '../../../../../lib/permissions.js';
import { getDpAttentionPulse } from '../../../../../lib/people/employee-dp.js';
import { DP_LEAVE_STATUS } from '../../../../../lib/domain-status.js';

/** GET /api/admin/dp/attention — pending docs + leave pulse for inbox chips. */
export const GET = withAdminApi(
  {
    anyCap: [CAP.DP_VIEW, CAP.TEAM_VIEW],
    requireCompany: true,
    companyFrom: 'query',
    logLabel: 'dp-attention',
  },
  async ({ companyId }) => {
    const pulse = await getDpAttentionPulse({ query }, { companyId, cap: 20 });
    return NextResponse.json({
      ok: true,
      pendingDocsPeople: (pulse.pendingDocs || []).length,
      requestedLeaves: (pulse.leaves || []).filter(
        (l) => l.status === DP_LEAVE_STATUS.REQUESTED
      ).length,
      pendingDocs: pulse.pendingDocs || [],
      leaves: pulse.leaves || [],
    });
  }
);

import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../../lib/admin-api.js';
import { apiErrorFromResult, ERR } from '../../../../../lib/api-error.js';
import { query } from '../../../../../lib/db.js';
import { CAP } from '../../../../../lib/permissions.js';
import {
  listLeaveCalendar,
  listLeaveRequests,
} from '../../../../../lib/people/employee-dp.js';

/** GET /api/admin/dp/leave — company leave inbox + optional calendar */
export const GET = withAdminApi(
  {
    anyCap: [CAP.DP_VIEW, CAP.TEAM_VIEW],
    requireCompany: true,
    companyFrom: 'query',
    logLabel: 'dp-leave-list',
  },
  async ({ query: q, companyId }) => {
    const mode = String(q.mode || 'list');
    if (mode === 'calendar') {
      const data = await listLeaveCalendar({ query }, {
        companyId,
        from: q.from,
        to: q.to,
        limit: q.limit,
      });
      return NextResponse.json(data);
    }
    const data = await listLeaveRequests({ query }, {
      companyId,
      ...q,
    });
    return NextResponse.json(data);
  }
);

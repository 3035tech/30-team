/**
 * GET  /api/admin/whistleblowing — channels + reports inbox
 * POST /api/admin/whistleblowing — create channel
 */

import { NextResponse } from 'next/server';
import { withAdminApi } from '../../../../lib/admin-api.js';
import { CAP } from '../../../../lib/ae/require-admin.js';
import { apiErrorFromResult, ERR } from '../../../../lib/api-error.js';
import { audit, auditRequestContext } from '../../../../lib/audit.js';
import { z, zPositiveInt } from '../../../../lib/validate.js';
import {
  createWhistleblowingChannel,
  listWhistleblowingChannels,
  listWhistleblowingReports,
  aggregateWhistleblowingReports,
} from '../../../../lib/people/whistleblowing.js';

const listQuerySchema = z.object({
  companyId: zPositiveInt.optional(),
  status: z.string().max(20).optional(),
  includeInactive: z
    .union([z.literal('1'), z.literal('true'), z.literal('0'), z.literal('false')])
    .optional(),
});

const createBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  title: z.string().trim().min(1).max(200),
  dueDays: z.coerce.number().int().min(1).max(90).optional(),
});

export const GET = withAdminApi(
  {
    cap: CAP.WHISTLEBLOWING_VIEW,
    query: listQuerySchema,
    companyFrom: 'query',
    logLabel: 'whistleblowing GET',
  },
  async ({ request, companyId, query, payload }) => {
    const includeInactive =
      query.includeInactive === '1' || query.includeInactive === 'true';
    const channels = await listWhistleblowingChannels(null, {
      companyId,
      includeInactive,
    });
    if (!channels.ok) {
      return apiErrorFromResult(request, channels, { fallbackCode: ERR.COMPANY_REQUIRED });
    }
    const reports = await listWhistleblowingReports(null, {
      companyId,
      status: query.status || 'all',
    });
    if (!reports.ok) {
      return apiErrorFromResult(request, reports, { fallbackCode: ERR.COMPANY_REQUIRED });
    }
    const aggregates = await aggregateWhistleblowingReports(null, { companyId });
    if (!aggregates.ok) {
      return apiErrorFromResult(request, aggregates, { fallbackCode: ERR.COMPANY_REQUIRED });
    }
    await audit({
      actorUserId: payload.userId || null,
      action: 'whistleblowing.inbox_view',
      companyId,
      targetType: 'whistleblowing',
      metadata: { reportCount: reports.reports.length },
      ...auditRequestContext(request),
    });
    return NextResponse.json({
      channels: channels.channels,
      reports: reports.reports,
      aggregates: {
        total: aggregates.total,
        byStatus: aggregates.byStatus,
        byCategory: aggregates.byCategory,
      },
    });
  }
);

export const POST = withAdminApi(
  {
    cap: CAP.WHISTLEBLOWING_VIEW,
    body: createBodySchema,
    companyFrom: 'body',
    logLabel: 'whistleblowing POST',
  },
  async ({ request, companyId, body, payload }) => {
    const result = await createWhistleblowingChannel(null, {
      companyId,
      title: body.title,
      dueDays: body.dueDays,
      createdByUserId: payload.userId || null,
    });
    if (!result.ok) {
      return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    }
    await audit({
      actorUserId: payload.userId || null,
      action: 'whistleblowing.channel_create',
      companyId,
      targetType: 'whistleblowing_channel',
      targetId: result.channel.id,
      metadata: { title: result.channel.title },
      ...auditRequestContext(request),
    });
    return NextResponse.json({ channel: result.channel });
  }
);

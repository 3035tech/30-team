import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { apiError } from '../../../../lib/api-error';
import { audit } from '../../../../lib/audit';
import { CAP, getManagerScope, getSessionPayload, requireCapability } from '../../../../lib/ae/require-admin';
import {
  createTeamPulse,
  createTeamPulseInvite,
  createTeamPulseInviteBatch,
  getTeamPulse,
  getTeamPulseAggregate,
  listTeamPulses,
  setTeamPulseStatus,
} from '../../../../lib/people/team-pulses';

function resolveCompanyId(scope, bodyCompanyId, searchCompanyId) {
  if (scope.isAdmin) {
    const raw = bodyCompanyId ?? searchCompanyId;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return scope.companyId;
}

/** GET /api/admin/team-pulses?teamGroupId=&companyId= */
export async function GET(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.GROUP_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const url = new URL(request.url);
    const teamGroupId = url.searchParams.get('teamGroupId');
    const pulseId = url.searchParams.get('id');
    const companyId = resolveCompanyId(scope, null, url.searchParams.get('companyId'));
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

    if (pulseId) {
      const pulse = await getTeamPulse(query, { companyId, pulseId });
      if (!pulse) return apiError(request, 'NOT_FOUND', 404);
      const aggregate =
        url.searchParams.get('aggregate') === '1'
          ? await getTeamPulseAggregate(query, {
              companyId,
              pulseId,
              locale: url.searchParams.get('locale') || payload.locale || 'pt-BR',
            })
          : null;
      return NextResponse.json({ pulse, aggregate });
    }

    if (!teamGroupId) return apiError(request, 'INVALID_ID', 400);
    const items = await listTeamPulses(query, { companyId, teamGroupId });
    return NextResponse.json({ items, minResponses: items[0] ? undefined : undefined });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('GET team-pulses', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

/** POST /api/admin/team-pulses */
export async function POST(request) {
  try {
    const payload = await getSessionPayload();
    if (!requireCapability(payload, CAP.GROUP_VIEW)) return apiError(request, 'UNAUTHORIZED', 401);
    const scope = getManagerScope(payload);
    if (!scope.authorized) return apiError(request, 'UNAUTHORIZED', 401);

    const body = await request.json().catch(() => ({}));
    const companyId = resolveCompanyId(scope, body.companyId, null);
    if (!companyId) return apiError(request, 'COMPANY_REQUIRED', 400);

    if (body.action === 'invite' || body.action === 'inviteBatch') {
      if (body.action === 'inviteBatch') {
        const batch = await createTeamPulseInviteBatch(query, {
          companyId,
          pulseId: body.pulseId,
          count: body.count,
        });
        if (!batch.ok) return apiError(request, batch.errorCode || 'INVALID_DATA', 400);
        return NextResponse.json({ ok: true, invites: batch.invites });
      }
      const one = await createTeamPulseInvite(query, {
        companyId,
        pulseId: body.pulseId,
      });
      if (!one.ok) return apiError(request, one.errorCode || 'INVALID_DATA', 400);
      return NextResponse.json({ ok: true, invite: one.invite });
    }

    if (body.action === 'status') {
      const updated = await setTeamPulseStatus(query, {
        companyId,
        pulseId: body.pulseId,
        status: body.status,
      });
      if (!updated.ok) return apiError(request, updated.errorCode || 'INVALID_DATA', 400);
      return NextResponse.json({ ok: true, pulse: updated.pulse });
    }

    const created = await createTeamPulse(query, {
      companyId,
      teamGroupId: body.teamGroupId,
      title: body.title,
      createdByUserId: payload.userId || null,
      locale: body.locale || payload.locale || 'pt-BR',
    });
    if (!created.ok) return apiError(request, created.errorCode || 'INVALID_DATA', 400);

    await audit({
      actorUserId: payload.userId || null,
      action: 'team_pulse.create',
      targetType: 'team_group',
      targetId: body.teamGroupId,
      metadata: { pulseId: created.pulse?.id },
    });

    return NextResponse.json({ ok: true, pulse: created.pulse }, { status: 201 });
  } catch (err) {
    if (err?.code === '42P01') return apiError(request, 'SCHEMA_NOT_INITIALIZED', 503);
    console.error('POST team-pulses', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

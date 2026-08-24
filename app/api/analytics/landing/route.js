import { trackLandingEvent } from '../../../../lib/landing-analytics.js';

/**
 * POST /api/analytics/landing
 * Client-side analytics tracking (público).
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      eventType,
      sessionId = null,
      referrer = null,
      utmSource = null,
      utmMedium = null,
      utmCampaign = null,
      metadata = {},
    } = body;

    if (!eventType) {
      return Response.json({ ok: false, error: 'eventType required' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || null;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || null;

    await trackLandingEvent({
      eventType,
      sessionId,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      userAgent,
      ipAddress: ip,
      metadata,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[analytics] Landing track error:', err);
    // Não falhar ruidosamente — analytics não deve bloquear cliente
    return Response.json({ ok: false }, { status: 500 });
  }
}

import { cookies } from 'next/headers';
import { verifyToken } from '../../../../../lib/auth.js';
import { query } from '../../../../../lib/db.js';
import { apiError, ERR } from '../../../../../lib/api-error.js';
import { hydrateSessionPayload } from '../../../../../lib/session.js';

/**
 * POST /api/admin/onboarding/complete
 * Marca o wizard de onboarding como completo para o usuário atual.
 */
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('team30_session')?.value;
    if (!token) {
      return apiError(request, ERR.REQUIRED_LOGIN, 401);
    }

    const rawPayload = verifyToken(token);
    const payload = await hydrateSessionPayload(rawPayload);
    if (!payload) {
      return apiError(request, ERR.INVALID_CREDENTIALS, 401);
    }

    const userId = payload.userId;

    // Marca onboarding como completo
    await query(
      `UPDATE users
       SET onboarding_completed = TRUE,
           onboarding_completed_at = NOW()
       WHERE id = $1
         AND deleted = FALSE
         AND active = TRUE`,
      [userId]
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[onboarding] Complete error:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

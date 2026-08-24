import { query } from '../../../../lib/db.js';
import {
  hashUnusablePassword,
  issuePasswordSetupInvite,
} from '../../../../lib/user-password-invite.js';
import { apiError } from '../../../../lib/api-error.js';
import { isMailConfigured } from '../../../../lib/mail.js';
import { generateUniqueCompanySlug } from '../../../../lib/slugify.js';
import { trackLandingEvent } from '../../../../lib/landing-analytics.js';

/**
 * Self-service signup: cria user pendente + company (ou associa a existente).
 * POST /api/auth/signup
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      email,
      companyName,
      fullName,
      jobTitle = '',
      teamSize = '',
      painPoints = '',
      locale = 'pt-BR',
      sessionId = null,
      utmSource = null,
      utmMedium = null,
      utmCampaign = null,
    } = body;

    // Validações
    const emailClean = String(email || '')
      .trim()
      .toLowerCase();
    if (!emailClean || !emailClean.includes('@') || emailClean.length > 254) {
      return apiError(request, 'EMAIL_REQUIRED', 400);
    }
    if (!companyName || !fullName) {
      return apiError(request, 'REQUIRED_FIELDS_MISSING', 400);
    }
    if (!isMailConfigured()) {
      return apiError(request, 'SMTP_NOT_CONFIGURED', 503);
    }

    // Rate limit simples (5 signups/min por IP) — opcional, adicionar depois
    // TODO: implement rate limiting via redis or in-memory cache

    // Check se email já existe
    const existing = await query(
      `SELECT id, active, deleted, signup_pending, role, company_id
       FROM users
       WHERE LOWER(TRIM(email)) = $1
       LIMIT 1`,
      [emailClean]
    );

    if (existing.rowCount > 0) {
      const user = existing.rows[0];

      if (!user.deleted && user.active && !user.signup_pending) {
        // Usuário já ativo → não revelar (segurança), mas sugerir login
        return apiError(request, 'EMAIL_ALREADY_REGISTERED', 409);
      }

      if (user.signup_pending) {
        // Signup pendente → reenviar email de confirmação
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        const issued = await issuePasswordSetupInvite(user.id, {
          appUrl,
          locale: locale || 'pt-BR',
          purpose: 'invite',
        });
        if (!issued.ok) {
          return apiError(request, issued.code, 500);
        }

        await trackLandingEvent({
          eventType: 'signup_resent',
          sessionId,
          utmSource,
          utmMedium,
          utmCampaign,
          metadata: { email: emailClean, userId: user.id },
        });

        return Response.json({ ok: true, action: 'resent' });
      }
    }

    // Criar company ou associar a existente por domain match
    const domain = emailClean.split('@')[1];
    let companyId;
    let companyAction = 'created';

    // Opção: buscar company existente por domain (opt-in via env)
    if (process.env.SIGNUP_DOMAIN_MATCH === 'true') {
      const domainMatch = await query(
        `SELECT c.id
         FROM companies c
         JOIN users u ON u.company_id = c.id
         WHERE LOWER(TRIM(u.email)) LIKE $1
           AND c.deleted = FALSE
           AND u.deleted = FALSE
           AND u.active = TRUE
         LIMIT 1`,
        [`%@${domain}`]
      );

      if (domainMatch.rowCount > 0) {
        // Associar à company existente (colaborador novo)
        companyId = domainMatch.rows[0].id;
        companyAction = 'joined';
      }
    }

    if (!companyId) {
      // Criar nova company
      const slug = await generateUniqueCompanySlug(companyName);
      const companyRes = await query(
        `INSERT INTO companies (name, slug, active, signup_auto_created)
         VALUES ($1, $2, TRUE, TRUE)
         RETURNING id`,
        [companyName, slug]
      );
      companyId = companyRes.rows[0].id;
    }

    // Criar user pendente
    const passwordHash = await hashUnusablePassword();
    const role = 'direction'; // ou 'hr' — early access usa direction
    const signupMetadata = {
      companyName: String(companyName).trim(),
      fullName: String(fullName).trim(),
      jobTitle: String(jobTitle).trim(),
      teamSize: String(teamSize).trim(),
      painPoints: String(painPoints).trim(),
    };

    const userRes = await query(
      `INSERT INTO users (
        company_id, email, password_hash, role, locale,
        active, signup_pending, signup_source, signup_metadata, deleted
      ) VALUES ($1, $2, $3, $4, $5, FALSE, TRUE, 'early_access', $6, FALSE)
      RETURNING id`,
      [companyId, emailClean, passwordHash, role, locale || 'pt-BR', JSON.stringify(signupMetadata)]
    );
    const userId = userRes.rows[0].id;

    // Atualizar company.signup_creator_user_id se for nova
    if (companyAction === 'created') {
      await query(`UPDATE companies SET signup_creator_user_id = $1 WHERE id = $2`, [userId, companyId]);
    }

    // Emitir token de confirmação (72h)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return apiError(request, 'APP_URL_NOT_CONFIGURED', 500);
    }

    const issued = await issuePasswordSetupInvite(userId, {
      appUrl,
      locale: locale || 'pt-BR',
      purpose: 'invite',
    });
    if (!issued.ok) {
      return apiError(request, issued.code, 500);
    }

    // Analytics
    const userAgent = request.headers.get('user-agent') || null;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || null;

    await trackLandingEvent({
      eventType: 'signup_complete',
      sessionId,
      utmSource,
      utmMedium,
      utmCampaign,
      userAgent,
      ipAddress: ip,
      metadata: {
        userId,
        companyId,
        companyAction,
        role,
        jobTitle: signupMetadata.jobTitle,
        teamSize: signupMetadata.teamSize,
      },
    });

    return Response.json({ ok: true, action: 'created', userId, companyId });
  } catch (err) {
    console.error('[signup] Error:', err);
    return apiError(request, 'INTERNAL', 500);
  }
}

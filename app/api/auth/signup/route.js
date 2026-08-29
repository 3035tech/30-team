import { query } from '../../../../lib/db.js';
import {
  hashUnusablePassword,
  issuePasswordSetupInvite,
} from '../../../../lib/user-password-invite.js';
import { apiError, ERR, httpStatusForError } from '../../../../lib/api-error.js';
import { enqueueTransactionalMail, isMailConfigured } from '../../../../lib/mail.js';
import { generateUniqueCompanySlug } from '../../../../lib/slugify.js';
import { trackLandingEvent } from '../../../../lib/landing-analytics.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../lib/rate-limit.js';
import { verifyTurnstileToken } from '../../../../lib/turnstile.js';

/**
 * Self-service signup: cria user pendente + company (ou associa a existente).
 * POST /api/auth/signup
 *
 * Segurança:
 * - Rate limit por IP + Turnstile
 * - Conta já ativa → { ok: true } uniforme (anti-enum) + e-mail de lembrete
 * - SIGNUP_DOMAIN_MATCH=true: ao juntar company existente, role = hr (não direction)
 */
export async function POST(request) {
  try {
    const ip = clientIpFromRequest(request);
    const rl = await checkRateLimit(`signup:${ip}`, 8, 15 * 60 * 1000);
    if (!rl.ok) {
      return apiError(
        request,
        ERR.RATE_LIMIT,
        429,
        {},
        { headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await request.json().catch(() => ({}));

    const turnstile = await verifyTurnstileToken({
      token: body.turnstileToken,
      remoteIp: ip,
    });
    if (!turnstile.ok) {
      return apiError(
        request,
        ERR.TURNSTILE_FAILED,
        httpStatusForError(ERR.TURNSTILE_FAILED)
      );
    }

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
      return apiError(request, ERR.EMAIL_REQUIRED, 400);
    }
    if (!companyName || !fullName) {
      return apiError(request, ERR.REQUIRED_FIELDS_MISSING, 400);
    }
    if (!isMailConfigured()) {
      return apiError(request, ERR.SMTP_NOT_CONFIGURED, 503);
    }

    const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || '')
      .trim()
      .replace(/\/+$/, '');
    if (!appUrl) {
      return apiError(request, ERR.APP_URL_NOT_CONFIGURED, httpStatusForError(ERR.APP_URL_NOT_CONFIGURED));
    }

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
        // Anti-enum: mesma forma de sucesso; e-mail de lembrete (já tem conta).
        if (isMailConfigured()) {
          const loc = locale === 'en' ? 'en' : 'pt-BR';
          const loginUrl = `${appUrl}/login`;
          const subject =
            loc === 'en'
              ? 'You already have a 30Team account'
              : 'Você já tem uma conta no 30Team';
          const text =
            loc === 'en'
              ? `Someone tried to sign up with this email. You already have an account. Sign in: ${loginUrl}\n`
              : `Alguém tentou se cadastrar com este e-mail. Você já tem conta. Entre em: ${loginUrl}\n`;
          enqueueTransactionalMail({
            to: emailClean,
            subject,
            text,
            html: `<p>${text.replace(/\n/g, '<br/>')}</p>`,
          });
        }
        await trackLandingEvent({
          eventType: 'signup_existing',
          sessionId,
          utmSource,
          utmMedium,
          utmCampaign,
          metadata: { email: emailClean },
        });
        return Response.json({ ok: true });
      }

      if (user.signup_pending) {
        // Signup pendente → reenviar email de confirmação
        const issued = await issuePasswordSetupInvite(user.id, {
          appUrl,
          locale: locale || 'pt-BR',
          purpose: 'invite',
        });
        if (!issued.ok) {
          return apiError(request, issued.code, httpStatusForError(issued.code));
        }

        await trackLandingEvent({
          eventType: 'signup_resent',
          sessionId,
          utmSource,
          utmMedium,
          utmCampaign,
          metadata: { email: emailClean, userId: user.id },
        });

        // Mesma forma de sucesso do create (sem IDs) — reduz distinção pending vs novo.
        return Response.json({ ok: true });
      }
    }

    // Criar company ou associar a existente por domain match
    const domain = emailClean.split('@')[1];
    let companyId;
    let companyAction = 'created';

    // Opção: buscar company existente por domain (opt-in via env — manter false em prod salvo intenção explícita)
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
        [String(companyName).trim(), slug]
      );
      companyId = companyRes.rows[0].id;
    }

    // Criar user pendente (active=FALSE até definir senha no link).
    // Company nova → direction (dona do trial). Domain-match join → hr (menos privilégio).
    const passwordHash = await hashUnusablePassword();
    const role = companyAction === 'joined' ? 'hr' : 'direction';
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

    const issued = await issuePasswordSetupInvite(userId, {
      appUrl,
      locale: locale || 'pt-BR',
      purpose: 'invite',
    });
    if (!issued.ok) {
      return apiError(request, issued.code, httpStatusForError(issued.code));
    }

    // Analytics
    const userAgent = request.headers.get('user-agent') || null;

    await trackLandingEvent({
      eventType: 'signup_complete',
      sessionId,
      utmSource,
      utmMedium,
      utmCampaign,
      userAgent,
      ipAddress: ip === 'unknown' ? null : ip,
      metadata: {
        userId,
        companyId,
        companyAction,
        role,
        jobTitle: signupMetadata.jobTitle,
        teamSize: signupMetadata.teamSize,
      },
    });

    // Sem userId/companyId na resposta pública (menos vazamento + forma alinhada ao resent).
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[signup] Error:', err);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

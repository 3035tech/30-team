/**
 * E-mail de acesso ao painel (usuário criado com senha temporária).
 */
import { DEFAULT_LOCALE, localeHtmlLang, normalizeLocale, t } from './i18n.js';

const ACCENT = '#7C3AED';
const TEXT = '#1a1625';
const MUTED = '#5b5766';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

/**
 * @param {{ email: string, temporaryPassword: string, loginUrl: string, locale?: string, displayName?: string|null }} opts
 */
export function buildUserAccessMail({
  email,
  temporaryPassword,
  loginUrl,
  locale = DEFAULT_LOCALE,
  displayName = null,
}) {
  const loc = normalizeLocale(locale);
  const name = String(displayName || '').trim().split(/\s+/)[0] || email;
  const subject = t(loc, 'mail.userAccess.subject');
  const safeUrl = escapeAttr(loginUrl);

  const text = `${t(loc, 'mail.userAccess.textGreeting', { name })}

${t(loc, 'mail.userAccess.textBody')}

${t(loc, 'mail.userAccess.textEmail')}: ${email}
${t(loc, 'mail.userAccess.textPassword')}: ${temporaryPassword}

${loginUrl}

${t(loc, 'mail.userAccess.textFooter')}

—
${t(loc, 'mail.userAccess.textSignature')}`;

  const html = `<!DOCTYPE html>
<html lang="${localeHtmlLang(loc)}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f2f8;font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid rgba(26,22,37,0.08);">
        <tr><td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
          <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${ACCENT};font-weight:600;">${t(loc, 'mail.userAccess.brand')}</p>
          <h1 style="margin:0 0 14px;font-size:22px;color:${TEXT};">${t(loc, 'mail.userAccess.htmlGreeting', { name: escapeHtml(name) })}</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${MUTED};">${t(loc, 'mail.userAccess.htmlBody')}</p>
          <p style="margin:0 0 8px;font-size:14px;color:${TEXT};"><strong>${t(loc, 'mail.userAccess.textEmail')}:</strong> ${escapeHtml(email)}</p>
          <p style="margin:0 0 20px;font-size:14px;color:${TEXT};"><strong>${t(loc, 'mail.userAccess.textPassword')}:</strong> <code style="font-size:15px;">${escapeHtml(temporaryPassword)}</code></p>
          <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;background:${ACCENT};color:#fff;text-decoration:none;border-radius:12px;font-weight:600;">${t(loc, 'mail.userAccess.ctaButton')}</a>
          <p style="margin:20px 0 0;font-size:12px;color:${MUTED};line-height:1.5;">${t(loc, 'mail.userAccess.htmlFooter')}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

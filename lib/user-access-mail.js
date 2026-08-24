/**
 * E-mail de acesso ao painel — convite ou redefinição de senha (link com token).
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

function mailPrefix(purpose) {
  return purpose === 'reset' ? 'mail.userAccessReset' : 'mail.userAccess';
}

/**
 * @param {{ email: string, setupUrl: string, locale?: string, displayName?: string|null, purpose?: 'invite'|'reset' }} opts
 */
export function buildUserPasswordInviteMail({
  email,
  setupUrl,
  locale = DEFAULT_LOCALE,
  displayName = null,
  purpose = 'invite',
}) {
  const loc = normalizeLocale(locale);
  const prefix = mailPrefix(purpose);
  const name = String(displayName || '').trim().split(/\s+/)[0] || email;
  const subject = t(loc, `${prefix}.subject`);
  const safeUrl = escapeAttr(setupUrl);

  const text = `${t(loc, `${prefix}.textGreeting`, { name })}

${t(loc, `${prefix}.textBody`)}

${t(loc, `${prefix}.textEmail`)}: ${email}

${setupUrl}

${t(loc, `${prefix}.textFooter`)}

—
${t(loc, `${prefix}.textSignature`)}`;

  const html = `<!DOCTYPE html>
<html lang="${localeHtmlLang(loc)}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f2f8;font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid rgba(26,22,37,0.08);">
        <tr><td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
          <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${ACCENT};font-weight:600;">${t(loc, `${prefix}.brand`)}</p>
          <h1 style="margin:0 0 14px;font-size:22px;color:${TEXT};">${t(loc, `${prefix}.htmlGreeting`, { name: escapeHtml(name) })}</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${MUTED};">${t(loc, `${prefix}.htmlBody`)}</p>
          <p style="margin:0 0 20px;font-size:14px;color:${TEXT};"><strong>${t(loc, `${prefix}.textEmail`)}:</strong> ${escapeHtml(email)}</p>
          <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;background:${ACCENT};color:#fff;text-decoration:none;border-radius:12px;font-weight:600;">${t(loc, `${prefix}.ctaButton`)}</a>
          <p style="margin:20px 0 0;font-size:12px;color:${MUTED};line-height:1.5;">${t(loc, `${prefix}.htmlFooter`)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

/** @deprecated use buildUserPasswordInviteMail */
export function buildUserAccessMail(opts) {
  if (opts?.setupUrl) return buildUserPasswordInviteMail(opts);
  const setupUrl = opts?.loginUrl || '';
  return buildUserPasswordInviteMail({ ...opts, setupUrl });
}

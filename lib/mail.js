import nodemailer from 'nodemailer';

/** Lê env em runtime (evita valores “congelados” no build standalone) e tira aspas do env_file do Docker. */
function envTrim(key) {
  const raw = process.env[key];
  if (raw == null || raw === '') return '';
  let s = String(raw).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

export function isMailConfigured() {
  return Boolean(envTrim('SMTP_HOST') && envTrim('MAIL_FROM'));
}

let cachedTransport = null;

function getTransport() {
  if (!isMailConfigured()) return null;
  if (cachedTransport) return cachedTransport;
  const host = envTrim('SMTP_HOST');
  const port = parseInt(envTrim('SMTP_PORT') || '587', 10);
  const secure = envTrim('SMTP_SECURE') === 'true' || port === 465;
  const user = envTrim('SMTP_USER');
  const pass = envTrim('SMTP_PASS');
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });
  return cachedTransport;
}

/**
 * @param {{ to: string, subject: string, text: string, html?: string }} opts
 */
export async function sendTransactionalMail(opts) {
  const transport = getTransport();
  if (!transport) {
    const err = new Error('E-mail não configurado no servidor (defina SMTP_HOST e MAIL_FROM).');
    err.code = 'MAIL_NOT_CONFIGURED';
    throw err;
  }
  const from = envTrim('MAIL_FROM');
  await transport.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? opts.text.replace(/\n/g, '<br/>'),
  });
}

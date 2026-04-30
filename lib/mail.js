import nodemailer from 'nodemailer';

export function isMailConfigured() {
  return Boolean((process.env.SMTP_HOST || '').trim() && (process.env.MAIL_FROM || '').trim());
}

let cachedTransport = null;

function getTransport() {
  if (!isMailConfigured()) return null;
  if (cachedTransport) return cachedTransport;
  const host = (process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = (process.env.SMTP_USER || '').trim();
  const pass = process.env.SMTP_PASS ?? '';
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
  const from = (process.env.MAIL_FROM || '').trim();
  await transport.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? opts.text.replace(/\n/g, '<br/>'),
  });
}

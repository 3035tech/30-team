/**
 * E-mail: convite para Assessment de Motivadores Profissionais.
 */
import { MOTIVATORS_DEFINITION } from './ae/motivators-dimensions.js';

const SESSION_MINUTES = Math.max(10, Math.round((MOTIVATORS_DEFINITION.config.questions_per_session ?? 30) * 0.4));

const ACCENT = '#7C3AED';
const TEXT = '#1a1625';
const MUTED = '#5b5766';

export function greetingName(fullName) {
  const first = String(fullName || '').trim().split(/\s+/)[0];
  return first || 'Colaborador(a)';
}

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

export function buildMotivatorsInviteMail({ candidateFullName, companyName, assessmentUrl }) {
  const name = greetingName(candidateFullName);
  const subjectCompany = companyName?.trim() ? ` — ${companyName.trim()}` : '';
  const subject = `[30Team] Convite — Assessment de Motivadores${subjectCompany}`;
  const safeUrl = escapeAttr(assessmentUrl);

  const text = `Olá, ${name},

${companyName?.trim()
    ? `${companyName.trim()} convidou você para responder o Assessment de Motivadores Profissionais.`
    : 'Você foi convidado(a) a responder o Assessment de Motivadores Profissionais.'}

O objetivo é identificar o que mais motiva você no trabalho — não é um teste de personalidade. Reserve cerca de ${SESSION_MINUTES} minutos em um ambiente tranquilo.

${assessmentUrl}

Este link é pessoal — não encaminhe para outras pessoas.

—
Plataforma 30Team (mensagem automática em nome do RH).`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f2f8;font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid rgba(26,22,37,0.08);">
        <tr><td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
          <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${ACCENT};font-weight:600;">30Team · Motivadores</p>
          <h1 style="margin:0 0 14px;font-size:22px;color:${TEXT};">Olá, ${escapeHtml(name)}</h1>
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:${TEXT};">
            ${companyName?.trim()
              ? `${escapeHtml(companyName.trim())} convidou você para o <strong>Assessment de Motivadores Profissionais</strong>.`
              : 'Você foi convidado(a) para o <strong>Assessment de Motivadores Profissionais</strong>.'}
          </p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${MUTED};">
            Descubra o que mais motiva você no trabalho. Reserve ~${SESSION_MINUTES} minutos e conclua em uma única sessão.
          </p>
          <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;background:${ACCENT};color:#fff;text-decoration:none;border-radius:12px;font-weight:600;">Iniciar assessment</a>
          <p style="margin:20px 0 0;font-size:12px;word-break:break-all;color:${ACCENT};font-family:monospace;">${escapeHtml(assessmentUrl)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}

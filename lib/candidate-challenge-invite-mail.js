/**
 * E-mail transactional: RH convida candidato com link público `/v/:token` da vaga.
 * HTML com estilos inline para clientes comuns de e-mail.
 */

const ACCENT = '#7C3AED';
const TEXT = '#1a1625';
const MUTED = '#5b5766';

/** Primeira palavra do nome para saudação. */
export function greetingName(fullName) {
  const first = String(fullName || '').trim().split(/\s+/)[0];
  return first || 'Candidato(a)';
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

/**
 * @param {{
 *   candidateFullName: string,
 *   vacancyTitle: string,
 *   companyName?: string|null,
 *   challengeUrl: string,
 * }} p
 */
export function buildCandidateChallengeInviteMail({
  candidateFullName,
  vacancyTitle,
  companyName,
  challengeUrl,
}) {
  const name = greetingName(candidateFullName);
  const title = String(vacancyTitle || '').trim() || 'Vaga';
  const subjectCompany = companyName?.trim() ? ` — ${companyName.trim()}` : '';
  const subject = `[30Team] Convite para o desafio${subjectCompany}`;

  const safeUrl = escapeAttr(challengeUrl);
  const safeTitle = escapeHtml(title);

  const text = `Olá, ${name},

${companyName?.trim()
    ? `${companyName.trim()} convidou você para participar do desafio 30Team vinculado à vaga: «${title}».`
    : `Você foi convidado(a) a participar do desafio 30Team para a vaga: «${title}».`}

O link abaixo abre o formulário exclusivo desta vaga. Reserve um momento calmo e conclua em uma única sessão, se possível.

${challengeUrl}

Este link é pessoal e corresponde a esta oportunidade — não encaminhe para outras pessoas.

—
Plataforma 30Team (mensagem automática em nome do RH).`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f2f8;font-family:Georgia,'Times New Roman',serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(`Seu link para o desafio da vaga «${title}».`)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(26,22,37,0.08);box-shadow:0 4px 24px rgba(76,29,149,0.06);">
          <tr>
            <td style="padding:28px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
              <p style="margin:0 0 20px 0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${ACCENT};font-weight:600;">30Team</p>
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.35;font-weight:600;color:${TEXT};">Olá, ${escapeHtml(name)}</h1>
              <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:${TEXT};">
                ${companyName?.trim()
                  ? `${escapeHtml(companyName.trim())} convidou você para o <strong>desafio 30Team</strong> desta oportunidade: <strong>${safeTitle}</strong>.`
                  : `Você foi convidado(a) a participar do <strong>desafio 30Team</strong> para a vaga <strong>${safeTitle}</strong>.`}
              </p>
              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.65;color:${MUTED};">
                O botão abaixo abre o formulário <strong>desta vaga</strong>. Recomendamos um ambiente tranquilo e concluir em uma única sessão.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="border-radius:12px;background:${ACCENT};">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
                      style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                      Iniciar o desafio
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:${MUTED};">
                Se o botão não funcionar, copie e cole este endereço no navegador:
              </p>
              <p style="margin:0 0 22px 0;font-size:12px;line-height:1.5;word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:${ACCENT};">
                ${escapeHtml(challengeUrl)}
              </p>
              <p style="margin:0;font-size:13px;line-height:1.55;color:${MUTED};">
                Este link é pessoal e vale para <strong>esta vaga</strong> — não encaminhe para outras pessoas.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 26px 28px;border-top:1px solid rgba(26,22,37,0.08);background:rgba(124,58,237,0.04);">
              <p style="margin:0;font-size:12px;line-height:1.55;color:${MUTED};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                Mensagem enviada automaticamente pela plataforma <strong style="color:${ACCENT};">30Team</strong> em nome do RH.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

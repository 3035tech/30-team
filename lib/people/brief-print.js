/**
 * Print / PDF one-pager for the decision brief (B-401).
 * Opens a minimal document and triggers the browser print dialog (Save as PDF).
 * No extra PDF library — matches /r print pattern.
 */

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function listHtml(items, ordered = false) {
  const tag = ordered ? 'ol' : 'ul';
  const rows = (items || [])
    .map((text) => `<li>${esc(text)}</li>`)
    .join('');
  return rows ? `<${tag}>${rows}</${tag}>` : '';
}

/**
 * @param {{
 *   locale?: string,
 *   personName?: string,
 *   brief: object,
 *   labels: {
 *     product: string,
 *     title: string,
 *     hint: string,
 *     alerts: string,
 *     do: string,
 *     avoid: string,
 *     interview: string,
 *     team: string,
 *     hypotheses: string,
 *     footer: string,
 *     generatedAt: string,
 *   },
 * }} opts
 */
export function buildBriefPrintHtml(opts = {}) {
  const brief = opts.brief || {};
  const labels = opts.labels || {};
  const name = String(opts.personName || '').trim();
  const syn = brief.synthesis || {};
  const team = brief.team || {};
  const alerts = Array.isArray(brief.alerts) ? brief.alerts : [];
  const interview = Array.isArray(brief.interviewQuestions) ? brief.interviewQuestions : [];
  const actionsDo = Array.isArray(brief.actionsDo) ? brief.actionsDo : [];
  const actionsAvoid = Array.isArray(brief.actionsAvoid) ? brief.actionsAvoid : [];
  const hypotheses = Array.isArray(brief.hypotheses) ? brief.hypotheses : [];

  const sections = [];

  if (syn.headline) {
    sections.push(`<p class="headline">${esc(syn.headline)}</p>`);
  }

  const synBlocks = [
    ['convergences', labels.synthesisConvergences],
    ['tensions', labels.synthesisTensions],
    ['howToLead', labels.synthesisHowToLead],
    ['pdiIdeas', labels.synthesisPdiIdeas],
  ].filter(([key]) => Array.isArray(syn[key]) && syn[key].length > 0);
  if (synBlocks.length) {
    const synHtml = synBlocks
      .map(
        ([key, label]) =>
          `<div class="box"><h2>${esc(label || key)}</h2>${listHtml(syn[key])}</div>`
      )
      .join('');
    sections.push(`<div class="grid">${synHtml}</div>`);
  }

  if (alerts.length) {
    sections.push(
      `<section><h2>${esc(labels.alerts)}</h2>${listHtml(alerts.map((a) => a.text || a))}</section>`
    );
  }

  if (actionsDo.length || actionsAvoid.length) {
    const cols = [];
    if (actionsDo.length) {
      cols.push(
        `<div class="box do"><h2>${esc(labels.do)}</h2>${listHtml(actionsDo.map((a) => a.text || a))}</div>`
      );
    }
    if (actionsAvoid.length) {
      cols.push(
        `<div class="box avoid"><h2>${esc(labels.avoid)}</h2>${listHtml(actionsAvoid.map((a) => a.text || a))}</div>`
      );
    }
    sections.push(`<div class="grid">${cols.join('')}</div>`);
  }

  if (interview.length) {
    sections.push(
      `<section><h2>${esc(labels.interview)}</h2>${listHtml(
        interview.map((q) => q.text || q),
        true
      )}</section>`
    );
  }

  if (!team.empty) {
    const teamItems = [];
    if (team.roleHint?.text) teamItems.push(team.roleHint.text);
    for (const row of team.synergies || []) {
      if (row.text) teamItems.push(row.text);
    }
    for (const row of team.tensions || []) {
      if (row.text) teamItems.push(row.text);
    }
    if (teamItems.length) {
      sections.push(`<section><h2>${esc(labels.team)}</h2>${listHtml(teamItems)}</section>`);
    }
  }

  if (hypotheses.length) {
    const hypoLis = hypotheses
      .map((h) => {
        const title = h.title ? `<strong>${esc(h.title)}</strong> — ` : '';
        return `<li>${title}${esc(h.body || '')}</li>`;
      })
      .join('');
    sections.push(`<section><h2>${esc(labels.hypotheses)}</h2><ul>${hypoLis}</ul></section>`);
  }

  const docTitle = name
    ? `${esc(labels.title)} — ${esc(name)}`
    : esc(labels.title || 'Briefing');

  return `<!DOCTYPE html>
<html lang="${esc(opts.locale === 'en' ? 'en' : 'pt-BR')}">
<head>
  <meta charset="utf-8" />
  <title>${docTitle}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px 32px 40px;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      color: #1a1625;
      font-size: 13px;
      line-height: 1.45;
      background: #fff;
    }
    .brand {
      margin: 0 0 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #8930b8;
    }
    h1 { margin: 0 0 4px; font-size: 22px; font-weight: 650; }
    .sub { margin: 0 0 8px; color: #5c5668; font-size: 13px; }
    .hint { margin: 0 0 18px; color: #8a8496; font-size: 11px; }
    .meta { margin: 0 0 20px; color: #8a8496; font-size: 11px; }
    .headline { margin: 0 0 16px; font-size: 14px; font-weight: 600; }
    h2 {
      margin: 0 0 8px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #5c5668;
    }
    section { margin: 0 0 16px; }
    ul, ol { margin: 0; padding-left: 1.15rem; }
    li { margin: 0 0 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0 0 16px; }
    .box { border: 1px solid #e4e0ea; border-radius: 8px; padding: 10px 12px; }
    .box.do { border-color: #b7e0c4; background: #f4fbf6; }
    .box.avoid { border-color: #f0c4c4; background: #fdf6f6; }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e4e0ea;
      color: #8a8496;
      font-size: 11px;
    }
    @media print {
      body { padding: 12px 16px; }
      .box { break-inside: avoid; }
      section { break-inside: avoid; }
    }
    @media (max-width: 640px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <p class="brand">${esc(labels.product || '30Team')}</p>
  <h1>${esc(labels.title)}</h1>
  ${name ? `<p class="sub">${esc(name)}</p>` : ''}
  <p class="hint">${esc(labels.hint)}</p>
  <p class="meta">${esc(labels.generatedAt)}</p>
  ${sections.join('\n')}
  <p class="footer">${esc(labels.footer)}</p>
</body>
</html>`;
}

/**
 * @returns {boolean} true if print window opened
 */
export function printDecisionBrief(opts = {}) {
  if (typeof window === 'undefined') return false;
  if (!opts.brief?.hasAny) return false;
  const html = buildBriefPrintHtml(opts);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=820,height=900');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Allow layout before print
  const trigger = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* ignore */
    }
  };
  if (win.document.readyState === 'complete') {
    setTimeout(trigger, 50);
  } else {
    win.addEventListener('load', () => setTimeout(trigger, 50));
  }
  return true;
}

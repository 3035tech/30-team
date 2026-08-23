/**
 * Print / PDF for client vacancy report /r (B-412).
 * Same popup + browser print pattern as brief-print.js.
 */

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {{
 *   locale?: string,
 *   data: object,
 *   labels: Record<string, string>,
 * }} opts
 */
export function buildClientReportPrintHtml(opts = {}) {
  const data = opts.data || {};
  const labels = opts.labels || {};
  const vacancy = data.vacancy || {};
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const note = stripHtml(data.executiveNote || data.note || '');
  const title = data.title || vacancy.title || labels.publicTitle || 'Report';

  const rows = candidates
    .map((c) => {
      const name = esc(c.name || c.fullName || '—');
      const rec = esc(c.recommendation || c.recLabel || '—');
      const fit =
        c.fitScore010 != null || c.vacancyFitScore010 != null
          ? esc(String(c.fitScore010 ?? c.vacancyFitScore010))
          : '—';
      const type = c.topType != null ? `T${esc(c.topType)}` : '—';
      const why = esc(stripHtml(c.whyFit || c.why || '').slice(0, 280));
      return `<tr>
        <td>${name}</td>
        <td>${rec}</td>
        <td>${fit}</td>
        <td>${type}</td>
        <td class="why">${why || '—'}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="${opts.locale === 'en' ? 'en' : 'pt-BR'}">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    @page { margin: 16mm; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.45; max-width: 800px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    .meta { font-family: ui-monospace, monospace; font-size: 11px; color: #666; margin-bottom: 18px; }
    .brand { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #7c3aed; margin: 0 0 8px; }
    h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    p.note { font-size: 13px; white-space: pre-wrap; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e5e5e5; padding: 8px; text-align: left; vertical-align: top; }
    th { font-family: ui-monospace, monospace; font-size: 10px; text-transform: uppercase; color: #666; background: #fafafa; }
    td.why { font-size: 11px; color: #444; }
    .footer { margin-top: 28px; font-size: 10px; color: #888; font-family: ui-monospace, monospace; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <p class="brand">30Team</p>
  <h1>${esc(title)}</h1>
  <p class="meta">${esc(
    [vacancy.companyName, vacancy.positionsCount != null ? `${vacancy.positionsCount}` : '']
      .filter(Boolean)
      .join(' · ')
  )}</p>
  ${note ? `<h2>${esc(labels.executiveNote || 'Note')}</h2><p class="note">${esc(note)}</p>` : ''}
  <h2>${esc((labels.shortlistTitle || 'Shortlist').replace('{n}', String(candidates.length)))}</h2>
  <table>
    <thead>
      <tr>
        <th>${esc(labels.colName || 'Name')}</th>
        <th>${esc(labels.colRec || 'Rec')}</th>
        <th>${esc(labels.colFit || 'Fit')}</th>
        <th>${esc(labels.colType || 'Type')}</th>
        <th>${esc(labels.colWhy || 'Why')}</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="5">${esc(labels.empty || '—')}</td></tr>`}</tbody>
  </table>
  <p class="footer">${esc(labels.footer || '')}</p>
</body>
</html>`;
}

export function printClientReport(opts = {}) {
  if (typeof window === 'undefined') return false;
  if (!opts.data) return false;
  const html = buildClientReportPrintHtml(opts);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=820,height=900');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
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

/**
 * Minimal single-page PDF (Helvetica) — no puppeteer/pdfkit.
 * Enough for Analytics digest attachment.
 */

function escapePdf(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * @param {string[]} lines
 * @returns {Buffer}
 */
export function buildSimplePdf(lines) {
  const safe = (Array.isArray(lines) ? lines : [String(lines || '')])
    .map((l) => String(l || '').slice(0, 110))
    .slice(0, 48);
  const contentParts = ['BT', '/F1 10 Tf', '50 780 Td', '14 TL'];
  safe.forEach((line, i) => {
    if (i === 0) contentParts.push(`(${escapePdf(line)}) Tj`);
    else contentParts.push(`T* (${escapePdf(line)}) Tj`);
  });
  contentParts.push('ET');
  const stream = contentParts.join('\n');
  const objects = [];
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n');
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n');
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n'
  );
  objects.push(`4 0 obj<< /Length ${Buffer.byteLength(stream, 'utf8')} >>stream\n${stream}\nendstream\nendobj\n`);
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

/**
 * Sanitização básica de HTML do editor de notas (sem dependência externa).
 * Remove scripts, iframes e handlers on*.
 */

/** Se o HTML veio escapado (&lt;p&gt;…), decodifica uma vez antes de sanitizar. */
export function decodeEscapedHtmlOnce(input) {
  const s = String(input ?? '');
  if (!s || !/&lt;\/?[a-z]/i.test(s)) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, '\u00a0');
}

export function sanitizeInterviewNotesHtml(input, maxLen = 100_000) {
  if (input == null) return null;
  let html = decodeEscapedHtmlOnce(String(input));
  if (!html.trim()) return null;
  if (html.length > maxLen) html = html.slice(0, maxLen);

  html = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<link[\s\S]*?>/gi, '')
    .replace(/<meta[\s\S]*?>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');

  return html.trim() || null;
}

/** Alias genérico — mesmo sanitizador para qualquer campo de notas ricas. */
export const sanitizeRichTextHtml = sanitizeInterviewNotesHtml;

export function htmlToPlainText(html) {
  if (!html) return '';
  return String(decodeEscapedHtmlOnce(html))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isRichTextEmpty(html) {
  return !htmlToPlainText(html);
}

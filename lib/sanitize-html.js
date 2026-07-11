/**
 * Sanitização básica de HTML do editor de anotações (sem dependência externa).
 * Remove scripts, iframes e handlers on*.
 */
export function sanitizeInterviewNotesHtml(input) {
  if (input == null) return null;
  let html = String(input);
  if (!html.trim()) return null;
  if (html.length > 100_000) html = html.slice(0, 100_000);

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

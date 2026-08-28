/**
 * Sanitização de HTML do editor de notas (sem dependência externa).
 * Remove scripts, iframes, handlers on* e tags fora da allowlist.
 */

const INTERVIEW_NOTES_TAGS = new Set([
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'a',
]);

/** Tags perigosas removidas por completo (não só unwrap). */
const STRIP_TAGS_RE =
  /<(script|iframe|object|embed|link|meta|style|svg|math|form|input|button|textarea|select|video|audio|source|picture|template|base)\b[^>]*>[\s\S]*?<\/\1>|<(script|iframe|object|embed|link|meta|style|svg|math|form|input|button|textarea|select|video|audio|source|picture|template|base)\b[^>]*\/?>/gi;

function sanitizeAllowedAnchor(openTag) {
  const hrefMatch = openTag.match(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const href = String(hrefMatch?.[2] || hrefMatch?.[3] || hrefMatch?.[4] || '').trim();
  if (!/^(https?:|mailto:)/i.test(href)) return '';
  const safeHref = href.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return `<a href="${safeHref}">`;
}

/** Mantém só tags seguras para notas de entrevista / rich text interno. */
export function allowlistInterviewNotesHtml(html) {
  let s = String(html || '');
  if (!s.trim()) return s;

  s = s.replace(STRIP_TAGS_RE, '');

  s = s.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    const t = String(tag).toLowerCase();
    if (t === 'a') {
      if (match.startsWith('</')) return '</a>';
      return sanitizeAllowedAnchor(match);
    }
    if (!INTERVIEW_NOTES_TAGS.has(t)) return '';
    if (t === 'br') return '<br>';
    return match.startsWith('</') ? `</${t}>` : `<${t}>`;
  });

  return s;
}

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
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');

  html = allowlistInterviewNotesHtml(html);

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

/** Remove cercas ```html / ```md e rótulos que o modelo costuma devolver. */
export function stripModelCodeFences(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  const fenced = s.match(/^```(?:html|htm|markdown|md|text|plain)?\s*\r?\n?([\s\S]*?)\r?\n?```$/i);
  if (fenced) return String(fenced[1] || '').trim();
  s = s.replace(/^```(?:html|htm|markdown|md|text|plain)?\s*\r?\n?/i, '');
  s = s.replace(/\r?\n?```\s*$/i, '');
  return s.trim();
}

/** Remove marcação markdown inline (negrito, itálico, código, links). */
export function stripInlineMarkdown(text) {
  let t = String(text || '');
  t = t.replace(/!\[[^\]]*]\([^)]*\)/g, '');
  t = t.replace(/\[([^\]]+)]\([^)]*\)/g, '$1');
  t = t.replace(/`([^`]+)`/g, '$1');
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  t = t.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1');
  t = t.replace(/(?<!_)_([^_]+)_(?!_)/g, '$1');
  t = t.replace(/^#{1,6}\s+/gm, '');
  t = t.replace(/^>\s?/gm, '');
  t = t.replace(/^[-*+]\s+/gm, '');
  t = t.replace(/^\d+\.\s+/gm, '');
  return t;
}

function escapeHtmlText(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Texto/markdown (sem tags HTML) → HTML estrutural mínimo (h2, p, ul/li).
 * Sem negrito/itálico/código.
 */
export function plainOrMarkdownToSimpleHtml(raw) {
  const src = String(raw || '');
  if (!src.trim()) return '';

  const lines = src.split(/\r?\n/);
  const parts = [];
  let listBuf = [];

  const flushList = () => {
    if (!listBuf.length) return;
    parts.push(`<ul>${listBuf.map((li) => `<li>${escapeHtmlText(li)}</li>`).join('')}</ul>`);
    listBuf = [];
  };

  const isBullet = (line) => /^\s*([-*+]|\d+\.)\s+\S/.test(line);
  const bulletText = (line) => stripInlineMarkdown(line.replace(/^\s*([-*+]|\d+\.)\s+/, '').trim());
  const isMdHeading = (line) => /^#{1,6}\s+\S/.test(line.trim());
  const knownSection =
    /^(sobre a vaga|o que você vai fazer|o que voce vai fazer|o que buscamos|diferenciais|como trabalhamos|o que oferecemos|processo seletivo|about the role|what you will do|what we look for|nice to have|how we work|what we offer|selection process)\s*$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (isBullet(line)) {
      listBuf.push(bulletText(line));
      continue;
    }
    flushList();
    if (isMdHeading(trimmed) || knownSection.test(trimmed)) {
      const title = stripInlineMarkdown(trimmed.replace(/^#{1,6}\s+/, ''));
      parts.push(`<h2>${escapeHtmlText(title)}</h2>`);
    } else {
      parts.push(`<p>${escapeHtmlText(stripInlineMarkdown(trimmed))}</p>`);
    }
  }
  flushList();
  return parts.join('\n');
}

/**
 * Mantém só estrutura permitida na descrição de vaga; desembrulha o resto.
 * Removido: strong/em/b/i/u/code/a/span/div e atributos de estilo.
 */
export function whitelistSimpleRichHtml(html) {
  let s = String(html || '');
  if (!s.trim()) return '';

  s = stripModelCodeFences(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');

  const unwrap = ['strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'code', 'pre', 'span', 'font', 'mark', 'small', 'big'];
  for (const tag of unwrap) {
    const re = new RegExp(`</?${tag}\\b[^>]*>`, 'gi');
    s = s.replace(re, '');
  }
  s = s.replace(/<\/?a\b[^>]*>/gi, '');
  s = s.replace(/<\/?div\b[^>]*>/gi, '');
  s = s.replace(/<\/?section\b[^>]*>/gi, '');
  s = s.replace(/<\/?article\b[^>]*>/gi, '');

  s = s.replace(/<\/?h1\b[^>]*>/gi, (m) => (String(m).startsWith('</') ? '</h2>' : '<h2>'));
  s = s.replace(/<\/?h[3-6]\b[^>]*>/gi, (m) => (String(m).startsWith('</') ? '</h2>' : '<h2>'));

  s = s.replace(/<(h2|p|ul|ol|li|br)\b[^>]*>/gi, (_, tag) => {
    const t = String(tag).toLowerCase();
    return t === 'br' ? '<br>' : `<${t}>`;
  });

  s = s.replace(/<\/?(?!h2\b|p\b|ul\b|ol\b|li\b|br\b)[a-z][a-z0-9]*\b[^>]*>/gi, '');

  return s.trim();
}

/**
 * Normaliza resposta de modelo para HTML de descrição: sem markdown, sem formatação decorativa.
 */
export function normalizeAiRichTextHtml(raw, maxLen = 12_000) {
  let s = stripModelCodeFences(raw);
  if (!s.trim()) return null;

  const hasHtml = /<(?:h[1-6]|p|ul|ol|li|div|br|strong|em|b|i)\b/i.test(s);
  if (!hasHtml) {
    s = plainOrMarkdownToSimpleHtml(s);
  }
  s = whitelistSimpleRichHtml(s);
  return sanitizeInterviewNotesHtml(s, maxLen);
}

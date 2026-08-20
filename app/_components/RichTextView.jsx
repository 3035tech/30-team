import { sanitizeRichTextHtml } from '../../lib/sanitize-html';
import { C } from '../../lib/theme';

/**
 * Renderiza HTML de notas já sanitizado (ou re-sanitiza no cliente).
 */
export function RichTextView({
  html,
  style = {},
  as: Tag = 'div',
}) {
  const safe = sanitizeRichTextHtml(html);
  if (!safe) return null;
  return (
    <Tag
      style={{
        fontSize: '13px',
        color: C.text,
        lineHeight: 1.6,
        fontFamily: 'Georgia, "Times New Roman", serif',
        wordBreak: 'break-word',
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

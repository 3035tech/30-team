import { sanitizeRichTextHtml } from '../../lib/sanitize-html';
import { cn } from '../../lib/cn';

/**
 * Renderiza HTML de notas já sanitizado (ou re-sanitiza no cliente).
 * Estilos de lista/citação em `globals.css` (`.rich-text-view`).
 */
export function RichTextView({
  html,
  className,
  style,
  as: Tag = 'div',
}) {
  const safe = sanitizeRichTextHtml(html);
  if (!safe) return null;
  return (
    <Tag
      className={cn(
        'rich-text-view break-words font-ui text-sm leading-relaxed text-ink',
        className
      )}
      style={style}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

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
    <>
      <Tag
        className="rich-text-view"
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
      <style>{`
        .rich-text-view ul { margin: 0.35em 0; padding-left: 1.4em; list-style: disc; }
        .rich-text-view ol { margin: 0.35em 0; padding-left: 1.4em; list-style: decimal; }
        .rich-text-view li { margin: 0.15em 0; }
        .rich-text-view h2 { font-size: 1.15em; margin: 0.5em 0 0.25em; font-weight: 600; }
        .rich-text-view p { margin: 0.35em 0; }
        .rich-text-view blockquote { margin: 0.4em 0; padding-left: 0.8em; border-left: 3px solid ${C.border}; color: ${C.muted}; }
      `}</style>
    </>
  );
}

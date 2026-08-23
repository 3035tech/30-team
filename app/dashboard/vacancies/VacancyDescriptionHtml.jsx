'use client';

import { RichTextView } from '../../_components/RichTextView';

export function VacancyDescriptionHtml({ html }) {
  return (
    <div className="mt-3 text-[13px] leading-[1.65]">
      <RichTextView html={html} />
    </div>
  );
}

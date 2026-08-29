'use client';

import { CollapsibleBlock } from '../../_components/CollapsibleBlock';
import { t } from '../../../lib/i18n';

/**
 * Progressive section for vacancy create/edit drawers.
 * Uses canonical Expand/Collapse chrome ({@link CollapsibleBlock} panel variant).
 */
export function VacancyFormSection({ locale, titleKey, defaultOpen = true, children }) {
  return (
    <CollapsibleBlock
      locale={locale}
      title={t(locale, titleKey)}
      defaultOpen={defaultOpen}
      variant="panel"
      bordered={false}
    >
      {children}
    </CollapsibleBlock>
  );
}

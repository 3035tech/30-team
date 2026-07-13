'use client';

import { REJECTION_REASONS, rejectionReasonLabelKey } from '../../lib/pipeline';
import { t } from '../../lib/i18n';

export function rejectionReasonLabel(locale, code) {
  if (!code) return null;
  return t(locale, rejectionReasonLabelKey(code));
}

export { REJECTION_REASONS };

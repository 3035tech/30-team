import { cookies } from 'next/headers';
import { COOKIE_NAME, verifyToken } from '../../lib/auth';
import { normalizeLocale, t } from '../../lib/i18n';
import { C, FONTS } from '../../lib/theme';

/**
 * Soft-nav shell while the dashboard RSC re-fetches tab/filter data.
 * Keeps a stable full-viewport placeholder so chrome does not flash blank.
 */
export default function DashboardLoading() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  const locale = normalizeLocale(payload?.locale);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: C.bg,
        fontFamily: FONTS.serif,
        color: C.muted,
        fontSize: 15,
      }}
      role="status"
      aria-live="polite"
    >
      {t(locale, 'dashboard.loadingPanel')}
    </div>
  );
}

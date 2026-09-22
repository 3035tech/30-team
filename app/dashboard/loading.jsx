import { DashboardRouteLoading } from './DashboardRouteLoading';

/**
 * Soft-nav placeholder. It intentionally does not mount a second DashboardClient:
 * during streamed navigation Next can retain the current screen alongside this
 * fallback, and duplicating the shell would duplicate landmarks, dialogs and menus.
 */
export default function DashboardLoading() {
  return <DashboardRouteLoading />;
}

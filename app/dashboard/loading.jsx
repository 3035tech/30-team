import { AppLoading } from '../_components/AppLoading';

/**
 * Soft-nav placeholder. It intentionally does not mount a second DashboardClient:
 * during streamed navigation Next can retain the current screen alongside this
 * fallback, and duplicating the shell would duplicate landmarks, dialogs and menus.
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-canvas px-4 py-8 font-ui text-ink sm:px-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <AppLoading variant="panel" />
      </div>
    </div>
  );
}

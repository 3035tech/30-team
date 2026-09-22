import { AppLoading } from '../_components/AppLoading';

const SIDEBAR_ROWS = [5, 4, 3, 5, 3];

function SkeletonBar({ className = '' }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-control bg-ink/[0.08] ${className}`} />;
}

/** Route fallback that keeps the dashboard's familiar frame while data streams. */
export function DashboardRouteLoading({ locale = 'pt-BR' }) {
  return (
    <div className="min-h-screen bg-canvas font-ui text-ink" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">{locale === 'en' ? 'Loading dashboard' : 'Carregando painel'}</span>
      <div className="flex min-h-screen">
        <aside aria-hidden="true" className="hidden w-[240px] shrink-0 border-r border-ink/8 bg-surface/70 px-4 py-5 md:block">
          <div className="mb-8 flex items-center gap-3 px-1">
            <SkeletonBar className="h-9 w-9 rounded-control bg-brand-500/15" />
            <SkeletonBar className="h-4 w-20" />
          </div>
          {SIDEBAR_ROWS.map((count, section) => (
            <div key={section} className="mb-5 space-y-3">
              <SkeletonBar className="h-2.5 w-20" />
              {Array.from({ length: count }, (_, row) => (
                <SkeletonBar key={row} className="h-9 w-full" />
              ))}
            </div>
          ))}
        </aside>
        <div className="min-w-0 flex-1">
          <header aria-hidden="true" className="flex h-[72px] items-center justify-end gap-3 border-b border-ink/8 px-4 sm:px-8">
            <SkeletonBar className="h-10 w-10" />
            <SkeletonBar className="h-10 w-10" />
            <SkeletonBar className="h-10 w-32" />
          </header>
          <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
            <AppLoading locale={locale} variant="panel" />
          </main>
        </div>
      </div>
    </div>
  );
}

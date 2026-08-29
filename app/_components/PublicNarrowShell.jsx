'use client';

import { cn } from '../../lib/cn';
import { AppLoading, ContentEnter } from './AppLoading';

/**
 * Narrow centered chrome for public token + collaborator flows.
 * @param {'loading'|'error'|'done'|'form'} [variant='form']
 */
export function PublicNarrowShell({
  variant = 'form',
  locale = 'pt-BR',
  title = null,
  children,
  className = '',
  maxWidthClass = 'max-w-lg',
}) {
  const pad =
    variant === 'loading' || variant === 'error' || variant === 'done'
      ? 'px-4 py-16'
      : 'px-4 py-8 sm:py-10';

  if (variant === 'loading') {
    return (
      <div className={cn('mx-auto w-full', maxWidthClass, pad, className)}>
        <AppLoading locale={locale} variant="panel" />
      </div>
    );
  }

  return (
    <div className={cn('mx-auto w-full', maxWidthClass, pad, className)}>
      <ContentEnter>
        {title ? (
          <h1 className="mb-3 mt-0 font-display text-xl font-normal text-ink sm:text-2xl">
            {title}
          </h1>
        ) : null}
        {children}
      </ContentEnter>
    </div>
  );
}

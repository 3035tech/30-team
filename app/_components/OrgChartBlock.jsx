'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { AppLoading, ContentEnter } from './AppLoading';
import { EmptyState } from './EmptyState';
import { CollapsibleBlock } from './CollapsibleBlock';
import { InlineCallout } from './InlineCallout';
import { useAppFeedback } from './AppFeedback';

function OrgNode({ node, depth, locale, onOpen }) {
  const maxDepth = 8;
  const childCount = (node.children || []).length;
  return (
    <li className="m-0 list-none p-0">
      <button
        type="button"
        className={cn(
          'flex min-h-touch w-full items-start gap-2 rounded-control border border-ink/10 bg-canvas px-2.5 py-2 text-left transition-colors hover:border-brand-500/30 hover:bg-brand-500/[0.04]',
          depth > 0 && 'mt-1.5'
        )}
        style={depth > 0 ? { marginLeft: Math.min(depth, maxDepth) * 12 } : undefined}
        onClick={() => onOpen?.(node.id)}
        aria-label={t(locale, 'panel.orgChart.openPerson', { name: node.name })}
      >
        <span className="min-w-0 flex-1">
          <span className={cn(S.cardTitle, 'block truncate')}>{node.name}</span>
          {node.jobRoleName ? (
            <span className={cn(S.faint, 'block truncate')}>{node.jobRoleName}</span>
          ) : null}
        </span>
        {childCount > 0 ? (
          <span className={cn(S.faint, 'shrink-0')} title={t(locale, 'panel.orgChart.reportsCount', { n: childCount })}>
            {childCount}
          </span>
        ) : null}
      </button>
      {childCount > 0 && depth < maxDepth ? (
        <ul className="m-0 list-none p-0">
          {node.children.map((ch) => (
            <OrgNode
              key={ch.id}
              node={ch}
              depth={depth + 1}
              locale={locale}
              onOpen={onOpen}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * B-3006 read-only org chart. Click opens Equipe.
 * Incomplete graph still lists people (flat roots) with a callout.
 */
export function OrgChartBlock({
  locale = 'pt-BR',
  companyId,
  navigateDashboard = null,
}) {
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/org-chart?companyId=${encodeURIComponent(companyId)}`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'load');
      setData(json);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.orgChart.loadError'), 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, locale, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!companyId) return null;

  const openPerson = (candidateId) => {
    if (typeof navigateDashboard === 'function') {
      navigateDashboard({
        tab: 'team',
        candidate: String(candidateId),
        roster: 'internal',
      });
    }
  };

  const hasPeople = data && data.total > 0;
  const showTree = hasPeople && Array.isArray(data.roots) && data.roots.length > 0;

  return (
    <CollapsibleBlock
      locale={locale}
      title={t(locale, 'panel.orgChart.title')}
      count={!loading && data?.total ? data.total : null}
      defaultOpen={false}
      variant="card"
      collapsedHint={
        data?.incomplete
          ? t(locale, 'panel.orgChart.incompleteHint')
          : data?.withManager
            ? t(locale, 'panel.orgChart.meta', {
                total: data.total,
                linked: data.withManager,
              })
            : t(locale, 'panel.orgChart.hint')
      }
    >
      {loading ? (
        <AppLoading variant="panel" />
      ) : !hasPeople ? (
        <EmptyState
          title={t(locale, 'panel.orgChart.empty')}
          description={t(locale, 'panel.orgChart.emptyHint')}
        />
      ) : (
        <ContentEnter animKey={`org|${companyId}|${data.total}|${data.withManager}`}>
          {data.incomplete ? (
            <InlineCallout tone="info" className="mb-3">
              {t(locale, 'panel.orgChart.incompleteHint')}
            </InlineCallout>
          ) : (
            <p className={cn(S.muted, 'mb-3 text-xs')}>
              {t(locale, 'panel.orgChart.meta', {
                total: data.total,
                linked: data.withManager,
              })}
              {data.capped ? ` · ${t(locale, 'panel.orgChart.capped')}` : ''}
            </p>
          )}
          {showTree ? (
            <ul className="m-0 list-none space-y-0 p-0">
              {data.roots.map((root) => (
                <OrgNode
                  key={root.id}
                  node={root}
                  depth={0}
                  locale={locale}
                  onOpen={openPerson}
                />
              ))}
            </ul>
          ) : null}
        </ContentEnter>
      )}
    </CollapsibleBlock>
  );
}

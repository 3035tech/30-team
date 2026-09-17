'use client';

import { useState } from 'react';
import { cn } from '../../../lib/cn';
import { t } from '../../../lib/i18n';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { EmptyState } from '../../_components/EmptyState';
import { useAppFeedback } from '../../_components/AppFeedback';
import { AdminDeleteButton, AdminEditButton, AdminIconButton, S } from '../dashboard-shared';

export function PipelineTemplatesManager({ locale, companyId, templates, loading, onChanged }) {
  const { confirm, promptForm, toast } = useAppFeedback();
  const [busyId, setBusyId] = useState(null);

  const mutate = async (template, action) => {
    if (!template?.id) return;
    let method = 'PATCH';
    let body = companyId ? { companyId: Number(companyId) } : {};
    if (action === 'rename') {
      const values = await promptForm({
        title: t(locale, 'panel.pipelineTemplates.renameTitle'),
        confirmLabel: t(locale, 'panel.common.save'),
        fields: [{
          name: 'name',
          label: t(locale, 'panel.pipelineTemplates.nameLabel'),
          initialValue: template.name,
          required: true,
          maxLength: 80,
        }],
      });
      if (!values) return;
      body.name = values.name;
    } else if (action === 'duplicate') {
      const values = await promptForm({
        title: t(locale, 'panel.pipelineTemplates.duplicateTitle'),
        confirmLabel: t(locale, 'panel.pipelineTemplates.duplicate'),
        fields: [{
          name: 'name',
          label: t(locale, 'panel.pipelineTemplates.nameLabel'),
          initialValue: t(locale, 'panel.pipelineTemplates.copyName', { name: template.name }),
          required: true,
          maxLength: 80,
        }],
      });
      if (!values) return;
      body.duplicateName = values.name;
    } else if (action === 'default') {
      body.isDefault = true;
    } else if (action === 'archive') {
      const ok = await confirm({
        title: t(locale, 'panel.pipelineTemplates.archiveTitle'),
        message: t(locale, 'panel.pipelineTemplates.archiveHint', { name: template.name }),
        confirmLabel: t(locale, 'panel.pipelineTemplates.archive'),
        danger: true,
      });
      if (!ok) return;
      method = 'DELETE';
      body = null;
    }
    setBusyId(template.id);
    try {
      const query = method === 'DELETE' && companyId
        ? `?companyId=${encodeURIComponent(companyId)}`
        : '';
      const res = await fetch(`/api/admin/pipeline-templates/${template.id}${query}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.pipelineTemplates.manageFailed'));
      toast(t(locale, 'panel.pipelineTemplates.managed'), 'ok');
      await onChanged?.();
    } catch (error) {
      toast(error?.message || t(locale, 'panel.pipelineTemplates.manageFailed'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <AppLoading variant="panel" />;
  if (!templates?.length) {
    return <EmptyState message={t(locale, 'panel.pipelineTemplates.empty')} />;
  }

  return (
    <ContentEnter animKey={templates.map((item) => item.id).join('-')}>
      <div className="overflow-hidden rounded-control border border-ink/10 bg-surface">
        {templates.map((template) => {
          const busy = busyId === template.id;
          return (
            <article
              key={template.id}
              className={cn(
                'flex flex-col gap-3 border-b border-ink/8 px-3.5 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between',
                template.isDefault && 'border-l-2 border-l-brand-500 bg-brand-500/[0.025]'
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-control border border-ink/10 bg-ink/[0.035] font-mono text-2xs text-ink-muted">
                  {template.stageCount}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="m-0 truncate font-ui text-sm font-semibold text-ink">{template.name}</h4>
                    {template.isDefault ? (
                      <span className="rounded-full bg-brand-500/10 px-2 py-0.5 font-mono text-2xs text-brand-600">
                        {t(locale, 'panel.pipelineTemplates.defaultBadge')}
                      </span>
                    ) : null}
                  </div>
                  <p className={cn(S.faint, 'mb-0 mt-0.5')}>
                    {t(locale, 'panel.pipelineTemplates.usage', {
                      stages: template.stageCount,
                      vacancies: template.vacancyCount,
                    })}
                  </p>
              </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:flex-none sm:justify-end">
                <AdminEditButton label={t(locale, 'panel.pipelineTemplates.rename')} disabled={busy} onClick={() => mutate(template, 'rename')} />
                <AdminIconButton icon="copy" label={t(locale, 'panel.pipelineTemplates.duplicate')} disabled={busy} onClick={() => mutate(template, 'duplicate')} />
                {!template.isDefault ? (
                  <AdminIconButton icon="check" label={t(locale, 'panel.pipelineTemplates.makeDefault')} disabled={busy} onClick={() => mutate(template, 'default')} />
                ) : null}
                <AdminDeleteButton label={t(locale, 'panel.pipelineTemplates.archive')} disabled={busy} onClick={() => mutate(template, 'archive')} />
              </div>
            </article>
          );
        })}
      </div>
    </ContentEnter>
  );
}

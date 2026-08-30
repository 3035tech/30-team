'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { AppLoading, ContentEnter } from './AppLoading';
import { FormField } from './FormField';
import { EntitySearchSelect } from './EntitySearchSelect';
import { useAppFeedback } from './AppFeedback';
import { CollapsibleBlock } from './CollapsibleBlock';

/**
 * B-3006: assign direct manager on Equipe person panel.
 */
export function OrgManagerBlock({
  locale = 'pt-BR',
  companyId,
  candidateId,
}) {
  const { toast } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [managerId, setManagerId] = useState('');
  const [managerName, setManagerName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!companyId || !candidateId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        companyId: String(companyId),
        candidateId: String(candidateId),
      });
      const res = await fetch(`/api/admin/org-chart?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setManagerId(data.managerCandidateId ? String(data.managerCandidateId) : '');
      setManagerName(data.managerName || '');
    } catch {
      setManagerId('');
      setManagerName('');
    } finally {
      setLoading(false);
    }
  }, [companyId, candidateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (nextId) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/org-chart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: Number(companyId),
          candidateId: Number(candidateId),
          managerCandidateId: nextId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      toast(t(locale, 'panel.orgChart.managerSaved'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.orgChart.managerError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!companyId || !candidateId) return null;

  return (
    <CollapsibleBlock
      locale={locale}
      title={t(locale, 'panel.orgChart.managerTitle')}
      defaultOpen={false}
      variant="card"
      collapsedHint={
        managerName
          ? t(locale, 'panel.orgChart.managerHintNamed', { name: managerName })
          : t(locale, 'panel.orgChart.managerHintEmpty')
      }
    >
      {loading ? (
        <AppLoading variant="panel" />
      ) : (
        <ContentEnter animKey={`mgr|${candidateId}|${managerId || 0}`}>
          <FormField
            label={t(locale, 'panel.orgChart.managerLabel')}
            hint={
              managerName
                ? t(locale, 'panel.orgChart.currentManager', { name: managerName })
                : t(locale, 'panel.orgChart.managerHintEmpty')
            }
          >
            <EntitySearchSelect
              locale={locale}
              value={managerId}
              disabled={busy}
              searchUrl={`/api/admin/employees/search?companyId=${encodeURIComponent(companyId)}`}
              placeholder={t(locale, 'panel.orgChart.managerSearch')}
              aria-label={t(locale, 'panel.orgChart.managerLabel')}
              onChange={(id) => {
                const next = id ? String(id) : '';
                setManagerId(next);
                if (!next) {
                  setManagerName('');
                  void save(null);
                  return;
                }
                void save(Number(next));
              }}
            />
          </FormField>
        </ContentEnter>
      )}
    </CollapsibleBlock>
  );
}

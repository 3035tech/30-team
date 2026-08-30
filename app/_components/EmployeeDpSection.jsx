'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { t, localeHtmlLang } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { S } from '../dashboard/dashboard-shared';
import { useAppFeedback } from './AppFeedback';
import { AppLoading, ContentEnter } from './AppLoading';
import { EmptyState } from './EmptyState';
import { FormField } from './FormField';
import { InlineCallout } from './InlineCallout';
import { StatusToneChip } from './StatusToneChip';
import { CopyableLink } from './CopyableLink';
import { LeaveBalanceSummary } from './LeaveBalanceSummary';
import {
  DP_DOCUMENT_STATUS,
  DP_LEAVE_STATUS,
  DP_LEAVE_TYPE,
  DP_LEAVE_TYPES,
} from '../../lib/domain-status.js';
import { leaveInclusiveDays } from '../../lib/leave-days.js';

function formatDate(value, locale) {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d) return raw;
  return new Date(y, m - 1, d).toLocaleDateString(localeHtmlLang(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function docKeyLabel(locale, key) {
  const k = `panel.dp.docKey.${key}`;
  const label = t(locale, k);
  return label === k ? key : label;
}

function docStatusLabel(locale, status) {
  const k = `panel.dp.docStatus.${status}`;
  const label = t(locale, k);
  return label === k ? status : label;
}

function leaveTypeLabel(locale, type) {
  const k = `panel.dp.leaveType.${type}`;
  const label = t(locale, k);
  return label === k ? type : label;
}

function leaveStatusLabel(locale, status) {
  const k = `panel.dp.leaveStatus.${status}`;
  const label = t(locale, k);
  return label === k ? status : label;
}

function docStatusTone(status) {
  if (status === DP_DOCUMENT_STATUS.RECEIVED) return 'success';
  if (status === DP_DOCUMENT_STATUS.WAIVED) return 'neutral';
  return 'warning';
}

function leaveStatusTone(status) {
  if (status === DP_LEAVE_STATUS.APPROVED || status === DP_LEAVE_STATUS.TAKEN) return 'success';
  if (status === DP_LEAVE_STATUS.REJECTED) return 'danger';
  if (status === DP_LEAVE_STATUS.CANCELLED) return 'neutral';
  return 'warning';
}

/**
 * Collaborator DP: emergency contact, doc checklist (read), leave request.
 */
export function EmployeeDpSection({ locale = 'pt-BR', onBadge }) {
  const { toast, promptForm, confirm } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [pendingDocs, setPendingDocs] = useState(0);
  const [uploadKey, setUploadKey] = useState(null);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee/dp');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setProfile(data.profile || null);
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      setLeaves(Array.isArray(data.leaves) ? data.leaves : []);
      setBalance(data.balance || null);
      const badge = Number(data.badge) || 0;
      setPendingDocs(Number(data.pendingDocs) || 0);
      onBadge?.(badge);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.dp.loadError'), 'error');
      setProfile(null);
      setDocuments([]);
      setLeaves([]);
      setBalance(null);
      onBadge?.(0);
    } finally {
      setLoading(false);
    }
  }, [locale, toast, onBadge]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    const values = await promptForm({
      title: t(locale, 'panel.dp.editProfile'),
      confirmLabel: t(locale, 'panel.dp.save'),
      fields: [
        {
          key: 'emergencyName',
          label: t(locale, 'panel.dp.emergencyName'),
          defaultValue: profile?.emergencyName || '',
          maxLength: 120,
        },
        {
          key: 'emergencyPhone',
          label: t(locale, 'panel.dp.emergencyPhone'),
          defaultValue: profile?.emergencyPhone || '',
          maxLength: 40,
        },
        {
          key: 'emergencyRelation',
          label: t(locale, 'panel.dp.emergencyRelation'),
          defaultValue: profile?.emergencyRelation || '',
          maxLength: 80,
        },
        {
          key: 'addressLine',
          label: t(locale, 'panel.dp.addressLine'),
          defaultValue: profile?.addressLine || '',
          maxLength: 200,
        },
        {
          key: 'addressCity',
          label: t(locale, 'panel.dp.addressCity'),
          defaultValue: profile?.addressCity || '',
          maxLength: 80,
        },
        {
          key: 'addressState',
          label: t(locale, 'panel.dp.addressState'),
          defaultValue: profile?.addressState || '',
          maxLength: 40,
        },
        {
          key: 'addressPostal',
          label: t(locale, 'panel.dp.addressPostal'),
          defaultValue: profile?.addressPostal || '',
          maxLength: 20,
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch('/api/employee/dp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      setProfile(data.profile || profile);
      toast(t(locale, 'employeeHome.dpSaved'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.dpSaveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const startUpload = (docKey) => {
    setUploadKey(docKey);
    fileInputRef.current?.click();
  };

  const onFilePicked = async (ev) => {
    const file = ev.target.files?.[0];
    const docKey = uploadKey;
    ev.target.value = '';
    if (!file || !docKey) {
      setUploadKey(null);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(
        `/api/employee/dp/documents/${encodeURIComponent(docKey)}/file`,
        { method: 'POST', body: fd }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'upload');
      toast(t(locale, 'panel.dp.uploadOk'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.dp.uploadError'), 'error');
    } finally {
      setBusy(false);
      setUploadKey(null);
    }
  };

  const removeFile = async (doc) => {
    const ok = await confirm({
      title: t(locale, 'panel.dp.deleteFileTitle'),
      message: t(locale, 'panel.dp.deleteFileConfirm'),
      confirmLabel: t(locale, 'panel.dp.docDeleteFile'),
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/employee/dp/documents/${encodeURIComponent(doc.docKey)}/file`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'delete');
      toast(t(locale, 'panel.dp.fileDeleted'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'panel.dp.fileDeleteError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const requestLeave = async () => {
    const avail =
      balance?.availableDays != null ? Number(balance.availableDays) : null;
    const values = await promptForm({
      title: t(locale, 'employeeHome.dpRequestLeave'),
      confirmLabel: t(locale, 'employeeHome.dpLeaveSubmit'),
      fields: [
        {
          key: 'leaveType',
          label: t(locale, 'panel.dp.colType'),
          type: 'select',
          defaultValue: DP_LEAVE_TYPE.VACATION,
          options: DP_LEAVE_TYPES.map((v) => ({
            value: v,
            label: leaveTypeLabel(locale, v),
          })),
        },
        {
          key: 'startsOn',
          label: t(locale, 'panel.dp.leaveStarts'),
          type: 'date',
          required: true,
        },
        {
          key: 'endsOn',
          label: t(locale, 'panel.dp.leaveEnds'),
          type: 'date',
          required: true,
        },
        {
          key: 'reason',
          label: t(locale, 'panel.dp.leaveReason'),
          type: 'textarea',
          maxLength: 2000,
          defaultValue: '',
          help:
            avail != null
              ? t(locale, 'employeeHome.dpBalanceFormHint', { n: avail })
              : undefined,
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch('/api/employee/dp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'leave');
      toast(t(locale, 'employeeHome.dpLeaveOk'), 'ok');
      await load();
    } catch (e) {
      toast(e?.message || t(locale, 'employeeHome.dpLeaveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <AppLoading variant="panel" label={t(locale, 'panel.common.loading')} />;
  }

  const openLeaveCount = leaves.filter(
    (l) => l.status === DP_LEAVE_STATUS.REQUESTED || l.status === DP_LEAVE_STATUS.APPROVED
  ).length;

  return (
    <ContentEnter animKey={`emp-dp|${pendingDocs}|${openLeaveCount}|${leaves.length}|${balance?.availableDays ?? 'x'}`}>
      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => void onFilePicked(e)}
        />
        <p className={cn(S.muted, 'm-0 text-xs')}>{t(locale, 'employeeHome.dpHint')}</p>

        {pendingDocs > 0 ? (
          <InlineCallout tone="warning">
            {t(locale, 'employeeHome.dpDocsPending', { n: pendingDocs })}
          </InlineCallout>
        ) : null}

        <div className={cn(S.card, 'p-3')}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className={cn(S.label, 'm-0')}>{t(locale, 'panel.dp.profileTitle')}</h3>
            <button
              type="button"
              disabled={busy}
              className={cn(S.btnBrandSoft, 'min-h-touch text-2xs')}
              onClick={() => void saveProfile()}
            >
              {t(locale, 'panel.dp.editProfile')}
            </button>
          </div>
          {!profile?.emergencyName && !profile?.addressLine ? (
            <InlineCallout tone="info" className="mb-3">
              {t(locale, 'panel.dp.noProfile')}
            </InlineCallout>
          ) : null}
          <dl className="m-0 grid gap-2 sm:grid-cols-2">
            <FormField label={t(locale, 'panel.dp.emergencyName')}>
              <p className={cn(S.cardMuted, 'm-0')}>{profile?.emergencyName || '—'}</p>
            </FormField>
            <FormField label={t(locale, 'panel.dp.emergencyPhone')}>
              <p className={cn(S.cardMuted, 'm-0')}>{profile?.emergencyPhone || '—'}</p>
            </FormField>
            <FormField label={t(locale, 'panel.dp.emergencyRelation')}>
              <p className={cn(S.cardMuted, 'm-0')}>{profile?.emergencyRelation || '—'}</p>
            </FormField>
            <FormField label={t(locale, 'panel.dp.addressLine')}>
              <p className={cn(S.cardMuted, 'm-0')}>
                {[profile?.addressLine, profile?.addressCity, profile?.addressState, profile?.addressPostal]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </p>
            </FormField>
          </dl>
        </div>

        <div className={cn(S.card, 'p-3')}>
          <h3 className={cn(S.label, 'mb-2 mt-0')}>{t(locale, 'panel.dp.docsTitle')}</h3>
          <p className={cn(S.muted, 'mb-3 mt-0 text-xs')}>{t(locale, 'employeeHome.dpDocsUploadHint')}</p>
          {documents.length === 0 ? (
            <div data-emp-empty tabIndex={-1} className="outline-none">
              <EmptyState message={t(locale, 'panel.dp.docsEmptyHint')} />
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {documents.map((doc) => (
                <li
                  key={doc.docKey}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/8 bg-canvas/40 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <div className={S.cardMuted}>{docKeyLabel(locale, doc.docKey)}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusToneChip tone={docStatusTone(doc.status)}>
                        {docStatusLabel(locale, doc.status)}
                      </StatusToneChip>
                      <span className="font-mono text-2xs text-ink-muted">
                        {doc.hasFile
                          ? doc.fileName || t(locale, 'panel.dp.docHasFile')
                          : t(locale, 'panel.dp.docNoFile')}
                      </span>
                      {doc.hasFile && doc.fileUrl ? (
                        <CopyableLink
                          url={doc.fileUrl}
                          label={t(locale, 'panel.dp.docOpenFile')}
                          compact
                          locale={locale}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    {doc.status !== DP_DOCUMENT_STATUS.WAIVED ? (
                      <button
                        type="button"
                        disabled={busy || uploadKey === doc.docKey}
                        className={cn(S.btnGhost, 'min-h-touch text-2xs')}
                        onClick={() => startUpload(doc.docKey)}
                      >
                        {uploadKey === doc.docKey
                          ? t(locale, 'panel.common.loading')
                          : t(locale, 'panel.dp.docUpload')}
                      </button>
                    ) : null}
                    {doc.hasFile ? (
                      <button
                        type="button"
                        disabled={busy}
                        className={cn(S.btnGhost, 'min-h-touch text-2xs text-danger')}
                        onClick={() => void removeFile(doc)}
                      >
                        {t(locale, 'panel.dp.docDeleteFile')}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cn(S.card, 'p-3')}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className={cn(S.label, 'm-0')}>{t(locale, 'panel.dp.leaveTitle')}</h3>
            <button
              type="button"
              disabled={busy}
              className={cn(S.btnPrimary, 'min-h-touch text-2xs')}
              onClick={() => void requestLeave()}
            >
              {t(locale, 'employeeHome.dpRequestLeave')}
            </button>
          </div>
          <LeaveBalanceSummary
            locale={locale}
            balance={balance}
            className="mb-3"
          />
          <p className={cn(S.faint, 'mb-3 mt-0')}>{t(locale, 'employeeHome.dpBalanceHint')}</p>
          {leaves.length === 0 ? (
            <div data-emp-empty tabIndex={-1} className="outline-none">
              <EmptyState message={t(locale, 'employeeHome.dpEmptyLeave')} />
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {leaves.map((row) => {
                const days = leaveInclusiveDays(row.startsOn, row.endsOn);
                return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/8 bg-canvas/40 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <div className={S.cardMuted}>{leaveTypeLabel(locale, row.leaveType)}</div>
                    <div className="font-mono text-2xs text-ink-faint">
                      {formatDate(row.startsOn, locale)}–{formatDate(row.endsOn, locale)}
                      {days != null
                        ? ` · ${t(locale, 'panel.dp.leaveDaysMeta', { n: days })}`
                        : ''}
                    </div>
                    {row.reason ? (
                      <p className={cn(S.muted, 'mb-0 mt-1 text-xs')}>{row.reason}</p>
                    ) : null}
                  </div>
                  <StatusToneChip tone={leaveStatusTone(row.status)}>
                    {leaveStatusLabel(locale, row.status)}
                  </StatusToneChip>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </ContentEnter>
  );
}

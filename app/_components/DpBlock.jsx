'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { t, localeHtmlLang } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import {
  S,
  AdminCreateButton,
  AdminDeleteButton,
  AdminEditButton,
} from '../dashboard/dashboard-shared';
import { EmptyState } from './EmptyState';
import { AppLoading, ContentEnter } from './AppLoading';
import { useAppFeedback } from './AppFeedback';
import { StatusToneChip } from './StatusToneChip';
import { FormField } from './FormField';
import { InlineCallout } from './InlineCallout';
import { CopyableLink } from './CopyableLink';
import {
  DP_DOCUMENT_KEYS,
  DP_DOCUMENT_STATUS,
  DP_DOCUMENT_STATUSES,
  DP_LEAVE_STATUS,
  DP_LEAVE_TYPES,
  EMPLOYMENT_STATUS,
} from '../../lib/domain-status.js';

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
 * Lightweight DP: emergency/address profile, document checklist, leave.
 */
export function DpBlock({ locale, candidateId, employmentStatus, companyId }) {
  const { toast, promptForm, confirm } = useAppFeedback();
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadKey, setUploadKey] = useState(null);
  const fileInputRef = useRef(null);

  const readOnly = employmentStatus === EMPLOYMENT_STATUS.ALUMNI;
  const visible =
    employmentStatus === EMPLOYMENT_STATUS.EMPLOYEE ||
    employmentStatus === EMPLOYMENT_STATUS.ALUMNI;

  const baseUrl = `/api/admin/candidates/${encodeURIComponent(candidateId)}/dp`;
  const scopedCompanyId = companyId != null ? Number(companyId) : null;

  const load = useCallback(async () => {
    if (!candidateId || !visible) {
      setProfile(null);
      setDocuments([]);
      setLeaves([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(baseUrl);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'load');
      setProfile(data.profile || null);
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      setLeaves(Array.isArray(data.leaves) ? data.leaves : []);
    } catch (e) {
      toast(e?.message || t(locale, 'panel.dp.loadError'), 'error');
      setProfile(null);
      setDocuments([]);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [candidateId, visible, locale, toast, baseUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!visible) {
    return (
      <p className="m-0 rounded-control border border-ink/12 bg-ink/[0.02] px-3.5 py-3 text-xs leading-normal text-ink-muted">
        {t(locale, 'panel.dp.notInternal')}
      </p>
    );
  }

  const editProfile = async () => {
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
        {
          key: 'internalNotes',
          type: 'textarea',
          label: t(locale, 'panel.dp.internalNotes'),
          defaultValue: profile?.internalNotes || '',
          rows: 3,
          maxLength: 4000,
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      setProfile(data.profile || values);
      toast(t(locale, 'panel.dp.saved'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.dp.saveError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const editDocument = async (doc) => {
    const values = await promptForm({
      title: t(locale, 'panel.dp.docEdit'),
      confirmLabel: t(locale, 'panel.dp.save'),
      fields: [
        {
          key: 'status',
          type: 'select',
          label: t(locale, 'panel.dp.docStatusLabel'),
          defaultValue: doc.status || DP_DOCUMENT_STATUS.PENDING,
          required: true,
          options: DP_DOCUMENT_STATUSES.map((s) => ({
            value: s,
            label: docStatusLabel(locale, s),
          })),
        },
        {
          key: 'notes',
          type: 'textarea',
          label: t(locale, 'panel.dp.docNotes'),
          defaultValue: doc.notes || '',
          rows: 3,
          maxLength: 2000,
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(
        `${baseUrl}/documents/${encodeURIComponent(doc.docKey)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: values.status, notes: values.notes }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      setDocuments((prev) =>
        prev.map((d) => (d.docKey === doc.docKey ? data.item || { ...d, ...values } : d))
      );
      toast(t(locale, 'panel.dp.saved'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.dp.saveError'), 'error');
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
        `${baseUrl}/documents/${encodeURIComponent(docKey)}/file`,
        { method: 'POST', body: fd }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'upload');
      setDocuments((prev) =>
        prev.map((d) => (d.docKey === docKey ? data.item || d : d))
      );
      toast(t(locale, 'panel.dp.uploadOk'), 'ok');
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
        `${baseUrl}/documents/${encodeURIComponent(doc.docKey)}/file`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'delete');
      setDocuments((prev) =>
        prev.map((d) => (d.docKey === doc.docKey ? data.item || { ...d, hasFile: false, fileName: '', fileUrl: null } : d))
      );
      toast(t(locale, 'panel.dp.fileDeleted'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.dp.fileDeleteError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addLeave = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const values = await promptForm({
      title: t(locale, 'panel.dp.leaveAdd'),
      confirmLabel: t(locale, 'panel.dp.save'),
      fields: [
        {
          key: 'leaveType',
          type: 'select',
          label: t(locale, 'panel.dp.leaveTypeLabel'),
          defaultValue: DP_LEAVE_TYPES[0],
          required: true,
          options: DP_LEAVE_TYPES.map((v) => ({
            value: v,
            label: leaveTypeLabel(locale, v),
          })),
        },
        {
          key: 'startsOn',
          type: 'date',
          label: t(locale, 'panel.dp.leaveStarts'),
          defaultValue: today,
          required: true,
        },
        {
          key: 'endsOn',
          type: 'date',
          label: t(locale, 'panel.dp.leaveEnds'),
          defaultValue: today,
          required: true,
        },
        {
          key: 'reason',
          type: 'textarea',
          label: t(locale, 'panel.dp.leaveReason'),
          defaultValue: '',
          rows: 2,
          maxLength: 2000,
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(`${baseUrl}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveType: values.leaveType,
          startsOn: values.startsOn,
          endsOn: values.endsOn,
          reason: values.reason,
          autoApprove: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      if (data.item) setLeaves((prev) => [data.item, ...prev]);
      else await load();
      toast(t(locale, 'panel.dp.leaveCreated'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.dp.leaveCreateError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const editLeave = async (row) => {
    if (!scopedCompanyId) {
      toast(t(locale, 'panel.dp.needCompanyHint'), 'error');
      return;
    }
    const values = await promptForm({
      title: t(locale, 'panel.dp.editLeave'),
      confirmLabel: t(locale, 'panel.dp.save'),
      fields: [
        {
          key: 'status',
          type: 'select',
          label: t(locale, 'panel.dp.leaveStatusLabel'),
          defaultValue: row.status,
          required: true,
          options: [
            DP_LEAVE_STATUS.REQUESTED,
            DP_LEAVE_STATUS.APPROVED,
            DP_LEAVE_STATUS.REJECTED,
            DP_LEAVE_STATUS.CANCELLED,
            DP_LEAVE_STATUS.TAKEN,
          ].map((s) => ({
            value: s,
            label: leaveStatusLabel(locale, s),
          })),
        },
        {
          key: 'managerNotes',
          type: 'textarea',
          label: t(locale, 'panel.dp.managerNotes'),
          defaultValue: row.managerNotes || '',
          rows: 3,
          maxLength: 2000,
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/dp/leave/${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: scopedCompanyId,
          status: values.status,
          managerNotes: values.managerNotes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'save');
      setLeaves((prev) =>
        prev.map((l) => (l.id === row.id ? data.item || { ...l, ...values } : l))
      );
      toast(t(locale, 'panel.dp.leaveUpdated'), 'ok');
    } catch (e) {
      toast(e?.message || t(locale, 'panel.dp.leaveUpdateError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AppLoading variant="panel" label={t(locale, 'panel.common.loading')} />;

  const orderedDocs = [...documents].sort((a, b) => {
    const ia = DP_DOCUMENT_KEYS.indexOf(a.docKey);
    const ib = DP_DOCUMENT_KEYS.indexOf(b.docKey);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const pendingDocCount = orderedDocs.filter((d) => d.status === DP_DOCUMENT_STATUS.PENDING).length;
  const requestedLeaveCount = leaves.filter((l) => l.status === DP_LEAVE_STATUS.REQUESTED).length;

  return (
    <ContentEnter animKey={`dp-block|${candidateId}|${pendingDocCount}|${leaves.length}`}>
    <section
      className="flex flex-col gap-4"
      aria-labelledby="dp-block-title"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => void onFilePicked(e)}
      />

      <div className="rounded-control border border-ink/12 bg-canvas/40 p-3.5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <span id="dp-block-title" className={S.label}>
              {t(locale, 'panel.dp.title')}
            </span>
            <p className={cn(S.muted, 'mb-0 mt-1 text-xs')}>{t(locale, 'panel.dp.hint')}</p>
          </div>
        </div>
        {readOnly ? (
          <InlineCallout tone="info" className="mb-0">
            {t(locale, 'panel.dp.alumniReadOnly')}
          </InlineCallout>
        ) : null}
      </div>

      {pendingDocCount > 0 ? (
        <InlineCallout tone="warning">
          {t(locale, 'panel.dp.pendingBanner', { n: pendingDocCount })}
        </InlineCallout>
      ) : null}

      {requestedLeaveCount > 0 ? (
        <InlineCallout tone="info">
          {t(locale, 'panel.dp.requestedLeaveBanner', { n: requestedLeaveCount })}
        </InlineCallout>
      ) : null}

      <div className="rounded-control border border-ink/12 bg-canvas/40 p-3.5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <span className={S.label}>{t(locale, 'panel.dp.profileTitle')}</span>
          {!readOnly ? (
            <AdminEditButton
              label={t(locale, 'panel.dp.editProfile')}
              onClick={() => void editProfile()}
              disabled={busy}
            />
          ) : null}
        </div>
        {profile ? (
          <dl className="m-0 grid gap-2 sm:grid-cols-2">
            <FormField as="div" label={t(locale, 'panel.dp.emergencyName')}>
              <p className="m-0 text-sm text-ink">{profile.emergencyName || '—'}</p>
            </FormField>
            <FormField as="div" label={t(locale, 'panel.dp.emergencyPhone')}>
              <p className="m-0 text-sm text-ink">{profile.emergencyPhone || '—'}</p>
            </FormField>
            <FormField as="div" label={t(locale, 'panel.dp.emergencyRelation')}>
              <p className="m-0 text-sm text-ink">{profile.emergencyRelation || '—'}</p>
            </FormField>
            <FormField as="div" label={t(locale, 'panel.dp.addressLine')}>
              <p className="m-0 text-sm text-ink">{profile.addressLine || '—'}</p>
            </FormField>
            <FormField as="div" label={t(locale, 'panel.dp.addressCity')}>
              <p className="m-0 text-sm text-ink">{profile.addressCity || '—'}</p>
            </FormField>
            <FormField as="div" label={t(locale, 'panel.dp.addressState')}>
              <p className="m-0 text-sm text-ink">{profile.addressState || '—'}</p>
            </FormField>
            <FormField as="div" label={t(locale, 'panel.dp.addressPostal')}>
              <p className="m-0 text-sm text-ink">{profile.addressPostal || '—'}</p>
            </FormField>
            <FormField as="div" label={t(locale, 'panel.dp.internalNotes')} className="sm:col-span-2">
              <p className="m-0 whitespace-pre-wrap text-sm text-ink">
                {profile.internalNotes || '—'}
              </p>
            </FormField>
          </dl>
        ) : (
          <p className={cn(S.muted, 'm-0 text-xs')}>{t(locale, 'panel.dp.noProfile')}</p>
        )}
      </div>

      <div className="rounded-control border border-ink/12 bg-canvas/40 p-3.5">
        <span className={cn(S.label, 'mb-3 block')}>{t(locale, 'panel.dp.docsTitle')}</span>
        {orderedDocs.length === 0 ? (
          <EmptyState
            title={t(locale, 'panel.dp.docsEmptyTitle')}
            message={t(locale, 'panel.dp.docsEmptyHint')}
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {orderedDocs.map((doc) => (
              <li
                key={doc.docKey}
                className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/10 bg-surface px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="font-ui text-sm text-ink">{docKeyLabel(locale, doc.docKey)}</div>
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
                  {doc.notes ? (
                    <p className={cn(S.muted, 'mb-0 mt-1 text-xs')}>{doc.notes}</p>
                  ) : null}
                </div>
                {!readOnly ? (
                  <div className="flex shrink-0 gap-1">
                    <AdminEditButton
                      label={t(locale, 'panel.dp.docEdit')}
                      onClick={() => void editDocument(doc)}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      disabled={busy || uploadKey === doc.docKey}
                      className={cn(S.btnGhost, 'min-h-touch text-xs')}
                      onClick={() => startUpload(doc.docKey)}
                    >
                      {uploadKey === doc.docKey
                        ? t(locale, 'panel.common.loading')
                        : t(locale, 'panel.dp.docUpload')}
                    </button>
                    {doc.hasFile ? (
                      <AdminDeleteButton
                        label={t(locale, 'panel.dp.docDeleteFile')}
                        onClick={() => void removeFile(doc)}
                        disabled={busy}
                      />
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-control border border-ink/12 bg-canvas/40 p-3.5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <span className={S.label}>{t(locale, 'panel.dp.leaveTitle')}</span>
          {!readOnly ? (
            <AdminCreateButton
              label={t(locale, 'panel.dp.leaveAdd')}
              onClick={() => void addLeave()}
              disabled={busy}
            />
          ) : null}
        </div>
        {leaves.length === 0 ? (
          <EmptyState
            title={t(locale, 'panel.dp.leaveEmpty')}
            message={t(locale, 'panel.dp.leaveEmptyHint')}
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {leaves.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/10 bg-surface px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="font-ui text-sm text-ink">
                    {leaveTypeLabel(locale, row.leaveType)}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-2xs text-ink-muted">
                    <span>
                      {formatDate(row.startsOn, locale)}
                      {' · '}
                      {formatDate(row.endsOn, locale)}
                    </span>
                    <StatusToneChip tone={leaveStatusTone(row.status)}>
                      {leaveStatusLabel(locale, row.status)}
                    </StatusToneChip>
                  </div>
                  {row.reason ? (
                    <p className={cn(S.muted, 'mb-0 mt-1 text-xs')}>{row.reason}</p>
                  ) : null}
                  {row.managerNotes ? (
                    <p className={cn(S.muted, 'mb-0 mt-1 text-xs')}>
                      {t(locale, 'panel.dp.managerNotes')}: {row.managerNotes}
                    </p>
                  ) : null}
                </div>
                {!readOnly && scopedCompanyId ? (
                  <AdminEditButton
                    label={t(locale, 'panel.dp.editLeave')}
                    onClick={() => void editLeave(row)}
                    disabled={busy}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
    </ContentEnter>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorMessage, t } from '../../lib/i18n';
import { C } from '../../lib/theme';
import { S } from './dashboard-shared';

const REPORT_EXPIRY_DAYS = [7, 14, 30];
const DEFAULT_REPORT_EXPIRY_DAYS = 14;

const INTERVIEW_PLUS = new Set(['interview', 'approved', 'hired']);

/**
 * Generate / list / revoke public client report links for a vacancy.
 */
export function VacancyClientReportBlock({ vacancyId, locale = 'pt-BR', appUrl = '' }) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [stageFilter, setStageFilter] = useState('all');
  const [expiresInDays, setExpiresInDays] = useState(DEFAULT_REPORT_EXPIRY_DAYS);
  const [note, setNote] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [lastUrl, setLastUrl] = useState('');

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/vacancies/${vacancyId}/reports`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.errorCode ? errorMessage(locale, data.errorCode, data.error) : data?.error);
      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    }
  }, [vacancyId, locale]);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/vacancies/${vacancyId}/reports?candidates=1`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.errorCode ? errorMessage(locale, data.errorCode, data.error) : data?.error);
      setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [vacancyId, locale]);

  useEffect(() => {
    if (!open) return;
    loadCandidates();
    loadReports();
  }, [open, loadCandidates, loadReports]);

  const visible = useMemo(() => {
    if (stageFilter === 'interview_plus') {
      return candidates.filter((c) => INTERVIEW_PLUS.has(c.pipelineStage));
    }
    return candidates;
  }, [candidates, stageFilter]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectVisible = () => {
    setSelected(new Set(visible.map((c) => c.candidateId)));
  };

  const clearSelected = () => setSelected(new Set());

  const generate = async () => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${vacancyId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: [...selected],
          expiresInDays,
          executiveNote: note,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.errorCode ? errorMessage(locale, data.errorCode, data.error) : data?.error);
      const url = data.url || (appUrl ? `${appUrl}/r/${data.token}` : `/r/${data.token}`);
      setLastUrl(url);
      setMsg(t(locale, 'panel.report.generated'));
      await loadReports();
      try {
        await navigator.clipboard.writeText(url);
        setMsg(t(locale, 'panel.report.generatedCopied'));
      } catch {
        /* ignore */
      }
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (reportId) => {
    if (!window.confirm(t(locale, 'panel.report.revokeConfirm'))) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/vacancies/${vacancyId}/reports/${reportId}/revoke`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.errorCode ? errorMessage(locale, data.errorCode, data.error) : data?.error);
      setMsg(t(locale, 'panel.report.revoked'));
      await loadReports();
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setMsg(t(locale, 'panel.common.copied'));
    } catch {
      setErr(t(locale, 'panel.common.copyFailed'));
    }
  };

  const stageLabel = (stage) => {
    const map = {
      new: 'recruiting.pipelineNew',
      test_completed: 'recruiting.pipelineTestCompleted',
      screening: 'recruiting.pipelineScreening',
      interview: 'recruiting.pipelineInterview',
      approved: 'recruiting.pipelineApproved',
      hired: 'recruiting.pipelineHired',
      rejected: 'recruiting.pipelineRejected',
      archived: 'recruiting.pipelineArchived',
    };
    return map[stage] ? t(locale, map[stage]) : stage || '—';
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: `${C.purple}18`,
          border: `1px solid ${C.purple}55`,
          borderRadius: '10px',
          padding: '8px 10px',
          color: C.purple,
          fontSize: '12px',
          cursor: 'pointer',
          fontFamily: 'monospace',
        }}
      >
        {open ? t(locale, 'panel.report.hidePanel') : t(locale, 'panel.report.openPanel')}
      </button>

      {open ? (
        <div
          style={{
            marginTop: '12px',
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid ${C.border}`,
            background: C.surface || C.card,
          }}
        >
          <span style={S.label}>{t(locale, 'panel.report.title')}</span>
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: C.muted, lineHeight: 1.55 }}>
            {t(locale, 'panel.report.intro')}
          </p>

          {err ? (
            <p style={{ marginTop: '10px', color: C.danger || C.tension, fontSize: '12px', fontFamily: 'monospace' }}>
              {err}
            </p>
          ) : null}
          {msg ? (
            <p style={{ marginTop: '10px', color: C.success || C.synergy, fontSize: '12px', fontFamily: 'monospace' }}>
              {msg}
            </p>
          ) : null}

          {lastUrl ? (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1px solid ${C.purple}40`,
                background: `${C.purple}0a`,
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <code style={{ fontSize: '11px', color: C.purple, wordBreak: 'break-all', flex: 1 }}>{lastUrl}</code>
              <button
                type="button"
                onClick={() => copyUrl(lastUrl)}
                style={{
                  background: `${C.purple}18`,
                  border: `1px solid ${C.purple}55`,
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: C.purple,
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                {t(locale, 'panel.report.copyLink')}
              </button>
            </div>
          ) : null}

          <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              style={S.select}
            >
              <option value="all">{t(locale, 'panel.report.filterAllTested')}</option>
              <option value="interview_plus">{t(locale, 'panel.report.filterInterviewPlus')}</option>
            </select>
            <button type="button" onClick={selectVisible} style={btnGhost(locale)} disabled={loading || !visible.length}>
              {t(locale, 'panel.report.selectVisible')}
            </button>
            <button type="button" onClick={clearSelected} style={btnGhost(locale)} disabled={!selected.size}>
              {t(locale, 'panel.report.clearSelection')}
            </button>
            <select
              value={String(expiresInDays)}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              style={S.select}
            >
              {REPORT_EXPIRY_DAYS.map((d) => (
                <option key={d} value={d}>
                  {t(locale, 'panel.report.expiresInDays', { n: d })}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t(locale, 'panel.report.notePlaceholder')}
            rows={3}
            style={{
              ...S.select,
              width: '100%',
              marginTop: '10px',
              resize: 'vertical',
              fontFamily: 'Georgia, serif',
            }}
          />

          <div style={{ marginTop: '12px', maxHeight: '240px', overflow: 'auto', border: `1px solid ${C.border}`, borderRadius: '10px' }}>
            {loading ? (
              <p style={{ padding: '12px', fontSize: '12px', color: C.muted }}>{t(locale, 'panel.common.loading')}</p>
            ) : visible.length === 0 ? (
              <p style={{ padding: '12px', fontSize: '12px', color: C.muted }}>{t(locale, 'panel.report.noCandidates')}</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: C.muted, fontFamily: 'monospace' }}>
                    <th style={{ padding: '8px 10px', width: '36px' }} />
                    <th style={{ padding: '8px 10px' }}>{t(locale, 'panel.report.colName')}</th>
                    <th style={{ padding: '8px 10px' }}>{t(locale, 'panel.report.colStage')}</th>
                    <th style={{ padding: '8px 10px' }}>{t(locale, 'panel.report.colFit')}</th>
                    <th style={{ padding: '8px 10px' }}>{t(locale, 'panel.report.colType')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => (
                    <tr key={c.candidateId} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="checkbox"
                          checked={selected.has(c.candidateId)}
                          onChange={() => toggle(c.candidateId)}
                          style={{ accentColor: C.purple }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px', color: C.text }}>{c.name}</td>
                      <td style={{ padding: '8px 10px', color: C.muted, fontFamily: 'monospace' }}>
                        {stageLabel(c.pipelineStage)}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                        {c.vacancyFitScore010 != null ? c.vacancyFitScore010.toFixed(1) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                        {c.topType != null ? `T${c.topType}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              onClick={generate}
              disabled={busy || selected.size === 0}
              style={{
                background: selected.size ? `${C.purple}18` : 'transparent',
                border: `1px solid ${selected.size ? `${C.purple}55` : C.border}`,
                borderRadius: '10px',
                padding: '10px 14px',
                color: selected.size ? C.purple : C.faint,
                fontSize: '12px',
                cursor: selected.size && !busy ? 'pointer' : 'default',
                fontFamily: 'monospace',
              }}
            >
              {busy
                ? t(locale, 'panel.common.loading')
                : t(locale, 'panel.report.generate', { n: selected.size })}
            </button>
          </div>

          <div style={{ marginTop: '20px' }}>
            <span style={{ ...S.label, marginBottom: '8px' }}>{t(locale, 'panel.report.historyTitle')}</span>
            {reports.length === 0 ? (
              <p style={{ fontSize: '12px', color: C.muted }}>{t(locale, 'panel.report.historyEmpty')}</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
                {reports.map((r) => {
                  const url = r.url || (appUrl ? `${appUrl}/r/${r.token}` : `/r/${r.token}`);
                  const exp = r.expiresAt ? new Date(r.expiresAt) : null;
                  return (
                    <li
                      key={r.id}
                      style={{
                        padding: '10px 0',
                        borderTop: `1px solid ${C.border}`,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '12px', color: C.text }}>
                          {r.candidateCount != null
                            ? t(locale, 'panel.report.historyItem', { n: r.candidateCount })
                            : r.title}
                          {' · '}
                          <span style={{ color: r.isLive ? (C.success || C.synergy) : C.faint, fontFamily: 'monospace' }}>
                            {r.isLive ? t(locale, 'panel.report.statusLive') : t(locale, 'panel.report.statusDead')}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace', marginTop: '2px' }}>
                          {exp ? t(locale, 'panel.report.expiresAt', { date: exp.toLocaleString(locale) }) : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" onClick={() => copyUrl(url)} style={btnGhost(locale)} disabled={!r.isLive}>
                          {t(locale, 'panel.report.copyLink')}
                        </button>
                        <button
                          type="button"
                          onClick={() => revoke(r.id)}
                          style={{
                            ...btnGhost(locale),
                            color: C.danger || C.tension,
                            borderColor: 'rgba(220,38,38,.35)',
                          }}
                          disabled={busy || !r.active}
                        >
                          {t(locale, 'panel.report.revoke')}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function btnGhost() {
  return {
    background: 'transparent',
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    padding: '6px 10px',
    color: C.muted,
    fontSize: '11px',
    cursor: 'pointer',
    fontFamily: 'monospace',
  };
}

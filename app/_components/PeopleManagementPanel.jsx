'use client';

import { useState } from 'react';
import { t, localeHtmlLang } from '../../lib/i18n';
import { C } from '../../lib/theme';
import { S } from '../dashboard/dashboard-shared';

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatMeetingDate(value, locale) {
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

/**
 * Hipóteses de gestão + registro de 1:1 (mesma pessoa = candidate_id).
 */
export function PeopleManagementPanel({
  locale,
  candidateId,
  people,
  onRefresh,
}) {
  const management = people?.management;
  const oneOnOnes = people?.oneOnOnes || [];
  const [meetingDate, setMeetingDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgError, setMsgError] = useState(false);

  if (!management && !people) {
    return null;
  }

  const completeness = management?.completeness || {};
  const hypotheses = management?.hypotheses || [];
  const prompts = management?.oneOnOnePrompts || [];
  const signals = management?.retentionSignals || [];
  const topMot = management?.motivators?.top || [];

  const save = async () => {
    if (!candidateId || !notes.trim()) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(candidateId)}/one-on-ones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingDate, notes, nextSteps }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.team.oneOnOneSaveError'));
      setNotes('');
      setNextSteps('');
      setMeetingDate(todayIso());
      setMsgError(false);
      setMsg(t(locale, 'panel.team.oneOnOneSaved'));
      if (onRefresh) await onRefresh();
    } catch (e) {
      setMsgError(true);
      setMsg(e?.message || t(locale, 'panel.team.oneOnOneSaveError'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (ooId) => {
    if (!candidateId || !ooId) return;
    const ok = window.confirm(t(locale, 'panel.team.oneOnOneDeleteConfirm'));
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/candidates/${encodeURIComponent(candidateId)}/one-on-ones/${encodeURIComponent(ooId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      if (onRefresh) await onRefresh();
    } catch (e) {
      window.alert(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'rgba(26,22,37,.02)' }}>
      <span style={{ ...S.label, marginBottom: '6px', display: 'block' }}>
        {t(locale, 'panel.team.peopleTitle')}
      </span>
      <p style={{ margin: '0 0 12px', fontSize: '12px', color: C.faint, lineHeight: 1.5 }}>
        {t(locale, 'panel.team.peopleHint')}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <span style={{
          fontSize: '11px', fontFamily: 'monospace', padding: '3px 8px', borderRadius: '999px',
          background: completeness.enneagram ? `${C.synergy}18` : 'rgba(26,22,37,.06)',
          color: completeness.enneagram ? C.synergy : C.muted,
        }}>
          {completeness.enneagram ? t(locale, 'panel.team.peopleHasEnneagram') : t(locale, 'panel.team.peopleMissingEnneagram')}
        </span>
        <span style={{
          fontSize: '11px', fontFamily: 'monospace', padding: '3px 8px', borderRadius: '999px',
          background: completeness.motivators ? `${C.synergy}18` : 'rgba(26,22,37,.06)',
          color: completeness.motivators ? C.synergy : C.muted,
        }}>
          {completeness.motivators ? t(locale, 'panel.team.peopleHasMotivators') : t(locale, 'panel.team.peopleMissingMotivators')}
        </span>
      </div>

      {topMot.length > 0 ? (
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
            {t(locale, 'panel.team.peopleTopMotivators')}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            {topMot.map((d) => (
              <span
                key={d.key}
                style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  border: `1px solid ${d.color || C.border}`,
                  color: C.text,
                  background: 'rgba(255,255,255,.5)',
                }}
              >
                {d.label} · {Math.round(d.score)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {signals.length > 0 ? (
        <div style={{ marginBottom: '12px' }}>
          <span style={{ ...S.label, marginBottom: '6px', display: 'block' }}>
            {t(locale, 'panel.team.peopleRetention')}
          </span>
          <ul style={{ margin: 0, paddingLeft: '18px' }}>
            {signals.map((s) => (
              <li key={s.key} style={{ fontSize: '13px', color: C.muted, lineHeight: 1.55, marginBottom: '4px' }}>
                {s.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hypotheses.length > 0 ? (
        <div style={{ marginBottom: '14px' }}>
          <span style={{ ...S.label, marginBottom: '8px', display: 'block' }}>
            {t(locale, 'panel.team.peopleHypotheses')}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {hypotheses.map((h) => (
              <div
                key={h.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${C.border}`,
                  background: 'rgba(255,255,255,.45)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>
                  {h.title}
                </div>
                <div style={{ fontSize: '13px', color: C.muted, lineHeight: 1.55 }}>{h.body}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ margin: '0 0 12px', fontSize: '12px', color: C.faint, fontStyle: 'italic' }}>
          {t(locale, 'panel.team.peopleHypothesesEmpty')}
        </p>
      )}

      {prompts.length > 0 ? (
        <div style={{ marginBottom: '14px' }}>
          <span style={{ ...S.label, marginBottom: '6px', display: 'block' }}>
            {t(locale, 'panel.team.peoplePrompts')}
          </span>
          <ol style={{ margin: 0, paddingLeft: '18px' }}>
            {prompts.map((q) => (
              <li key={q} style={{ fontSize: '13px', color: C.text, lineHeight: 1.55, marginBottom: '4px' }}>
                {q}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '12px', marginTop: '4px' }}>
        <span style={{ ...S.label, marginBottom: '8px', display: 'block' }}>
          {t(locale, 'panel.team.oneOnOneTitle')}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
          <label style={{ fontSize: '12px', color: C.muted }}>
            {t(locale, 'panel.team.oneOnOneDate')}
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              style={{
                display: 'block',
                marginTop: '4px',
                width: '100%',
                maxWidth: '220px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.text,
                fontFamily: 'inherit',
              }}
            />
          </label>
          <label style={{ fontSize: '12px', color: C.muted }}>
            {t(locale, 'panel.team.oneOnOneNotes')}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t(locale, 'panel.team.oneOnOneNotesPlaceholder')}
              style={{
                display: 'block',
                marginTop: '4px',
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.text,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </label>
          <label style={{ fontSize: '12px', color: C.muted }}>
            {t(locale, 'panel.team.oneOnOneNextSteps')}
            <textarea
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              rows={2}
              placeholder={t(locale, 'panel.team.oneOnOneNextStepsPlaceholder')}
              style={{
                display: 'block',
                marginTop: '4px',
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.text,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              disabled={busy || !notes.trim()}
              onClick={save}
              style={{
                background: C.purple,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                cursor: busy || !notes.trim() ? 'default' : 'pointer',
                opacity: busy || !notes.trim() ? 0.5 : 1,
                fontFamily: 'inherit',
              }}
            >
              {busy ? t(locale, 'panel.admin.save') : t(locale, 'panel.team.oneOnOneSave')}
            </button>
            {msg ? (
              <span style={{ fontSize: '12px', color: msgError ? C.tension : C.synergy }}>{msg}</span>
            ) : null}
          </div>
        </div>

        {oneOnOnes.length === 0 ? (
          <p style={{ margin: 0, fontSize: '12px', color: C.faint, fontStyle: 'italic' }}>
            {t(locale, 'panel.team.oneOnOneEmpty')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {oneOnOnes.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${C.border}`,
                  background: 'rgba(255,255,255,.4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', color: C.muted }}>
                    {formatMeetingDate(item.meetingDate, locale)}
                    {item.createdByName ? ` · ${item.createdByName}` : ''}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: C.tension,
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                    }}
                  >
                    {t(locale, 'panel.team.oneOnOneDelete')}
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  {item.notes}
                </div>
                {item.nextSteps ? (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: C.muted, lineHeight: 1.5 }}>
                    <strong style={{ color: C.text }}>{t(locale, 'panel.team.oneOnOneNextSteps')}: </strong>
                    {item.nextSteps}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

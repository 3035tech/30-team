'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorMessage, t } from '../../lib/i18n';
import { typeHintTooltip, typeShortLabel } from '../../lib/type-en';
import { C } from '../../lib/theme';
import { S } from './dashboard-shared';
import { RichTextEditor } from '../_components/RichTextEditor';
import { useAppFeedback } from '../_components/AppFeedback';
import { htmlToPlainText } from '../../lib/sanitize-html';
import { getTypeData } from '../../lib/i18n-data';
import {
  REPORT_NOTE_MIN_CHARS,
  REPORT_RECOMMENDATIONS,
  STRUCTURED_FIELD_MAX_CHARS,
  normalizeRecommendation,
} from '../../lib/vacancy-report-shared';

const REPORT_EXPIRY_DAYS = [7, 14, 30];
const DEFAULT_REPORT_EXPIRY_DAYS = 14;

const INTERVIEW_PLUS = new Set(['interview', 'approved', 'hired']);

const NOTE_TEMPLATE_PT = `<p><strong>Quem avançar:</strong> …</p>
<p><strong>Por quê (fit / contexto da vaga):</strong> …</p>
<p><strong>Alertas / pontos a explorar na entrevista:</strong> …</p>
<p><strong>Próximo passo sugerido:</strong> …</p>`;

const NOTE_TEMPLATE_EN = `<p><strong>Who to advance:</strong> …</p>
<p><strong>Why (fit / role context):</strong> …</p>
<p><strong>Watch-outs / interview probes:</strong> …</p>
<p><strong>Suggested next step:</strong> …</p>`;

/**
 * Generate / list / revoke public client report links for a vacancy.
 */
export function VacancyClientReportBlock({
  vacancyId,
  locale = 'pt-BR',
  appUrl = '',
  clientReportShowSalary: clientReportShowSalaryProp = false,
  onClientReportShowSalaryChange,
}) {
  const { confirm } = useAppFeedback();
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [vacancyMeta, setVacancyMeta] = useState(null);
  const [rubricMeta, setRubricMeta] = useState(null);
  const [showSalary, setShowSalary] = useState(Boolean(clientReportShowSalaryProp));
  const [salaryBusy, setSalaryBusy] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [overrides, setOverrides] = useState({});
  const [stageFilter, setStageFilter] = useState('shortlist');
  const [expiresInDays, setExpiresInDays] = useState(DEFAULT_REPORT_EXPIRY_DAYS);
  const [note, setNote] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [lastUrl, setLastUrl] = useState('');
  const [editingReportId, setEditingReportId] = useState(null);
  const [editNoteDraft, setEditNoteDraft] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const notePlainLen = htmlToPlainText(note).length;
  const noteOk = notePlainLen >= REPORT_NOTE_MIN_CHARS;

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
      setVacancyMeta(data.vacancy || null);
      setRubricMeta(data.rubricSummary || null);
      if (typeof data.vacancy?.clientReportShowSalary === 'boolean') {
        setShowSalary(Boolean(data.vacancy.clientReportShowSalary));
      }
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
      setCandidates([]);
      setVacancyMeta(null);
      setRubricMeta(null);
    } finally {
      setLoading(false);
    }
  }, [vacancyId, locale]);

  useEffect(() => {
    setShowSalary(Boolean(clientReportShowSalaryProp));
  }, [clientReportShowSalaryProp, vacancyId]);

  useEffect(() => {
    if (!open) return;
    loadCandidates();
    loadReports();
  }, [open, loadCandidates, loadReports]);

  const persistShowSalary = async (next) => {
    const prev = showSalary;
    setShowSalary(next);
    setSalaryBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientReportShowSalary: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.errorCode ? errorMessage(locale, data.errorCode, data.error) : data?.error);
      }
      setVacancyMeta((cur) => (cur ? { ...cur, clientReportShowSalary: next } : cur));
      onClientReportShowSalaryChange?.(next);
      setMsg(t(locale, 'panel.report.showSalarySaved'));
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      setShowSalary(prev);
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setSalaryBusy(false);
    }
  };

  const visible = useMemo(() => {
    if (stageFilter === 'interview_plus') {
      return candidates.filter((c) => INTERVIEW_PLUS.has(c.pipelineStage));
    }
    if (stageFilter === 'shortlist') {
      return candidates.filter((c) => !c.excludedFromClient && c.recommendation !== 'exclude');
    }
    return candidates;
  }, [candidates, stageFilter]);

  const selectedPeople = useMemo(
    () => candidates.filter((c) => selected.has(c.candidateId)),
    [candidates, selected]
  );

  const ensureOverride = (c) => {
    setOverrides((prev) => {
      if (prev[c.candidateId]) return prev;
      const typeData = getTypeData(locale);
      const probe = c.topType != null ? typeData[c.topType]?.challenge || '' : '';
      return {
        ...prev,
        [c.candidateId]: {
          recommendation: normalizeRecommendation(c.recommendation, 'bank'),
          why: '',
          watchOut: '',
          interviewProbe: String(probe).slice(0, STRUCTURED_FIELD_MAX_CHARS),
        },
      };
    });
  };

  const toggle = (c) => {
    const id = c.candidateId;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        ensureOverride(c);
      }
      return next;
    });
  };

  const selectVisible = () => {
    setSelected(new Set(visible.map((c) => c.candidateId)));
    setOverrides((prev) => {
      const next = { ...prev };
      const typeData = getTypeData(locale);
      for (const c of visible) {
        if (!next[c.candidateId]) {
          const probe = c.topType != null ? typeData[c.topType]?.challenge || '' : '';
          next[c.candidateId] = {
            recommendation: normalizeRecommendation(c.recommendation, 'bank'),
            why: '',
            watchOut: '',
            interviewProbe: String(probe).slice(0, STRUCTURED_FIELD_MAX_CHARS),
          };
        }
      }
      return next;
    });
  };

  const clearSelected = () => setSelected(new Set());

  const setRec = (id, recommendation) => {
    setOverrides((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        recommendation: normalizeRecommendation(recommendation, 'bank'),
      },
    }));
  };

  const setStructured = (id, field, text) => {
    setOverrides((prev) => ({
      ...prev,
      [id]: {
        recommendation: normalizeRecommendation(prev[id]?.recommendation, 'bank'),
        why: prev[id]?.why || '',
        watchOut: prev[id]?.watchOut || '',
        interviewProbe: prev[id]?.interviewProbe || '',
        [field]: String(text || '').slice(0, STRUCTURED_FIELD_MAX_CHARS),
      },
    }));
  };

  const applyNoteTemplate = () => {
    const tpl = locale === 'en' ? NOTE_TEMPLATE_EN : NOTE_TEMPLATE_PT;
    setNote((prev) => (htmlToPlainText(prev).length ? prev : tpl));
  };

  /** Preenche o parecer com a shortlist selecionada (passa o mínimo de 80 chars). */
  const generateNoteFromShortlist = () => {
    const people = selectedPeople.filter((c) => !c.excludedFromClient && c.recommendation !== 'exclude');
    if (!people.length) {
      setErr(t(locale, 'panel.report.generateNoteNeedSelection'));
      return;
    }
    const vacTitle = vacancyMeta?.title || '';
    const byRec = (rec) =>
      people.filter((c) => effectiveRec(c) === rec).map((c) => {
        const ov = overrides[c.candidateId] || {};
        const fit =
          c.vacancyFitScore010 != null ? ` (fit ${Number(c.vacancyFitScore010).toFixed(1)}/10)` : '';
        const why = ov.why ? ` — ${ov.why}` : '';
        return `${c.name}${c.topType != null ? ` T${c.topType}` : ''}${fit}${why}`;
      });

    const advance = byRec('advance');
    const discuss = byRec('discuss');
    const bank = byRec('bank');
    const alerts = people
      .map((c) => {
        const w = overrides[c.candidateId]?.watchOut || '';
        return w ? `${c.name}: ${w}` : null;
      })
      .filter(Boolean);

    const en = locale === 'en';
    const html = en
      ? `<p><strong>Who to advance:</strong> ${advance.length ? advance.join('; ') : '—'}${discuss.length ? `. Discuss further: ${discuss.join('; ')}` : ''}.</p>
<p><strong>Why (fit / role context):</strong> Shortlist for ${vacTitle || 'this role'} ranked by rubric alignment and interview notes. ${bank.length ? `Hold for now: ${bank.join('; ')}.` : ''}</p>
<p><strong>Watch-outs / interview probes:</strong> ${alerts.length ? alerts.join(' · ') : 'Validate technical depth and delivery cadence in the client interview.'}</p>
<p><strong>Suggested next step:</strong> Schedule technical interviews with the client team for those marked Advance; keep Discuss for a second pass if capacity allows.</p>`
      : `<p><strong>Quem avançar:</strong> ${advance.length ? advance.join('; ') : '—'}${discuss.length ? `. Conversar antes: ${discuss.join('; ')}` : ''}.</p>
<p><strong>Por quê (fit / contexto da vaga):</strong> Shortlist para ${vacTitle || 'esta vaga'} com base na rubrica T1–T9 e nas notas de triagem. ${bank.length ? `Banco por ora: ${bank.join('; ')}.` : ''}</p>
<p><strong>Alertas / pontos a explorar na entrevista:</strong> ${alerts.length ? alerts.join(' · ') : 'Validar profundidade técnica e ritmo de entrega na entrevista com o time do cliente.'}</p>
<p><strong>Próximo passo sugerido:</strong> Agendar entrevistas técnicas com o time do cliente para quem está em Avançar; manter Conversar para segunda passagem se houver capacidade.</p>`;

    setNote(html);
    setErr('');
    setMsg(t(locale, 'panel.report.generateNoteDone'));
    setTimeout(() => setMsg(''), 2500);
  };

  const peoplePayloadForAi = () =>
    selectedPeople
      .filter((c) => !c.excludedFromClient && c.recommendation !== 'exclude')
      .map((c) => {
        const ov = overrides[c.candidateId] || {};
        return {
          candidateId: c.candidateId,
          name: c.name,
          topType: c.topType,
          vacancyFitScore010: c.vacancyFitScore010,
          recommendation: effectiveRec(c),
          why: ov.why || '',
          watchOut: ov.watchOut || '',
          interviewProbe: ov.interviewProbe || '',
          interviewNotes: c.interviewNotes || '',
          motivatorsTop: c.motivatorsTop || [],
        };
      });

  const generateNoteWithAi = async () => {
    const candidates = peoplePayloadForAi();
    if (!candidates.length) {
      setErr(t(locale, 'panel.report.generateNoteNeedSelection'));
      return;
    }
    setAiBusy('note');
    setErr('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/assist-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'executiveNote', candidates, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.errorCode ? t(locale, `errors.${data.errorCode}`) : data?.error || t(locale, 'panel.report.aiFailed')
        );
      }
      if (data.executiveNote) setNote(String(data.executiveNote));
      setMsg(t(locale, 'panel.report.generateNoteAiDone'));
      setTimeout(() => setMsg(''), 3500);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.report.aiFailed'));
    } finally {
      setAiBusy('');
    }
  };

  const fillFieldsWithAi = async () => {
    const candidates = peoplePayloadForAi();
    if (!candidates.length) {
      setErr(t(locale, 'panel.report.generateNoteNeedSelection'));
      return;
    }
    setAiBusy('fields');
    setErr('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/assist-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'candidateFields', candidates, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.errorCode ? t(locale, `errors.${data.errorCode}`) : data?.error || t(locale, 'panel.report.aiFailed')
        );
      }
      const fields = data.fields || {};
      setOverrides((prev) => {
        const next = { ...prev };
        for (const [id, row] of Object.entries(fields)) {
          const person = selectedPeople.find((c) => String(c.candidateId) === String(id));
          next[id] = {
            recommendation: normalizeRecommendation(
              prev[id]?.recommendation,
              person?.recommendation || 'bank'
            ),
            why: String(row.why || '').slice(0, STRUCTURED_FIELD_MAX_CHARS),
            watchOut: String(row.watchOut || '').slice(0, STRUCTURED_FIELD_MAX_CHARS),
            interviewProbe: String(row.interviewProbe || '').slice(0, STRUCTURED_FIELD_MAX_CHARS),
          };
        }
        return next;
      });
      setMsg(t(locale, 'panel.report.fillFieldsAiDone'));
      setTimeout(() => setMsg(''), 3500);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.report.aiFailed'));
    } finally {
      setAiBusy('');
    }
  };

  const recommendationLabel = (rec) => {
    const key =
      rec === 'advance'
        ? 'panel.report.recAdvance'
        : rec === 'discuss'
          ? 'panel.report.recDiscuss'
          : rec === 'exclude'
            ? 'panel.report.recExclude'
            : 'panel.report.recBank';
    return t(locale, key);
  };

  const effectiveRec = (c) =>
    normalizeRecommendation(overrides[c.candidateId]?.recommendation, c.recommendation || 'bank');

  const generate = async () => {
    if (!noteOk) {
      setErr(t(locale, 'panel.report.noteTooShort', { n: REPORT_NOTE_MIN_CHARS }));
      return;
    }
    const excluded = selectedPeople.filter((c) => c.excludedFromClient || c.recommendation === 'exclude');
    if (excluded.length && excluded.length === selectedPeople.length) {
      setErr(t(locale, 'panel.report.onlyExcludedSelected'));
      return;
    }
    if (excluded.length) {
      const ok = await confirm({
        message: t(locale, 'panel.report.stripExcludedConfirm', { n: excluded.length }),
      });
      if (!ok) return;
    }

    const candidateOverrides = {};
    for (const c of selectedPeople) {
      if (c.excludedFromClient || c.recommendation === 'exclude') continue;
      const ov = overrides[c.candidateId] || {};
      candidateOverrides[String(c.candidateId)] = {
        recommendation: normalizeRecommendation(ov.recommendation, c.recommendation),
        why: ov.why || '',
        watchOut: ov.watchOut || '',
        interviewProbe: ov.interviewProbe || '',
      };
    }

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
          candidateOverrides,
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
    const ok = await confirm({
      message: t(locale, 'panel.report.revokeConfirm'),
      danger: true,
    });
    if (!ok) return;
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

  const startEditReport = (r) => {
    setEditingReportId(r.id);
    setEditNoteDraft(r.executiveNote || '');
    setErr('');
  };

  const cancelEditReport = () => {
    setEditingReportId(null);
    setEditNoteDraft('');
  };

  const saveReportNote = async (reportId) => {
    const plain = htmlToPlainText(editNoteDraft);
    if (plain.length < REPORT_NOTE_MIN_CHARS) {
      setErr(t(locale, 'panel.report.noteTooShort', { n: REPORT_NOTE_MIN_CHARS }));
      return;
    }
    setEditBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/vacancies/${vacancyId}/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executiveNote: editNoteDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.errorCode ? errorMessage(locale, data.errorCode, data.error) : data?.error);
      setMsg(t(locale, 'panel.report.noteUpdated'));
      setEditingReportId(null);
      setEditNoteDraft('');
      await loadReports();
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setEditBusy(false);
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

  const canGenerate = selected.size > 0 && noteOk && !busy;

  const rubricTypesLabel = (rubricMeta?.weightedTypes || [])
    .map((w) => `T${w.type} · ${typeShortLabel(w.type, locale)}`)
    .join(', ');

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
              <button type="button" onClick={() => copyUrl(lastUrl)} style={btnPurple()}>
                {t(locale, 'panel.report.copyLink')}
              </button>
            </div>
          ) : null}

          <div
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: `1px solid ${C.border}`,
              background: 'rgba(26,22,37,.02)',
            }}
          >
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '11px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: C.muted,
              }}
            >
              {previewOpen ? t(locale, 'panel.report.previewHide') : t(locale, 'panel.report.previewShow')}
            </button>
            {previewOpen ? (
              <div style={{ marginTop: '10px', fontSize: '12px', color: C.text, lineHeight: 1.55 }}>
                <p style={{ margin: '0 0 8px', color: C.muted }}>{t(locale, 'panel.report.previewHint')}</p>
                <ol style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>
                    {t(locale, 'panel.report.previewSeeks')}
                    {rubricMeta?.hasRubric && rubricTypesLabel
                      ? `: ${rubricTypesLabel}`
                      : ` — ${t(locale, 'panel.report.previewNoRubric')}`}
                    {vacancyMeta?.hasDescription ? ` · ${t(locale, 'panel.report.previewHasDesc')}` : ''}
                    {rubricMeta?.hasNotes ? ` · ${t(locale, 'panel.report.previewHasRubricNotes')}` : ''}
                  </li>
                  {!rubricMeta?.hasRubric ? (
                    <li style={{ color: C.danger || C.tension }}>{t(locale, 'panel.report.previewNoRubricWarn')}</li>
                  ) : null}
                  <li>
                    {t(locale, 'panel.report.previewNote')}
                    {noteOk
                      ? ` ✓ (${notePlainLen} ${t(locale, 'panel.report.chars')})`
                      : ` — ${t(locale, 'panel.report.previewNoteMissing')}`}
                  </li>
                  <li>
                    {t(locale, 'panel.report.previewShortlist', { n: selectedPeople.length })}
                    {selectedPeople.length
                      ? `: ${selectedPeople.map((c) => `${c.name} (${recommendationLabel(effectiveRec(c))})`).join('; ')}`
                      : ''}
                  </li>
                  <li>
                    {showSalary
                      ? t(locale, 'panel.report.previewSalaryOn')
                      : t(locale, 'panel.report.previewSalaryOff')}
                  </li>
                  <li>{t(locale, 'panel.report.previewReadings')}</li>
                </ol>
              </div>
            ) : null}
          </div>

          <label
            style={{
              marginTop: '12px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              fontSize: '12px',
              color: C.muted,
              lineHeight: 1.45,
            }}
          >
            <input
              type="checkbox"
              checked={showSalary}
              disabled={salaryBusy || busy}
              onChange={(e) => persistShowSalary(e.target.checked)}
              style={{ marginTop: '2px', accentColor: C.purple }}
            />
            <span>
              <strong style={{ color: C.text }}>{t(locale, 'panel.report.showSalaryLabel')}</strong>
              <br />
              {t(locale, 'panel.report.showSalaryHelp')}
            </span>
          </label>

          <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={S.select}>
              <option value="shortlist">{t(locale, 'panel.report.filterShortlist')}</option>
              <option value="interview_plus">{t(locale, 'panel.report.filterInterviewPlus')}</option>
              <option value="all">{t(locale, 'panel.report.filterAllTested')}</option>
            </select>
            <button type="button" onClick={selectVisible} style={btnGhost()} disabled={loading || !visible.length}>
              {t(locale, 'panel.report.selectVisible')}
            </button>
            <button type="button" onClick={clearSelected} style={btnGhost()} disabled={!selected.size}>
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

          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: C.muted }}>{t(locale, 'panel.report.noteRequiredLabel')}</span>
              <button type="button" onClick={applyNoteTemplate} style={btnGhost()}>
                {t(locale, 'panel.report.noteTemplate')}
              </button>
              <button
                type="button"
                onClick={generateNoteFromShortlist}
                style={btnGhost()}
                disabled={!selectedPeople.length}
                title={t(locale, 'panel.report.generateNote')}
              >
                {t(locale, 'panel.report.generateNote')}
              </button>
              <button
                type="button"
                onClick={generateNoteWithAi}
                style={btnGhost()}
                disabled={!selectedPeople.length || aiBusy === 'note'}
                title={t(locale, 'panel.report.generateNoteAi')}
              >
                {aiBusy === 'note'
                  ? t(locale, 'panel.report.aiWorking')
                  : t(locale, 'panel.report.generateNoteAi')}
              </button>
              <button
                type="button"
                onClick={fillFieldsWithAi}
                style={btnGhost()}
                disabled={!selectedPeople.length || aiBusy === 'fields'}
                title={t(locale, 'panel.report.fillFieldsAi')}
              >
                {aiBusy === 'fields'
                  ? t(locale, 'panel.report.aiWorking')
                  : t(locale, 'panel.report.fillFieldsAi')}
              </button>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: noteOk ? C.muted : C.danger || C.tension,
                }}
              >
                {t(locale, 'panel.report.noteCharCount', { n: notePlainLen, min: REPORT_NOTE_MIN_CHARS })}
              </span>
            </div>
            <RichTextEditor
              value={note}
              onChange={setNote}
              placeholder={t(locale, 'panel.report.notePlaceholder')}
              minHeight={110}
              locale={locale}
            />
          </div>

          <div
            style={{
              marginTop: '12px',
              maxHeight: '360px',
              overflow: 'auto',
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
            }}
          >
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
                    <th style={{ padding: '8px 10px' }}>{t(locale, 'panel.report.colRec')}</th>
                    <th style={{ padding: '8px 10px' }}>{t(locale, 'panel.report.colFit')}</th>
                    <th style={{ padding: '8px 10px' }}>{t(locale, 'panel.report.colType')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => {
                    const isOn = selected.has(c.candidateId);
                    const rec = effectiveRec(c);
                    return (
                      <tr key={c.candidateId} style={{ borderTop: `1px solid ${C.border}`, verticalAlign: 'top' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="checkbox"
                            checked={isOn}
                            onChange={() => toggle(c)}
                            style={{ accentColor: C.purple }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', color: C.text }}>
                          <div>{c.name}</div>
                          {c.hasMotivators ? (
                            <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px', fontFamily: 'monospace' }}>
                              {t(locale, 'panel.report.hasMotivatorsBadge')}
                            </div>
                          ) : null}
                          {isOn ? (
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <input
                                type="text"
                                value={overrides[c.candidateId]?.why || ''}
                                onChange={(e) => setStructured(c.candidateId, 'why', e.target.value)}
                                placeholder={t(locale, 'panel.report.fieldWhyPh')}
                                maxLength={STRUCTURED_FIELD_MAX_CHARS}
                                style={fieldInputStyle()}
                              />
                              <input
                                type="text"
                                value={overrides[c.candidateId]?.watchOut || ''}
                                onChange={(e) => setStructured(c.candidateId, 'watchOut', e.target.value)}
                                placeholder={t(locale, 'panel.report.fieldWatchPh')}
                                maxLength={STRUCTURED_FIELD_MAX_CHARS}
                                style={fieldInputStyle()}
                              />
                              <input
                                type="text"
                                value={overrides[c.candidateId]?.interviewProbe || ''}
                                onChange={(e) => setStructured(c.candidateId, 'interviewProbe', e.target.value)}
                                placeholder={t(locale, 'panel.report.fieldProbePh')}
                                maxLength={STRUCTURED_FIELD_MAX_CHARS}
                                style={fieldInputStyle()}
                              />
                            </div>
                          ) : null}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {isOn ? (
                            <select
                              value={rec}
                              onChange={(e) => setRec(c.candidateId, e.target.value)}
                              style={{ ...S.select, fontSize: '11px', padding: '4px 6px' }}
                            >
                              {REPORT_RECOMMENDATIONS.map((r) => (
                                <option key={r} value={r}>
                                  {recommendationLabel(r)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ color: C.muted, fontFamily: 'monospace' }}>{recommendationLabel(rec)}</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                          {c.vacancyFitScore010 != null ? c.vacancyFitScore010.toFixed(1) : '—'}
                        </td>
                        <td
                          style={{ padding: '8px 10px', fontFamily: 'monospace' }}
                          title={c.topType != null ? typeHintTooltip(c.topType, locale) : undefined}
                        >
                          {c.topType != null ? `T${c.topType}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              onClick={generate}
              disabled={!canGenerate}
              style={{
                background: canGenerate ? `${C.purple}18` : 'transparent',
                border: `1px solid ${canGenerate ? `${C.purple}55` : C.border}`,
                borderRadius: '10px',
                padding: '10px 14px',
                color: canGenerate ? C.purple : C.faint,
                fontSize: '12px',
                cursor: canGenerate ? 'pointer' : 'default',
                fontFamily: 'monospace',
              }}
            >
              {busy ? t(locale, 'panel.common.loading') : t(locale, 'panel.report.generate', { n: selected.size })}
            </button>
            {!noteOk && selected.size > 0 ? (
              <p style={{ margin: '8px 0 0', fontSize: '11px', color: C.muted, lineHeight: 1.45 }}>
                {t(locale, 'panel.report.noteGateHint', { n: REPORT_NOTE_MIN_CHARS })}
              </p>
            ) : null}
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
                  const isEditing = Number(editingReportId) === Number(r.id);
                  return (
                    <li
                      key={r.id}
                      style={{
                        padding: '10px 0',
                        borderTop: `1px solid ${C.border}`,
                      }}
                    >
                      <div
                        style={{
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
                            <span
                              style={{
                                color: r.isLive ? C.success || C.synergy : C.faint,
                                fontFamily: 'monospace',
                              }}
                            >
                              {r.isLive ? t(locale, 'panel.report.statusLive') : t(locale, 'panel.report.statusDead')}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace', marginTop: '2px' }}>
                            {exp ? t(locale, 'panel.report.expiresAt', { date: exp.toLocaleString(locale) }) : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => copyUrl(url)} style={btnGhost()} disabled={!r.isLive}>
                            {t(locale, 'panel.report.copyLink')}
                          </button>
                          {r.isLive ? (
                            <button
                              type="button"
                              onClick={() => (isEditing ? cancelEditReport() : startEditReport(r))}
                              style={btnGhost()}
                              disabled={busy || editBusy}
                            >
                              {isEditing ? t(locale, 'panel.report.editNoteCancel') : t(locale, 'panel.report.editNote')}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => revoke(r.id)}
                            style={{
                              ...btnGhost(),
                              color: C.danger || C.tension,
                              borderColor: 'rgba(220,38,38,.35)',
                            }}
                            disabled={busy || !r.active}
                          >
                            {t(locale, 'panel.report.revoke')}
                          </button>
                        </div>
                      </div>
                      {isEditing ? (
                        <div style={{ marginTop: '10px' }}>
                          <p style={{ margin: '0 0 6px', fontSize: '11px', color: C.muted }}>
                            {t(locale, 'panel.report.editNoteHint')}
                          </p>
                          <RichTextEditor
                            value={editNoteDraft}
                            onChange={setEditNoteDraft}
                            minHeight={90}
                            locale={locale}
                          />
                          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => saveReportNote(r.id)}
                              disabled={editBusy}
                              style={btnPurple()}
                            >
                              {editBusy ? t(locale, 'panel.common.loading') : t(locale, 'panel.report.saveNote')}
                            </button>
                            <button type="button" onClick={cancelEditReport} style={btnGhost()} disabled={editBusy}>
                              {t(locale, 'panel.report.editNoteCancel')}
                            </button>
                          </div>
                        </div>
                      ) : null}
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

function fieldInputStyle() {
  return {
    width: '100%',
    boxSizing: 'border-box',
    background: C.inputBg,
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    padding: '6px 8px',
    fontSize: '11px',
    color: C.text,
    fontFamily: 'inherit',
  };
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

function btnPurple() {
  return {
    background: `${C.purple}18`,
    border: `1px solid ${C.purple}55`,
    borderRadius: '8px',
    padding: '6px 10px',
    color: C.purple,
    fontSize: '11px',
    cursor: 'pointer',
    fontFamily: 'monospace',
  };
}

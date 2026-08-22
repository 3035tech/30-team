'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { t, localeHtmlLang } from '../../../lib/i18n';
import { C } from '../../../lib/theme';
import { titleCasePersonName } from '../../../lib/person-name';
import {
  PAGE_SIZE_OPTIONS,
  parseVacanciesPagination,
  parseVacanciesSort,
} from '../../../lib/assessment-filters';
import { clientSortNextDir, getKanbanStages, PanelSubNav, S, TypeBadge } from '../dashboard-shared';
import { VacancyInterviewCandidates } from '../VacancyInterviewCandidates';
import { VacancyClientReportBlock } from '../VacancyClientReportBlock';
import { RichTextEditor } from '../../_components/RichTextEditor';
import { RichTextView } from '../../_components/RichTextView';
import {
  AdminRichFormDrawer,
  dialogBtnGhost,
  dialogBtnPrimary,
} from '../../_components/AdminRichFormDrawer';
import { formatSalaryBr, salaryToCentsDigits, stripSalary, digitsOnly } from '../../../lib/br-masks';
import { htmlToPlainText } from '../../../lib/sanitize-html';
import { rejectionReasonLabel } from '../pipeline-prompts';
import { usePipelineExtras } from '../PipelineExtrasContext';
import { useAppFeedback } from '../../_components/AppFeedback';
import { AppLoading, Spinner } from '../../_components/AppLoading';
import { buildRubricWeightsPrompt, buildRubricContextDraft, parseRubricWeightsFromAiText, isRubricContextFilledEnough } from '../../../lib/rubric-prompt';
import { VACANCY_EMPLOYMENT_TYPES, employmentTypeLabelKey } from '../../../lib/vacancy-employment-type';
import { formatWorkplaceLabel } from '../../../lib/vacancy-workplace';
import { VacancyWorkplaceFields } from '../../_components/VacancyWorkplaceFields';
import {
  buildVacancyDescriptionTemplate,
  isVacancyDescriptionSparse,
} from '../../../lib/vacancy-description-template';
import { publicVacancyPath } from '../../../lib/public-job-url';
import { formatPublicVacancyDate } from '../../../lib/public-vacancy-lifecycle';
import { computeJobSeoScore } from '../../../lib/job-seo-score';

function formatVacancySalaryRange(locale, min, max) {
  const a = min ? formatSalaryBr(min) : '';
  const b = max ? formatSalaryBr(max) : '';
  if (a && b) return t(locale, 'recruiting.salaryRangeDisplay', { min: a, max: b });
  if (a) return t(locale, 'recruiting.salaryFromDisplay', { min: a });
  if (b) return t(locale, 'recruiting.salaryUpToDisplay', { max: b });
  return null;
}

function VacancyDescriptionHtml({ html }) {
  return (
    <RichTextView
      html={html}
      style={{
        marginTop: '12px',
        fontSize: '13px',
        lineHeight: 1.65,
      }}
    />
  );
}

const descAssistBtn = (opts = {}) => ({
  fontSize: '11px',
  padding: '6px 12px',
  borderRadius: '8px',
  border: opts.primary ? `1px solid ${C.purple}55` : `1px solid ${C.border}`,
  background: opts.primary ? `${C.purple}18` : C.card,
  color: opts.primary ? C.purple : C.text,
  cursor: opts.busy ? 'wait' : opts.disabled ? 'default' : 'pointer',
  fontFamily: 'monospace',
  // Em busy manter opacidade alta — spinner precisa ser legível
  opacity: opts.busy ? 1 : opts.disabled ? 0.55 : 1,
  minHeight: '36px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
});

function VacancyPublicFlagCheckbox({ locale, checked, onChange, labelKey, helpKey }) {
  return (
    <label
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        fontSize: '12px',
        color: C.muted,
        lineHeight: 1.45,
        maxWidth: '520px',
      }}
    >
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: '2px', accentColor: C.purple }}
      />
      <span>
        <strong style={{ color: C.text }}>{t(locale, labelKey)}</strong>
        <br />
        {t(locale, helpKey)}
      </span>
    </label>
  );
}

function VacancyPublicFlagsFields({ locale, values, onChange, seoContext = null }) {
  const score = computeJobSeoScore({
    title: seoContext?.title,
    description: seoContext?.description,
    employmentType: seoContext?.employmentType,
    workplaceModality: seoContext?.workplaceModality,
    salaryMin: seoContext?.salaryMin,
    salaryMax: seoContext?.salaryMax,
    publicPageEnabled: values.publicPageEnabled,
    publicAllowIndex: values.publicAllowIndex,
    publicShowCompanyInfo: values.publicShowCompanyInfo,
    companyWebsite: seoContext?.companyWebsite,
    companyAboutHtml: seoContext?.companyAboutHtml,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <VacancyPublicFlagCheckbox
        locale={locale}
        checked={values.publicPageEnabled}
        onChange={(v) => onChange({ publicPageEnabled: v })}
        labelKey="recruiting.publicPageEnabled"
        helpKey="recruiting.publicPageEnabledHelp"
      />
      <VacancyPublicFlagCheckbox
        locale={locale}
        checked={values.publicAllowIndex}
        onChange={(v) => onChange({ publicAllowIndex: v })}
        labelKey="recruiting.publicAllowIndex"
        helpKey="recruiting.publicAllowIndexHelp"
      />
      <VacancyPublicFlagCheckbox
        locale={locale}
        checked={values.publicShowCompanyInfo}
        onChange={(v) => onChange({ publicShowCompanyInfo: v })}
        labelKey="recruiting.publicShowCompanyInfo"
        helpKey="recruiting.publicShowCompanyInfoHelp"
      />
      <VacancyPublicFlagCheckbox
        locale={locale}
        checked={values.publicShowSalary}
        onChange={(v) => onChange({ publicShowSalary: v })}
        labelKey="recruiting.publicShowSalary"
        helpKey="recruiting.publicShowSalaryHelp"
      />
      <div
        style={{
          marginTop: '4px',
          padding: '12px',
          borderRadius: '10px',
          border: `1px solid ${C.border}`,
          background: `${C.purple}08`,
        }}
      >
        <div style={{ fontSize: '12px', fontFamily: 'monospace', color: C.text, marginBottom: '8px' }}>
          {t(locale, 'recruiting.seoScoreTitle', {
            score: String(score.score),
            max: String(score.maxScore),
          })}
        </div>
        <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '11px', color: C.muted, lineHeight: 1.55 }}>
          {score.checks.map((c) => (
            <li key={c.id} style={{ color: c.ok ? C.success : C.muted }}>
              {c.ok ? '✓' : '○'} {t(locale, `recruiting.seoCheck_${c.id}`)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Template estruturado + IA (criar base se vazio / melhorar se já houver texto).
 */
function VacancyDescriptionAssistBar({
  locale,
  busy,
  title,
  descriptionHtml,
  employmentType,
  salaryMin,
  salaryMax,
  vacancyId = null,
  onApplyDescription,
  onBusyChange,
}) {
  const { toast, notice, confirm } = useAppFeedback();
  const sparse = isVacancyDescriptionSparse(descriptionHtml);
  const titleOk = Boolean(String(title || '').trim());

  const insertTemplate = async () => {
    const next = buildVacancyDescriptionTemplate(locale);
    if (!sparse && htmlToPlainText(descriptionHtml || '').trim()) {
      const ok = await confirm({
        title: t(locale, 'recruiting.descTemplateOverwriteTitle'),
        message: t(locale, 'recruiting.descTemplateOverwriteMsg'),
        confirmLabel: t(locale, 'recruiting.descTemplateInsert'),
        danger: true,
      });
      if (!ok) return;
    }
    onApplyDescription(next);
    toast(t(locale, 'recruiting.descTemplateInserted'), 'ok');
  };

  const runAi = async () => {
    if (!titleOk || busy) return;
    onBusyChange(true);
    try {
      const url = vacancyId
        ? `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/assist-ai`
        : '/api/admin/vacancies/assist-ai';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vacancyDescription',
          title,
          employmentType: employmentType || null,
          salaryMin,
          salaryMax,
          description: descriptionHtml || '',
          mode: 'auto',
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.errorCode
            ? t(locale, `errors.${data.errorCode}`)
            : data?.error || t(locale, 'recruiting.descAiFailed')
        );
      }
      if (data.description) onApplyDescription(String(data.description));
      const doneKey =
        data.mode === 'improve' ? 'recruiting.descAiImprovedDone' : 'recruiting.descAiCreatedDone';
      toast(t(locale, doneKey), 'ok');
    } catch (e) {
      await notice({
        title: t(locale, 'panel.common.errorTitle'),
        message: e?.message || t(locale, 'recruiting.descAiFailed'),
        tone: 'error',
      });
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <button
          type="button"
          disabled={busy}
          onClick={insertTemplate}
          title={t(locale, 'recruiting.descTemplateHelp')}
          aria-label={t(locale, 'recruiting.descTemplateInsert')}
          style={descAssistBtn({ disabled: busy })}
        >
          {t(locale, 'recruiting.descTemplateInsert')}
        </button>
        <button
          type="button"
          disabled={busy || !titleOk}
          onClick={runAi}
          title={
            sparse
              ? t(locale, 'recruiting.descAiCreateHelp')
              : t(locale, 'recruiting.descAiImproveHelp')
          }
          aria-busy={busy || undefined}
          aria-label={
            busy
              ? t(locale, 'recruiting.descAiWorking')
              : sparse
                ? t(locale, 'recruiting.descAiCreate')
                : t(locale, 'recruiting.descAiImprove')
          }
          style={descAssistBtn({ primary: true, disabled: busy || !titleOk, busy })}
        >
          {busy ? (
            <AppLoading locale={locale} variant="button" label={t(locale, 'recruiting.descAiWorking')} />
          ) : sparse ? (
            t(locale, 'recruiting.descAiCreate')
          ) : (
            t(locale, 'recruiting.descAiImprove')
          )}
        </button>
      </div>
      {busy ? (
        <AppLoading
          locale={locale}
          variant="banner"
          label={t(locale, 'recruiting.descAiWorkingHint')}
        />
      ) : (
        <p style={{ margin: '6px 0 0', fontSize: '11px', color: C.faint, lineHeight: 1.4 }}>
          {t(locale, 'recruiting.descAssistHint')}
        </p>
      )}
    </div>
  );
}

export function VacancyInviteByEmail({ vacancyId, onSent, locale = 'pt-BR' }) {
  const { promptForm } = useAppFeedback();
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');
  const [localOk, setLocalOk] = useState('');

  const openInvite = async () => {
    setLocalErr('');
    setLocalOk('');
    const values = await promptForm({
      title: t(locale, 'recruiting.inviteEmailIntro'),
      confirmLabel: t(locale, 'recruiting.inviteSendChallenge'),
      fields: [
        {
          key: 'name',
          label: t(locale, 'recruiting.inviteCandidateNamePh'),
          placeholder: t(locale, 'recruiting.inviteCandidateNamePh'),
          defaultValue: '',
        },
        {
          key: 'email',
          label: t(locale, 'recruiting.inviteCandidateEmailPh'),
          placeholder: t(locale, 'recruiting.inviteCandidateEmailPh'),
          defaultValue: '',
        },
      ],
    });
    if (!values) return;

    const name = titleCasePersonName(String(values.name || ''));
    const mail = String(values.email || '').trim().toLowerCase();
    if (!name) {
      setLocalErr(t(locale, 'recruiting.inviteNeedName'));
      return;
    }
    if (!mail) {
      setLocalErr(t(locale, 'recruiting.inviteNeedEmail'));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateName: name, candidateEmail: mail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      setLocalOk(t(locale, 'recruiting.inviteSendOk', { email: mail }));
      onSent?.();
      setTimeout(() => setLocalOk(''), 5000);
    } catch (e) {
      setLocalErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${C.border}`, width: '100%' }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
          {t(locale, 'recruiting.inviteEmailIntro')}
        </span>
        <button
          type="button"
          onClick={openInvite}
          disabled={busy}
          style={{
            flex: '0 0 auto', background: `${C.synergy}18`, border: `1px solid ${C.synergy}55`,
            borderRadius: '10px', padding: '8px 14px', color: C.synergy, fontSize: '12px',
            cursor: 'pointer', fontFamily: 'monospace', opacity: busy ? 0.6 : 1, minHeight: '40px',
          }}
        >
          {busy ? t(locale, 'recruiting.inviteSending') : t(locale, 'recruiting.openInviteBtn')}
        </button>
      </div>
      {localErr ? (
        <p style={{ marginTop: '8px', marginBottom: 0, color: C.tension, fontSize: '11px', fontFamily: 'monospace' }}>
          {localErr}
        </p>
      ) : null}
      {localOk ? (
        <p style={{ marginTop: '8px', marginBottom: 0, color: C.synergy, fontSize: '11px', fontFamily: 'monospace' }}>
          {localOk}
        </p>
      ) : null}
    </div>
  );
}

function inviteStatusLabel(locale, status) {
  const s = String(status || '');
  if (s === 'opened') return t(locale, 'recruiting.inviteOpened');
  if (s === 'completed') return t(locale, 'recruiting.inviteCompleted');
  if (s === 'cancelled') return t(locale, 'recruiting.inviteCancelled');
  return t(locale, 'recruiting.inviteSent');
}

function VacancyInvitesBlock({ vacancyId, locale, refreshKey }) {
  const { confirm } = useAppFeedback();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');

  const fetchInvites = async (cancelled = { current: false }) => {
    setErr('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invites`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      if (!cancelled.current) setRows(Array.isArray(data.invites) ? data.invites : []);
    } catch (e) {
      if (!cancelled.current) setErr(e?.message || t(locale, 'panel.common.error'));
    }
  };

  useEffect(() => {
    const cancelled = { current: false };
    fetchInvites(cancelled);
    return () => { cancelled.current = true; };
  }, [vacancyId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const remind = async (inviteId) => {
    setBusy(String(inviteId));
    setErr('');
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invites/${encodeURIComponent(inviteId)}/remind`,
        { method: 'POST' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      await fetchInvites();
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setBusy(null);
    }
  };

  const removeInvite = async (inv) => {
    const ok = await confirm({
      message: t(locale, 'recruiting.inviteDeleteConfirm', {
        name: inv.candidateName || '—',
        email: inv.candidateEmail || '—',
      }),
      danger: true,
    });
    if (!ok) return;
    setBusy(`del:${inv.id}`);
    setErr('');
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/invites/${encodeURIComponent(inv.id)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      await fetchInvites();
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setBusy(null);
    }
  };

  if (!rows.length && !err) {
    return (
      <div style={{ marginTop: '10px', fontSize: '12px', color: C.faint, fontFamily: 'monospace' }}>
        {t(locale, 'recruiting.inviteListTitle')}: —
      </div>
    );
  }

  return (
    <div style={{ marginTop: '12px' }}>
      <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace', display: 'block', marginBottom: '8px' }}>
        {t(locale, 'recruiting.inviteListTitle')}
      </span>
      {err ? (
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: C.tension, fontFamily: 'monospace' }}>{err}</p>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
        {rows.map((inv) => {
          const lastReminder = inv.lastReminderAt ? new Date(inv.lastReminderAt) : null;
          const reminderCount = inv.reminderCount ?? 0;
          const canRemind = ['sent', 'opened'].includes(String(inv.status || ''));
          return (
            <div
              key={inv.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                background: 'rgba(26,22,37,.02)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontWeight: 500 }}>{inv.candidateName}</div>
                <div style={{ color: C.muted, fontSize: '11px' }}>{inv.candidateEmail}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
                  <span style={{ color: C.purpleLight }}>{inviteStatusLabel(locale, inv.status)}</span>
                  {reminderCount > 0 && (
                    <span style={{ color: C.faint, fontSize: '11px' }}>
                      {t(locale, 'recruiting.reminderSentCount', { n: reminderCount })}
                      {lastReminder
                        ? t(locale, 'recruiting.lastReminderSuffix', {
                            date: lastReminder.toLocaleDateString(localeHtmlLang(locale)),
                          })
                        : ''}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                {canRemind ? (
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => remind(inv.id)}
                    style={{
                      fontSize: '11px', padding: '5px 10px', borderRadius: '6px',
                      border: `1px solid ${C.synergy}55`, background: `${C.synergy}12`,
                      color: C.synergy, cursor: busy ? 'default' : 'pointer', display: 'flex',
                      alignItems: 'center', gap: '6px',
                    }}
                  >
                    {busy === String(inv.id)
                      ? <><span className="spinner" />{t(locale, 'recruiting.sendingShort')}</>
                      : t(locale, 'recruiting.inviteRemind')}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => removeInvite(inv)}
                  title={t(locale, 'recruiting.inviteDelete')}
                  style={{
                    fontSize: '11px', padding: '5px 10px', borderRadius: '6px',
                    border: '1px solid rgba(232,71,71,.35)', background: 'rgba(232,71,71,.08)',
                    color: C.tension, cursor: busy ? 'default' : 'pointer', display: 'flex',
                    alignItems: 'center', gap: '6px',
                  }}
                >
                  {busy === `del:${inv.id}`
                    ? <><span className="spinner" />{t(locale, 'recruiting.removingShort')}</>
                    : t(locale, 'recruiting.inviteRemove')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VacancyRubricEditor({ vacancyId, locale, vacancyTitle = '', vacancyDescription = '', onSaved }) {
  const { notice, toast } = useAppFeedback();
  const [weights, setWeights] = useState(() => Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, ''])));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [jobDesc, setJobDesc] = useState(() =>
    buildRubricContextDraft({
      locale,
      title: vacancyTitle,
      descriptionPlain: htmlToPlainText(vacancyDescription),
    })
  );
  const [aiPaste, setAiPaste] = useState('');
  const [aiBusy, setAiBusy] = useState('');

  const showError = async (message) => {
    await notice({
      title: t(locale, 'panel.common.errorTitle'),
      message: String(message || t(locale, 'panel.common.error')),
      tone: 'error',
    });
  };

  useEffect(() => {
    setJobDesc(
      buildRubricContextDraft({
        locale,
        title: vacancyTitle,
        descriptionPlain: htmlToPlainText(vacancyDescription),
      })
    );
  }, [vacancyId]); // eslint-disable-line react-hooks/exhaustive-deps -- reset draft only when switching vacancy

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        if (cancelled) return;
        const w = data.vacancyFitWeights || {};
        const next = {};
        for (let typeNum = 1; typeNum <= 9; typeNum++) {
          const v = w[String(typeNum)] ?? w[typeNum];
          next[typeNum] = v != null && v !== '' ? String(v) : '';
        }
        setWeights(next);
        setNotes(data.vacancyRubricNotes != null ? String(data.vacancyRubricNotes) : '');
        if (!vacancyTitle && !htmlToPlainText(vacancyDescription)) {
          setJobDesc(
            buildRubricContextDraft({
              locale,
              title: data.title || '',
              descriptionPlain: htmlToPlainText(data.description || ''),
            })
          );
        }
      } catch (e) {
        if (!cancelled) {
          void notice({
            title: t(locale, 'panel.common.errorTitle'),
            message: e?.message || t(locale, 'panel.common.error'),
            tone: 'error',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [vacancyId, locale, notice]);

  const applyParsedWeights = (parsed) => {
    const next = {};
    for (let n = 1; n <= 9; n++) {
      const v = parsed.weights[String(n)];
      next[n] = v != null && Number(v) > 0 ? String(v) : '';
    }
    setWeights(next);
    if (parsed.notes) {
      setNotes((prev) => {
        const cur = String(prev || '').trim();
        if (!cur) return parsed.notes;
        if (cur.includes(parsed.notes.slice(0, 40))) return cur;
        return `${cur}\n\n${parsed.notes}`;
      });
      toast(t(locale, 'recruiting.rubricAiAppliedWithNotes'), 'ok');
    } else {
      toast(t(locale, 'recruiting.rubricAiApplied'), 'ok');
    }
  };

  const save = async () => {
    const wObj = {};
    for (let typeNum = 1; typeNum <= 9; typeNum++) {
      const raw = String(weights[typeNum] ?? '').trim();
      if (!raw) continue;
      const n = parseFloat(raw);
      if (Number.isFinite(n) && n > 0) wObj[String(typeNum)] = n;
    }
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacancyFitWeights: wObj, vacancyRubricNotes: notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      toast(t(locale, 'recruiting.rubricSaved'), 'ok');
      onSaved?.();
    } catch (e) {
      await showError(e?.message || t(locale, 'panel.common.error'));
    }
  };

  const suggestContext = async () => {
    setAiBusy('context');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/rubric-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggestContext', locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error ||
            (data?.errorCode ? t(locale, `errors.${data.errorCode}`) : null) ||
            t(locale, 'recruiting.rubricAiSuggestFailed')
        );
      }
      if (data.context) setJobDesc(String(data.context));
      toast(t(locale, 'recruiting.rubricAiContextDone'), 'ok');
    } catch (e) {
      await showError(e?.message || t(locale, 'recruiting.rubricAiSuggestFailed'));
    } finally {
      setAiBusy('');
    }
  };

  const suggestWeights = async () => {
    if (!isRubricContextFilledEnough(jobDesc)) {
      await showError(t(locale, 'recruiting.rubricAiNeedContext'));
      return;
    }
    setAiBusy('weights');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/rubric-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggestWeights', context: jobDesc, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.raw) setAiPaste(String(data.raw));
        throw new Error(
          data?.error ||
            (data?.errorCode ? t(locale, `errors.${data.errorCode}`) : null) ||
            t(locale, 'recruiting.rubricAiSuggestFailed')
        );
      }
      if (data.raw) setAiPaste(String(data.raw));
      if (data.weights) {
        applyParsedWeights({
          weights: data.weights,
          notes: data.notes || '',
        });
      }
    } catch (e) {
      await showError(e?.message || t(locale, 'recruiting.rubricAiSuggestFailed'));
    } finally {
      setAiBusy('');
    }
  };

  const copyPrompt = async () => {
    if (!isRubricContextFilledEnough(jobDesc)) {
      await showError(t(locale, 'recruiting.rubricAiNeedContext'));
      return;
    }
    const prompt = buildRubricWeightsPrompt({ locale, context: jobDesc });
    try {
      await navigator.clipboard.writeText(prompt);
      toast(t(locale, 'recruiting.rubricAiCopied'), 'ok');
    } catch {
      await showError(t(locale, 'recruiting.rubricAiCopyFailed'));
    }
  };

  const applyAiWeights = async () => {
    const parsed = parseRubricWeightsFromAiText(aiPaste, locale);
    if (!parsed.ok) {
      await showError(t(locale, 'recruiting.rubricAiParseError'));
      return;
    }
    applyParsedWeights(parsed);
  };

  const btnSm = {
    fontSize: '11px',
    padding: '6px 12px',
    borderRadius: '8px',
    border: `1px solid ${C.purple}55`,
    background: `${C.purple}18`,
    color: C.purple,
    cursor: 'pointer',
    fontFamily: 'monospace',
  };

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${C.border}` }}>
      <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace', display: 'block', marginBottom: '8px' }}>
        {t(locale, 'recruiting.rubricTitle')}
      </span>
      <p style={{ fontSize: '11px', color: C.faint, lineHeight: 1.5, margin: '0 0 10px' }}>
        {t(locale, 'recruiting.rubricWeightHint')}
      </p>
      {loading ? <p style={{ fontSize: '11px', color: C.faint }}>…</p> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((typeNum) => (
          <label key={typeNum} style={{ fontSize: '12px', color: C.muted, display: 'flex', alignItems: 'center', gap: '4px' }}>
            T{typeNum}
            <input
              value={weights[typeNum] ?? ''}
              onChange={(e) => setWeights((prev) => ({ ...prev, [typeNum]: e.target.value }))}
              placeholder="0"
              style={{
                width: '44px',
                padding: '4px 6px',
                borderRadius: '6px',
                border: `1px solid ${C.border}`,
                fontSize: '11px',
                fontFamily: 'monospace',
                background: 'rgba(26,22,37,.03)',
                color: C.text,
              }}
            />
          </label>
        ))}
      </div>

      <div
        style={{
          marginBottom: '12px',
          padding: '12px',
          borderRadius: '10px',
          border: `1px solid ${C.border}`,
          background: 'rgba(26,22,37,.02)',
        }}
      >
        <button
          type="button"
          onClick={() => setAiOpen((o) => !o)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: '11px',
            color: C.purple,
            fontFamily: 'monospace',
            marginBottom: aiOpen ? '8px' : 0,
          }}
        >
          {aiOpen ? '▾ ' : '▸ '}
          {t(locale, 'recruiting.rubricAiTitle')}
        </button>
        {aiOpen ? (
          <>
            <p style={{ fontSize: '12px', color: C.muted, lineHeight: 1.55, margin: '0 0 10px' }}>
              {t(locale, 'recruiting.rubricAiIntro')}
            </p>
            <p
              style={{
                fontSize: '12px',
                color: C.text,
                lineHeight: 1.55,
                margin: '0 0 10px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: `${C.purple}0c`,
                border: `1px solid ${C.purple}33`,
              }}
            >
              {t(locale, 'recruiting.rubricAiFillSteps')}
            </p>
            <label style={{ fontSize: '11px', color: C.muted, display: 'block', marginBottom: '4px' }}>
              {t(locale, 'recruiting.rubricAiJobLabel')}
            </label>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder={t(locale, 'recruiting.rubricAiJobPh')}
              rows={10}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                fontSize: '12px',
                fontFamily: 'inherit',
                color: C.text,
                background: C.card,
                marginBottom: '8px',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={suggestContext}
                disabled={Boolean(aiBusy)}
                aria-busy={aiBusy === 'context' || undefined}
                style={{ ...btnSm, opacity: aiBusy ? 0.6 : 1 }}
              >
                {aiBusy === 'context' ? (
                  <AppLoading locale={locale} variant="button" label={t(locale, 'recruiting.rubricAiWorking')} />
                ) : (
                  t(locale, 'recruiting.rubricAiSuggestContext')
                )}
              </button>
              <button
                type="button"
                onClick={suggestWeights}
                disabled={Boolean(aiBusy)}
                aria-busy={aiBusy === 'weights' || undefined}
                style={{ ...btnSm, opacity: aiBusy ? 0.6 : 1 }}
              >
                {aiBusy === 'weights' ? (
                  <AppLoading locale={locale} variant="button" label={t(locale, 'recruiting.rubricAiWorking')} />
                ) : (
                  t(locale, 'recruiting.rubricAiSuggestWeights')
                )}
              </button>
              <button type="button" onClick={copyPrompt} disabled={Boolean(aiBusy)} style={btnSm}>
                {t(locale, 'recruiting.rubricAiCopyPrompt')}
              </button>
            </div>
            <label style={{ fontSize: '11px', color: C.muted, display: 'block', marginBottom: '4px' }}>
              {t(locale, 'recruiting.rubricAiPasteLabel')}
            </label>
            <textarea
              value={aiPaste}
              onChange={(e) => setAiPaste(e.target.value)}
              placeholder={t(locale, 'recruiting.rubricAiPastePh')}
              rows={6}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                fontSize: '12px',
                fontFamily: 'monospace',
                color: C.text,
                background: C.card,
                marginBottom: '8px',
                resize: 'vertical',
              }}
            />
            <button type="button" onClick={applyAiWeights} style={btnSm}>
              {t(locale, 'recruiting.rubricAiApply')}
            </button>
          </>
        ) : null}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <RichTextEditor
          value={notes}
          onChange={setNotes}
          placeholder={t(locale, 'recruiting.rubricNotes')}
          minHeight={120}
          locale={locale}
        />
      </div>
      <button
        type="button"
        onClick={save}
        disabled={loading}
        style={{
          ...btnSm,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {t(locale, 'recruiting.rubricSave')}
      </button>
    </div>
  );
}

function formatRelativeAgo(dateLike, locale = 'pt-BR') {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return null;
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return t(locale, 'recruiting.timeJustNow');
  if (min < 60) return t(locale, 'recruiting.timeMinutesAgo', { min });
  if (hr < 48) return t(locale, 'recruiting.timeHoursAgo', { hr });
  if (day < 30) return t(locale, 'recruiting.timeDaysAgo', { day });
  return d.toLocaleDateString(localeHtmlLang(locale), { day: '2-digit', month: '2-digit' });
}

function inviteStatusShort(locale, status) {
  const s = String(status || '');
  if (s === 'opened') return t(locale, 'recruiting.inviteOpened');
  if (s === 'completed') return t(locale, 'recruiting.inviteCompleted');
  if (s === 'sent') return t(locale, 'recruiting.inviteSent');
  if (s === 'cancelled') return t(locale, 'recruiting.inviteCancelled');
  return null;
}

function fitBandLabel(locale, code) {
  if (code === 'high') return t(locale, 'recruiting.fitHigh');
  if (code === 'medium') return t(locale, 'recruiting.fitMedium');
  if (code === 'low') return t(locale, 'recruiting.fitLow');
  return null;
}

function pipelineStageLabel(locale, code) {
  const map = {
    new: 'recruiting.pipelineNew',
    interview: 'recruiting.pipelineInterview',
    test_completed: 'recruiting.pipelineTestCompleted',
    screening: 'recruiting.pipelineScreening',
    approved: 'recruiting.pipelineApproved',
    hired: 'recruiting.pipelineHired',
    rejected: 'recruiting.pipelineRejected',
    archived: 'recruiting.pipelineArchived',
  };
  return t(locale, map[code] || 'recruiting.pipelineNew');
}

function VacancyFitRankingBlock({ vacancyId, locale, refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [hasCompletedTests, setHasCompletedTests] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/ranking`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        const all = Array.isArray(data.ranking) ? data.ranking : [];
        const completed = all.filter((r) => !r.pendingTest && r.assessmentId != null);
        const scored = completed
          .filter((r) => r.vacancyFitScore010 != null)
          .sort((a, b) => {
            const av = a.vacancyFitScore010;
            const bv = b.vacancyFitScore010;
            if (bv !== av) return bv - av;
            return String(a.name || '').localeCompare(String(b.name || ''), localeHtmlLang(locale));
          });
        if (!cancelled) {
          setHasCompletedTests(completed.length > 0);
          setRows(scored);
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || t(locale, 'panel.common.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [vacancyId, refreshKey, locale]);

  const scoreColor = (s) => (s >= 7 ? C.success : s >= 4 ? C.warning : C.danger);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <span style={S.label}>{t(locale, 'recruiting.rankingTitle')}</span>
        {loading ? <span className="spinner" style={{ color: C.muted }} /> : null}
        {!loading && rows.length > 0 ? (
          <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
            {t(locale, 'recruiting.rankingScoredCount', { n: rows.length })}
          </span>
        ) : null}
      </div>
      <p style={{ margin: '0 0 14px', fontSize: '12px', color: C.muted, lineHeight: 1.55 }}>
        {t(locale, 'recruiting.rankingIntro')}
      </p>

      {err ? (
        <p style={{ fontSize: '12px', color: C.tension, fontFamily: 'monospace', margin: '0 0 10px' }}>{err}</p>
      ) : null}

      {!loading && rows.length === 0 ? (
        <p style={{ fontSize: '12px', color: C.faint, fontStyle: 'italic', margin: 0 }}>
          {hasCompletedTests
            ? t(locale, 'recruiting.rankingNoWeights')
            : t(locale, 'recruiting.rankingEmpty')}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px', color: C.faint, fontWeight: 600 }}>
                  {t(locale, 'recruiting.rankingColRank')}
                </th>
                <th style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px', color: C.faint, fontWeight: 600 }}>
                  {t(locale, 'recruiting.rankingColCandidate')}
                </th>
                <th style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px', color: C.faint, fontWeight: 600 }}>
                  {t(locale, 'recruiting.rankingColType')}
                </th>
                <th style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px', color: C.faint, fontWeight: 600 }}>
                  {t(locale, 'recruiting.rankingColFit')}
                </th>
                <th style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px', color: C.faint, fontWeight: 600 }}>
                  {t(locale, 'recruiting.rankingColStage')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const band = fitBandLabel(locale, r.vacancyFitLabel);
                return (
                  <tr
                    key={r.assessmentId != null ? `a:${r.assessmentId}` : `c:${r.candidateId}`}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: idx === 0 ? `${C.synergy}0a` : idx < 3 ? 'rgba(26,22,37,.02)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: idx < 3 ? C.purple : C.faint, fontWeight: idx < 3 ? 700 : 400 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ color: C.text, fontWeight: 500 }}>{titleCasePersonName(r.name)}</div>
                      {r.email ? (
                        <div style={{ marginTop: '2px', fontSize: '11px', fontFamily: 'monospace', color: C.faint }}>
                          {r.email}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {r.topType != null ? <TypeBadge type={r.topType} locale={locale} compact /> : t(locale, 'panel.common.notApplicable')}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: scoreColor(r.vacancyFitScore010) }}>
                        {r.vacancyFitScore010}/10
                      </span>
                      {band ? (
                        <span style={{ marginLeft: '8px', fontSize: '11px', fontFamily: 'monospace', color: C.muted }}>
                          {band}
                        </span>
                      ) : null}
                    </td>
                    <td style={{ padding: '10px', fontSize: '12px', fontFamily: 'monospace', color: C.muted }}>
                      {pipelineStageLabel(locale, r.pipelineStage || 'new')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function VacancyFunnelAnalyticsBlock({ vacancyId, locale, publicPagePath }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/analytics`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || t(locale, 'panel.common.error'));
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || t(locale, 'panel.common.error'));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vacancyId, locale]);

  const steps = [
    { key: 'views', label: t(locale, 'recruiting.analyticsViews') },
    { key: 'applyStarts', label: t(locale, 'recruiting.analyticsApplyStarts') },
    { key: 'applications', label: t(locale, 'recruiting.analyticsApplications') },
    { key: 'interviews', label: t(locale, 'recruiting.analyticsInterviews') },
    { key: 'hires', label: t(locale, 'recruiting.analyticsHires') },
  ];

  if (loading) {
    return (
      <div style={{ ...S.card, padding: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Spinner size={18} />
        <span style={{ color: C.muted, fontSize: '13px' }}>{t(locale, 'common.loading')}</span>
      </div>
    );
  }
  if (err) {
    return (
      <div style={{ ...S.card, padding: '16px', color: C.danger, fontSize: '13px' }}>{err}</div>
    );
  }

  const views = Number(data?.views) || 0;
  const empty = views === 0 && !(Number(data?.applications) || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ ...S.card, padding: '16px 18px' }}>
        <div style={{ fontSize: '13px', color: C.text, marginBottom: '12px', fontWeight: 600 }}>
          {t(locale, 'recruiting.analyticsFunnelTitle')}
        </div>
        {empty ? (
          <p style={{ margin: 0, color: C.muted, fontSize: '13px', lineHeight: 1.55 }}>
            {t(locale, 'recruiting.analyticsEmpty')}
            {publicPagePath ? (
              <>
                {' '}
                <a href={publicPagePath} target="_blank" rel="noopener noreferrer" style={{ color: C.purple }}>
                  {t(locale, 'recruiting.analyticsOpenPublic')}
                </a>
              </>
            ) : null}
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '10px',
            }}
          >
            {steps.map((s) => (
              <div
                key={s.key}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '22px', color: C.text, fontFamily: 'monospace' }}>
                  {Number(data?.[s.key]) || 0}
                </div>
                <div style={{ marginTop: '4px', fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
        {data?.conversionRate != null && !empty ? (
          <p style={{ margin: '12px 0 0', fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
            {t(locale, 'recruiting.analyticsConversion', {
              rate: String(Math.round(Number(data.conversionRate) * 1000) / 10),
            })}
          </p>
        ) : null}
      </div>

      {!empty && Array.isArray(data?.sources) && data.sources.length > 0 ? (
        <div style={{ ...S.card, padding: '16px 18px' }}>
          <div style={{ fontSize: '13px', color: C.text, marginBottom: '10px', fontWeight: 600 }}>
            {t(locale, 'recruiting.analyticsSourcesTitle')}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ color: C.muted, textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 500 }}>{t(locale, 'recruiting.analyticsColSource')}</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500 }}>{t(locale, 'recruiting.analyticsViews')}</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500 }}>{t(locale, 'recruiting.analyticsApplications')}</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500 }}>{t(locale, 'recruiting.analyticsHires')}</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.slice(0, 8).map((row) => (
                  <tr key={row.source} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px', color: C.text }}>{row.source}</td>
                    <td style={{ padding: '8px', color: C.muted }}>{row.views}</td>
                    <td style={{ padding: '8px', color: C.muted }}>{row.applications}</td>
                    <td style={{ padding: '8px', color: C.muted }}>{row.hires}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VacancyReferralBlock({ vacancyId, locale, publicPagePath, appUrl = '' }) {
  const { promptForm, confirm, toast } = useAppFeedback();
  const [codes, setCodes] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const qs = new URLSearchParams({ vacancyId: String(vacancyId) });
      const [codesRes, analyticsRes] = await Promise.all([
        fetch(`/api/admin/referral-codes?${qs.toString()}`),
        fetch(`/api/admin/referral-codes/analytics?${qs.toString()}`),
      ]);
      const codesJson = await codesRes.json().catch(() => ({}));
      const analyticsJson = await analyticsRes.json().catch(() => ({}));
      if (!codesRes.ok) throw new Error(codesJson?.error || t(locale, 'panel.common.error'));
      if (!analyticsRes.ok) throw new Error(analyticsJson?.error || t(locale, 'panel.common.error'));
      setCodes(Array.isArray(codesJson.items) ? codesJson.items : []);
      setAnalytics(Array.isArray(analyticsJson.items) ? analyticsJson.items : []);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
      setCodes([]);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [vacancyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const metricsByCode = Object.fromEntries(
    (analytics || []).map((row) => [String(row.code || '').toUpperCase(), row])
  );

  const visibleCodes = showInactive ? codes : codes.filter((c) => c.active !== false);

  const shareUrlFor = (code) => {
    if (!publicPagePath || !code) return '';
    const base = appUrl ? `${appUrl}${publicPagePath}` : publicPagePath;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}ref=${encodeURIComponent(code)}`;
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      if (toast) toast(t(locale, 'panel.common.copied'));
    } catch {
      if (toast) toast(t(locale, 'panel.common.copyFailed'));
    }
  };

  const createCode = async () => {
    const values = await promptForm({
      title: t(locale, 'recruiting.referralCreateTitle'),
      confirmLabel: t(locale, 'recruiting.referralCreateSubmit'),
      fields: [
        {
          key: 'code',
          label: t(locale, 'recruiting.referralCodeLabel'),
          placeholder: t(locale, 'recruiting.referralCodePlaceholder'),
          defaultValue: '',
        },
        {
          key: 'label',
          label: t(locale, 'recruiting.referralLabelLabel'),
          placeholder: t(locale, 'recruiting.referralLabelPlaceholder'),
          defaultValue: '',
        },
        {
          key: 'companyWide',
          type: 'boolean',
          label: t(locale, 'recruiting.referralCompanyWide'),
          defaultValue: false,
        },
      ],
    });
    if (!values) return;
    setBusy(true);
    setErr('');
    try {
      const companyWide = values.companyWide === true || values.companyWide === 'true';
      const res = await fetch('/api/admin/referral-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vacancyId: companyWide ? null : vacancyId,
          code: String(values.code || '').trim() || undefined,
          label: String(values.label || '').trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.referralCreateFailed'));
      await load();
      if (toast) toast(t(locale, 'recruiting.referralCreated'));
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (row, active) => {
    if (!active) {
      const ok = await confirm({
        message: t(locale, 'recruiting.referralDeactivateConfirm', { code: row.code }),
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/referral-codes/${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      await load();
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...S.card, padding: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Spinner size={18} />
        <span style={{ color: C.muted, fontSize: '13px' }}>{t(locale, 'common.loading')}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ ...S.card, padding: '16px 18px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ fontSize: '13px', color: C.text, marginBottom: '6px', fontWeight: 600 }}>
              {t(locale, 'recruiting.referralTitle')}
            </div>
            <p style={{ margin: 0, color: C.muted, fontSize: '13px', lineHeight: 1.55 }}>
              {t(locale, 'recruiting.referralIntro')}
            </p>
            {!publicPagePath ? (
              <p style={{ margin: '8px 0 0', color: C.faint, fontSize: '12px' }}>
                {t(locale, 'recruiting.referralNeedPublicPage')}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={createCode}
            disabled={busy}
            style={{
              background: `${C.purple}18`,
              border: `1px solid ${C.purple}55`,
              borderRadius: '10px',
              padding: '10px 14px',
              color: C.purple,
              fontSize: '12px',
              cursor: busy ? 'default' : 'pointer',
              fontFamily: 'monospace',
              opacity: busy ? 0.6 : 1,
              minHeight: '40px',
            }}
          >
            {t(locale, 'recruiting.referralNewBtn')}
          </button>
        </div>

        {err ? (
          <p style={{ margin: '12px 0 0', color: C.tension, fontSize: '13px' }}>{err}</p>
        ) : null}

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '14px',
            fontSize: '12px',
            color: C.muted,
            fontFamily: 'monospace',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          {t(locale, 'recruiting.referralShowInactive')}
        </label>

        {visibleCodes.length === 0 ? (
          <p style={{ margin: '14px 0 0', color: C.muted, fontSize: '13px', fontStyle: 'italic' }}>
            {t(locale, 'recruiting.referralEmpty')}
          </p>
        ) : (
          <div style={{ marginTop: '12px', overflowX: 'auto' }} className="db-table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '640px' }}>
              <thead>
                <tr style={{ color: C.muted, textAlign: 'left' }}>
                  <th style={{ padding: '8px', fontWeight: 500 }}>{t(locale, 'recruiting.referralColCode')}</th>
                  <th style={{ padding: '8px', fontWeight: 500 }}>{t(locale, 'recruiting.referralColScope')}</th>
                  <th style={{ padding: '8px', fontWeight: 500 }}>{t(locale, 'recruiting.analyticsViews')}</th>
                  <th style={{ padding: '8px', fontWeight: 500 }}>{t(locale, 'recruiting.analyticsApplications')}</th>
                  <th style={{ padding: '8px', fontWeight: 500 }}>{t(locale, 'recruiting.analyticsHires')}</th>
                  <th style={{ padding: '8px', fontWeight: 500, textAlign: 'right' }}>
                    {t(locale, 'recruiting.referralColActions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleCodes.map((row) => {
                  const m = metricsByCode[String(row.code || '').toUpperCase()] || {};
                  const share = shareUrlFor(row.code);
                  const companyWide = row.vacancyId == null;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderTop: `1px solid ${C.border}`,
                        opacity: row.active === false ? 0.55 : 1,
                      }}
                    >
                      <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
                        <div style={{ fontFamily: 'monospace', color: C.text, fontWeight: 600 }}>
                          {row.code}
                        </div>
                        {row.label ? (
                          <div style={{ marginTop: '2px', color: C.muted, fontSize: '11px' }}>{row.label}</div>
                        ) : null}
                        {row.active === false ? (
                          <div style={{ marginTop: '2px', color: C.faint, fontSize: '10px', fontFamily: 'monospace' }}>
                            {t(locale, 'recruiting.referralInactive')}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ padding: '10px 8px', color: C.muted, fontFamily: 'monospace', verticalAlign: 'top' }}>
                        {companyWide
                          ? t(locale, 'recruiting.referralScopeCompany')
                          : t(locale, 'recruiting.referralScopeVacancy')}
                      </td>
                      <td style={{ padding: '10px 8px', color: C.muted, fontFamily: 'monospace', verticalAlign: 'top' }}>
                        {Number(m.views) || 0}
                      </td>
                      <td style={{ padding: '10px 8px', color: C.muted, fontFamily: 'monospace', verticalAlign: 'top' }}>
                        {Number(m.applications) || 0}
                      </td>
                      <td style={{ padding: '10px 8px', color: C.muted, fontFamily: 'monospace', verticalAlign: 'top' }}>
                        {Number(m.hires) || 0}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            disabled={busy || !share || row.active === false}
                            onClick={() => copyText(share)}
                            style={{
                              background: `${C.purple}18`,
                              border: `1px solid ${C.purple}55`,
                              borderRadius: '10px',
                              padding: '8px 10px',
                              color: C.purple,
                              fontSize: '11px',
                              cursor: busy || !share || row.active === false ? 'default' : 'pointer',
                              fontFamily: 'monospace',
                              opacity: busy || !share || row.active === false ? 0.5 : 1,
                              minHeight: '36px',
                            }}
                          >
                            {t(locale, 'recruiting.referralCopyLink')}
                          </button>
                          {row.active !== false ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setActive(row, false)}
                              style={{
                                background: 'transparent',
                                border: `1px solid ${C.border}`,
                                borderRadius: '10px',
                                padding: '8px 10px',
                                color: C.muted,
                                fontSize: '11px',
                                cursor: busy ? 'default' : 'pointer',
                                fontFamily: 'monospace',
                                minHeight: '36px',
                              }}
                            >
                              {t(locale, 'recruiting.referralDeactivate')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setActive(row, true)}
                              style={{
                                background: 'transparent',
                                border: `1px solid ${C.border}`,
                                borderRadius: '10px',
                                padding: '8px 10px',
                                color: C.muted,
                                fontSize: '11px',
                                cursor: busy ? 'default' : 'pointer',
                                fontFamily: 'monospace',
                                minHeight: '36px',
                              }}
                            >
                              {t(locale, 'recruiting.referralReactivate')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function VacancyKanbanBlock({ vacancyId, locale, refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [moving, setMoving] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const stages = getKanbanStages(locale);
  const { requestPipelineExtras } = usePipelineExtras();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/ranking`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        if (!cancelled) setRows(Array.isArray(data.ranking) ? data.ranking : []);
      } catch (e) {
        if (!cancelled) setErr(e?.message || t(locale, 'panel.common.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [vacancyId, refreshKey, locale]);

  const cardKey = (r) =>
    r.assessmentId != null ? `a:${r.assessmentId}` : `vc:${r.vacancyCandidateId}`;

  const moveTo = async (row, stage) => {
    const extras = await requestPipelineExtras(locale, stage);
    if (extras == null) return;
    const key = cardKey(row);
    setMoving(key);
    try {
      if (row.pendingTest || !row.assessmentId) {
        const res = await fetch(
          `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(row.candidateId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pipelineStage: stage, ...extras }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        setRows((prev) =>
          prev.map((r) => (cardKey(r) === key ? {
            ...r,
            pipelineStage: stage,
            rejectionReason: data.rejectionReason ?? extras.rejectionReason ?? r.rejectionReason,
            startDate: data.startDate ?? extras.startDate ?? r.startDate,
          } : r))
        );
      } else {
        const res = await fetch(`/api/admin/assessments/${encodeURIComponent(row.assessmentId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pipelineStage: stage, ...extras }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
        setRows((prev) =>
          prev.map((r) => (cardKey(r) === key ? {
            ...r,
            pipelineStage: stage,
            rejectionReason: data.rejectionReason ?? extras.rejectionReason ?? r.rejectionReason,
            startDate: data.startDate ?? extras.startDate ?? r.startDate,
          } : r))
        );
      }
    } catch (e) {
      setErr(e?.message || t(locale, 'recruiting.moveCandidateError'));
    } finally {
      setMoving(null);
    }
  };

  const grouped = Object.fromEntries(stages.map((s) => [s.id, []]));
  rows.forEach((r) => {
    const stage = r.pipelineStage || 'new';
    if (grouped[stage]) grouped[stage].push(r);
    else grouped['new'].push(r);
  });

  const hasAny = rows.length > 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace', textTransform: 'uppercase',
          letterSpacing: '1.5px' }}>
          {t(locale, 'recruiting.pipelineTitle')}
        </span>
        {loading && <span className="spinner" style={{ color: C.muted }} />}
        {!loading && hasAny && (
          <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
            {t(locale, 'recruiting.candidatesCount', { n: rows.length })}
          </span>
        )}
      </div>

      {err ? <p style={{ fontSize: '12px', color: C.tension, fontFamily: 'monospace', margin: '0 0 10px' }}>{err}</p> : null}

      {!loading && !hasAny ? (
        <p style={{ fontSize: '12px', color: C.faint, fontStyle: 'italic' }}>
          {t(locale, 'recruiting.pipelineEmpty')}
        </p>
      ) : null}

      {hasAny && (
        <div className="kanban-scroll" style={{ overflowX: 'auto', paddingBottom: '8px',
          WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', gap: '10px', minWidth: 'max-content', alignItems: 'flex-start' }}>
            {stages.map((stage) => {
              const cards = grouped[stage.id] || [];
              const isDropTarget = dragOverStage === stage.id;
              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(null); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain');
                    setDragOverStage(null);
                    setDraggingId(null);
                    if (!id) return;
                    const r = rows.find((row) => cardKey(row) === id);
                    if (!r || (r.pipelineStage || 'new') === stage.id) return;
                    await moveTo(r, stage.id);
                  }}
                  style={{ width: '210px', flexShrink: 0, borderRadius: '12px',
                    outline: isDropTarget ? `2px dashed ${stage.color}` : '2px dashed transparent',
                    outlineOffset: '3px', transition: 'outline-color 0.12s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 10px', borderRadius: '10px 10px 0 0',
                    background: isDropTarget ? `${stage.color}22` : `${stage.color}12`,
                    borderTop: `3px solid ${stage.color}`, border: `1px solid ${stage.color}30`,
                    marginBottom: '8px', transition: 'background 0.12s' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%',
                      background: stage.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: stage.color,
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', flex: 1 }}>
                      {stage.label}
                    </span>
                    <span style={{ fontSize: '11px', color: stage.color, fontFamily: 'monospace',
                      background: `${stage.color}25`, borderRadius: '8px', padding: '1px 7px', fontWeight: 700 }}>
                      {cards.length}
                    </span>
                  </div>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    style={{ minHeight: isDropTarget ? '60px' : '30px', display: 'flex',
                      flexDirection: 'column', gap: '7px', transition: 'min-height 0.12s' }}
                  >
                    {cards.map((r) => {
                      const rid = cardKey(r);
                      const isDragging = draggingId === rid;
                      const isBusy = moving === rid;
                      const inviteLabel = inviteStatusShort(locale, r.inviteStatus);
                      const ago = formatRelativeAgo(r.inviteSentAt, locale);
                      return (
                        <div
                          key={rid}
                          draggable
                          onDragStart={(e) => {
                            setDraggingId(rid);
                            e.dataTransfer.setData('text/plain', rid);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => { setDraggingId(null); setDragOverStage(null); }}
                          style={{ background: 'rgba(255,255,255,.88)',
                            border: `1px solid ${C.border}`, borderRadius: '8px',
                            padding: '9px 10px', cursor: 'grab', userSelect: 'none',
                            opacity: isDragging ? 0.4 : isBusy ? 0.65 : 1,
                            transition: 'opacity 0.15s',
                            pointerEvents: draggingId && !isDragging ? 'none' : 'auto' }}
                        >
                          <div style={{ fontSize: '13px', color: C.text, marginBottom: '3px',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            fontFamily: "'Georgia',serif" }}>
                            {titleCasePersonName(r.name)}
                          </div>
                          {r.email ? (
                            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: C.faint,
                              marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                              title={r.email}>
                              {r.email}
                            </div>
                          ) : null}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {r.pendingTest || r.topType == null ? null : (
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: C.muted }}>
                                T{r.topType}
                              </span>
                            )}
                            {r.vacancyFitScore010 != null && (
                              <span style={{ fontSize: '11px', fontFamily: 'monospace',
                                color: r.vacancyFitScore010 >= 7 ? C.success : r.vacancyFitScore010 >= 4 ? C.warning : C.danger }}>
                                {r.vacancyFitScore010}/10
                              </span>
                            )}
                          </div>
                          {r.rejectionReason ? (
                            <div style={{ marginTop: '4px', fontSize: '10px', fontFamily: 'monospace', color: C.tension }}>
                              {rejectionReasonLabel(locale, r.rejectionReason)}
                            </div>
                          ) : null}
                          {r.startDate && (r.pipelineStage === 'hired') ? (
                            <div style={{ marginTop: '4px', fontSize: '10px', fontFamily: 'monospace', color: C.synergy }}>
                              {t(locale, 'recruiting.startDateLabel')}: {r.startDate}
                            </div>
                          ) : null}
                          {(inviteLabel || ago) ? (
                            <div style={{ marginTop: '5px', fontSize: '10px', fontFamily: 'monospace', color: C.muted,
                              lineHeight: 1.35 }}>
                              {inviteLabel ? t(locale, 'recruiting.inviteLine', { status: inviteLabel }) : null}
                              {inviteLabel && ago ? ' · ' : null}
                              {ago || null}
                            </div>
                          ) : r.pendingTest ? (
                            <div style={{ marginTop: '5px', fontSize: '10px', fontFamily: 'monospace', color: C.faint }}>
                              {t(locale, 'recruiting.waitingTest')}
                            </div>
                          ) : null}
                          {r.hasNotes ? (
                            <div style={{ marginTop: '4px', fontSize: '10px', fontFamily: 'monospace', color: C.purpleLight }}>
                              {t(locale, 'recruiting.withNotes')}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                    {cards.length === 0 && (
                      <div style={{ padding: '14px 10px', textAlign: 'center',
                        color: isDropTarget ? stage.color : C.faint, fontSize: '11px',
                        fontFamily: 'monospace', fontStyle: 'italic',
                        border: isDropTarget ? `2px dashed ${stage.color}55` : '2px dashed transparent',
                        borderRadius: '8px', transition: 'all 0.12s' }}>
                        {isDropTarget ? '↓' : '—'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function toDatetimeLocalValue(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  // datetime-local (horário local do navegador)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function VacanciesAdminTab({ isAdmin, navigateDashboard, locale = 'pt-BR' }) {
  const { confirm, notice, toast } = useAppFeedback();
  const urlParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [vacancies, setVacancies] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [invitesRefresh, setInvitesRefresh] = useState(0);
  const [pipelineRefresh, setPipelineRefresh] = useState(0);
  const [linkExpiryEdit, setLinkExpiryEdit] = useState(null);
  const [editingVacancy, setEditingVacancy] = useState(null);
  const [detailVacancy, setDetailVacancy] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSection, setDetailSection] = useState('pipeline');

  const vacancyDetailId = String(urlParams.get('vacancyDetail') || '').trim();
  const isDetailView = Boolean(vacancyDetailId);

  const { page: vacPage, pageSize: vacPageSize } = parseVacanciesPagination(
    Object.fromEntries(urlParams.entries())
  );
  const vacSortSt = parseVacanciesSort(Object.fromEntries(urlParams.entries()), { isAdmin });
  const vacFilterFromUrl = String(urlParams.get('vacancy') || 'all');
  const companyFilterFromUrl = String(urlParams.get('company') || 'all');
  const [vacTotal, setVacTotal] = useState(0);
  const [vacTotalPages, setVacTotalPages] = useState(1);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('open');
  const [positionsCount, setPositionsCount] = useState('1');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [descAiBusy, setDescAiBusy] = useState(false);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [workplaceModality, setWorkplaceModality] = useState('');
  const [workplaceState, setWorkplaceState] = useState('');
  const [workplaceCity, setWorkplaceCity] = useState('');
  const [clientReportShowSalary, setClientReportShowSalary] = useState(false);
  const [publicPageEnabled, setPublicPageEnabled] = useState(false);
  const [publicAllowIndex, setPublicAllowIndex] = useState(true);
  const [publicShowCompanyInfo, setPublicShowCompanyInfo] = useState(false);
  const [publicShowSalary, setPublicShowSalary] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const appUrl =
    (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';

  const pushVacanciesSort = (column) => {
    const cur = parseVacanciesSort(Object.fromEntries(urlParams.entries()), { isAdmin });
    const nextDir = clientSortNextDir(column, cur.sort, cur.dir);
    navigateDashboard({
      vacanciesSort: column,
      vacanciesSortDir: nextDir,
      vacanciesPage: 1,
      tab: 'vacancies',
    });
  };

  const loadVacancies = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        page: String(vacPage),
        pageSize: String(vacPageSize),
        sort: vacSortSt.sort,
        sortDir: vacSortSt.dir,
      });
      if (vacFilterFromUrl && vacFilterFromUrl !== 'all') qs.set('vacancy', vacFilterFromUrl);
      if (isAdmin && companyFilterFromUrl && companyFilterFromUrl !== 'all') {
        qs.set('company', companyFilterFromUrl);
      }
      const res = await fetch(`/api/admin/vacancies?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.loadVacanciesFailed'));
      const rows = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];
      setVacancies(rows);
      const total = typeof data?.total === 'number' ? data.total : rows.length;
      const tpg = typeof data?.totalPages === 'number'
        ? data.totalPages
        : Math.max(1, Math.ceil(total / vacPageSize));
      setVacTotal(total);
      setVacTotalPages(tpg);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/companies?forSelect=1');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.loadCompaniesFailed'));
      setCompanies(Array.isArray(data) ? data : []);
      if (!companyId && Array.isArray(data) && data.length) {
        const fromFilter =
          companyFilterFromUrl !== 'all' &&
          data.some((c) => String(c.id) === companyFilterFromUrl)
            ? companyFilterFromUrl
            : String(data[0].id);
        setCompanyId(fromFilter);
      }
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDetailView) return;
    loadVacancies();
  }, [vacPage, vacPageSize, vacSortSt.sort, vacSortSt.dir, vacFilterFromUrl, companyFilterFromUrl, isDetailView]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadCompanies();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdmin) return;
    if (companyFilterFromUrl !== 'all') setCompanyId(companyFilterFromUrl);
  }, [companyFilterFromUrl, isAdmin]);

  const loadVacancyDetail = async (id) => {
    setDetailLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.loadVacancyFailed'));
      setDetailVacancy(data);
    } catch (e) {
      setDetailVacancy(null);
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!vacancyDetailId) {
      setDetailVacancy(null);
      return;
    }
    setDetailSection('pipeline');
    loadVacancyDetail(vacancyDetailId);
  }, [vacancyDetailId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openVacancyDetail = (id) => {
    navigateDashboard({ tab: 'vacancies', vacancyDetail: String(id) });
  };

  const backToVacanciesList = () => {
    setDetailVacancy(null);
    setLinkExpiryEdit(null);
    setEditingVacancy(null);
    navigateDashboard({ tab: 'vacancies', vacancyDetail: '' });
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(t(locale, 'recruiting.copied'));
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg(t(locale, 'recruiting.copyFailed'));
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const createVacancy = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const body = {
        title: title.trim(), status, slug: slug.trim() || undefined,
        positionsCount: parseInt(positionsCount, 10) || 1,
        targetDate: targetDate || null,
        description,
        employmentType,
        workplaceModality,
        workplaceState,
        workplaceCity,
        salaryMin: stripSalary(salaryMin),
        salaryMax: stripSalary(salaryMax),
        clientReportShowSalary,
        publicPageEnabled,
        publicAllowIndex,
        publicShowCompanyInfo,
        publicShowSalary,
      };
      if (isAdmin) body.companyId = companyId ? parseInt(companyId, 10) : null;
      const res = await fetch('/api/admin/vacancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.createVacancyFailed'));
      setTitle(''); setSlug(''); setStatus('open'); setPositionsCount('1'); setTargetDate('');
      setDescription(''); setEmploymentType(''); setWorkplaceModality(''); setWorkplaceState(''); setWorkplaceCity('');
      setSalaryMin(''); setSalaryMax(''); setClientReportShowSalary(false);
      setPublicPageEnabled(false); setPublicAllowIndex(true);
      setPublicShowCompanyInfo(false); setPublicShowSalary(false);
      setShowCreate(false);
      setMsg(t(locale, 'recruiting.vacancyCreated'));
      await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const rotateLink = async (vacancyId) => {
    setLoading(true);
    setError('');
    setMsg('');
    setLinkExpiryEdit((cur) => (cur?.vacancyId === vacancyId ? null : cur));
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/link`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.admin.rotateLinkFailed'));
      setMsg(t(locale, 'recruiting.linkRotated'));
      if (isDetailView) await loadVacancyDetail(vacancyId);
      else await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const saveLinkExpiry = async () => {
    if (!linkExpiryEdit?.vacancyId) return;
    const parsed = new Date(linkExpiryEdit.value);
    if (Number.isNaN(parsed.getTime())) {
      setError(t(locale, 'recruiting.invalidExpiry'));
      return;
    }
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(linkExpiryEdit.vacancyId)}/link`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt: parsed.toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.updateExpiryFailed'));
      setMsg(t(locale, 'recruiting.expiryUpdated'));
      setLinkExpiryEdit(null);
      if (isDetailView) await loadVacancyDetail(linkExpiryEdit.vacancyId);
      else await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const setVacancyStatus = async (vacancyId, nextStatus) => {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.updateVacancyFailed'));
      setMsg(t(locale, 'recruiting.vacancyUpdated'));
      if (isDetailView) await loadVacancyDetail(vacancyId);
      else await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const editVacancy = (v) => {
    setShowCreate(false);
    setEditingVacancy({
      id: v.id,
      title: v.title ?? '',
      slug: v.slug ?? '',
      status: v.status ?? 'open',
      positionsCount: String(v.positionsCount ?? 1),
      targetDate: v.targetDate ? String(v.targetDate).slice(0, 10) : '',
      description: v.description ?? '',
      employmentType: v.employmentType ?? '',
      workplaceModality: v.workplaceModality ?? '',
      workplaceState: v.workplaceState ?? '',
      workplaceCity: v.workplaceCity ?? '',
      salaryMin: salaryToCentsDigits(v.salaryMin),
      salaryMax: salaryToCentsDigits(v.salaryMax),
      clientReportShowSalary: Boolean(v.clientReportShowSalary),
      publicPageEnabled: Boolean(v.publicPageEnabled),
      publicAllowIndex: Boolean(v.publicAllowIndex),
      publicShowCompanyInfo: Boolean(v.publicShowCompanyInfo),
      publicShowSalary: Boolean(v.publicShowSalary),
      companySlug: v.companySlug || '',
    });
  };

  const saveVacancyEdit = async () => {
    if (!editingVacancy) return;
    const {
      id,
      title,
      slug,
      status,
      positionsCount,
      targetDate,
      description,
      employmentType,
      workplaceModality,
      workplaceState,
      workplaceCity,
      salaryMin,
      salaryMax,
      clientReportShowSalary,
      publicPageEnabled,
      publicAllowIndex,
      publicShowCompanyInfo,
      publicShowSalary,
    } = editingVacancy;
    if (!title.trim()) { setError(t(locale, 'recruiting.titleRequired')); return; }
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || undefined,
          status,
          positionsCount: parseInt(positionsCount, 10) || 1,
          targetDate: targetDate || null,
          description,
          employmentType,
          workplaceModality,
          workplaceState,
          workplaceCity,
          salaryMin: stripSalary(salaryMin),
          salaryMax: stripSalary(salaryMax),
          clientReportShowSalary: Boolean(clientReportShowSalary),
          publicPageEnabled: Boolean(publicPageEnabled),
          publicAllowIndex: Boolean(publicAllowIndex),
          publicShowCompanyInfo: Boolean(publicShowCompanyInfo),
          publicShowSalary: Boolean(publicShowSalary),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.updateVacancyFailed'));
      setMsg(t(locale, 'recruiting.vacancyUpdated'));
      setEditingVacancy(null);
      if (isDetailView) await loadVacancyDetail(id);
      else await loadVacancies();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const archiveVacancy = async (vacancyId, title) => {
    const ok = await confirm({
      message: t(locale, 'recruiting.archiveConfirm', { title }),
      danger: true,
    });
    if (!ok) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t(locale, 'recruiting.archiveVacancyFailed'));
      setMsg(t(locale, 'recruiting.vacancyArchived'));
      if (isDetailView) {
        backToVacanciesList();
      } else {
        await loadVacancies();
      }
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setLoading(false);
    }
  };

  const vacancyFormDrawers = (
    <>
      <AdminRichFormDrawer
        open={showCreate}
        title={t(locale, 'recruiting.createVacancyDrawerTitle')}
        locale={locale}
        onClose={() => setShowCreate(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              disabled={loading}
              style={dialogBtnGhost}
            >
              {t(locale, 'panel.admin.cancel')}
            </button>
            <button
              type="button"
              onClick={createVacancy}
              disabled={loading || !title.trim() || (isAdmin && !companyId)}
              style={{
                ...dialogBtnPrimary(C.purple),
                opacity: (loading || !title.trim() || (isAdmin && !companyId)) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {loading ? <span className="spinner" /> : null}
              {t(locale, 'panel.admin.create')}
            </button>
          </>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isAdmin ? (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              aria-label={t(locale, 'dashboard.allCompanies')}
              style={{ width: '100%', maxWidth: '420px', background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`,
                borderRadius: '10px', padding: '10px 12px', color: C.muted, fontSize: '12px',
                cursor: 'pointer', fontFamily: 'monospace', boxSizing: 'border-box' }}
            >
              {companies.length === 0 ? (
                <option value="">{t(locale, 'panel.admin.loadingCompanies')}</option>
              ) : companies.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name} (#{c.id})</option>
              ))}
            </select>
          ) : null}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
          }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(locale, 'recruiting.createTitlePh')}
              aria-label={t(locale, 'recruiting.createTitlePh')}
              style={{ width: '100%', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px',
                fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t(locale, 'recruiting.createSlugPh')}
              aria-label={t(locale, 'recruiting.createSlugPh')}
              style={{ width: '100%', maxWidth: '320px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px',
                fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            alignItems: 'end',
          }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px',
              fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
              {t(locale, 'recruiting.sortStatus')}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 12px', color: C.muted, fontSize: '12px',
                  cursor: 'pointer', fontFamily: 'monospace', boxSizing: 'border-box' }}
              >
                <option value="open">{t(locale, 'recruiting.openStatus')}</option>
                <option value="closed">{t(locale, 'recruiting.closedStatus')}</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px',
              fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
              {t(locale, 'recruiting.positionsLabel')}
              <input
                type="number"
                min="1"
                value={positionsCount}
                onChange={(e) => setPositionsCount(e.target.value)}
                aria-label={t(locale, 'recruiting.positionsLabel')}
                style={{ width: '100%', minWidth: '72px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 8px', color: C.text, fontSize: '12px',
                  fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px',
              fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
              {t(locale, 'recruiting.targetDateLabel')}
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                aria-label={t(locale, 'recruiting.targetDateLabel')}
                style={{ width: '100%', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '9px 8px', color: C.text, fontSize: '12px',
                  fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </label>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            maxWidth: '640px',
          }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px',
              fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
              {t(locale, 'recruiting.employmentTypeLabel')}
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                style={{ width: '100%', background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 12px', color: C.muted, fontSize: '12px',
                  cursor: 'pointer', fontFamily: 'monospace', boxSizing: 'border-box' }}
              >
                <option value="">{t(locale, 'recruiting.employmentTypeNone')}</option>
                {VACANCY_EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{t(locale, employmentTypeLabelKey(type))}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px',
              fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
              {t(locale, 'recruiting.salaryMinPh')}
              <input
                value={formatSalaryBr(salaryMin)}
                onChange={(e) => setSalaryMin(digitsOnly(e.target.value).slice(0, 15))}
                placeholder={t(locale, 'recruiting.salaryMinPh')}
                inputMode="numeric"
                aria-label={t(locale, 'recruiting.salaryMinPh')}
                style={{ width: '100%', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px',
                  fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px',
              fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
              {t(locale, 'recruiting.salaryMaxPh')}
              <input
                value={formatSalaryBr(salaryMax)}
                onChange={(e) => setSalaryMax(digitsOnly(e.target.value).slice(0, 15))}
                placeholder={t(locale, 'recruiting.salaryMaxPh')}
                inputMode="numeric"
                aria-label={t(locale, 'recruiting.salaryMaxPh')}
                style={{ width: '100%', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '12px',
                  fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </label>
          </div>

          <VacancyWorkplaceFields
            locale={locale}
            workplaceModality={workplaceModality}
            workplaceState={workplaceState}
            workplaceCity={workplaceCity}
            onChange={(patch) => {
              if (patch.workplaceModality !== undefined) setWorkplaceModality(patch.workplaceModality);
              if (patch.workplaceState !== undefined) setWorkplaceState(patch.workplaceState);
              if (patch.workplaceCity !== undefined) setWorkplaceCity(patch.workplaceCity);
            }}
          />

          <label
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              fontSize: '12px',
              color: C.muted,
              lineHeight: 1.45,
              maxWidth: '520px',
            }}
          >
            <input
              type="checkbox"
              checked={clientReportShowSalary}
              onChange={(e) => setClientReportShowSalary(e.target.checked)}
              style={{ marginTop: '2px', accentColor: C.purple }}
            />
            <span>
              <strong style={{ color: C.text }}>{t(locale, 'recruiting.clientReportShowSalary')}</strong>
              <br />
              {t(locale, 'recruiting.clientReportShowSalaryHelp')}
            </span>
          </label>

          <VacancyPublicFlagsFields
            locale={locale}
            values={{
              publicPageEnabled,
              publicAllowIndex,
              publicShowCompanyInfo,
              publicShowSalary,
            }}
            seoContext={{
              title,
              description,
              employmentType,
              salaryMin,
              salaryMax,
              workplaceModality,
              workplaceCity,
              workplaceState,
            }}
            onChange={(patch) => {
              if (patch.publicPageEnabled != null) setPublicPageEnabled(patch.publicPageEnabled);
              if (patch.publicAllowIndex != null) setPublicAllowIndex(patch.publicAllowIndex);
              if (patch.publicShowCompanyInfo != null) setPublicShowCompanyInfo(patch.publicShowCompanyInfo);
              if (patch.publicShowSalary != null) setPublicShowSalary(patch.publicShowSalary);
            }}
          />

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: C.faint, fontFamily: 'monospace', marginBottom: '6px' }}>
              {t(locale, 'recruiting.vacancyDescriptionLabel')}
            </label>
            <VacancyDescriptionAssistBar
              locale={locale}
              busy={descAiBusy}
              title={title}
              descriptionHtml={description}
              employmentType={employmentType}
              salaryMin={salaryMin}
              salaryMax={salaryMax}
              onApplyDescription={setDescription}
              onBusyChange={setDescAiBusy}
            />
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder={t(locale, 'recruiting.vacancyDescriptionPh')}
              minHeight={120}
              locale={locale}
              disabled={descAiBusy}
            />
          </div>
        </div>
      </AdminRichFormDrawer>

      <AdminRichFormDrawer
        open={!!editingVacancy}
        title={t(locale, 'recruiting.editVacancyDrawerTitle')}
        locale={locale}
        onClose={() => setEditingVacancy(null)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setEditingVacancy(null)}
              disabled={loading}
              style={dialogBtnGhost}
            >
              {t(locale, 'panel.admin.cancel')}
            </button>
            <button
              type="button"
              onClick={saveVacancyEdit}
              disabled={loading || !editingVacancy}
              style={{
                ...dialogBtnPrimary(C.purple),
                opacity: loading || !editingVacancy ? 0.6 : 1,
              }}
            >
              {t(locale, 'panel.admin.save')}
            </button>
          </>
        )}
      >
        {editingVacancy ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                value={editingVacancy.title}
                onChange={(e) => setEditingVacancy((cur) => ({ ...cur, title: e.target.value }))}
                placeholder={t(locale, 'recruiting.vacancyTitlePh')}
                aria-label={t(locale, 'recruiting.vacancyTitlePh')}
                style={{ flex: '2 1 280px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '13px', fontFamily: 'monospace' }}
              />
              <input
                value={editingVacancy.slug}
                onChange={(e) => setEditingVacancy((cur) => ({ ...cur, slug: e.target.value }))}
                placeholder={t(locale, 'recruiting.vacancySlugPh')}
                aria-label={t(locale, 'recruiting.vacancySlugPh')}
                style={{ flex: '1 1 200px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '13px', fontFamily: 'monospace' }}
              />
              <select
                value={editingVacancy.status}
                onChange={(e) => setEditingVacancy((cur) => ({ ...cur, status: e.target.value }))}
                aria-label={t(locale, 'recruiting.sortStatus')}
                style={{ flex: '0 0 140px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 12px', color: C.text, fontSize: '13px',
                  cursor: 'pointer', fontFamily: 'monospace' }}
              >
                <option value="open">{t(locale, 'recruiting.openStatus')}</option>
                <option value="closed">{t(locale, 'recruiting.closedStatus')}</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                {t(locale, 'recruiting.positionsLabel')}
                <input
                  type="number"
                  min="1"
                  value={editingVacancy.positionsCount}
                  onChange={(e) => setEditingVacancy((cur) => ({ ...cur, positionsCount: e.target.value }))}
                  aria-label={t(locale, 'recruiting.positionsLabel')}
                  style={{ width: '70px', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '8px 10px', color: C.text, fontSize: '13px',
                    fontFamily: 'monospace' }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                {t(locale, 'recruiting.targetDateLabel')}
                <input
                  type="date"
                  value={editingVacancy.targetDate}
                  onChange={(e) => setEditingVacancy((cur) => ({ ...cur, targetDate: e.target.value }))}
                  aria-label={t(locale, 'recruiting.targetDateLabel')}
                  style={{ background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '8px 10px', color: C.text, fontSize: '13px',
                    fontFamily: 'monospace' }}
                />
              </label>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
              maxWidth: '640px',
            }}>
              <select
                value={editingVacancy.employmentType}
                onChange={(e) => setEditingVacancy((cur) => ({ ...cur, employmentType: e.target.value }))}
                aria-label={t(locale, 'recruiting.employmentTypeLabel')}
                style={{ width: '100%', background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '13px',
                  cursor: 'pointer', fontFamily: 'monospace', boxSizing: 'border-box' }}
              >
                <option value="">{t(locale, 'recruiting.employmentTypeNone')}</option>
                {VACANCY_EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{t(locale, employmentTypeLabelKey(type))}</option>
                ))}
              </select>
              <input
                value={formatSalaryBr(editingVacancy.salaryMin)}
                onChange={(e) => setEditingVacancy((cur) => ({ ...cur, salaryMin: digitsOnly(e.target.value).slice(0, 15) }))}
                placeholder={t(locale, 'recruiting.salaryMinPh')}
                inputMode="numeric"
                aria-label={t(locale, 'recruiting.salaryMinPh')}
                style={{ width: '100%', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '8px 10px', color: C.text, fontSize: '13px',
                  fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
              <input
                value={formatSalaryBr(editingVacancy.salaryMax)}
                onChange={(e) => setEditingVacancy((cur) => ({ ...cur, salaryMax: digitsOnly(e.target.value).slice(0, 15) }))}
                placeholder={t(locale, 'recruiting.salaryMaxPh')}
                inputMode="numeric"
                aria-label={t(locale, 'recruiting.salaryMaxPh')}
                style={{ width: '100%', background: 'rgba(26,22,37,.04)', border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '8px 10px', color: C.text, fontSize: '13px',
                  fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </div>
            <VacancyWorkplaceFields
              locale={locale}
              compact
              workplaceModality={editingVacancy.workplaceModality}
              workplaceState={editingVacancy.workplaceState}
              workplaceCity={editingVacancy.workplaceCity}
              onChange={(patch) => setEditingVacancy((cur) => ({ ...cur, ...patch }))}
            />
            <label
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                fontSize: '12px',
                color: C.muted,
                lineHeight: 1.45,
                maxWidth: '520px',
              }}
            >
              <input
                type="checkbox"
                checked={Boolean(editingVacancy.clientReportShowSalary)}
                onChange={(e) =>
                  setEditingVacancy((cur) => ({ ...cur, clientReportShowSalary: e.target.checked }))
                }
                style={{ marginTop: '2px', accentColor: C.purple }}
              />
              <span>
                <strong style={{ color: C.text }}>{t(locale, 'recruiting.clientReportShowSalary')}</strong>
                <br />
                {t(locale, 'recruiting.clientReportShowSalaryHelp')}
              </span>
            </label>
            <VacancyPublicFlagsFields
              locale={locale}
              values={{
                publicPageEnabled: editingVacancy.publicPageEnabled,
                publicAllowIndex: editingVacancy.publicAllowIndex,
                publicShowCompanyInfo: editingVacancy.publicShowCompanyInfo,
                publicShowSalary: editingVacancy.publicShowSalary,
              }}
              seoContext={{
                title: editingVacancy.title,
                description: editingVacancy.description,
                employmentType: editingVacancy.employmentType,
                salaryMin: editingVacancy.salaryMin,
                salaryMax: editingVacancy.salaryMax,
                workplaceModality: editingVacancy.workplaceModality,
                workplaceCity: editingVacancy.workplaceCity,
                workplaceState: editingVacancy.workplaceState,
              }}
              onChange={(patch) => setEditingVacancy((cur) => ({ ...cur, ...patch }))}
            />
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: C.muted, fontFamily: 'monospace', marginBottom: '6px' }}>
                {t(locale, 'recruiting.vacancyDescriptionLabel')}
              </label>
              <VacancyDescriptionAssistBar
                locale={locale}
                busy={descAiBusy}
                title={editingVacancy.title}
                descriptionHtml={editingVacancy.description}
                employmentType={editingVacancy.employmentType}
                salaryMin={editingVacancy.salaryMin}
                salaryMax={editingVacancy.salaryMax}
                vacancyId={editingVacancy.id}
                onApplyDescription={(html) =>
                  setEditingVacancy((cur) => ({ ...cur, description: html }))
                }
                onBusyChange={setDescAiBusy}
              />
              <RichTextEditor
                value={editingVacancy.description}
                onChange={(html) => setEditingVacancy((cur) => ({ ...cur, description: html }))}
                placeholder={t(locale, 'recruiting.vacancyDescriptionPh')}
                minHeight={140}
                locale={locale}
                disabled={descAiBusy}
              />
            </div>
          </div>
        ) : null}
      </AdminRichFormDrawer>
    </>
  );

  if (isDetailView) {
    const v = detailVacancy;
    const token = v?.activeToken || null;
    const link = token ? `${appUrl}/v/${token}` : '';
    const publicPagePath =
      v?.id && v?.slug
        ? publicVacancyPath({ vacancySlug: v.slug, vacancyId: v.id })
        : '';
    const publicPageLink = publicPagePath ? `${appUrl}${publicPagePath}` : '';
    const exp = v?.activeTokenExpiresAt ? new Date(v.activeTokenExpiresAt) : null;
    const linkRowStyle = {
      marginTop: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: 0,
    };
    const linkLabelStyle = {
      fontSize: '11px',
      color: C.faint,
      fontFamily: 'monospace',
      letterSpacing: '0.02em',
    };
    const linkAnchorStyle = {
      fontSize: '12px',
      color: C.purple,
      fontFamily: 'monospace',
      wordBreak: 'break-all',
      textDecoration: 'underline',
      textUnderlineOffset: '2px',
    };

    return (
      <>
        {vacancyFormDrawers}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ ...S.card, padding: '22px 28px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <button
              type="button"
              onClick={backToVacanciesList}
              style={{
                background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: '10px', padding: '8px 12px', color: C.muted, fontSize: '12px',
                cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              {t(locale, 'recruiting.backToVacancies')}
            </button>
            <span style={S.label}>{t(locale, 'recruiting.vacancyDetailTitle')}</span>
          </div>
          {error ? (
            <p style={{ marginTop: '10px', marginBottom: 0, color: C.tension, fontSize: '12px', fontFamily: 'monospace' }}>
              {error}
            </p>
          ) : null}
          {msg ? (
            <p style={{ marginTop: '10px', marginBottom: 0, color: C.synergy, fontSize: '12px', fontFamily: 'monospace' }}>
              {msg}
            </p>
          ) : null}
          {(detailLoading || loading) && !v ? (
            <p style={{ marginTop: '14px', color: C.muted, fontSize: '13px', fontFamily: 'monospace' }}>
              {t(locale, 'recruiting.loadingVacancy')}
            </p>
          ) : null}
          {!detailLoading && !v && error ? (
            <button
              type="button"
              onClick={backToVacanciesList}
              style={{
                marginTop: '14px', background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                borderRadius: '10px', padding: '8px 14px', color: C.purple, fontSize: '12px',
                cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              {t(locale, 'recruiting.backToList')}
            </button>
          ) : null}
        </div>

        {v ? (
          <>
            <div style={{ ...S.card }}>
              <span style={{ ...S.label, marginBottom: '14px', display: 'block' }}>{t(locale, 'recruiting.vacancyInfoTitle')}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '18px', color: C.text }}>{v.title}</span>
                    <span
                      style={{
                        fontFamily: 'monospace', fontSize: '11px',
                        color: v.status === 'open' ? C.synergy : C.faint,
                        border: `1px solid ${v.status === 'open' ? `${C.synergy}55` : C.border}`,
                        borderRadius: '999px', padding: '2px 8px',
                      }}
                    >
                      {v.status === 'open' ? t(locale, 'recruiting.openStatus') : t(locale, 'recruiting.closedStatus')}
                    </span>
                    {isAdmin && (
                      <span style={{ fontFamily: 'monospace', color: C.faint, fontSize: '12px' }}>
                        · {v.companyName}
                      </span>
                    )}
                  </div>
                  {token ? (
                    <div style={linkRowStyle}>
                      <span style={linkLabelStyle}>{t(locale, 'recruiting.enneagramLinkLabel')}</span>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={linkAnchorStyle}
                      >
                        {link}
                      </a>
                      {exp ? (
                        <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
                          {t(locale, 'recruiting.expiresAt', {
                            when: exp.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR'),
                          })}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: C.faint, fontFamily: 'monospace' }}>
                      {t(locale, 'recruiting.noActiveLink')}
                    </div>
                  )}
                  {publicPageLink ? (
                    <div style={linkRowStyle}>
                      <span style={linkLabelStyle}>{t(locale, 'recruiting.publicPageLinkLabel')}</span>
                      <a
                        href={publicPageLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={linkAnchorStyle}
                      >
                        {publicPageLink}
                      </a>
                      {!v.publicPageEnabled ? (
                        <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
                          {t(locale, 'recruiting.publicPageLinkDisabledHint')}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {v.positionsCount != null && v.positionsCount > 0 && (
                      <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                        {t(locale, 'recruiting.positionsCount', { n: v.positionsCount })}
                      </span>
                    )}
                    {v.targetDate && formatPublicVacancyDate(v.targetDate, locale) ? (
                      <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                        {t(locale, 'recruiting.targetDate', {
                          date: formatPublicVacancyDate(v.targetDate, locale),
                        })}
                      </span>
                    ) : null}
                    {formatVacancySalaryRange(locale, v.salaryMin, v.salaryMax) ? (
                      <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                        {formatVacancySalaryRange(locale, v.salaryMin, v.salaryMax)}
                      </span>
                    ) : null}
                    {employmentTypeLabelKey(v.employmentType) ? (
                      <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                        {t(locale, employmentTypeLabelKey(v.employmentType))}
                      </span>
                    ) : null}
                    {formatWorkplaceLabel(
                      {
                        workplaceModality: v.workplaceModality,
                        workplaceCity: v.workplaceCity,
                        workplaceState: v.workplaceState,
                      },
                      locale,
                      t
                    ) ? (
                      <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                        {formatWorkplaceLabel(
                          {
                            workplaceModality: v.workplaceModality,
                            workplaceCity: v.workplaceCity,
                            workplaceState: v.workplaceState,
                          },
                          locale,
                          t
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => token && copy(link)}
                  disabled={loading || !token}
                  style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                    borderRadius: '10px', padding: '8px 10px', color: C.purple, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !token) ? 0.6 : 1 }}
                >
                  {t(locale, 'recruiting.copyLink')}
                </button>
                <button
                  type="button"
                  onClick={() => publicPageLink && copy(publicPageLink)}
                  disabled={loading || !publicPageLink}
                  style={{ background: 'transparent', border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !publicPageLink) ? 0.6 : 1 }}
                >
                  {t(locale, 'recruiting.copyPublicPageLink')}
                </button>
                <button
                  type="button"
                  onClick={() => editVacancy(v)}
                  disabled={loading}
                  style={{ background: 'transparent', border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                >
                  {t(locale, 'recruiting.editVacancy')}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailSection('config')}
                  style={{ background: 'transparent', border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'monospace' }}
                >
                  {t(locale, 'recruiting.moreActions')}
                </button>
              </div>

              <div style={{ marginTop: '18px' }}>
                <PanelSubNav
                  ariaLabel={t(locale, 'recruiting.detailTabsAria')}
                  active={detailSection}
                  onChange={setDetailSection}
                  tabs={[
                    { id: 'pipeline', label: t(locale, 'recruiting.detailTabPipeline') },
                    { id: 'candidates', label: t(locale, 'recruiting.detailTabCandidates') },
                    { id: 'fit', label: t(locale, 'recruiting.detailTabFit') },
                    { id: 'analytics', label: t(locale, 'recruiting.detailTabAnalytics') },
                    { id: 'referral', label: t(locale, 'recruiting.detailTabReferral') },
                    { id: 'report', label: t(locale, 'recruiting.detailTabReport') },
                    { id: 'config', label: t(locale, 'recruiting.detailTabConfig') },
                  ]}
                />
              </div>

              {detailSection === 'pipeline' ? (
                <VacancyKanbanBlock vacancyId={v.id} locale={locale} refreshKey={pipelineRefresh} />
              ) : null}

              {detailSection === 'analytics' ? (
                <VacancyFunnelAnalyticsBlock
                  vacancyId={v.id}
                  locale={locale}
                  publicPagePath={
                    v.publicPageEnabled && v.slug
                      ? publicVacancyPath({ vacancySlug: v.slug, vacancyId: v.id })
                      : ''
                  }
                />
              ) : null}

              {detailSection === 'referral' ? (
                <VacancyReferralBlock
                  vacancyId={v.id}
                  locale={locale}
                  appUrl={appUrl}
                  publicPagePath={
                    v.publicPageEnabled && v.slug
                      ? publicVacancyPath({ vacancySlug: v.slug, vacancyId: v.id })
                      : ''
                  }
                />
              ) : null}

              {detailSection === 'candidates' ? (
                <div>
                  <VacancyInterviewCandidates
                    vacancyId={v.id}
                    locale={locale}
                    onPipelineChange={() => {
                      setInvitesRefresh((x) => x + 1);
                      setPipelineRefresh((x) => x + 1);
                    }}
                  />
                  <VacancyInviteByEmail
                    vacancyId={v.id}
                    locale={locale}
                    onSent={() => {
                      setInvitesRefresh((x) => x + 1);
                      setPipelineRefresh((x) => x + 1);
                    }}
                  />
                  <VacancyInvitesBlock vacancyId={v.id} locale={locale} refreshKey={invitesRefresh} />
                </div>
              ) : null}

              {detailSection === 'fit' ? (
                <div>
                  <VacancyRubricEditor
                    vacancyId={v.id}
                    locale={locale}
                    vacancyTitle={v.title || ''}
                    vacancyDescription={v.description || ''}
                    onSaved={() => setPipelineRefresh((x) => x + 1)}
                  />
                  <div style={{ marginTop: '16px' }}>
                    <VacancyFitRankingBlock vacancyId={v.id} locale={locale} refreshKey={pipelineRefresh} />
                  </div>
                </div>
              ) : null}

              {detailSection === 'report' ? (
                <VacancyClientReportBlock
                  vacancyId={v.id}
                  locale={locale}
                  appUrl={appUrl}
                  clientReportShowSalary={Boolean(v.clientReportShowSalary)}
                  onClientReportShowSalaryChange={(next) => {
                    setVacancies((list) =>
                      list.map((row) =>
                        Number(row.id) === Number(v.id)
                          ? { ...row, clientReportShowSalary: next }
                          : row
                      )
                    );
                  }}
                />
              ) : null}

              {detailSection === 'config' ? (
                <div>
                  {v.description ? <VacancyDescriptionHtml html={v.description} /> : null}
                  <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => navigateDashboard({ tab: 'team', vacancy: String(v.id), vacancyDetail: '' })}
                      style={{ background: `${C.purple}12`, border: `1px solid ${C.purple}44`,
                        borderRadius: '10px', padding: '8px 10px', color: C.purpleLight, fontSize: '12px',
                        cursor: 'pointer', fontFamily: 'monospace' }}
                    >
                      {t(locale, 'recruiting.viewCandidates')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVacancyStatus(v.id, v.status === 'open' ? 'closed' : 'open')}
                      disabled={loading}
                      style={{ background: 'transparent', border: `1px solid ${C.border}`,
                        borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                        cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                    >
                      {v.status === 'open' ? t(locale, 'recruiting.closeVacancy') : t(locale, 'recruiting.reopenVacancy')}
                    </button>
                    <button
                      type="button"
                      onClick={() => rotateLink(v.id)}
                      disabled={loading}
                      style={{ background: 'transparent', border: `1px solid ${C.border}`,
                        borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                        cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                    >
                      {t(locale, 'recruiting.rotateLink')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!token) return;
                        setLinkExpiryEdit((cur) =>
                          cur?.vacancyId === v.id
                            ? null
                            : {
                                vacancyId: v.id,
                                value: v.activeTokenExpiresAt
                                  ? toDatetimeLocalValue(new Date(v.activeTokenExpiresAt))
                                  : toDatetimeLocalValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                              }
                        );
                      }}
                      disabled={loading || !token}
                      style={{ background: 'transparent', border: `1px solid ${C.border}`,
                        borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                        cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !token) ? 0.6 : 1 }}
                    >
                      {t(locale, 'recruiting.editLinkExpiry')}
                    </button>
                    <button
                      type="button"
                      onClick={() => archiveVacancy(v.id, v.title)}
                      disabled={loading}
                      style={{ background: 'rgba(232,71,71,.08)', border: '1px solid rgba(232,71,71,.35)',
                        borderRadius: '10px', padding: '8px 10px', color: C.tension, fontSize: '12px',
                        cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                    >
                      {t(locale, 'recruiting.archiveVacancy')}
                    </button>
                  </div>
                  {linkExpiryEdit?.vacancyId === v.id && (
                    <div style={{
                      marginTop: '12px', padding: '12px', borderRadius: '10px',
                      border: `1px solid ${C.border}`, background: 'rgba(26,22,37,.04)',
                      display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
                        {t(locale, 'panel.admin.expiringOn')}
                      </span>
                      <input
                        type="datetime-local"
                        value={linkExpiryEdit.value}
                        onChange={(e) =>
                          setLinkExpiryEdit((cur) =>
                            cur && cur.vacancyId === v.id ? { ...cur, value: e.target.value } : cur
                          )
                        }
                        disabled={loading}
                        aria-label={t(locale, 'panel.admin.ariaLinkExpiry')}
                        style={{ flex: '1 1 200px', minWidth: '180px', background: 'rgba(26,22,37,.04)',
                          border: `1px solid ${C.border}`, borderRadius: '10px', padding: '8px 10px',
                          color: C.text, fontSize: '13px', fontFamily: 'monospace' }}
                      />
                      <button type="button" onClick={saveLinkExpiry} disabled={loading}
                        style={{ background: `${C.synergy}18`, border: `1px solid ${C.synergy}55`,
                          borderRadius: '10px', padding: '8px 12px', color: C.synergy, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}>
                        {t(locale, 'panel.admin.save')}
                      </button>
                      <button type="button" onClick={() => setLinkExpiryEdit(null)} disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 12px', color: C.muted, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}>
                        {t(locale, 'panel.admin.cancel')}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      </>
    );
  }

  return (
    <>
      {vacancyFormDrawers}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...S.card, padding: '22px 28px' }}>
        <span style={S.label}>{t(locale, 'recruiting.vacanciesTitle')}</span>
        <p style={{ fontSize: '13px', color: C.muted, marginTop: '10px', lineHeight: 1.65, marginBottom: 0 }}>
          {t(locale, 'recruiting.vacanciesIntro')}
        </p>
        {error ? (
          <p style={{ marginTop: '10px', marginBottom: 0, color: C.tension, fontSize: '12px', fontFamily: 'monospace' }}>
            {error}
          </p>
        ) : null}
        {msg ? (
          <p style={{ marginTop: '10px', marginBottom: 0, color: C.synergy, fontSize: '12px', fontFamily: 'monospace' }}>
            {msg}
          </p>
        ) : null}
      </div>

      <div style={{ ...S.card }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <span style={S.label}>{t(locale, 'recruiting.registeredVacancies')}</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={loadVacancies}
              disabled={loading}
              style={{ background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: '10px', padding: '10px 14px', color: C.muted, fontSize: '12px',
                cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {loading ? <span className="spinner" /> : null}
              {t(locale, 'recruiting.refresh')}
            </button>
            <button
              type="button"
              onClick={() => { setEditingVacancy(null); setShowCreate(true); }}
              aria-expanded={showCreate}
              style={{ background: `${C.purple}18`,
                border: `1px solid ${C.purple}55`,
                borderRadius: '10px', padding: '10px 14px',
                color: C.purple, fontSize: '12px',
                cursor: 'pointer', fontFamily: 'monospace' }}
            >
              {t(locale, 'recruiting.createVacancyOpen')}
            </button>
          </div>
        </div>

        {vacFilterFromUrl !== 'all' ? (
          <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'rgba(26,22,37,.03)' }}>
            <p style={{ margin: 0, fontSize: '12px', color: C.muted, lineHeight: 1.55 }}>
              {t(locale, 'recruiting.filterLimited')}{' '}
              <button
                type="button"
                onClick={() => navigateDashboard({ vacancy: 'all', vacanciesPage: 1, tab: 'vacancies' })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: C.purpleLight,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  textDecoration: 'underline',
                }}
              >
                {t(locale, 'recruiting.showAllVacancies')}
              </button>
            </p>
          </div>
        ) : null}
        {vacTotal === 0 ? (
          <p style={{ color: C.muted, fontStyle: 'italic', marginTop: '10px' }}>
            {vacFilterFromUrl !== 'all' ? t(locale, 'recruiting.noVacancyFilter') : t(locale, 'recruiting.noVacanciesYet')}
          </p>
        ) : (
          <>
            <div
              role="group"
              aria-label={t(locale, 'recruiting.sortVacanciesAria')}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '10px',
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(26,22,37,.03)',
                borderRadius: '12px',
                border: `1px solid ${C.border}`,
              }}
            >
              <span style={{ fontSize: '11px', color: C.faint, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {t(locale, 'recruiting.sortBy')}
              </span>
              {[
                { k: 'id', label: 'ID' },
                { k: 'title', label: t(locale, 'recruiting.sortTitle') },
                { k: 'status', label: t(locale, 'recruiting.sortStatus') },
                ...(isAdmin ? [{ k: 'companyName', label: t(locale, 'recruiting.sortCompany') }] : []),
                { k: 'createdAt', label: t(locale, 'recruiting.sortCreated') },
              ].map(({ k, label }) => {
                const active = vacSortSt.sort === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => pushVacanciesSort(k)}
                    aria-pressed={active}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      border: `1px solid ${active ? `${C.purple}55` : C.border}`,
                      background: active ? `${C.purple}18` : 'transparent',
                      color: active ? C.purple : C.muted,
                    }}
                  >
                    {label}
                    {active ? (vacSortSt.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                );
              })}
            </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {vacancies.map((v) => {
              const token = v.activeToken || '';
              const link = token ? `${appUrl}/v/${token}` : '';
              const exp = v.activeTokenExpiresAt ? new Date(v.activeTokenExpiresAt) : null;
              return (
                <div key={v.id} style={{ background: 'rgba(26,22,37,.03)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px' }}>
                  {/* Header da vaga */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: C.text, fontSize: '14px' }}>
                        <span style={{ fontFamily: 'monospace', color: C.faint, marginRight: '8px', fontSize: '12px' }}>#{v.id}</span>
                        <strong style={{ fontWeight: 'normal' }}>{v.title}</strong>
                        <span
                          style={{
                            marginLeft: '10px',
                            padding: '2px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            background: v.status === 'open' ? 'rgba(21,128,61,.12)' : 'rgba(26,22,37,.08)',
                            color: v.status === 'open' ? C.synergy : C.muted,
                            border: `1px solid ${v.status === 'open' ? 'rgba(21,128,61,.3)' : C.border}`,
                          }}
                        >
                          {v.status === 'open' ? t(locale, 'recruiting.openStatus') : t(locale, 'recruiting.closedStatus')}
                        </span>
                        {isAdmin && (
                          <span style={{ fontFamily: 'monospace', color: C.faint, marginLeft: '10px', fontSize: '12px' }}>
                            · {v.companyName}
                          </span>
                        )}
                      </div>
                      {token ? (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: C.muted, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {link}
                        </div>
                      ) : (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: C.faint, fontFamily: 'monospace' }}>
                          {t(locale, 'recruiting.noActiveLink')}
                        </div>
                      )}
                      {token && exp ? (
                        <div style={{ marginTop: '4px', fontSize: '11px', color: C.faint, fontFamily: 'monospace' }}>
                          {t(locale, 'recruiting.expiresAt', { when: exp.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR') })}
                        </div>
                      ) : null}
                      <div style={{ marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {v.positionsCount != null && v.positionsCount > 0 && (
                          <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                            {t(locale, 'recruiting.positionsCount', { n: v.positionsCount })}
                          </span>
                        )}
                        {v.targetDate && formatPublicVacancyDate(v.targetDate, locale) ? (
                          <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                            {t(locale, 'recruiting.targetDate', {
                              date: formatPublicVacancyDate(v.targetDate, locale),
                            })}
                          </span>
                        ) : null}
                        {formatVacancySalaryRange(locale, v.salaryMin, v.salaryMax) ? (
                          <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                            {formatVacancySalaryRange(locale, v.salaryMin, v.salaryMax)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => navigateDashboard({ tab: 'team', vacancy: String(v.id) })}
                        style={{ background: `${C.purple}12`, border: `1px solid ${C.purple}44`,
                          borderRadius: '10px', padding: '8px 10px', color: C.purpleLight, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace' }}
                      >
                        {t(locale, 'recruiting.viewCandidates')}
                      </button>
                      <button
                        type="button"
                        onClick={() => editVacancy(v)}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        {t(locale, 'recruiting.editVacancy')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVacancyStatus(v.id, v.status === 'open' ? 'closed' : 'open')}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        {v.status === 'open' ? t(locale, 'recruiting.closeVacancy') : t(locale, 'recruiting.reopenVacancy')}
                      </button>
                      <button
                        type="button"
                        onClick={() => rotateLink(v.id)}
                        disabled={loading}
                        style={{ background: 'transparent', border: `1px solid ${C.border}`,
                          borderRadius: '10px', padding: '8px 10px', color: C.muted, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        {t(locale, 'recruiting.rotateLink')}
                      </button>
                      <button
                        type="button"
                        onClick={() => token && copy(link)}
                        disabled={loading || !token}
                        style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                          borderRadius: '10px', padding: '8px 10px', color: C.purple, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: (loading || !token) ? 0.6 : 1 }}
                      >
                        {t(locale, 'recruiting.copyLink')}
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveVacancy(v.id, v.title)}
                        disabled={loading}
                        style={{ background: 'rgba(232,71,71,.08)', border: '1px solid rgba(232,71,71,.35)',
                          borderRadius: '10px', padding: '8px 10px', color: C.tension, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace', opacity: loading ? 0.6 : 1 }}
                      >
                        {t(locale, 'recruiting.archiveVacancy')}
                      </button>
                      <button
                        type="button"
                        onClick={() => openVacancyDetail(v.id)}
                        style={{ background: `${C.synergy}14`, border: `1px solid ${C.synergy}44`,
                          borderRadius: '10px', padding: '8px 10px', color: C.synergy, fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'monospace' }}
                        title={t(locale, 'recruiting.openDetailsTitle')}
                      >
                        {t(locale, 'recruiting.details')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            <div style={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between',
              marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>
                {t(locale, 'recruiting.vacanciesPage', { total: vacTotal, page: vacPage, pages: vacTotalPages })}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <select
                  value={String(vacPageSize)}
                  onChange={(e) => {
                    const ps = parseInt(e.target.value, 10);
                    navigateDashboard({ vacanciesPage: 1, vacanciesPageSize: ps, tab: 'vacancies' });
                  }}
                  disabled={loading}
                  style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                    borderRadius: '10px', padding: '6px 10px', color: C.muted, fontSize: '11px',
                    cursor: 'pointer', fontFamily: 'monospace' }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={String(n)}>{t(locale, 'panel.compat.perPageShort', { n })}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={loading || vacPage <= 1}
                  onClick={() => navigateDashboard({ vacanciesPage: Math.max(1, vacPage - 1), tab: 'vacancies' })}
                  style={{ background: vacPage <= 1 ? 'transparent' : `${C.purple}18`,
                    border: `1px solid ${vacPage <= 1 ? C.border : `${C.purple}55`}`,
                    borderRadius: '10px', padding: '6px 12px', color: vacPage <= 1 ? C.faint : C.purple,
                    fontSize: '11px', cursor: vacPage <= 1 ? 'default' : 'pointer', fontFamily: 'monospace' }}
                >
                  {t(locale, 'panel.admin.prev')}
                </button>
                <button
                  type="button"
                  disabled={loading || vacPage >= vacTotalPages}
                  onClick={() => navigateDashboard({ vacanciesPage: Math.min(vacTotalPages, vacPage + 1), tab: 'vacancies' })}
                  style={{ background: vacPage >= vacTotalPages ? 'transparent' : `${C.purple}18`,
                    border: `1px solid ${vacPage >= vacTotalPages ? C.border : `${C.purple}55`}`,
                    borderRadius: '10px', padding: '6px 12px',
                    color: vacPage >= vacTotalPages ? C.faint : C.purple,
                    fontSize: '11px', cursor: vacPage >= vacTotalPages ? 'default' : 'pointer', fontFamily: 'monospace' }}
                >
                  {t(locale, 'panel.admin.next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}

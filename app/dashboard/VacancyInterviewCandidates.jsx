'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '../../lib/cn';
import { t } from '../../lib/i18n';
import { RichTextEditor } from '../_components/RichTextEditor';
import { BrStateSelect } from '../_components/BrStateSelect';
import { BrCitySelect } from '../_components/BrCitySelect';
import { formatPhoneBr, formatSalaryBr, stripPhone, salaryToCentsDigits, stripSalary, digitsOnly } from '../../lib/br-masks';
import { titleCasePersonName } from '../../lib/person-name';
import { S } from './dashboard-shared';
import { useAppFeedback } from '../_components/AppFeedback';
import { AppLoading, Spinner } from '../_components/AppLoading';
import { HrActionBrief } from '../_components/HrActionBrief';
import { InterviewScorecardBlock } from './vacancies/InterviewScorecardBlock';
import { VacancyOfferBlock } from './vacancies/VacancyOfferBlock';
import { HireReadinessBlock } from './vacancies/HireReadinessBlock';
import { VacancyFitDecisionStrip } from './vacancies/VacancyFitDecisionStrip';
import { CandidateCvBlock } from '../_components/CandidateCvBlock';
import { VacancyInterviewSlotsBlock } from '../_components/VacancyInterviewSlotsBlock';

const FIELD = cn(S.input, 'min-w-0 flex-[1_1_180px] bg-surface/80');
const FIELD_SELECT = cn(S.select, 'min-w-0 flex-[1_1_180px] bg-surface/80');

function inviteStatusLabel(locale, status) {
  const s = String(status || '');
  if (s === 'opened') return t(locale, 'recruiting.inviteOpened');
  if (s === 'completed') return t(locale, 'recruiting.inviteCompleted');
  if (s === 'cancelled') return t(locale, 'recruiting.inviteCancelled');
  if (s === 'sent') return t(locale, 'recruiting.inviteSent');
  return t(locale, 'recruiting.noInviteYet');
}

function motivatorsStatusLabel(locale, status) {
  const s = String(status || '');
  if (s === 'opened') return t(locale, 'recruiting.motivatorsInviteOpened');
  if (s === 'completed') return t(locale, 'recruiting.motivatorsInviteCompleted');
  if (s === 'cancelled') return t(locale, 'recruiting.motivatorsInviteCancelled');
  if (s === 'sent') return t(locale, 'recruiting.motivatorsInviteSent');
  return t(locale, 'recruiting.motivatorsNoInviteYet');
}

function availabilityLabel(locale, code) {
  const map = {
    immediate: 'recruiting.availabilityImmediate',
    '15_days': 'recruiting.availability15',
    '30_days': 'recruiting.availability30',
    '60_days': 'recruiting.availability60',
    other: 'recruiting.availabilityOther',
  };
  return code ? t(locale, map[code] || 'recruiting.availabilityOther') : null;
}

function sourceLabel(locale, code) {
  const map = {
    linkedin: 'recruiting.sourceLinkedin',
    referral: 'recruiting.sourceReferral',
    agency: 'recruiting.sourceAgency',
    job_board: 'recruiting.sourceJobBoard',
    other: 'recruiting.sourceOther',
  };
  return code ? t(locale, map[code] || 'recruiting.sourceOther') : null;
}

function CandidateCard({ row, vacancyId, locale, onChanged, onPipelineChange }) {
  const { notice, toast } = useAppFeedback();
  const [notes, setNotes] = useState(row.interviewNotes || '');
  const [phone, setPhone] = useState(stripPhone(row.phone) || '');
  const [linkedinUrl, setLinkedinUrl] = useState(row.linkedinUrl || '');
  const [city, setCity] = useState(row.city || '');
  const [stateUf, setStateUf] = useState(row.state || '');
  const [salaryExpectation, setSalaryExpectation] = useState(salaryToCentsDigits(row.salaryExpectation));
  const [availability, setAvailability] = useState(row.availability || '');
  const [source, setSource] = useState(row.source || '');
  const [busy, setBusy] = useState(false);
  const [notesAiBusy, setNotesAiBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [motivatorsBusy, setMotivatorsBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [decisionBrief, setDecisionBrief] = useState(null);
  const [fitScores, setFitScores] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const showError = async (message) => {
    await notice({
      title: t(locale, 'panel.common.errorTitle'),
      message: String(message || t(locale, 'panel.common.error')),
      tone: 'error',
    });
  };

  useEffect(() => {
    setNotes(row.interviewNotes || '');
    setPhone(stripPhone(row.phone) || '');
    setLinkedinUrl(row.linkedinUrl || '');
    setCity(row.city || '');
    setStateUf(row.state || '');
    setSalaryExpectation(salaryToCentsDigits(row.salaryExpectation));
    setAvailability(row.availability || '');
    setSource(row.source || '');
  }, [row]);

  useEffect(() => {
    if (!expanded || !row.candidateId) return undefined;
    let cancelled = false;
    (async () => {
      setBriefLoading(true);
      try {
        const res = await fetch(
          `/api/admin/candidates/${encodeURIComponent(row.candidateId)}?locale=${encodeURIComponent(locale === 'en' ? 'en' : 'pt-BR')}`
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setDecisionBrief(null);
          setFitScores(null);
          return;
        }
        setDecisionBrief(data?.people?.decisionBrief || null);
        const assessments = Array.isArray(data?.assessments) ? data.assessments : [];
        const forVac = assessments.find(
          (a) => a.scores && String(a.vacancyId) === String(vacancyId)
        );
        setFitScores(forVac?.scores || assessments.find((a) => a.scores)?.scores || null);
      } catch {
        if (!cancelled) {
          setDecisionBrief(null);
          setFitScores(null);
        }
      } finally {
        if (!cancelled) setBriefLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expanded, row.candidateId, locale, vacancyId]);

  const saveNotes = async () => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(row.candidateId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewNotes: notes }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      toast(t(locale, 'recruiting.notesSaved'), 'ok');
      onChanged?.();
    } catch (e) {
      void showError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setBusy(false);
    }
  };

  const summarizeNotesWithAi = async () => {
    setNotesAiBusy(true);
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/assist-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarizeNotes',
          notesHtml: notes,
          candidateName: row.fullName || row.name || '',
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.errorCode ? t(locale, `errors.${data.errorCode}`) : data?.error || t(locale, 'panel.common.error')
        );
      }
      if (data.summaryHtml) setNotes(String(data.summaryHtml));
      toast(t(locale, 'recruiting.notesSummarizedAi'), 'ok');
    } catch (e) {
      void showError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setNotesAiBusy(false);
    }
  };

  const saveProfile = async () => {
    setProfileBusy(true);
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(row.candidateId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          linkedinUrl,
          city,
          state: stateUf,
          salaryExpectation: stripSalary(salaryExpectation),
          availability: availability || null,
          source: source || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      toast(t(locale, 'recruiting.profileSaved'), 'ok');
      onChanged?.();
    } catch (e) {
      void showError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setProfileBusy(false);
    }
  };

  const sendChallenge = async () => {
    setInviteBusy(true);
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(row.candidateId)}/invite`,
        { method: 'POST' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      toast(t(locale, 'recruiting.challengeSentTo', { email: data.sentTo || row.email }), 'ok');
      onChanged?.();
      onPipelineChange?.();
    } catch (e) {
      void showError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setInviteBusy(false);
    }
  };

  const sendMotivators = async () => {
    setMotivatorsBusy(true);
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(row.candidateId)}/motivators-invite`,
        { method: 'POST' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      toast(t(locale, 'recruiting.motivatorsSentTo', { email: data.sentTo || row.email }), 'ok');
      onChanged?.();
    } catch (e) {
      void showError(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setMotivatorsBusy(false);
    }
  };

  const alreadyCompleted = Boolean(row.assessmentId) || row.inviteStatus === 'completed';
  const motivatorsDone =
    Boolean(row.motivatorsAttemptId) || row.motivatorsInviteStatus === 'completed';
  const motivatorsStatus =
    motivatorsDone && row.motivatorsInviteStatus !== 'completed'
      ? 'completed'
      : row.motivatorsInviteStatus;
  const anyInviteBusy = inviteBusy || motivatorsBusy;
  const locBits = [row.city, row.state].filter(Boolean).join(' / ');

  return (
    <div
      className="rounded-xl border border-ink/12 bg-ink/[0.02] p-3.5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-sm text-ink">
            <strong className="font-semibold">{titleCasePersonName(row.fullName)}</strong>
          </div>
          <div className="mt-1 text-xs font-mono text-ink-muted">
            {row.email}
            {row.phone ? ` · ${formatPhoneBr(row.phone)}` : ''}
          </div>
          {(locBits || row.linkedinUrl) ? (
            <div className="mt-1 text-2xs font-mono text-ink-faint">
              {locBits || null}
              {locBits && row.linkedinUrl ? ' · ' : null}
              {row.linkedinUrl ? (
                <a href={row.linkedinUrl} target="_blank" rel="noreferrer" className="text-brand-500">
                  LinkedIn
                </a>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span
              className="rounded-lg border border-ink/12 px-2 py-0.5 font-mono text-2xs text-ink-muted"
              title={t(locale, 'recruiting.enneagramBadgeTitle')}
            >
              {t(locale, 'recruiting.enneagramBadgeShort')}: {inviteStatusLabel(locale, row.inviteStatus)}
            </span>
            <span
              className={cn(
                  'rounded-lg border px-2 py-0.5 font-mono text-2xs',
                  motivatorsDone ? 'border-success/35 text-success' : 'border-ink/12 text-ink-muted'
                )}
              title={t(locale, 'recruiting.motivatorsBadgeTitle')}
            >
              {t(locale, 'recruiting.motivatorsBadgeShort')}: {motivatorsStatusLabel(locale, motivatorsStatus)}
            </span>
            {row.topType != null && (
              <span className="text-2xs font-mono text-brand-500">
                {t(locale, 'recruiting.typeShort', { type: row.topType })}
              </span>
            )}
            {availabilityLabel(locale, row.availability) ? (
              <span className="text-2xs font-mono text-ink-faint">
                {availabilityLabel(locale, row.availability)}
              </span>
            ) : null}
            {sourceLabel(locale, row.source) ? (
              <span className="text-2xs font-mono text-ink-faint">
                {sourceLabel(locale, row.source)}
              </span>
            ) : null}
            {row.salaryExpectation ? (
              <span className="text-2xs font-mono text-ink-faint">
                {formatSalaryBr(row.salaryExpectation)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            className="min-h-touch cursor-pointer rounded-control border border-ink/12 bg-transparent px-2.5 py-2 font-mono text-xs text-ink-muted"
          >
            {expanded ? t(locale, 'recruiting.hideNotes') : t(locale, 'recruiting.notesActions')}
          </button>
          <button
            type="button"
            onClick={sendChallenge}
            disabled={anyInviteBusy || alreadyCompleted}
            title={
              alreadyCompleted
                ? t(locale, 'recruiting.testAlreadyDone')
                : t(locale, 'recruiting.sendEnneagramTitle')
            }
            className={cn(
                  'min-h-touch rounded-control border px-2.5 py-2 font-mono text-xs',
                  alreadyCompleted
                    ? 'cursor-default border-ink/12 bg-transparent text-ink-muted'
                    : 'border-success/35 bg-success/[0.09] text-success',
                  inviteBusy ? 'cursor-default opacity-60' : !alreadyCompleted && 'cursor-pointer'
                )}
          >
            {inviteBusy
              ? t(locale, 'recruiting.inviteSending')
              : alreadyCompleted
                ? t(locale, 'recruiting.testDone')
                : t(locale, 'recruiting.sendEnneagram')}
          </button>
          <button
            type="button"
            onClick={sendMotivators}
            disabled={anyInviteBusy || !row.email || motivatorsDone}
            title={
              motivatorsDone
                ? t(locale, 'recruiting.motivatorsAlreadyDone')
                : !row.email
                  ? t(locale, 'recruiting.motivatorsNeedEmail')
                  : t(locale, 'recruiting.sendMotivatorsTitle')
            }
            className={cn(
                  'min-h-touch rounded-control border px-2.5 py-2 font-mono text-xs',
                  motivatorsDone
                    ? 'cursor-default border-ink/12 bg-transparent text-ink-muted'
                    : 'border-brand-500/25 bg-brand-500/[0.08] text-brand-500',
                  motivatorsBusy ? 'cursor-default opacity-60' : !motivatorsDone && 'cursor-pointer'
                )}
          >
            {motivatorsBusy
              ? t(locale, 'recruiting.inviteSending')
              : motivatorsDone
                ? t(locale, 'recruiting.motivatorsDone')
                : t(locale, 'recruiting.sendMotivators')}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-ink/12 pt-3">
          {row.candidateId ? (
            <HireReadinessBlock
              vacancyId={vacancyId}
              candidateId={row.candidateId}
              locale={locale}
              row={row}
            />
          ) : null}

          {row.candidateId ? (
            <VacancyFitDecisionStrip
              vacancyId={vacancyId}
              locale={locale}
              scores={fitScores}
            />
          ) : null}

          {briefLoading ? (
            <div className="mb-3 flex items-center gap-2 text-prose text-ink-muted">
              <Spinner size={16} />
              <span>{t(locale, 'common.loading')}</span>
            </div>
          ) : (
            <HrActionBrief
              locale={locale}
              brief={decisionBrief}
              dense
              personName={row.fullName || row.name || ''}
            />
          )}

          {row.candidateId ? (
            <div className="mb-3">
              <CandidateCvBlock candidateId={row.candidateId} locale={locale} embedded onApplied={() => onChanged?.()} />
            </div>
          ) : null}

          {row.candidateId ? (
            <VacancyOfferBlock
              vacancyId={vacancyId}
              candidateId={row.candidateId}
              assessmentId={row.assessmentId}
              locale={locale}
              initialOffer={{
                offerSalary: row.offerSalary,
                offerStartDate: row.offerStartDate,
                offerStatus: row.offerStatus || 'none',
                offerNotes: row.offerNotes,
              }}
              onSaved={() => onChanged?.()}
            />
          ) : null}

          {row.candidateId ? (
            <InterviewScorecardBlock
              vacancyId={vacancyId}
              candidateId={row.candidateId}
              locale={locale}
            />
          ) : null}

          <div className="flex flex-wrap gap-2.5 mb-2.5">
            <input
              value={formatPhoneBr(phone)}
              onChange={(e) => setPhone(stripPhone(e.target.value) || '')}
              placeholder={t(locale, 'recruiting.phonePh')}
              inputMode="tel"
              className={FIELD}
            />
            <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder={t(locale, 'recruiting.linkedinPh')} className={FIELD} />
            <BrStateSelect
              value={stateUf}
              onChange={(uf) => {
                setStateUf(uf);
                setCity('');
              }}
              locale={locale}
              className={cn(FIELD_SELECT, 'flex-[0_1_160px]')}
            />
            <BrCitySelect
              uf={stateUf}
              value={city}
              onChange={setCity}
              locale={locale}
              className={cn(FIELD_SELECT, 'flex-[1_1_180px]')}
            />
            <input
              value={formatSalaryBr(salaryExpectation)}
              onChange={(e) => setSalaryExpectation(digitsOnly(e.target.value).slice(0, 15))}
              placeholder={t(locale, 'recruiting.salaryPh')}
              inputMode="numeric"
              className={FIELD}
            />
            <select value={availability} onChange={(e) => setAvailability(e.target.value)} className={FIELD_SELECT} aria-label={t(locale, 'recruiting.availabilityLabel')}>
              <option value="">{t(locale, 'recruiting.availabilityLabel')}</option>
              <option value="immediate">{t(locale, 'recruiting.availabilityImmediate')}</option>
              <option value="15_days">{t(locale, 'recruiting.availability15')}</option>
              <option value="30_days">{t(locale, 'recruiting.availability30')}</option>
              <option value="60_days">{t(locale, 'recruiting.availability60')}</option>
              <option value="other">{t(locale, 'recruiting.availabilityOther')}</option>
            </select>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={FIELD_SELECT} aria-label={t(locale, 'recruiting.sourceLabel')}>
              <option value="">{t(locale, 'recruiting.sourceLabel')}</option>
              <option value="linkedin">{t(locale, 'recruiting.sourceLinkedin')}</option>
              <option value="referral">{t(locale, 'recruiting.sourceReferral')}</option>
              <option value="agency">{t(locale, 'recruiting.sourceAgency')}</option>
              <option value="job_board">{t(locale, 'recruiting.sourceJobBoard')}</option>
              <option value="other">{t(locale, 'recruiting.sourceOther')}</option>
            </select>
          </div>
          <button
            type="button"
            onClick={saveProfile}
            disabled={profileBusy}
            className={cn(
              'mb-3.5 min-h-touch cursor-pointer rounded-control border border-brand-500/25 bg-brand-500/[0.07] px-3.5 py-2 font-mono text-xs text-brand-500',
              profileBusy && 'opacity-60'
            )}
          >
            {profileBusy ? t(locale, 'recruiting.savingNotes') : t(locale, 'recruiting.saveProfile')}
          </button>

          <span
            className="block mb-2 text-2xs font-mono text-ink-muted uppercase tracking-[0.6px]"
          >
            {t(locale, 'recruiting.interviewNotesTitle')}
          </span>
          <RichTextEditor value={notes} onChange={setNotes} locale={locale} disabled={busy || notesAiBusy} />
          <div className="flex gap-2 mt-2.5">
            <button
              type="button"
              onClick={summarizeNotesWithAi}
              disabled={busy || notesAiBusy}
              aria-busy={notesAiBusy || undefined}
              className={cn(
                'min-h-touch rounded-control border border-brand-500/35 bg-transparent px-3.5 py-2 font-mono text-xs text-brand-500',
                busy || notesAiBusy ? 'cursor-default opacity-60' : 'cursor-pointer'
              )}
            >
              {notesAiBusy ? (
                <AppLoading locale={locale} variant="button" label={t(locale, 'recruiting.summarizeNotesAiWorking')} />
              ) : (
                t(locale, 'recruiting.summarizeNotesAi')
              )}
            </button>
            <button
              type="button"
              onClick={saveNotes}
              disabled={busy || notesAiBusy}
              aria-busy={busy || undefined}
              className={cn(
                'min-h-touch rounded-control border border-brand-500/35 bg-brand-500/[0.09] px-3.5 py-2 font-mono text-xs text-brand-500',
                busy || notesAiBusy ? 'cursor-default opacity-60' : 'cursor-pointer'
              )}
            >
              {busy ? (
                <AppLoading locale={locale} variant="button" label={t(locale, 'recruiting.savingNotes')} />
              ) : (
                t(locale, 'recruiting.saveNotes')
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function VacancyInterviewCandidates({ vacancyId, locale = 'pt-BR', onPipelineChange }) {
  const { notice, toast } = useAppFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [availability, setAvailability] = useState('');
  const [source, setSource] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [sendEnneagramInvite, setSendEnneagramInvite] = useState(false);
  const [sendMotivatorsInvite, setSendMotivatorsInvite] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [vacancyId, locale]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    setErr('');
    setCreateMsg('');
    try {
      const res = await fetch(`/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: titleCasePersonName(name),
          email: email.trim().toLowerCase(),
          phone,
          linkedinUrl,
          city,
          state: stateUf,
          salaryExpectation: stripSalary(salaryExpectation),
          availability: availability || null,
          source: source || null,
          interviewNotes: createNotes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));

      const requestedInvites = [
        sendEnneagramInvite ? 'invite' : null,
        sendMotivatorsInvite ? 'motivators-invite' : null,
      ].filter(Boolean);
      let invitesFailed = false;
      let enneagramSent = false;
      if (requestedInvites.length) {
        if (data.candidateId == null) {
          invitesFailed = true;
        } else {
          const inviteResults = await Promise.allSettled(
            requestedInvites.map(async (endpoint) => {
              const inviteRes = await fetch(
                `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(data.candidateId)}/${endpoint}`,
                { method: 'POST' }
              );
              const inviteData = await inviteRes.json().catch(() => ({}));
              if (!inviteRes.ok) {
                throw new Error(inviteData?.error || t(locale, 'panel.common.error'));
              }
              return inviteData;
            })
          );
          invitesFailed = inviteResults.some((result) => result.status === 'rejected');
          const enneagramIndex = requestedInvites.indexOf('invite');
          enneagramSent =
            enneagramIndex >= 0 && inviteResults[enneagramIndex]?.status === 'fulfilled';
          if (!invitesFailed) toast(t(locale, 'recruiting.createInvitesSent'), 'ok');
        }
      }

      setName('');
      setEmail('');
      setPhone('');
      setLinkedinUrl('');
      setCity('');
      setStateUf('');
      setSalaryExpectation('');
      setAvailability('');
      setSource('');
      setCreateNotes('');
      setSendEnneagramInvite(false);
      setSendMotivatorsInvite(false);
      setCreateMsg(t(locale, 'recruiting.candidateRegistered'));
      await load();
      if (invitesFailed) {
        await notice({
          title: t(locale, 'panel.common.errorTitle'),
          message: t(locale, 'recruiting.createInvitePartial'),
          tone: 'error',
        });
      }
      if (enneagramSent) onPipelineChange?.();
      setTimeout(() => setCreateMsg(''), 3000);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <span className={S.label}>{t(locale, 'recruiting.interviewCandidatesTitle')}</span>
      <p className="mt-2 mb-3 text-xs text-ink-muted leading-[1.55]">
        {t(locale, 'recruiting.interviewCandidatesIntro')}
      </p>

      <div
        className="mb-3.5 rounded-xl border border-brand-500/20 bg-brand-500/[0.03] p-3.5"
      >
        <span
          className="block mb-2.5 text-2xs font-mono text-brand-500 uppercase tracking-[0.6px]"
        >
          {t(locale, 'recruiting.newCandidate')}
        </span>
        <div className="flex flex-wrap gap-2.5 mb-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setName(titleCasePersonName(name))}
            placeholder={t(locale, 'recruiting.fullNamePh')}
            className={FIELD}
          />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t(locale, 'recruiting.inviteCandidateEmailPh')} className={FIELD} />
          <input
            value={formatPhoneBr(phone)}
            onChange={(e) => setPhone(stripPhone(e.target.value) || '')}
            placeholder={t(locale, 'recruiting.phonePh')}
            inputMode="tel"
            className={FIELD}
          />
          <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder={t(locale, 'recruiting.linkedinPh')} className={FIELD} />
          <BrStateSelect
            value={stateUf}
            onChange={(uf) => {
              setStateUf(uf);
              setCity('');
            }}
            locale={locale}
            className={cn(FIELD_SELECT, 'flex-[0_1_160px]')}
          />
          <BrCitySelect
            uf={stateUf}
            value={city}
            onChange={setCity}
            locale={locale}
            className={cn(FIELD_SELECT, 'flex-[1_1_180px]')}
          />
          <input
            value={formatSalaryBr(salaryExpectation)}
            onChange={(e) => setSalaryExpectation(digitsOnly(e.target.value).slice(0, 15))}
            placeholder={t(locale, 'recruiting.salaryPh')}
            inputMode="numeric"
            className={FIELD}
          />
          <select value={availability} onChange={(e) => setAvailability(e.target.value)} className={FIELD_SELECT}>
            <option value="">{t(locale, 'recruiting.availabilityLabel')}</option>
            <option value="immediate">{t(locale, 'recruiting.availabilityImmediate')}</option>
            <option value="15_days">{t(locale, 'recruiting.availability15')}</option>
            <option value="30_days">{t(locale, 'recruiting.availability30')}</option>
            <option value="60_days">{t(locale, 'recruiting.availability60')}</option>
            <option value="other">{t(locale, 'recruiting.availabilityOther')}</option>
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={FIELD_SELECT}>
            <option value="">{t(locale, 'recruiting.sourceLabel')}</option>
            <option value="linkedin">{t(locale, 'recruiting.sourceLinkedin')}</option>
            <option value="referral">{t(locale, 'recruiting.sourceReferral')}</option>
            <option value="agency">{t(locale, 'recruiting.sourceAgency')}</option>
            <option value="job_board">{t(locale, 'recruiting.sourceJobBoard')}</option>
            <option value="other">{t(locale, 'recruiting.sourceOther')}</option>
          </select>
        </div>
        <RichTextEditor
          value={createNotes}
          onChange={setCreateNotes}
          placeholder={t(locale, 'recruiting.interviewNotesInitialPh')}
          minHeight={100}
          locale={locale}
        />
        <div className="flex flex-wrap gap-[12px 18px] mt-2.5">
          <label htmlFor="create-send-enneagram" className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
            <input
              id="create-send-enneagram"
              name="sendEnneagramInvite"
              type="checkbox"
              checked={sendEnneagramInvite}
              onChange={(e) => setSendEnneagramInvite(e.target.checked)}
              className="accent-brand-500"
            />
            {t(locale, 'recruiting.createSendEnneagram')}
          </label>
          <label htmlFor="create-send-motivators" className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
            <input
              id="create-send-motivators"
              name="sendMotivatorsInvite"
              type="checkbox"
              checked={sendMotivatorsInvite}
              onChange={(e) => setSendMotivatorsInvite(e.target.checked)}
              className="accent-brand-500"
            />
            {t(locale, 'recruiting.createSendMotivators')}
          </label>
          <span className="text-2xs font-mono text-ink-faint">
            {t(locale, 'recruiting.createInvitesHint')}
          </span>
        </div>
        <div className="mt-2.5">
          <button
            type="button"
            onClick={create}
            disabled={creating || !name.trim() || !email.trim()}
            className={cn(
              'min-h-touch cursor-pointer rounded-control border border-brand-500/35 bg-brand-500/[0.09] px-4 py-[9px] font-mono text-prose text-brand-500',
              (creating || !name.trim() || !email.trim()) && 'opacity-55'
            )}
          >
            {creating
              ? t(locale, 'recruiting.registeringCandidate')
              : t(locale, 'recruiting.registerCandidate')}
          </button>
        </div>
        {createMsg ? (
          <p className="mb-0 mt-2 font-mono text-2xs text-success">
            {createMsg}
          </p>
        ) : null}
      </div>

      {err ? (
        <p className="mb-2.5 text-xs font-mono text-danger">{err}</p>
      ) : null}

      <div className="mb-4">
        <VacancyInterviewSlotsBlock vacancyId={vacancyId} candidates={items} locale={locale} />
      </div>

      {loading ? (
        <p className="font-mono text-xs text-ink-muted">
          {t(locale, 'recruiting.loadingCandidates')}
        </p>
      ) : items.length === 0 ? (
        <p className="font-mono text-xs text-ink-faint">
          {t(locale, 'recruiting.noCandidatesYet')}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((row) => (
            <CandidateCard
              key={row.candidateId}
              row={row}
              vacancyId={vacancyId}
              locale={locale}
              onChanged={load}
              onPipelineChange={onPipelineChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

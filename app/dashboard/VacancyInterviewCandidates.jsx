'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { C } from '../../lib/theme';
import { RichTextEditor } from '../_components/RichTextEditor';
import { BrStateSelect } from '../_components/BrStateSelect';
import { BrCitySelect } from '../_components/BrCitySelect';
import { S } from './dashboard-shared';

const inputStyle = {
  flex: '1 1 180px',
  background: 'rgba(255,255,255,.8)',
  border: `1px solid ${C.border}`,
  borderRadius: '10px',
  padding: '10px 12px',
  color: C.text,
  fontSize: '13px',
  fontFamily: 'monospace',
};

const selectStyle = { ...inputStyle, cursor: 'pointer' };

function inviteStatusLabel(locale, status) {
  const s = String(status || '');
  if (s === 'opened') return t(locale, 'recruiting.inviteOpened');
  if (s === 'completed') return t(locale, 'recruiting.inviteCompleted');
  if (s === 'cancelled') return t(locale, 'recruiting.inviteCancelled');
  if (s === 'sent') return t(locale, 'recruiting.inviteSent');
  return t(locale, 'recruiting.noInviteYet');
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
  const [notes, setNotes] = useState(row.interviewNotes || '');
  const [phone, setPhone] = useState(row.phone || '');
  const [linkedinUrl, setLinkedinUrl] = useState(row.linkedinUrl || '');
  const [city, setCity] = useState(row.city || '');
  const [stateUf, setStateUf] = useState(row.state || '');
  const [salaryExpectation, setSalaryExpectation] = useState(row.salaryExpectation || '');
  const [availability, setAvailability] = useState(row.availability || '');
  const [source, setSource] = useState(row.source || '');
  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setNotes(row.interviewNotes || '');
    setPhone(row.phone || '');
    setLinkedinUrl(row.linkedinUrl || '');
    setCity(row.city || '');
    setStateUf(row.state || '');
    setSalaryExpectation(row.salaryExpectation || '');
    setAvailability(row.availability || '');
    setSource(row.source || '');
  }, [row]);

  const saveNotes = async () => {
    setBusy(true);
    setErr('');
    setOk('');
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
      setOk(t(locale, 'recruiting.notesSaved'));
      onChanged?.();
      setTimeout(() => setOk(''), 3000);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    setProfileBusy(true);
    setErr('');
    setOk('');
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(row.candidateId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          linkedinUrl,
          city,
          state: stateUf,
          salaryExpectation,
          availability: availability || null,
          source: source || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      setOk(t(locale, 'recruiting.profileSaved'));
      onChanged?.();
      setTimeout(() => setOk(''), 3000);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setProfileBusy(false);
    }
  };

  const sendChallenge = async () => {
    setInviteBusy(true);
    setErr('');
    setOk('');
    try {
      const res = await fetch(
        `/api/admin/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(row.candidateId)}/invite`,
        { method: 'POST' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
      setOk(t(locale, 'recruiting.challengeSentTo', { email: data.sentTo || row.email }));
      onChanged?.();
      onPipelineChange?.();
      setTimeout(() => setOk(''), 5000);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setInviteBusy(false);
    }
  };

  const alreadyCompleted = Boolean(row.assessmentId) || row.inviteStatus === 'completed';
  const locBits = [row.city, row.state].filter(Boolean).join(' / ');

  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: '12px',
        padding: '14px',
        background: 'rgba(26,22,37,.02)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '14px', color: C.text }}>
            <strong style={{ fontWeight: 600 }}>{row.fullName}</strong>
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', fontFamily: 'monospace', color: C.muted }}>
            {row.email}
            {row.phone ? ` · ${row.phone}` : ''}
          </div>
          {(locBits || row.linkedinUrl) ? (
            <div style={{ marginTop: '4px', fontSize: '11px', fontFamily: 'monospace', color: C.faint }}>
              {locBits || null}
              {locBits && row.linkedinUrl ? ' · ' : null}
              {row.linkedinUrl ? (
                <a href={row.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: C.purpleLight }}>
                  LinkedIn
                </a>
              ) : null}
            </div>
          ) : null}
          <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                padding: '2px 8px',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                color: C.muted,
              }}
            >
              {inviteStatusLabel(locale, row.inviteStatus)}
            </span>
            {row.topType != null && (
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: C.purpleLight }}>
                {t(locale, 'recruiting.typeShort', { type: row.topType })}
              </span>
            )}
            {availabilityLabel(locale, row.availability) ? (
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: C.faint }}>
                {availabilityLabel(locale, row.availability)}
              </span>
            ) : null}
            {sourceLabel(locale, row.source) ? (
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: C.faint }}>
                {sourceLabel(locale, row.source)}
              </span>
            ) : null}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            style={{
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              padding: '8px 10px',
              color: C.muted,
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            {expanded ? t(locale, 'recruiting.hideNotes') : t(locale, 'recruiting.notesActions')}
          </button>
          <button
            type="button"
            onClick={sendChallenge}
            disabled={inviteBusy || alreadyCompleted}
            title={
              alreadyCompleted
                ? t(locale, 'recruiting.testAlreadyDone')
                : t(locale, 'recruiting.sendEnneagramTitle')
            }
            style={{
              background: alreadyCompleted ? 'transparent' : `${C.synergy}18`,
              border: `1px solid ${alreadyCompleted ? C.border : `${C.synergy}55`}`,
              borderRadius: '10px',
              padding: '8px 10px',
              color: alreadyCompleted ? C.faint : C.synergy,
              fontSize: '12px',
              cursor: alreadyCompleted ? 'default' : 'pointer',
              fontFamily: 'monospace',
              opacity: inviteBusy ? 0.6 : 1,
            }}
          >
            {inviteBusy
              ? t(locale, 'recruiting.inviteSending')
              : alreadyCompleted
                ? t(locale, 'recruiting.testDone')
                : t(locale, 'recruiting.sendEnneagram')}
          </button>
        </div>
      </div>

      {err ? (
        <p style={{ marginTop: '10px', marginBottom: 0, color: C.tension, fontSize: '11px', fontFamily: 'monospace' }}>
          {err}
        </p>
      ) : null}
      {ok ? (
        <p style={{ marginTop: '10px', marginBottom: 0, color: C.synergy, fontSize: '11px', fontFamily: 'monospace' }}>
          {ok}
        </p>
      ) : null}

      {expanded && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t(locale, 'recruiting.phonePh')} style={inputStyle} />
            <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder={t(locale, 'recruiting.linkedinPh')} style={{ ...inputStyle, flex: '2 1 220px' }} />
            <BrStateSelect
              value={stateUf}
              onChange={(uf) => {
                setStateUf(uf);
                setCity('');
              }}
              locale={locale}
              style={{ ...selectStyle, flex: '0 1 160px' }}
            />
            <BrCitySelect
              uf={stateUf}
              value={city}
              onChange={setCity}
              locale={locale}
              style={{ ...selectStyle, flex: '1 1 180px' }}
            />
            <input value={salaryExpectation} onChange={(e) => setSalaryExpectation(e.target.value)} placeholder={t(locale, 'recruiting.salaryPh')} style={inputStyle} />
            <select value={availability} onChange={(e) => setAvailability(e.target.value)} style={selectStyle} aria-label={t(locale, 'recruiting.availabilityLabel')}>
              <option value="">{t(locale, 'recruiting.availabilityLabel')}</option>
              <option value="immediate">{t(locale, 'recruiting.availabilityImmediate')}</option>
              <option value="15_days">{t(locale, 'recruiting.availability15')}</option>
              <option value="30_days">{t(locale, 'recruiting.availability30')}</option>
              <option value="60_days">{t(locale, 'recruiting.availability60')}</option>
              <option value="other">{t(locale, 'recruiting.availabilityOther')}</option>
            </select>
            <select value={source} onChange={(e) => setSource(e.target.value)} style={selectStyle} aria-label={t(locale, 'recruiting.sourceLabel')}>
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
            style={{
              background: `${C.purple}12`,
              border: `1px solid ${C.purple}44`,
              borderRadius: '10px',
              padding: '8px 14px',
              color: C.purple,
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              opacity: profileBusy ? 0.6 : 1,
              marginBottom: '14px',
            }}
          >
            {profileBusy ? t(locale, 'recruiting.savingNotes') : t(locale, 'recruiting.saveProfile')}
          </button>

          <span
            style={{
              fontSize: '11px',
              color: C.muted,
              fontFamily: 'monospace',
              display: 'block',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
            }}
          >
            {t(locale, 'recruiting.interviewNotesTitle')}
          </span>
          <RichTextEditor value={notes} onChange={setNotes} locale={locale} />
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={saveNotes}
              disabled={busy}
              style={{
                background: `${C.purple}18`,
                border: `1px solid ${C.purple}55`,
                borderRadius: '10px',
                padding: '8px 14px',
                color: C.purple,
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? t(locale, 'recruiting.savingNotes') : t(locale, 'recruiting.saveNotes')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function VacancyInterviewCandidates({ vacancyId, locale = 'pt-BR', onPipelineChange }) {
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
          fullName: name.trim(),
          email: email.trim().toLowerCase(),
          phone,
          linkedinUrl,
          city,
          state: stateUf,
          salaryExpectation,
          availability: availability || null,
          source: source || null,
          interviewNotes: createNotes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t(locale, 'panel.common.error'));
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
      setCreateMsg(t(locale, 'recruiting.candidateRegistered'));
      await load();
      setTimeout(() => setCreateMsg(''), 3000);
    } catch (e) {
      setErr(e?.message || t(locale, 'panel.common.error'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <span style={S.label}>{t(locale, 'recruiting.interviewCandidatesTitle')}</span>
      <p style={{ fontSize: '12px', color: C.muted, marginTop: '8px', lineHeight: 1.55, marginBottom: '12px' }}>
        {t(locale, 'recruiting.interviewCandidatesIntro')}
      </p>

      <div
        style={{
          padding: '14px',
          borderRadius: '12px',
          border: `1px solid ${C.purple}33`,
          background: `${C.purple}08`,
          marginBottom: '14px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            color: C.purpleLight,
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            display: 'block',
            marginBottom: '10px',
          }}
        >
          {t(locale, 'recruiting.newCandidate')}
        </span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t(locale, 'recruiting.fullNamePh')} style={inputStyle} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t(locale, 'recruiting.inviteCandidateEmailPh')} style={{ ...inputStyle, flex: '1 1 220px' }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t(locale, 'recruiting.phonePh')} style={inputStyle} />
          <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder={t(locale, 'recruiting.linkedinPh')} style={{ ...inputStyle, flex: '2 1 220px' }} />
          <BrStateSelect
            value={stateUf}
            onChange={(uf) => {
              setStateUf(uf);
              setCity('');
            }}
            locale={locale}
            style={{ ...selectStyle, flex: '0 1 160px' }}
          />
          <BrCitySelect
            uf={stateUf}
            value={city}
            onChange={setCity}
            locale={locale}
            style={{ ...selectStyle, flex: '1 1 180px' }}
          />
          <input value={salaryExpectation} onChange={(e) => setSalaryExpectation(e.target.value)} placeholder={t(locale, 'recruiting.salaryPh')} style={inputStyle} />
          <select value={availability} onChange={(e) => setAvailability(e.target.value)} style={selectStyle}>
            <option value="">{t(locale, 'recruiting.availabilityLabel')}</option>
            <option value="immediate">{t(locale, 'recruiting.availabilityImmediate')}</option>
            <option value="15_days">{t(locale, 'recruiting.availability15')}</option>
            <option value="30_days">{t(locale, 'recruiting.availability30')}</option>
            <option value="60_days">{t(locale, 'recruiting.availability60')}</option>
            <option value="other">{t(locale, 'recruiting.availabilityOther')}</option>
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} style={selectStyle}>
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
        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            onClick={create}
            disabled={creating || !name.trim() || !email.trim()}
            style={{
              background: `${C.purple}18`,
              border: `1px solid ${C.purple}55`,
              borderRadius: '10px',
              padding: '9px 16px',
              color: C.purple,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              opacity: creating || !name.trim() || !email.trim() ? 0.55 : 1,
            }}
          >
            {creating
              ? t(locale, 'recruiting.registeringCandidate')
              : t(locale, 'recruiting.registerCandidate')}
          </button>
        </div>
        {createMsg ? (
          <p style={{ marginTop: '8px', marginBottom: 0, color: C.synergy, fontSize: '11px', fontFamily: 'monospace' }}>
            {createMsg}
          </p>
        ) : null}
      </div>

      {err ? (
        <p style={{ marginBottom: '10px', color: C.tension, fontSize: '12px', fontFamily: 'monospace' }}>{err}</p>
      ) : null}

      {loading ? (
        <p style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
          {t(locale, 'recruiting.loadingCandidates')}
        </p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: '12px', color: C.faint, fontFamily: 'monospace' }}>
          {t(locale, 'recruiting.noCandidatesYet')}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

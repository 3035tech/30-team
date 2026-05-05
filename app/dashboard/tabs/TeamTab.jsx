'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { TYPE_DATA } from '../../../lib/data';
import { t } from '../../../lib/i18n';
import { C } from '../../../lib/theme';
import { Bar, S, TypeBadge } from '../dashboard-shared';

const PIPELINE_OPTIONS = [
  'new',
  'test_completed',
  'screening',
  'interview',
  'approved',
  'rejected',
  'archived',
];

function pipelineLabel(locale, code) {
  const map = {
    new: 'recruiting.pipelineNew',
    test_completed: 'recruiting.pipelineTestCompleted',
    screening: 'recruiting.pipelineScreening',
    interview: 'recruiting.pipelineInterview',
    approved: 'recruiting.pipelineApproved',
    rejected: 'recruiting.pipelineRejected',
    archived: 'recruiting.pipelineArchived',
  };
  return t(locale, map[code] || 'recruiting.pipelineNew');
}

export function TeamTab({ results, sortKey, sortDir, onSort, locale = 'pt-BR' }) {
  const [open, setOpen] = useState(null);
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState('');
  const [stageBusy, setStageBusy] = useState(null);

  const sortColumns = [
    { k: 'createdAt', label: 'Data' },
    { k: 'name', label: 'Nome' },
    { k: 'area', label: 'Área' },
    { k: 'type', label: 'Tipo perfil' },
    { k: 'vacancy', label: 'Vaga' },
    { k: 'pipeline', label: t(locale, 'recruiting.pipelineShort') },
  ];

  const loadDetail = useCallback(async (candidateId) => {
    setDetailLoading(true);
    setDetailErr('');
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(candidateId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha ao carregar');
      setDetail(data);
    } catch (e) {
      setDetailErr(e?.message || 'Erro');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const deleteCandidate = async (candidateId, name) => {
    const id = String(candidateId || '').trim();
    if (!id) return;
    const ok = window.confirm(`Excluir "${name}" e todas as respostas/avaliações associadas? Essa ação não pode ser desfeita.`);
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/candidates/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha ao excluir');
      router.refresh();
    } catch (e) {
      window.alert(e?.message || 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  const deleteAssessment = async (assessmentId) => {
    const ok = window.confirm(t(locale, 'recruiting.allowRetake') + '?');
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/assessments/${encodeURIComponent(assessmentId)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha');
      router.refresh();
      if (detail?.candidate?.id) await loadDetail(detail.candidate.id);
    } catch (e) {
      window.alert(e?.message || 'Erro');
    } finally {
      setDeleting(false);
    }
  };

  const patchPipeline = async (assessmentId, pipelineStage) => {
    setStageBusy(String(assessmentId));
    try {
      const res = await fetch(`/api/admin/assessments/${encodeURIComponent(assessmentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha');
      router.refresh();
      if (detail?.candidate?.id) await loadDetail(detail.candidate.id);
    } catch (e) {
      window.alert(e?.message || 'Erro');
    } finally {
      setStageBusy(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        role="group"
        aria-label="Ordenar lista da equipe"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          background: 'rgba(26,22,37,.03)',
          borderRadius: '12px',
          border: `1px solid ${C.border}`,
        }}
      >
        <span style={{ fontSize: '10px', color: C.faint, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Ordenar por
        </span>
        {sortColumns.map(({ k, label }) => {
          const active = sortKey === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onSort(k)}
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
              {active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
            </button>
          );
        })}
      </div>
      {results.map((r) => {
        const id = String(r.assessmentId);
        const d = TYPE_DATA[r.topType];
        const isOpen = open === id;
        const sorted = Object.entries(r.scores || {}).sort((a, b) => b[1] - a[1]);
        const second = sorted[1];
        const maxS = sorted[0] ? parseInt(sorted[0][1], 10) : 0;
        const showVacancyFit = r.vacancyFitScore010 != null && r.vacancyFitScore010 !== undefined;
        return (
          <div
            key={id}
            style={{
              ...S.card,
              padding: 0,
              overflow: 'hidden',
              cursor: 'pointer',
              border: isOpen ? `1px solid ${d.color}44` : `1px solid ${C.border}`,
            }}
            onClick={() => {
              const next = isOpen ? null : id;
              setOpen(next);
              if (next && r.candidateId) {
                loadDetail(r.candidateId);
              } else {
                setDetail(null);
                setDetailErr('');
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px' }}>
              <div style={{ fontSize: '24px', flexShrink: 0 }}>{d.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', marginBottom: '4px' }}>{r.name}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <TypeBadge type={r.topType} />
                  {r.areaLabel && (
                    <span
                      style={{
                        padding: '3px 10px',
                        fontSize: '11px',
                        borderRadius: '20px',
                        background: 'rgba(26,22,37,.04)',
                        border: `1px solid ${C.border}`,
                        color: C.muted,
                        fontFamily: 'monospace',
                      }}
                    >
                      {r.areaLabel}
                    </span>
                  )}
                  {r.pipelineStage ? (
                    <span
                      style={{
                        padding: '3px 10px',
                        fontSize: '11px',
                        borderRadius: '20px',
                        background: 'rgba(124,58,237,.12)',
                        border: '1px solid rgba(124,58,237,.35)',
                        color: C.purpleLight,
                        fontFamily: 'monospace',
                      }}
                    >
                      {t(locale, 'recruiting.pipelineShort')}: {pipelineLabel(locale, r.pipelineStage)}
                    </span>
                  ) : null}
                  {r.fitLabel && (
                    <span
                      style={{
                        padding: '3px 10px',
                        fontSize: '11px',
                        borderRadius: '20px',
                        background: `${C.purple}18`,
                        border: `1px solid ${C.purple}44`,
                        color: C.purpleLight,
                        fontFamily: 'monospace',
                      }}
                    >
                      Fit: {r.fitLabel}
                    </span>
                  )}
                  {showVacancyFit ? (
                    <span
                      style={{
                        padding: '3px 10px',
                        fontSize: '11px',
                        borderRadius: '20px',
                        background: 'rgba(71,232,123,.08)',
                        border: '1px solid rgba(71,232,123,.25)',
                        color: 'rgba(71,232,123,.95)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {t(locale, 'recruiting.vacancyFitShort')}: {r.vacancyFitScore010}/10
                    </span>
                  ) : r.areaFitScore010 !== null && r.areaFitScore010 !== undefined ? (
                    <span
                      style={{
                        padding: '3px 10px',
                        fontSize: '11px',
                        borderRadius: '20px',
                        background: 'rgba(71,232,123,.08)',
                        border: '1px solid rgba(71,232,123,.25)',
                        color: 'rgba(71,232,123,.95)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {t(locale, 'recruiting.areaFitShort')}: {r.areaFitScore010}/10
                    </span>
                  ) : null}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {r.candidateId ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCandidate(r.candidateId, r.name);
                    }}
                    disabled={deleting}
                    title="Excluir pessoa e respostas"
                    aria-label="Excluir pessoa e respostas"
                    style={{
                      background: 'rgba(232,71,71,.08)',
                      border: '1px solid rgba(232,71,71,.35)',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      color: C.tension,
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      opacity: deleting ? 0.6 : 1,
                    }}
                  >
                    Excluir
                  </button>
                ) : null}
                <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'monospace' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>
            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '20px 24px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <span style={{ ...S.label, marginBottom: '8px' }}>Pontos fortes</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {d.strengths.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          style={{
                            padding: '3px 10px',
                            background: `${d.color}15`,
                            border: `1px solid ${d.color}35`,
                            borderRadius: '20px',
                            fontSize: '11px',
                            color: d.color,
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={{ ...S.label, marginBottom: '8px' }}>Ala secundária</span>
                    {second && <TypeBadge type={parseInt(second[0], 10)} />}
                  </div>
                </div>
                <div
                  style={{
                    background: `${d.color}0a`,
                    border: `1px solid ${d.color}20`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ ...S.label, marginBottom: '6px', color: `${d.color}70` }}>Contribuição para a equipe</span>
                  <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.65, margin: 0 }}>{d.team}</p>
                </div>

                <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'rgba(26,22,37,.02)' }}>
                  <span style={{ ...S.label, marginBottom: '8px', display: 'block' }}>{t(locale, 'recruiting.assessmentsForCandidate')}</span>
                  {detailLoading ? (
                    <p style={{ margin: 0, fontSize: '12px', color: C.muted }}>…</p>
                  ) : detailErr ? (
                    <p style={{ margin: 0, fontSize: '12px', color: C.tension }}>{detailErr}</p>
                  ) : detail?.assessments?.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {detail.assessments.map((a) => (
                        <div
                          key={a.id}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px',
                            alignItems: 'center',
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1px solid ${C.border}`,
                            background: 'rgba(255,255,255,.4)',
                          }}
                        >
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: C.muted }}>
                            #{a.id} · {a.areaLabel}
                            {a.vacancyTitle ? ` · ${a.vacancyTitle}` : ''}
                          </span>
                          <label style={{ fontSize: '11px', color: C.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {t(locale, 'recruiting.stageLabel')}
                            <select
                              value={a.pipelineStage || 'test_completed'}
                              disabled={!!stageBusy}
                              onChange={(e) => patchPipeline(a.id, e.target.value)}
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: `1px solid ${C.border}`,
                                background: 'transparent',
                                color: C.text,
                              }}
                            >
                              {PIPELINE_OPTIONS.map((code) => (
                                <option key={code} value={code}>
                                  {pipelineLabel(locale, code)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => deleteAssessment(a.id)}
                            style={{
                              marginLeft: 'auto',
                              fontSize: '11px',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid rgba(232,71,71,.35)',
                              background: 'rgba(232,71,71,.08)',
                              color: C.tension,
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                            }}
                          >
                            {t(locale, 'recruiting.allowRetake')}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '12px', color: C.muted }}>—</p>
                  )}
                </div>

                <span style={{ ...S.label, marginBottom: '8px' }}>Pontuação por tipo</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {sorted.map(([t, s]) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        title={TYPE_DATA?.[parseInt(t, 10)]?.name ? `${TYPE_DATA[parseInt(t, 10)].name} (T${t})` : `T${t}`}
                        style={{ width: '60px', fontSize: '10px', color: TYPE_DATA[parseInt(t, 10)].color, fontFamily: 'monospace' }}
                      >
                        {TYPE_DATA[parseInt(t, 10)].emoji} T{t}
                      </span>
                      <div style={{ flex: 1 }}>
                        <Bar value={parseInt(s, 10)} max={maxS} color={TYPE_DATA[parseInt(t, 10)].color} h={5} />
                      </div>
                      <span style={{ fontSize: '10px', color: C.muted, fontFamily: 'monospace', width: '24px', textAlign: 'right' }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

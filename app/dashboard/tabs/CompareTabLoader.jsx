'use client';

import { useEffect, useState } from 'react';
import { C } from '../../../lib/theme';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
import { S } from '../dashboard-shared';
import { CompareTab } from './CompareTab';

export function CompareTabLoader({ filterQueryString, comparePage, comparePageSize, onComparePagination }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr('');
    const q = new URLSearchParams(filterQueryString || '');
    q.set('comparePage', String(comparePage));
    q.set('comparePageSize', String(comparePageSize));
    fetch(`/api/admin/assessment-rows?${q.toString()}`)
      .then(async (r) => {
        const raw = await r.text();
        let d = {};
        if (raw && raw.trim()) {
          try {
            d = JSON.parse(raw);
          } catch {
            d = {};
          }
        }
        return { ok: r.ok, d, status: r.status };
      })
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) throw new Error(d?.error || 'Falha ao carregar');
        setRows(Array.isArray(d.rows) ? d.rows : []);
        setMeta({
          total: typeof d.total === 'number' ? d.total : (Array.isArray(d.rows) ? d.rows.length : 0),
          totalPages: typeof d.totalPages === 'number' ? d.totalPages : 1,
          page: typeof d.page === 'number' ? d.page : comparePage,
        });
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message || 'Erro');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filterQueryString, comparePage, comparePageSize]);

  if (loading) {
    return (
      <div style={{ ...S.card, textAlign: 'center', padding: '40px' }}>
        <p style={{ color: C.muted, margin: 0 }}>Carregando dados do comparativo…</p>
      </div>
    );
  }
  if (err) {
    return (
      <div style={{ ...S.card, textAlign: 'center', padding: '40px' }}>
        <p style={{ color: C.tension, margin: 0 }}>{err}</p>
      </div>
    );
  }

  const effPage = meta.page;
  const totPg = meta.totalPages;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <CompareTab results={rows} />
      {meta.total > 0 ? (
        <div style={{
          ...S.card, padding: '14px 20px', display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', gap: '12px', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace' }}>
            Lista do comparativo (página própria) · {meta.total} pessoa(s)
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <select
              value={String(comparePageSize)}
              onChange={(e) => {
                const ps = parseInt(e.target.value, 10);
                onComparePagination({ page: 1, pageSize: ps });
              }}
              style={{ background: 'rgba(26,22,37,.05)', border: `1px solid ${C.border}`,
                borderRadius: '10px', padding: '8px 12px', color: C.muted, fontSize: '12px',
                cursor: 'pointer', fontFamily: 'monospace' }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={String(n)}>{n}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={effPage <= 1}
              onClick={() => onComparePagination({ page: effPage - 1, pageSize: comparePageSize })}
              style={{ background: effPage <= 1 ? 'transparent' : `${C.purple}18`,
                border: `1px solid ${effPage <= 1 ? C.border : `${C.purple}55`}`,
                borderRadius: '10px', padding: '8px 14px', color: effPage <= 1 ? C.faint : C.purple,
                fontSize: '12px', cursor: effPage <= 1 ? 'default' : 'pointer', fontFamily: 'monospace' }}
            >
              Anterior
            </button>
            <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'monospace', minWidth: '90px', textAlign: 'center' }}>
              {effPage} / {totPg}
            </span>
            <button
              type="button"
              disabled={effPage >= totPg}
              onClick={() => onComparePagination({ page: effPage + 1, pageSize: comparePageSize })}
              style={{ background: effPage >= totPg ? 'transparent' : `${C.purple}18`,
                border: `1px solid ${effPage >= totPg ? C.border : `${C.purple}55`}`,
                borderRadius: '10px', padding: '8px 14px',
                color: effPage >= totPg ? C.faint : C.purple,
                fontSize: '12px',
                cursor: effPage >= totPg ? 'default' : 'pointer', fontFamily: 'monospace' }}
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { BR_UF_SET } from '../../lib/candidate-profile';

/** Select de município IBGE, filtrado pela UF. */
export function BrCitySelect({
  uf = '',
  value = '',
  onChange,
  locale = 'pt-BR',
  style,
  className,
  id,
  'aria-label': ariaLabel,
}) {
  const ufCode = String(uf || '').trim().toUpperCase();
  const hasUf = BR_UF_SET.has(ufCode);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState(false);

  useEffect(() => {
    if (!hasUf) {
      setCities([]);
      setLoading(false);
      setLoadErr(false);
      return undefined;
    }

    let cancelled = false;
    const ctrl = new AbortController();
    setLoading(true);
    setLoadErr(false);

    (async () => {
      try {
        const res = await fetch(`/api/public/br-cities?uf=${encodeURIComponent(ufCode)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'fail');
        if (!cancelled) setCities(Array.isArray(data.cities) ? data.cities : []);
      } catch (e) {
        if (e?.name === 'AbortError') return;
        if (!cancelled) {
          setCities([]);
          setLoadErr(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [ufCode, hasUf]);

  const cityValue = String(value || '').trim();
  const inList = cities.includes(cityValue);
  const showLegacy = Boolean(cityValue && !loading && cities.length > 0 && !inList);

  let placeholder = t(locale, 'recruiting.cityPh');
  if (!hasUf) placeholder = t(locale, 'recruiting.citySelectUfFirst');
  else if (loading) placeholder = t(locale, 'recruiting.cityLoading');
  else if (loadErr) placeholder = t(locale, 'recruiting.cityLoadFailed');

  return (
    <select
      id={id}
      className={className}
      value={showLegacy || inList ? cityValue : ''}
      disabled={!hasUf || loading}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label={ariaLabel || t(locale, 'recruiting.cityPh')}
      style={{
        ...style,
        cursor: !hasUf || loading ? 'default' : 'pointer',
        opacity: !hasUf ? 0.65 : 1,
      }}
    >
      <option value="">{placeholder}</option>
      {showLegacy ? <option value={cityValue}>{cityValue}</option> : null}
      {cities.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}

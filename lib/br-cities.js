import { BR_UF_SET } from './candidate-profile';

const IBGE_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';

/** Cache em memória por UF (processo). */
const cache = new Map();

/**
 * Lista municípios de uma UF via IBGE.
 * @param {string} uf
 * @returns {Promise<string[]>} nomes ordenados
 */
export async function fetchCitiesByUf(uf) {
  const code = String(uf || '').trim().toUpperCase();
  if (!BR_UF_SET.has(code)) {
    const err = new Error('INVALID_UF');
    err.code = 'INVALID_UF';
    throw err;
  }

  if (cache.has(code)) return cache.get(code);

  const res = await fetch(`${IBGE_BASE}/${encodeURIComponent(code)}/municipios?orderBy=nome`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    const err = new Error('IBGE_CITIES_FAILED');
    err.code = 'IBGE_CITIES_FAILED';
    throw err;
  }

  const data = await res.json();
  const cities = Array.isArray(data)
    ? data.map((m) => String(m?.nome || '').trim()).filter(Boolean)
    : [];

  cache.set(code, cities);
  return cities;
}

/**
 * Brazilian CEP lookup (ViaCEP). Server-side to avoid CORS and centralize errors.
 */

import { ERR } from './api-error-codes.js';
import { stripCep } from './br-masks.js';

const VIA_CEP = 'https://viacep.com.br/ws';

/**
 * @param {string} cep
 * @returns {Promise<{
 *   ok: true,
 *   cep: string,
 *   street: string,
 *   neighborhood: string,
 *   city: string,
 *   state: string,
 * } | { ok: false, errorCode: string }>}
 */
export async function lookupCep(cep) {
  const digits = stripCep(cep);
  if (!digits || digits.length !== 8) {
    return { ok: false, errorCode: ERR.INVALID_CEP };
  }

  let res;
  try {
    res = await fetch(`${VIA_CEP}/${digits}/json/`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { ok: false, errorCode: ERR.CEP_LOOKUP_FAILED };
  }

  if (!res.ok) {
    return { ok: false, errorCode: ERR.CEP_LOOKUP_FAILED };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, errorCode: ERR.CEP_LOOKUP_FAILED };
  }

  if (data?.erro) {
    return { ok: false, errorCode: ERR.CEP_NOT_FOUND };
  }

  return {
    ok: true,
    cep: digits,
    street: String(data?.logradouro || '').trim(),
    neighborhood: String(data?.bairro || '').trim(),
    city: String(data?.localidade || '').trim(),
    state: String(data?.uf || '').trim().toUpperCase().slice(0, 2),
  };
}

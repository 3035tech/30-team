import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, DEFAULT_LOCALE, normalizeLocale, t } from './i18n';

/**
 * Resolve o locale a partir do cookie NEXT_LOCALE.
 * Aceita um `Request`/`NextRequest` (lê via `request.cookies`) ou nenhum argumento
 * (lê via `cookies()` do next/headers, disponível em qualquer Route Handler).
 */
export function localeFromRequest(request) {
  try {
    const fromRequest = request?.cookies?.get?.(LOCALE_COOKIE)?.value;
    if (fromRequest) return normalizeLocale(fromRequest);
  } catch {}
  try {
    const fromStore = cookies().get(LOCALE_COOKIE)?.value;
    if (fromStore) return normalizeLocale(fromStore);
  } catch {}
  return DEFAULT_LOCALE;
}

/**
 * Monta uma resposta de erro de API já localizada.
 *
 * @param {Request|string|null|undefined} requestOrLocale `Request`/`NextRequest` da rota,
 *   um locale já resolvido ('pt-BR'|'en'), ou `null`/`undefined` (usa cookies()).
 * @param {string} code chave em `errors.<code>` (lib/i18n.js)
 * @param {number} status HTTP status
 * @param {object} [values] valores para interpolação da mensagem (ex.: {email})
 * @param {ResponseInit} [init] opções extras do NextResponse (ex.: headers)
 */
export function apiError(requestOrLocale, code, status, values = {}, init = {}) {
  const locale =
    typeof requestOrLocale === 'string' ? normalizeLocale(requestOrLocale) : localeFromRequest(requestOrLocale);
  const message = t(locale, `errors.${code}`, values);
  return NextResponse.json({ errorCode: code, error: message }, { status, ...init });
}

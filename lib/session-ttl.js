/**
 * TTL / sliding session (puro — seguro no Edge, sem bcrypt/pg).
 */

/** Gestor (`team30_session`): 8h */
export const MANAGER_SESSION_MAX_AGE_SEC = 60 * 60 * 8;

/** Renova quando restam ≤ este prazo (JWT ainda válido). */
export const SESSION_SLIDE_WITHIN_SEC = 60 * 60 * 2; // 2h

/**
 * Renovar sessão perto do fim do TTL (não ressuscita JWT já expirado).
 * @param {number} expSec — claim `exp` Unix (segundos)
 * @param {{ nowSec?: number, withinSec?: number }} [opts]
 */
export function shouldSlideSession(
  expSec,
  { nowSec = Math.floor(Date.now() / 1000), withinSec = SESSION_SLIDE_WITHIN_SEC } = {}
) {
  const exp = Number(expSec);
  if (!Number.isFinite(exp)) return false;
  const remaining = exp - nowSec;
  return remaining > 0 && remaining <= withinSec;
}

/**
 * Inclusive calendar days between YYYY-MM-DD (UTC date parts).
 * Pure helper — safe for client and server.
 */

function dateOrNull(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function leaveInclusiveDays(startsOn, endsOn) {
  const a = dateOrNull(startsOn);
  const b = dateOrNull(endsOn);
  if (!a || !b || b < a) return null;
  const t0 = Date.UTC(Number(a.slice(0, 4)), Number(a.slice(5, 7)) - 1, Number(a.slice(8, 10)));
  const t1 = Date.UTC(Number(b.slice(0, 4)), Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10)));
  return Math.floor((t1 - t0) / 86400000) + 1;
}

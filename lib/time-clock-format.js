/** Pure time-clock formatters (safe for client components). */

/** 65 → "1h05", -65 → "-1h05". */
export function formatMinutesHm(totalMinutes) {
  const n = Math.round(Number(totalMinutes) || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${String(m).padStart(2, '0')}`;
}

/** 65 → "01:05", -997 → "-16:37" (mirror / balance columns). */
export function formatMinutesClock(totalMinutes) {
  const n = Math.round(Number(totalMinutes) || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/** Calendar YYYY-MM-DD in the browser's local zone. */
export function localIsoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function shiftIsoDay(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Valid punch coordinates or null (collaborator punches must carry a location).
 * @returns {{ latitude: number, longitude: number } | null}
 */
export function parsePunchCoordinates(latitude, longitude) {
  const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
  const la = num(latitude);
  const lo = num(longitude);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
  return { latitude: la, longitude: lo };
}

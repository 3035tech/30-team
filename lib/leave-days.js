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

/**
 * Expand leave rows into day → leaves map for calendar UI (who is out each day).
 * Caps days to avoid O(huge) for bad ranges.
 */
export function expandLeaveCalendarByDay(items, from, to, { maxDays = 92 } = {}) {
  const fromDate = dateOrNull(from);
  const toDate = dateOrNull(to);
  if (!fromDate || !toDate || toDate < fromDate) return [];
  const startMs = Date.parse(`${fromDate}T00:00:00Z`);
  const endMs = Date.parse(`${toDate}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return [];
  const dayCount = Math.floor((endMs - startMs) / 86400000) + 1;
  const lim = Math.min(Math.max(Number(maxDays) || 92, 1), 120);
  const days = Math.min(dayCount, lim);
  const byDate = [];
  for (let i = 0; i < days; i += 1) {
    const ms = startMs + i * 86400000;
    const iso = new Date(ms).toISOString().slice(0, 10);
    const rows = (items || []).filter((row) => {
      const a = dateOrNull(row.startsOn);
      const b = dateOrNull(row.endsOn);
      return a && b && a <= iso && b >= iso;
    });
    if (rows.length) byDate.push([iso, rows]);
  }
  return byDate;
}

const buckets = new Map();
const MAX_KEYS = 5000;

function pruneIfNeeded() {
  if (buckets.size <= MAX_KEYS) return;
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
    if (buckets.size <= MAX_KEYS * 0.8) break;
  }
}

/**
 * Janela fixa em memória (adequado a instância única / um container).
 * @returns {{ ok: true } | { ok: false, retryAfterSec: number }}
 */
export function checkRateLimit(key, limit, windowMs) {
  if (!key) return { ok: true };
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (b.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  b.count += 1;
  pruneIfNeeded();
  return { ok: true };
}

export function clientIpFromRequest(request) {
  const xf = request.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 128);
  return 'unknown';
}

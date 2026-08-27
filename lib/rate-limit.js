/**
 * Rate limit — fixed window.
 * Priority:
 * 1. REDIS_URL (Redis clássico / Dublin `redis-haproxy.redis.svc`) via ioredis
 * 2. In-memory per Node process (local / sem Redis)
 *
 * Always async — callers must `await checkRateLimit(...)`.
 */

import Redis from 'ioredis';

const buckets = new Map();
const MAX_KEYS = 5000;

/** @type {import('ioredis').Redis | null | undefined} */
let ioredisClient;
/** @type {boolean} */
let redisUnavailable = false;

function pruneIfNeeded() {
  if (buckets.size <= MAX_KEYS) return;
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
    if (buckets.size <= MAX_KEYS * 0.8) break;
  }
}

function keyPrefix() {
  const p = (process.env.REDIS_KEY_PREFIX || 'team30').trim().replace(/:+$/, '');
  return p || 'team30';
}

function getIoredis() {
  if (redisUnavailable) return null;
  if (ioredisClient !== undefined) return ioredisClient;
  const url = (process.env.REDIS_URL || '').trim();
  if (!url) {
    ioredisClient = null;
    return null;
  }
  try {
    ioredisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    ioredisClient.on('error', (err) => {
      console.warn('[rate-limit] Redis error', err?.message || err);
    });
    return ioredisClient;
  } catch (err) {
    console.warn('[rate-limit] Redis init failed; using memory', err?.message || err);
    redisUnavailable = true;
    ioredisClient = null;
    return null;
  }
}

function checkRateLimitMemory(key, limit, windowMs) {
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

/**
 * Shared fixed-window via classic Redis (INCR + PEXPIRE).
 * @returns {Promise<{ ok: true } | { ok: false, retryAfterSec: number } | null>}
 */
async function checkRateLimitRedis(key, limit, windowMs) {
  const redis = getIoredis();
  if (!redis) return null;
  const windowId = Math.floor(Date.now() / windowMs);
  const redisKey = `${keyPrefix()}:rl:v1:${key}:${windowId}`;
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.pexpire(redisKey, windowMs);
    }
    if (count > limit) {
      const ttl = await redis.pttl(redisKey);
      const retryAfterSec = Math.max(1, Math.ceil((ttl > 0 ? ttl : windowMs) / 1000));
      return { ok: false, retryAfterSec };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[rate-limit] Redis call failed; falling back to memory', err?.message || err);
    return null;
  }
}

/**
 * @param {string} key
 * @param {number} limit
 * @param {number} windowMs
 * @returns {Promise<{ ok: true } | { ok: false, retryAfterSec: number }>}
 */
export async function checkRateLimit(key, limit, windowMs) {
  if (!key) return { ok: true };
  const remote = await checkRateLimitRedis(key, limit, windowMs);
  if (remote) return remote;
  return checkRateLimitMemory(key, limit, windowMs);
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

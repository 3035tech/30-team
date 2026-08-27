/**
 * Tag lists stored as comma-separated TEXT (e.g. learning_resources.theme).
 * UI shows chips; persistence stays a single string.
 */

const DEFAULT_TAG_MAX = 40;
const DEFAULT_LIST_MAX = 400;

/**
 * Split free text / comma / semicolon / newline into unique tags (order preserved).
 * @param {unknown} raw
 * @param {{ tagMax?: number, listMax?: number }} [opts]
 * @returns {string[]}
 */
export function parseTagList(raw, opts = {}) {
  const tagMax = Math.max(1, Number(opts.tagMax) || DEFAULT_TAG_MAX);
  const listMax = Math.max(1, Number(opts.listMax) || DEFAULT_LIST_MAX);

  let parts;
  if (Array.isArray(raw)) {
    parts = raw;
  } else if (raw == null) {
    parts = [];
  } else {
    parts = String(raw).split(/[,;\n]+/);
  }

  const seen = new Set();
  const out = [];
  let total = 0;
  for (const part of parts) {
    const tag = String(part || '').trim().replace(/\s+/g, ' ').slice(0, tagMax);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    const nextLen = total === 0 ? tag.length : total + 2 + tag.length; // ", "
    if (nextLen > listMax) break;
    seen.add(key);
    out.push(tag);
    total = nextLen;
  }
  return out;
}

/**
 * Normalize to canonical storage string (comma + space), or null if empty.
 */
export function formatTagList(raw, opts = {}) {
  const tags = parseTagList(raw, opts);
  return tags.length ? tags.join(', ') : null;
}

export const TAG_LIST_DEFAULTS = {
  TAG_MAX: DEFAULT_TAG_MAX,
  LIST_MAX: DEFAULT_LIST_MAX,
};

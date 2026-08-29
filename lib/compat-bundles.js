/**
 * Compatibility cohort builder for the dashboard.
 * Caps people to keep pairwise work bounded (O(cap²), not O(n²) of the full filter).
 * Caps serialized pairs so RSC/HTML payload stays small.
 */

import { getCompat } from './data.js';

/** Max people included in pairwise compat / group UI for one dashboard load. */
export const COMPAT_PEOPLE_CAP = 150;

/** Max pair rows shipped to the client per list (tensions / synergies / all). */
export const COMPAT_PAIR_PAYLOAD_CAP = 120;

/**
 * @param {Array<{ assessmentId: any, candidateId: any, name: string, topType: number, areaLabel?: string }>} lightRows
 * @param {string} locale
 * @param {{ peopleCap?: number, includePairs?: boolean, pairPayloadCap?: number }} [opts]
 *   includePairs=false — group UI only needs people (avoids O(cap²) pair materialization).
 */
export function buildCompatBundles(lightRows, locale, opts = {}) {
  const peopleCap = opts.peopleCap ?? COMPAT_PEOPLE_CAP;
  const pairPayloadCap = opts.pairPayloadCap ?? COMPAT_PAIR_PAYLOAD_CAP;
  const includePairs = opts.includePairs !== false;
  const sliced = Array.isArray(lightRows) ? lightRows.slice(0, peopleCap) : [];

  const people = sliced.map((r) => ({
    assessmentId: r.assessmentId,
    candidateId: r.candidateId,
    name: r.name,
    areaKey: '',
    areaLabel: r.areaLabel || '',
    vacancyId: null,
    vacancyTitle: '',
    topType: r.topType,
    scores: {},
  }));

  const pairs = [];
  const tensions = [];
  const synergies = [];

  if (includePairs) {
    for (let i = 0; i < people.length; i += 1) {
      for (let j = i + 1; j < people.length; j += 1) {
        const a = people[i];
        const b = people[j];
        const compat = getCompat(a.topType, b.topType, locale);
        const row = { a, b, compat };
        pairs.push(row);
        if (compat.level === 'tension') tensions.push(row);
        if (compat.level === 'synergy') synergies.push(row);
      }
    }
  }

  const pairTotals = {
    pairs: pairs.length,
    tensions: tensions.length,
    synergies: synergies.length,
  };

  return {
    pairs: pairs.slice(0, pairPayloadCap),
    tensions: tensions.slice(0, pairPayloadCap),
    synergies: synergies.slice(0, pairPayloadCap),
    people,
    capped: Array.isArray(lightRows) && lightRows.length > peopleCap,
    peopleCap,
    pairTotals,
    pairsPayloadCapped:
      pairs.length > pairPayloadCap ||
      tensions.length > pairPayloadCap ||
      synergies.length > pairPayloadCap,
    pairPayloadCap,
  };
}

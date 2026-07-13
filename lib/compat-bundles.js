/**
 * Compatibility cohort builder for the dashboard.
 * Caps people to keep pairwise work bounded (O(cap²), not O(n²) of the full filter).
 */

import { getCompat } from './data';

/** Max people included in pairwise compat / group UI for one dashboard load. */
export const COMPAT_PEOPLE_CAP = 150;

/**
 * @param {Array<{ assessmentId: any, candidateId: any, name: string, topType: number, areaLabel?: string }>} lightRows
 * @param {string} locale
 * @param {{ peopleCap?: number }} [opts]
 */
export function buildCompatBundles(lightRows, locale, opts = {}) {
  const peopleCap = opts.peopleCap ?? COMPAT_PEOPLE_CAP;
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

  return {
    pairs,
    tensions,
    synergies,
    people,
    capped: Array.isArray(lightRows) && lightRows.length > peopleCap,
    peopleCap,
  };
}

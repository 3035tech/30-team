export const ORG_UNIT = Object.freeze({
  MAX_NAME: 100,
  MAX_ACTIVE: 500,
  MAX_DEPTH: 20,
  FILTER_NONE: 'none',
  WRITE_LIMIT: 60,
  WINDOW_MS: 60_000,
});

export function parseOrgUnitFilter(value) {
  if (value === ORG_UNIT.FILTER_NONE) return value;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Bounded, cycle-safe labels shared by selectors and the organizational list. */
export function orgUnitOptions(units) {
  const byId = new Map(units.map((unit) => [Number(unit.id), unit]));
  return units.map((unit) => {
    const names = [unit.name];
    const seen = new Set([Number(unit.id)]);
    let parent = byId.get(Number(unit.parentId));
    while (parent && !seen.has(Number(parent.id)) && names.length < ORG_UNIT.MAX_DEPTH) {
      names.unshift(parent.name);
      seen.add(Number(parent.id));
      parent = byId.get(Number(parent.parentId));
    }
    return { ...unit, label: names.join(' / ') };
  }).sort((a, b) => a.label.localeCompare(b.label));
}

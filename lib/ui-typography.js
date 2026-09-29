/** App typography: sentence case, UI font, readable supporting copy.
 * Keep complete Tailwind strings here so the content scanner includes each role.
 * Mono is reserved for numeric measurements, never labels or instructions.
 */
export const UI_TYPE = Object.freeze({
  page: 'font-ui text-2xl font-bold leading-tight tracking-tight text-ink',
  section: 'font-ui text-xl font-semibold leading-snug text-ink',
  card: 'font-ui text-base font-semibold leading-snug text-ink',
  body: 'font-ui text-sm leading-relaxed text-ink',
  supporting: 'font-ui text-prose leading-relaxed text-ink/75',
  label: 'font-ui text-prose font-medium normal-case tracking-normal text-ink/75',
  status: 'font-ui text-prose font-medium leading-snug',
  cta: 'font-ui text-sm font-semibold',
});

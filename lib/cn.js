/**
 * Join class names; falsy values skipped.
 * @param {...(string|false|null|undefined|0)} parts
 */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

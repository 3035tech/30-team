/**
 * Theme resolution shared by the pre-paint script (app/layout.jsx) and DarkModeProvider.
 * Panel routes: light unless the user chose dark. Public token/candidate routes have no
 * toggle, so they follow the OS preference when nothing was saved in this browser.
 */

export const DARK_MODE_STORAGE_KEY = 'team30_dark_mode';

export const PUBLIC_THEME_PATH_PREFIXES = Object.freeze([
  '/t/',
  '/v/',
  '/e/',
  '/r/',
  '/a/',
  '/assessment',
  '/avaliacao',
  '/prep/',
  '/pulso',
  '/clima',
  '/ouvidoria',
  '/feedback',
  '/formal-review',
  '/jobs',
  '/companies/',
]);

export function isPublicThemePath(pathname) {
  const path = String(pathname || '');
  return PUBLIC_THEME_PATH_PREFIXES.some((prefix) => path === prefix.replace(/\/$/, '') || path.startsWith(prefix));
}

/** @param {string|null} stored @param {string} pathname @param {boolean} osPrefersDark */
export function resolveDarkMode(stored, pathname, osPrefersDark) {
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return isPublicThemePath(pathname) && Boolean(osPrefersDark);
}

/** Inline, dependency-free copy of `resolveDarkMode` for the pre-paint <script>. */
export function themeInitScript() {
  const prefixes = JSON.stringify(PUBLIC_THEME_PATH_PREFIXES);
  return `(function(){try{var s=localStorage.getItem(${JSON.stringify(DARK_MODE_STORAGE_KEY)});var d=s==='true';if(s===null){var p=location.pathname;var pub=${prefixes}.some(function(x){return p===x.replace(/\\/$/,'')||p.indexOf(x)===0;});d=pub&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;}if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
}

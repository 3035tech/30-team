import ptBR from './catalogs/pt-BR.js';
import enUS from './catalogs/en-US.js';
import frFR from './catalogs/fr-FR.js';
import deDE from './catalogs/de-DE.js';

/**
 * Every full catalog, for server code (SSR, API routes, mail, scripts, tests).
 * Client bundles swap this module for `bundled-catalogs.client.js` (next.config.js)
 * and load only the active locale through `lib/i18n-client.js`.
 */
export default { 'pt-BR': ptBR, en: enUS, 'fr-FR': frFR, 'de-DE': deDE };

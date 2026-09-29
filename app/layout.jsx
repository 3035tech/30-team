import './brand-tokens.css';
import './globals.css';
import './mobile-fixes.css';
import './dark-mode.css';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, localeHtmlLang, normalizeLocale, t } from '../lib/i18n';
import { DarkModeProvider } from './_components/DarkModeProvider';
import { versionedIcon } from '../lib/brand';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return {
    title: '30Grow',
    description: t(locale, 'home.metaDescription'),
    icons: {
      icon: [
        { url: versionedIcon('/favicon.ico'), sizes: 'any' },
        { url: versionedIcon('/brand/favicon.svg'), type: 'image/svg+xml' },
        { url: versionedIcon('/brand/logo-32.png'), sizes: '32x32', type: 'image/png' },
        { url: versionedIcon('/brand/logo-16.png'), sizes: '16x16', type: 'image/png' },
      ],
      apple: [{ url: versionedIcon('/apple-icon.png'), sizes: '180x180', type: 'image/png' }],
      shortcut: versionedIcon('/favicon.ico'),
    },
    manifest: versionedIcon('/site.webmanifest'),
  };
}

export const viewport = { themeColor: '#111827' };

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return (
    <html lang={localeHtmlLang(locale)}>
      <head>
        <meta charSet="utf-8"/>
        {/* Apply saved theme before paint — default remains light */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('team30_dark_mode')==='true')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="m-0 bg-canvas p-0 font-ui text-prose text-ink antialiased">
        <DarkModeProvider>
          {children}
        </DarkModeProvider>
      </body>
    </html>
  );
}

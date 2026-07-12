import './globals.css';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, localeHtmlLang, normalizeLocale, t } from '../lib/i18n';

export function generateMetadata() {
  const cookieStore = cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return {
    title: '30Team',
    description: t(locale, 'home.metaDescription'),
  };
}

export default function RootLayout({ children }) {
  const cookieStore = cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return (
    <html lang={localeHtmlLang(locale)}>
      <head>
        <meta charSet="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </head>
      <body style={{ margin: 0, padding: 0, background: '#ffffff' }}>
        {children}
      </body>
    </html>
  );
}

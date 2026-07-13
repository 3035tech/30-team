import './globals.css';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, localeHtmlLang, normalizeLocale, t } from '../lib/i18n';

export function generateMetadata() {
  const cookieStore = cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return {
    title: '30Team',
    description: t(locale, 'home.metaDescription'),
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/brand/logo-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/brand/logo-16.png', sizes: '16x16', type: 'image/png' },
      ],
      apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
      shortcut: '/favicon.ico',
    },
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/brand/logo-32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#8930B8" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#ffffff' }}>
        {children}
      </body>
    </html>
  );
}

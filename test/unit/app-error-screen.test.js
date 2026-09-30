import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { t } from '../../lib/i18n.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('error boundaries render AppErrorScreen', () => {
  for (const file of ['app/global-error.jsx', 'app/error.jsx', 'app/r/error.jsx']) {
    assert.match(read(file), /<AppErrorScreen\b/, file);
  }
  assert.match(read('app/global-error.jsx'), /import '\.\/globals\.css'/);
});

test('AppErrorScreen animations respect reduced motion', () => {
  const css = read('app/globals.css');
  assert.match(css, /@keyframes app-err-check/);
  assert.match(css, /prefers-reduced-motion: reduce\)\s*\{\s*\.app-err-gear/);
});

test('app error copy exists in every locale without em dash', () => {
  const keys = ['appErrorEyebrow', 'appErrorTitle', 'appErrorBody', 'appErrorRetry', 'appErrorHome', 'appErrorArt'];
  for (const locale of ['pt-BR', 'en-US', 'fr-FR', 'de-DE']) {
    for (const k of keys) {
      const key = `panel.common.${k}`;
      const v = t(locale, key);
      assert.ok(v && v !== key, `${locale} ${key}`);
      assert.ok(!v.includes(' — '), `${locale} ${key} em dash`);
    }
    assert.match(t(locale, 'panel.common.appErrorCode', { code: 'abc' }), /abc/);
  }
});

test('fr/de error copy is translated, not the pt-BR fallback', () => {
  const pt = t('pt-BR', 'panel.common.appErrorTitle');
  assert.notEqual(t('fr-FR', 'panel.common.appErrorTitle'), pt);
  assert.notEqual(t('de-DE', 'panel.common.appErrorTitle'), pt);
});

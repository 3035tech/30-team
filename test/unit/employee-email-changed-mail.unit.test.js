import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEmployeeEmailChangedMail } from '../../lib/user-access-mail.js';

test('old-address notice masks the new e-mail and carries no link', () => {
  for (const locale of ['pt-BR', 'en-US', 'fr-FR', 'de-DE']) {
    const mail = buildEmployeeEmailChangedMail({
      oldEmail: 'ana@old.com', newEmail: 'ana.souza@new.com', companyLabel: 'Acme', locale, displayName: 'Ana Souza',
    });
    const all = `${mail.subject}\n${mail.text}\n${mail.html}`;
    assert.ok(all.includes('an***@new.com'), locale);
    assert.ok(!all.includes('ana.souza@new.com'), locale);
    assert.ok(!/https?:\/\//.test(mail.text), locale);
    assert.ok(!all.includes('mail.employeeEmailChanged'), `${locale}: missing i18n key`);
    assert.ok(!all.includes(' — '), locale);
    assert.ok(all.includes('Acme') && all.includes('Ana'), locale);
  }
});

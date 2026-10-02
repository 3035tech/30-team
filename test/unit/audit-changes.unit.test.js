import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANDIDATE_AUDIT_PRESENCE_FIELDS,
  CANDIDATE_AUDIT_VALUE_FIELDS,
  DP_AUDIT_PRESENCE_FIELDS,
  diffAuditFields,
} from '../../lib/audit-changes.js';

test('value fields keep from/to; presence fields never carry values', () => {
  const changes = diffAuditFields(
    { fullName: 'Ana', email: 'a@x.com', phone: '11999990000', hrNotes: '<p>a</p>' },
    { fullName: 'Ana Souza', email: 'a@x.com', phone: '11888880000', hrNotes: '<p>a</p>' },
    { valueFields: CANDIDATE_AUDIT_VALUE_FIELDS, presenceFields: CANDIDATE_AUDIT_PRESENCE_FIELDS }
  );
  assert.equal(changes.length, 2);
  assert.equal(JSON.stringify(changes[0]), JSON.stringify({ field: 'fullName' }));
  assert.equal(JSON.stringify(changes[1]), JSON.stringify({ field: 'phone' }));
  assert.ok(!JSON.stringify(changes).includes('11888880000'), 'phone value must not leak');
});

test('null, undefined and blank strings are the same; booleans compare by value', () => {
  assert.equal(diffAuditFields({ cpf: null, rg: '' }, { cpf: '', rg: undefined }, { presenceFields: DP_AUDIT_PRESENCE_FIELDS }).length, 0);
  const tc = diffAuditFields({ timeClockOverride: null }, { timeClockOverride: false }, { valueFields: ['timeClockOverride'] });
  assert.equal(JSON.stringify(tc), JSON.stringify([{ field: 'timeClockOverride', from: null, to: false }]));
});

test('dates, arrays and objects compare by content', () => {
  const d1 = new Date('1998-10-05T03:00:00Z');
  const d2 = new Date('1998-10-05T03:00:00Z');
  assert.equal(diffAuditFields({ birthDate: d1 }, { birthDate: d2 }, { presenceFields: ['birthDate'] }).length, 0);
  assert.equal(diffAuditFields({ dependents: [{ name: 'A' }] }, { dependents: [{ name: 'A' }] }, { presenceFields: ['dependents'] }).length, 0);
  assert.equal(diffAuditFields({ dependents: [] }, { dependents: [{ name: 'B' }] }, { presenceFields: ['dependents'] }).length, 1);
  const mods = diffAuditFields({ modules: ['a', 'b'] }, { modules: ['a'] }, { valueFields: ['modules'] });
  assert.equal(JSON.stringify(mods), JSON.stringify([{ field: 'modules', from: ['a', 'b'], to: ['a'] }]));
});

test('CPF and RG are presence-only by design', () => {
  assert.ok(DP_AUDIT_PRESENCE_FIELDS.includes('cpf'));
  assert.ok(DP_AUDIT_PRESENCE_FIELDS.includes('rg'));
  assert.ok(!CANDIDATE_AUDIT_VALUE_FIELDS.includes('phone'));
});

test('formatting-only changes in CPF, CEP and phones are not changes', () => {
  const changes = diffAuditFields(
    { cpf: '529.982.247-25', addressPostal: '01310-100', emergencyPhone: '(11) 95555-4444' },
    { cpf: '52998224725', addressPostal: '01310100', emergencyPhone: '11955554444' },
    { presenceFields: DP_AUDIT_PRESENCE_FIELDS }
  );
  assert.equal(changes.length, 0);
});

test('corporate e-mail and full name never carry values in candidate profile diffs', () => {
  const changes = diffAuditFields(
    { fullName: 'Ana', email: 'old@x.com' },
    { fullName: 'Ana Souza', email: 'new@x.com' },
    { valueFields: CANDIDATE_AUDIT_VALUE_FIELDS, presenceFields: CANDIDATE_AUDIT_PRESENCE_FIELDS }
  );
  assert.equal(JSON.stringify(changes), JSON.stringify([{ field: 'fullName' }]));
});

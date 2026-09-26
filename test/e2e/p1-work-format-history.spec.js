import { test, expect } from '@playwright/test';
import { HR } from './fixtures.js';

test('P1: employment type changes require effective date and audit only actual changes', async ({ page, baseURL }) => {
  expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL).hostname);
  expect((await page.request.post('/api/auth/login', { data: HR })).ok()).toBeTruthy();
  const { items } = await (await page.request.get('/api/admin/employees/search')).json();
  const id = items[0].id;
  const read = async () => {
    const response = await page.request.get(`/api/admin/candidates/${id}/dp`);
    expect(response.ok()).toBeTruthy();
    return response.json();
  };
  const before = await read();
  const previous = before.candidate.workFormat;
  const next = previous === 'pj' ? 'clt' : 'pj';
  const update = data => page.request.patch(`/api/admin/candidates/${id}`, { data });
  try {
    expect((await update({ workFormat: next })).status()).toBe(400);
    expect((await update({ workFormat: next, workFormatEffectiveDate: '2026-02-30' })).status()).toBe(400);
    expect((await read()).candidate.workFormat).toBe(previous);
    expect((await update({ workFormat: next, workFormatEffectiveDate: '2026-09-01' })).ok()).toBeTruthy();
    const after = await read();
    expect(after.candidate.workFormat).toBe(next);
    expect(after.workFormatHistory.length).toBe(before.workFormatHistory.length + 1);
    const event = after.workFormatHistory[0];
    expect(event.previousFormat).toBe(previous);
    expect(event.newFormat).toBe(next);
    expect(String(event.effectiveDate).slice(0, 10)).toBe('2026-09-01');
    expect(event.actorUserId).toBeTruthy();
    expect(event.actorName).toBeTruthy();
    expect(event.changedAt).toBeTruthy();
    expect((await update({ workFormat: next })).ok()).toBeTruthy();
    expect((await read()).workFormatHistory.length).toBe(after.workFormatHistory.length);
  } finally {
    expect((await update({ workFormat: previous, workFormatEffectiveDate: '2026-09-25' })).ok()).toBeTruthy();
  }
});

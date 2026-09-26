import { test, expect } from '@playwright/test';
import { HR, dismissManagerOnboarding } from './fixtures.js';

test('P1: dependent-only edits preserve other personnel fields and cancel is read-only', async ({ page, baseURL }) => {
  test.setTimeout(120000);
  expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL).hostname);
  async function json(promise) { const response = await promise; const data = await response.json(); expect(response.ok(), JSON.stringify(data)).toBeTruthy(); return data; }
  await json(page.request.post('/api/auth/login', { data: HR }));
  const { items } = await json(page.request.get('/api/admin/employees/search'));
  const id = items[0].id;
  const endpoint = `/api/admin/candidates/${id}/dp`;
  const before = await json(page.request.get(endpoint));
  const dependents = [{ name: 'Dependente P1', cpf: '12345678901', relation: 'Filho', birthDate: '2015-01-20' }];
  try {
    const after = await json(page.request.patch(endpoint, { data: { dependents } }));
    expect(after.profile.dependents).toEqual(dependents);
    for (const field of ['cpf','rg','emergencyName','emergencyPhone','emergencyRelation','addressLine','addressNumber','addressCity','addressState','addressPostal','internalNotes']) expect(after.profile[field], field).toEqual(before.profile[field]);
    await page.goto(`/dashboard?tab=team&candidate=${id}&section=dp`);
    await dismissManagerOnboarding(page);
    const button = page.getByRole('button', { name: 'Dependentes', exact: true });
    await expect(button).toBeVisible();
    await button.click();
    const editor = page.getByRole('dialog').filter({ hasText: 'Possui dependentes?' });
    await expect(editor).toBeVisible();
    await editor.getByLabel('Nome completo', { exact: true }).fill('Não salvar');
    await editor.getByRole('button', { name: 'Cancelar', exact: true }).last().click();
    expect((await json(page.request.get(endpoint))).profile.dependents).toEqual(dependents);
    await button.click();
    await editor.getByLabel('Não', { exact: true }).check();
    await editor.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(editor).toHaveCount(0);
    expect((await json(page.request.get(endpoint))).profile.dependents).toEqual([]);
    await page.reload();
    await expect(button).toBeVisible();
  } finally { await json(page.request.patch(endpoint, { data: { dependents: before.profile.dependents } })); }
});

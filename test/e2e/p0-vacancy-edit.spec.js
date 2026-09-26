import { test, expect } from '@playwright/test';
import { HR, dismissManagerOnboarding } from './fixtures.js';

test('P0: vacancy editor opens, cancels, recovers from API failure and persists', async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL).hostname);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  expect((await page.request.post('/api/auth/login', { data: HR })).ok()).toBeTruthy();
  const list = await (await page.request.get('/api/admin/vacancies?page=1&pageSize=100')).json();
  const vacancies = ['open', 'closed'].map(status => list.items.find(v => v.status === status));
  expect(vacancies.every(Boolean)).toBeTruthy();
  await page.goto('/dashboard?tab=vacancies');
  await page.getByRole('button', { name: 'Editar', exact: true }).first().waitFor();
  await dismissManagerOnboarding(page);
  const editor = page.locator('.app-dialog-overlay').filter({ has: page.getByRole('heading', { name: 'Editar vaga', exact: true }) });
  for (const vacancy of vacancies) {
    for (const section of ['pipeline', 'candidates', 'information', 'distribution', 'settings']) {
      await page.goto(`/dashboard?tab=vacancies&vacancyDetail=${vacancy.id}&vacancySection=${section}`);
      await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
      await expect(editor).toBeVisible();
      expect(await editor.evaluate(e => getComputedStyle(e).position)).toBe('fixed');
      await expect(editor.getByLabel('Título da vaga', { exact: true })).toHaveValue(vacancy.title);
      await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await expect(editor).toHaveCount(0);
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    }
  }
  const vacancy = vacancies[0];
  await page.goto('/dashboard?tab=vacancies');
  await page.getByRole('button', { name: 'Editar', exact: true }).nth(list.items.findIndex(v => v.id === vacancy.id)).click();
  await editor.getByLabel('Título da vaga', { exact: true }).fill(`${vacancy.title} rascunho`);
  await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar editor', exact: true }).click();
  await expect(editor).toHaveCount(0);
  const endpoint = `**/api/admin/vacancies/${vacancy.id}`;
  await page.goto(`/dashboard?tab=vacancies&vacancyDetail=${vacancy.id}`);
  await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
  await expect(editor.getByLabel('Título da vaga', { exact: true })).toHaveValue(vacancy.title);
  await page.route(endpoint, async route => route.request().method() === 'PATCH'
    ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Falha simulada P0' }) }) : route.continue());
  await editor.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(editor.getByRole('alert')).toHaveText('Falha simulada P0');
  await expect(editor.getByRole('button', { name: 'Salvar', exact: true })).toBeEnabled();
  await page.unroute(endpoint);
  try {
    await editor.getByLabel('Título da vaga', { exact: true }).fill(`${vacancy.title} P0`);
    await editor.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(editor).toHaveCount(0);
    await page.reload();
    await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
    await expect(editor.getByLabel('Título da vaga', { exact: true })).toHaveValue(`${vacancy.title} P0`);
    await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
  } finally {
    expect((await page.request.patch(`/api/admin/vacancies/${vacancy.id}`, { data: { title: vacancy.title } })).ok()).toBeTruthy();
  }
  expect(errors).toEqual([]);
});

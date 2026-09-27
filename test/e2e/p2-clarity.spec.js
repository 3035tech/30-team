import { test, expect } from '@playwright/test';
import pg from 'pg';
import { HR } from './fixtures.js';

test.beforeEach(async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL).hostname);
  expect((await page.request.post('/api/auth/login', { data: HR })).ok()).toBeTruthy();
});

test('P2: all nine cells keep people in their original classification and expose axis help', async ({ page }) => {
  const cells = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [String(i + 1), [{ candidateId: i + 1, name: `Pessoa ${i + 1}` }]]));
  await page.route('**/api/admin/nine-box?*', route => route.fulfill({ json: { cells, placed: 9, scanned: 9, unplaced: [] } }));
  await page.goto('/dashboard?tab=performance-reviews');
  await page.getByRole('tab', { name: '9-Box', exact: true }).click();
  const grid = page.getByRole('grid');
  await expect(grid.getByRole('gridcell')).toHaveCount(9);
  expect(await grid.locator('[data-cell]').evaluateAll(elements => elements.map(e => Number(e.dataset.cell)))).toEqual([3,6,9,2,5,8,1,4,7]);
  for (let id = 1; id <= 9; id++) await expect(grid.locator(`[data-cell="${id}"]`)).toContainText(`Pessoa ${id}`);
  await expect(page.getByText('Desempenho → Baixo · Médio · Alto', { exact: true })).toBeVisible();
  const help = page.locator('summary').filter({ hasText: 'Como interpretar a matriz' });
  await help.focus(); await page.keyboard.press('Enter');
  await expect(page.getByText(/Potencial é uma estimativa/)).toBeVisible();
  await page.screenshot({ path: '/private/tmp/p2-nine-box-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.db-sidebar')).not.toBeInViewport();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await grid.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/private/tmp/p2-nine-box-mobile.png' });
});

test('P2: five motivators follow the displayed scores, including stable ties', async ({ page }) => {
  const { items } = await (await page.request.get('/api/admin/employees/search')).json();
  const id = items[0].id;
  await page.route(`**/api/admin/candidates/${id}?*`, async route => {
    const response = await route.fetch(); const body = await response.json();
    body.people ||= {}; body.people.management ||= {};
    body.people.management.motivators = { dimensionScores: { autonomia: 90, reconhecimento: 80, crescimento: 70, financeiro: 70, desafio: 60, seguranca: 50 } };
    await route.fulfill({ response, json: body });
  });
  await page.goto(`/dashboard?tab=team&candidate=${id}&section=style`);
  await page.getByRole('tab', { name: 'Estilo', exact: true }).click();
  const summary = page.getByRole('region', { name: 'Principais motivadores', exact: true });
  await expect(summary.getByRole('listitem')).toHaveCount(5);
  for (const [index, name] of ['Autonomia', 'Reconhecimento', 'Crescimento', 'Financeiro', 'Desafio'].entries()) await expect(summary.getByRole('listitem').nth(index)).toContainText(name);
  await summary.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/private/tmp/p2-motivators-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.db-sidebar')).not.toBeInViewport();
  expect(await summary.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.screenshot({ path: '/private/tmp/p2-motivators-mobile.png' });
});

test('P2: independent named weights remain synchronized and persist above a total of 100', async ({ page }) => {
  const db = new pg.Client({ host: '127.0.0.1', port: 55432, database: 'enneagram_dtov', user: 'dtov', password: 'dtov_local_only', ssl: false });
  await db.connect(); let id;
  try {
    const name = `P2 pesos ${Date.now()}`;
    const response = await page.request.post('/api/admin/job-roles', { data: { name, rubric: { T1: 25.5, T2: 80 } } });
    expect(response.ok(), await response.text()).toBe(true);
    const body = await response.json(); id = body.role?.id || body.id;
    expect(id).toBeTruthy();
    await page.goto('/dashboard?tab=job-roles');
    const row = page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });
    await row.getByRole('button', { name: 'Editar', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const number = dialog.getByRole('spinbutton', { name: /T1\b/ });
    const slider = dialog.getByRole('slider', { name: /T1\b/ });
    // The existing server normalizes percentages to whole numbers.
    await expect(number).toHaveValue('26');
    await number.fill('35'); await expect(slider).toHaveValue('35');
    await slider.focus(); await page.keyboard.press('ArrowRight');
    await expect(number).toHaveValue(await slider.inputValue());
    const expected = Number(await number.inputValue());
    await page.setViewportSize({ width: 390, height: 844 });
    await number.scrollIntoViewIfNeeded();
    expect(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
    await page.screenshot({ path: '/private/tmp/p2-weights-mobile.png' });
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await row.getByRole('button', { name: 'Editar', exact: true }).click();
    await expect(number).toHaveValue(String(expected));
    await expect(dialog.getByRole('spinbutton', { name: /T2\b/ })).toHaveValue('80');
  } finally {
    if (id) await db.query('DELETE FROM job_roles WHERE id=$1', [id]);
    await db.end();
  }
});

test('P2: OKR failure is recoverable and does not masquerade as empty data', async ({ page }) => {
  await page.route('**/api/admin/okr/hierarchy?*', route => route.fulfill({ status: 500, json: { error: 'Simulated failure' } }));
  await page.goto('/dashboard?tab=okr');
  await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os OKRs.' })).toBeVisible();
  await expect(page.getByText('Nenhum ciclo ainda', { exact: true })).toHaveCount(0);
  await page.unroute('**/api/admin/okr/hierarchy?*');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('combobox', { name: 'Ciclo OKR ativo' })).toBeVisible();
  await page.screenshot({ path: '/private/tmp/p2-okr-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.db-sidebar')).not.toBeInViewport();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: '/private/tmp/p2-okr-mobile.png' });
});

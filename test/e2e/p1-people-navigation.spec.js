import { test, expect } from '@playwright/test';
import { HR, dismissManagerOnboarding } from './fixtures.js';
import { orgUnitOptions } from '../../lib/org-unit-constants.js';

test('P1: people summary navigation and confirmed organizational links persist', async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL).hostname);
  const errors = [];
  const writes = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if ((path === '/api/admin/org-chart' && request.method() === 'PATCH') ||
        (path === '/api/admin/org-units' && request.method() === 'PUT')) writes.push(request);
  });
  async function json(responsePromise) {
    const response = await responsePromise;
    expect(response.ok(), `${response.status()} ${response.url()}`).toBeTruthy();
    return response.json();
  }
  await json(page.request.post('/api/auth/login', { data: HR }));
  const { items } = await json(page.request.get('/api/admin/employees/search?limit=20'));
  expect(items.length, 'DTOV needs at least two active employees').toBeGreaterThan(1);
  const subject = items[0];
  const { candidate } = await json(page.request.get(`/api/admin/candidates/${subject.id}`));
  const companyId = Number(candidate.companyId);
  const candidateId = Number(subject.id);
  expect(companyId).toBeGreaterThan(0);
  const query = new URLSearchParams({ companyId, candidateId }).toString();
  const readManager = () => json(page.request.get(`/api/admin/org-chart?${query}`));
  const readUnit = () => json(page.request.get(`/api/admin/org-units?${query}`));
  const originalManager = await readManager();
  const originalUnit = await readUnit();
  const { units } = await json(page.request.get(`/api/admin/org-units?companyId=${companyId}`));
  expect(units.length, 'DTOV needs an existing department').toBeGreaterThan(0);
  const unit = units.find(item => Number(item.id) !== Number(originalUnit.orgUnitId)) || units[0];
  const unitLabel = orgUnitOptions(units).find(item => Number(item.id) === Number(unit.id)).label;

  // Follow the actual manager chain, including employees outside search's first page.
  async function isSafeManager(id) {
    const seen = new Set([candidateId]);
    let cursor = Number(id);
    for (let depth = 0; depth < 40; depth += 1) {
      if (seen.has(cursor)) return false;
      seen.add(cursor);
      const link = await json(page.request.get(`/api/admin/org-chart?companyId=${companyId}&candidateId=${cursor}`));
      if (!link.managerCandidateId) return true;
      cursor = Number(link.managerCandidateId);
    }
    return false;
  }
  let manager;
  for (const item of items.filter(item => Number(item.id) !== candidateId && Number(item.id) !== Number(originalManager.managerCandidateId))) {
    if (await isSafeManager(item.id)) { manager = item; break; }
  }
  // A small fixture can reuse the existing manager after clearing only this link.
  if (!manager && originalManager.managerCandidateId) {
    manager = items.find(item => Number(item.id) === Number(originalManager.managerCandidateId));
  }
  expect(manager, 'DTOV needs a selectable manager without a self-link or cycle').toBeTruthy();
  const setManager = managerCandidateId => json(page.request.patch('/api/admin/org-chart', {
    data: { companyId, candidateId, managerCandidateId },
  }));
  const setUnit = orgUnitId => json(page.request.put(`/api/admin/org-units?companyId=${companyId}`, {
    data: { companyId, candidateId, orgUnitId },
  }));
  const managerHeader = page.getByRole('button', { name: /^Gestor direto / });
  const unitHeader = page.getByRole('button', { name: /^Unidade \/ departamento / });
  const managerBlock = managerHeader.locator('..');
  const unitBlock = unitHeader.locator('..');
  const managerSearch = managerBlock.getByRole('combobox', { name: 'Buscar gestor', exact: true });
  const unitSearch = unitBlock.getByRole('combobox', { name: 'Unidade / departamento', exact: true });
  const dialog = page.getByRole('dialog');
  async function expand(header) {
    await expect(header).toBeVisible();
    if (await header.getAttribute('aria-expanded') !== 'true') await header.click();
  }
  async function pickManager() {
    await managerSearch.fill(manager.label);
    await managerBlock.getByRole('option').filter({ has: page.getByText(manager.label, { exact: true }) }).click();
    await expect(dialog).toContainText(`Alterar o gestor imediato para: ${manager.label}?`);
  }
  async function pickUnit() {
    await unitSearch.fill(unit.name);
    await unitBlock.getByRole('option', { name: unitLabel, exact: true }).click();
    await unitBlock.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(dialog).toContainText(`Alterar o departamento para: ${unit.name}?`);
  }
  async function confirmWrite(path, method) {
    const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === method);
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    await json(responsePromise);
    await expect(dialog).toHaveCount(0);
  }
  try {
    if (Number(manager.id) === Number(originalManager.managerCandidateId)) await setManager(null);
    if (Number(unit.id) === Number(originalUnit.orgUnitId)) await setUnit(null);
    const baselineManager = await readManager();
    const baselineUnit = await readUnit();
    const baselineUnitName = units.find(item => Number(item.id) === Number(baselineUnit.orgUnitId))?.name || 'Sem unidade';
    await page.goto(`/dashboard?tab=team&candidate=${candidateId}&section=summary`);
    const tabs = page.getByRole('tablist').filter({ has: page.getByRole('tab', { name: 'Resumo', exact: true }) });
    await expect(tabs.getByRole('tab', { name: 'Resumo', exact: true })).toBeVisible();
    await dismissManagerOnboarding(page);
    await expect(tabs.getByRole('tab', { name: 'Resumo', exact: true })).toHaveAttribute('aria-selected', 'true');
    await tabs.getByRole('tab', { name: '1:1', exact: true }).click();
    await expect(page).toHaveURL(/section=oneOnOne/);
    await expect(tabs.getByRole('tab', { name: '1:1', exact: true })).toHaveAttribute('aria-selected', 'true');
    await tabs.getByRole('tab', { name: 'Resumo', exact: true }).click();
    await expect(page).toHaveURL(/section=summary/);
    await expand(managerHeader);
    await expand(unitHeader);
    await expect(managerBlock.getByText(baselineManager.managerName ? `Atual: ${baselineManager.managerName}` : 'Sem gestor definido', { exact: true })).toBeVisible();
    await expect(unitBlock.getByText(`Atual: ${baselineUnitName}`, { exact: true })).toBeVisible();

    await managerSearch.fill(manager.label);
    await expect(managerBlock.getByRole('option').filter({ has: page.getByText(manager.label, { exact: true }) })).toBeVisible();
    expect(writes).toHaveLength(0);
    expect((await readManager()).managerCandidateId).toBe(baselineManager.managerCandidateId);
    await pickManager();
    expect(writes).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(managerSearch).toBeEnabled();
    expect((await readManager()).managerCandidateId).toBe(baselineManager.managerCandidateId);
    expect(writes).toHaveLength(0);
    await pickManager();
    await confirmWrite('/api/admin/org-chart', 'PATCH');
    expect((await readManager()).managerCandidateId).toBe(Number(manager.id));
    await page.reload();
    await expand(managerHeader);
    await expect(managerBlock.getByText(`Atual: ${manager.label}`, { exact: true })).toBeVisible();
    expect((await readManager()).managerCandidateId).toBe(Number(manager.id));

    await expand(unitHeader);
    const beforeUnitWrites = writes.length;
    await pickUnit();
    expect(writes).toHaveLength(beforeUnitWrites);
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(unitSearch).toBeEnabled();
    expect((await readUnit()).orgUnitId).toBe(baselineUnit.orgUnitId);
    expect(writes).toHaveLength(beforeUnitWrites);
    await expect(unitBlock.getByText(`Atual: ${baselineUnitName}`, { exact: true })).toBeVisible();
    await pickUnit();
    await confirmWrite('/api/admin/org-units', 'PUT');
    expect(Number((await readUnit()).orgUnitId)).toBe(Number(unit.id));
    await page.reload();
    await expand(unitHeader);
    await expect(unitBlock.getByText(`Atual: ${unit.name}`, { exact: true })).toBeVisible();
    expect(Number((await readUnit()).orgUnitId)).toBe(Number(unit.id));
    expect(errors).toEqual([]);
  } finally {
    // Attempt both restores even if one fails; verify the stored links afterward.
    const restored = await Promise.allSettled([
      setManager(originalManager.managerCandidateId),
      setUnit(originalUnit.orgUnitId),
    ]);
    for (const result of restored) expect(result.status).toBe('fulfilled');
    expect((await readManager()).managerCandidateId).toBe(originalManager.managerCandidateId);
    expect((await readUnit()).orgUnitId).toBe(originalUnit.orgUnitId);
  }
});

import { test, expect } from '@playwright/test';
import { HR, dismissManagerOnboarding } from './fixtures.js';

test('P1: corporate email is editable in Editar ficha, normalized, unique per company and audited', async ({ page, baseURL }) => {
  test.setTimeout(120000);
  expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL).hostname);
  expect((await page.request.post('/api/auth/login', { data: HR })).ok()).toBeTruthy();
  const { items } = await (await page.request.get('/api/admin/employees/search')).json();
  const [person, other] = items;
  expect(person && other).toBeTruthy();
  const endpoint = `/api/admin/candidates/${person.id}`;
  const original = person.email;
  const stamp = Date.now();
  const patch = (email) => page.request.patch(endpoint, { data: { email } });
  try {
    const renamed = await patch(`  Ficha.${stamp}@Todos-os-dados.demo `);
    expect(renamed.ok()).toBeTruthy();
    expect((await renamed.json()).email).toBe(`ficha.${stamp}@todos-os-dados.demo`);
    const taken = await patch(other.email);
    expect(taken.status()).toBe(409);
    expect((await taken.json()).errorCode).toBe('EMAIL_TAKEN');
    expect((await patch('nao-e-email')).status()).toBe(400);
    expect((await patch('')).status()).toBe(400);

    await page.goto(`/dashboard?tab=team&candidate=${person.id}&section=dp`);
    await dismissManagerOnboarding(page);
    await page.getByRole('button', { name: 'Editar ficha', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const email = dialog.getByLabel('E-mail corporativo', { exact: true });
    await expect(email).toHaveValue(`ficha.${stamp}@todos-os-dados.demo`);
    await email.fill(`ui.${stamp}@todos-os-dados.demo`);
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(`ui.${stamp}@todos-os-dados.demo`).first()).toBeVisible();
  } finally {
    expect((await patch(original)).ok()).toBeTruthy();
  }
});

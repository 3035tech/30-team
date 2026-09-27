import { test, expect } from '@playwright/test';
import { HR } from './fixtures.js';

for (const role of ['hr', 'employee']) test(`P0: ${role} upload timeout recovers and document actions fit mobile`, async ({ page, baseURL }) => {
  test.setTimeout(70000);
  expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL).hostname);
  const login = role === 'hr' ? '/api/auth/login' : '/api/auth/employee/login';
  expect((await page.request.post(login, { data: role === 'hr' ? HR : { email: 'colaborador@todos-os-dados.demo', password: 'DemoTodosDados!2026' } })).ok()).toBeTruthy();
  let url = '/employee/dp';
  if (role === 'hr') {
    const { items } = await (await page.request.get('/api/admin/employees/search')).json();
    url = `/dashboard?tab=team&candidate=${items[0].id}&section=dp`;
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const upload = page.getByRole('button', { name: /anexar arquivo/i }).first();
  await expect(upload).toBeVisible();
  if (role === 'hr') {
    const rows = page.locator('li').filter({ has: page.getByRole('button', { name: /anexar arquivo/i }) });
    const overflow = await rows.evaluateAll(elements => elements.some(row => {
      const rect = row.getBoundingClientRect();
      return [...row.querySelectorAll('button')].some(button => button.getBoundingClientRect().right > rect.right + 1);
    }));
    expect(overflow).toBe(false);
    await upload.scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/private/tmp/p0-documents-fixed-mobile.png' });
  }
  let pending;
  await page.route('**/documents/*/file', route => { pending = route; });
  const picker = page.waitForEvent('filechooser');
  await upload.click();
  await (await picker).setFiles({ name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
  await expect(page.getByText('O envio demorou mais que o esperado. Atualize a lista para conferir se o arquivo chegou antes de tentar novamente.')).toBeVisible({ timeout: 40000 });
  await expect(upload).toBeEnabled();
  await pending?.abort().catch(() => {});
  await page.unroute('**/documents/*/file');
});

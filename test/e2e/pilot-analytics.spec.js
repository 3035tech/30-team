/** Pilot smoke for Reports: UI, metadata, request trace and tenant scope. */
import { test, expect } from '@playwright/test';
import { HR, dismissManagerOnboarding, fillLogin } from './fixtures.js';

test('pilot reports: filters, trace metadata and tenant isolation', async ({ page }) => {
  await page.goto('/login');
  await fillLogin(page, HR);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await dismissManagerOnboarding(page);

  await page.goto('/dashboard?tab=analytics');
  const start = page.getByLabel(/data início|start date/i);
  const end = page.getByLabel(/data fim|end date/i);
  await expect(start).toBeVisible({ timeout: 20_000 });
  await expect(end).toBeVisible();

  const [startBox, endBox] = await Promise.all([start.boundingBox(), end.boundingBox()]);
  expect(startBox).not.toBeNull();
  expect(endBox).not.toBeNull();
  expect(Math.abs(startBox.y - endBox.y)).toBeLessThan(8);

  await start.fill('2025-01-01');
  await end.fill('2026-12-31');
  await page.getByRole('button', { name: /^aplicar$|^apply$/i }).click();
  await expect(page).toHaveURL(/analyticsStart=2025-01-01/);
  await page.reload();
  await expect(start).toHaveValue('2025-01-01');
  await expect(end).toHaveValue('2026-12-31');

  const baseline = await page.request.get('/api/admin/analytics/metrics');
  const forged = await page.request.get('/api/admin/analytics/metrics?companyId=99999999');
  expect(baseline.ok()).toBeTruthy();
  expect(forged.ok()).toBeTruthy();
  expect(baseline.headers()['x-request-id']).toBeTruthy();
  const [baselineBody, forgedBody] = await Promise.all([baseline.json(), forged.json()]);
  expect(baselineBody.meta?.generatedAt).toBeTruthy();
  expect(baselineBody.meta?.sampleSize).toBeTruthy();
  expect(forgedBody.metrics).toEqual(baselineBody.metrics);
});

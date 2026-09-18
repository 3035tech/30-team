/**
 * Jornada de aceite do piloto: descoberta pública → login do RH → vaga →
 * pipeline → pessoa contratada na Equipe. Assessment e DnD mutável possuem
 * specs separados para que uma falha continue localizável.
 */
import { test, expect } from '@playwright/test';
import { HR, PUBLIC, dismissManagerOnboarding, fillLogin } from './fixtures.js';

test('pilot journey: public job → manager pipeline → team', async ({ page }) => {
  await page.goto(PUBLIC.jobsIndex);
  const publicJob = page.getByRole('link').filter({ hasText: /engenheiro|fullstack|plataforma/i }).first();
  await expect(publicJob).toBeVisible();
  await publicJob.click();
  await expect(page).toHaveURL(/\/jobs\/.+-\d+/);
  await expect(page.getByRole('button', { name: /candidatar|apply|iniciar teste/i })).toBeVisible();

  await page.goto('/login');
  await fillLogin(page, HR);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await dismissManagerOnboarding(page);

  const sidebar = page.locator('#dashboard-sidebar');
  await sidebar.getByRole('button', { name: /recrutamento|recruitment/i }).click();
  await sidebar.getByRole('button', { name: /vagas|vacancies/i }).click();
  await expect(page).toHaveURL(/tab=vacancies/);
  const listRes = await page.request.get('/api/admin/vacancies?page=1&pageSize=20');
  expect(listRes.ok()).toBeTruthy();
  const listBody = await listRes.json();
  const rows = Array.isArray(listBody?.items) ? listBody.items : [];
  const vacancy = rows.find(
    (item) =>
      String(item?.status || '').toLowerCase() === 'open' &&
      /engenheiro|fullstack|plataforma/i.test(String(item?.title || ''))
  );
  expect(vacancy?.id).toBeTruthy();
  await page.goto(`/dashboard?tab=vacancies&vacancyDetail=${vacancy.id}`);
  await expect(page.getByText(/pipeline de candidatos|candidate pipeline/i)).toBeVisible({ timeout: 20_000 });
  await expect(
    page.locator('.kanban-scroll').getByRole('button', { name: /contratado|hired/i })
  ).toBeVisible();

  await sidebar.getByRole('button', { name: /pessoas|people/i }).click();
  await sidebar.getByRole('button', { name: /equipe|team/i }).click();
  await expect(page).toHaveURL(/tab=team/);
  await expect(page.getByText(/elena ferreira|colaborador|employee/i).first()).toBeVisible({ timeout: 20_000 });
});

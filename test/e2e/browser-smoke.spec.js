/**
 * Smoke de navegação / layout no Chromium (DTOV + Next local).
 * Cobre superfícies públicas + login HR + abas do dashboard.
 */

import { test, expect } from '@playwright/test';
import { TOK, HR, PUBLIC } from './fixtures.js';

async function fillLogin(page, { email, password }) {
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/senha|password/i).fill(password);
  await page.getByRole('button', { name: /entrar|sign in/i }).click();
}

test.describe('public pages', () => {
  test('home and login render', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await page.goto('/login');
    await expect(page.getByLabel(/e-?mail/i)).toBeVisible();
    await expect(page.getByLabel(/senha|password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar|sign in/i })).toBeVisible();
  });

  test('public vacancy open — title, description, apply CTA', async ({ page }) => {
    await page.goto(PUBLIC.vagaOpen);
    await expect(page).toHaveURL(/\/j\/engenheiro-fullstack-plataforma-\d+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /descrição da vaga|job description/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /candidatar|apply|iniciar teste/i })).toBeVisible();
  });

  test('public vacancy closed — thanks + browse CTA', async ({ page }) => {
    await page.goto(PUBLIC.vagaClosed);
    await expect(page).toHaveURL(/\/j\/analista-dados-encerrada-\d+/);
    await expect(page.getByRole('heading', { level: 1, name: /obrigado|thank/i })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /vagas abertas|open vacancies|browse/i }).first()
    ).toBeVisible();
  });

  test('vagas index lists openings', async ({ page }) => {
    await page.goto(PUBLIC.vagasIndex);
    await expect(page.getByRole('heading', { level: 1, name: /vagas abertas|open vacancies/i })).toBeVisible();
    await expect(page.getByRole('link').filter({ hasText: /engenheiro|fullstack|plataforma/i }).first()).toBeVisible();
  });

  test('token flows load assessment shells', async ({ page }) => {
    await page.goto(`/t/${TOK.company}`);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('input, button, [role="button"]').first()).toBeVisible({ timeout: 20_000 });

    await page.goto(`/v/${TOK.vacancyOpen}`);
    await expect(page.locator('input, button, [role="button"]').first()).toBeVisible({ timeout: 20_000 });

    await page.goto(`/assessment/motivators/${TOK.aeInvite}`);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('dashboard navigation (HR)', () => {
  test('login → sidebar → switch tabs → vacancies UI', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, HR);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    const sidebar = page.locator('#dashboard-sidebar');
    await expect(sidebar).toBeVisible();

    await sidebar.getByRole('button', { name: /equipe|team/i }).click();
    await expect(page).toHaveURL(/tab=team/);

    await sidebar.getByRole('button', { name: /vagas|vacancies/i }).click();
    await expect(page).toHaveURL(/tab=vacancies/);
    await expect(page.getByText(/engenheiro|vaga|vacancy|criar|new/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('mobile layout — hamburger opens sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await fillLogin(page, HR);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    const hamburger = page.getByRole('button', { name: /abrir menu|open menu/i });
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    await expect(page.locator('#dashboard-sidebar')).toBeVisible();
    await expect(
      page.locator('#dashboard-sidebar').getByRole('button', { name: 'Visão geral', exact: true })
    ).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { HR, dismissManagerOnboarding, fillLogin } from './fixtures.js';

const CRITICAL_TABS = [
  ['overview', /visão geral|overview/i],
  ['vacancies', /vagas|vacancies/i],
  ['talent-bank', /banco de talentos|talent bank/i],
  ['team', /equipe|team/i],
  ['profile', /perfil|profile|configurações|settings/i],
];

async function login(page) {
  await page.goto('/login');
  await fillLogin(page, HR);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await dismissManagerOnboarding(page);
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`pilot UI: critical manager surfaces remain usable on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await login(page);

    for (const [tab, label] of CRITICAL_TABS) {
      await page.goto(`/dashboard?tab=${tab}`);
      await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('body')).not.toHaveText(/application error|erro na aplicação/i);

      const hasBodyOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 2
      );
      expect(hasBodyOverflow, `${tab} must not overflow the viewport`).toBeFalsy();

      // Profile is intentionally reached from the account menu, not duplicated
      // in the destination sidebar.
      if (viewport.name === 'mobile' && tab !== 'profile') {
        await page.getByRole('button', { name: /abrir menu|open menu/i }).click();
        const activeItem = page.locator(`#${tab}-tab`);
        await expect(activeItem).toBeVisible();
        await expect(activeItem).toHaveAttribute('aria-current', 'page');
        const activeLabel = await activeItem.getAttribute('aria-label');
        expect(activeLabel || '').toMatch(label);
        await page.getByRole('button', { name: /fechar menu|close menu/i }).click();
      }
    }
  });
}

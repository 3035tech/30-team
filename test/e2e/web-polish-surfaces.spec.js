import { test, expect } from '@playwright/test';
import { HR, dismissManagerOnboarding, fillLogin } from './fixtures.js';

// Local DTOV only: screenshot artifacts contain synthetic demo records.
test.beforeEach(async ({ baseURL }) => {
  expect(new URL(baseURL).hostname).toMatch(/^(127\.0\.0\.1|localhost)$/);
});
const managerTabs = ['overview','analytics','team','compensation','vacancies','talent-bank','job-roles','performance-reviews','okr','succession','learning-resources','lms','compatibility','compare','group','leadership','motivators','climate','exit-analysis','dp','whistleblowing','company-benefits','company-feed','profile','help'];
async function surface(page, name) {
  await expect(page.getByRole('main').last()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/application error|erro na aplicação/i);
  expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), name + ': overflow').toBe(true);
  await page.screenshot({ path: test.info().outputPath(name + '.png'), fullPage: true });
}
for (const width of [390,1440]) {
  test('polish: HR surfaces and visible links at ' + width, async ({ page }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await fillLogin(page, HR);
    await expect(page).toHaveURL(/dashboard/);
    await dismissManagerOnboarding(page);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const tab of managerTabs) {
      await page.goto('/dashboard?tab=' + tab);
      await page.waitForLoadState('networkidle');
      await surface(page, 'hr-' + width + '-' + tab);
      // Empty hrefs are not usable destinations; in-page anchors remain valid.
      const emptyLinks = await page.locator('main a[href=""]').count();
      expect.soft(emptyLinks, tab + ': empty links').toBe(0);
    }
    expect(errors).toEqual([]);
  });
}

test('polish: admin surfaces', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/login');
  await fillLogin(page, {email: process.env.DTOV_ADMIN_EMAIL || 'admin@3035tech.com',password: process.env.DTOV_ADMIN_PASSWORD || 'TroqueEstaSenha123!'});
  await expect(page).toHaveURL(/dashboard/);
  await dismissManagerOnboarding(page);
  for (const tab of ['companies','users','leads','product-feedback','audit']) {
    await page.goto('/dashboard?tab=' + tab);
    await page.waitForLoadState('networkidle');
    await surface(page, 'admin-' + tab);
  }
});

test('polish: employee DP API, error/retry and dedicated screens', async ({ page }) => {
  test.setTimeout(120000);
  const login = await page.request.post('/api/auth/employee/login', {data:{email:'colaborador@todos-os-dados.demo',password:HR.password,locale:'pt-BR'}});
  expect(login.status()).toBe(200);
  const dp = await page.request.get('/api/employee/dp');
  expect(dp.status()).toBe(200);
  expect((await dp.json()).ok).toBe(true);
  let simulateError = true;
  await page.route('**/api/employee/dp', route => simulateError
    ? route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({errorCode:'INTERNAL',error:'Erro interno'})})
    : route.continue());
  await page.goto('/employee/dp');
  const retry = page.getByRole('button', {name:'Tentar novamente',exact:true});
  await expect(retry).toBeVisible();
  await expect(page.getByText('Sem dados ainda. Edite a ficha.',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Editar ficha',exact:true})).toHaveCount(0);
  await page.screenshot({path:test.info().outputPath('dp-error.png')});
  simulateError = false;
  await retry.click();
  await expect(page.getByRole('button',{name:'Editar ficha',exact:true})).toBeVisible();
  for (const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    for (const path of ['/employee','/employee/dp','/employee/time-clock','/employee/lms','/employee/profile']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await surface(page, 'employee-' + width + '-' + path.replaceAll('/','-'));
    }
  }
});

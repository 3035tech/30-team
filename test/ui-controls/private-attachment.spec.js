const { test, expect } = require('@playwright/test');

test('private attachment: icon/name, authenticated download, failure/retry and no storage link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let fail = true;
  let calls = 0;
  await page.route('**/api/employee/dp/documents/address_proof/file', async route => {
    calls++;
    if (fail) return route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"denied"}' });
    await new Promise(resolve => setTimeout(resolve, 250));
    return route.fulfill({ status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="test.pdf"' }, body: '%PDF-1.4\n%%EOF' });
  });
  await page.goto('/');
  const card = page.getByRole('region', { name: 'Anexo privado' });
  await expect(card.getByText('Comprovante de endereço.pdf', { exact: true })).toBeVisible();
  await expect(card.locator('svg')).toHaveCount(2);
  await expect(card.locator('a')).toHaveCount(0);
  const button = card.getByRole('button', { name: 'Baixar arquivo: Comprovante de endereço.pdf' });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(card.getByRole('alert')).toBeVisible();
  fail = false;
  const downloaded = page.waitForEvent('download');
  await button.click();
  await expect(button).toBeDisabled();
  await expect(button).toContainText('Baixando');
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe('Comprovante de endereço.pdf');
  expect(await file.failure()).toBe(null);
  await expect(button).toBeEnabled();
  await expect(card.getByRole('alert')).toHaveCount(0);
  expect(calls).toBe(2);
  expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await card.screenshot({ path: test.info().outputPath('private-attachment.png') });
});

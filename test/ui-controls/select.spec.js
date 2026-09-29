const { test, expect } = require('@playwright/test');
test('language options fit their content and stay inside the viewport', async ({ page }) => {
  await page.goto('/');
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const language = page.getByRole('combobox', { name: 'Idioma', exact: true });
    await language.click();
    const menu = page.getByRole('listbox');
    await expect(menu).toBeVisible();
    const bounds = await menu.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(8);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 8);
    expect(bounds.width).toBeGreaterThan((await language.boundingBox()).width);
    expect(await menu.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`language-${width}.png`) });
    await language.press('Escape');
  }
});
test('custom selection: keyboard, disabled options, escape, form/reset and small screen', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const area = page.getByRole('combobox', { name: 'Área', exact: true });
  await area.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await area.press('ArrowDown');
  await area.press('Enter');
  await expect(page.getByTestId('selected')).toHaveText('people');
  await area.click();
  await area.press('End');
  await area.press('Escape');
  await expect(page.getByTestId('selected')).toHaveText('people');
  await expect(area).toBeFocused();
  await area.press('a');
  await area.press('Enter');
  await expect(page.getByTestId('selected')).toHaveText('support');
  await expect(page.getByTestId('calls')).toHaveText('2');
  await area.click();
  await page.getByRole('option', { name: /Atendimento/ }).click();
  await expect(page.getByTestId('calls')).toHaveText('2');
  await page.getByRole('button', { name: 'Abrir por referência' }).click();
  await expect(page.getByRole('combobox', { name: 'Dentro do card' })).toBeFocused();
  await page.getByRole('option', { name: 'Segunda', exact: true }).click();
  await expect(page.getByTestId('row-calls')).toHaveText('0');
  await expect(page.getByRole('combobox', { name: 'Bloqueado' })).toBeDisabled();
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('combobox', { name: 'Empresa', exact: true })).toBeFocused();
  await page.getByRole('option', { name: 'Empresa demonstração' }).click();
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByTestId('result')).toHaveText('demo');
  await page.getByRole('button', { name: 'Limpar' }).click();
  await expect(page.getByRole('combobox', { name: 'Empresa', exact: true })).toHaveText('Selecione a empresa');
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await area.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('select-' + width + '.png') });
    await area.press('Escape');
  }
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await area.click();
  await page.screenshot({ path: test.info().outputPath('select-dark.png') });
  expect(errors).toEqual([]);
});

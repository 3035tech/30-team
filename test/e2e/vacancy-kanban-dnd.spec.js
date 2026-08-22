/**
 * B-002 — Drag-and-drop no kanban da vaga (gestor HR logado).
 * Demo: Nina Barbosa na vaga aberta. Idempotente — move entre estágios
 * sem modal (não hired/rejected), a partir da coluna atual.
 */

import { test, expect } from '@playwright/test';
import { HR, fillLogin, html5DragAndDrop } from './fixtures.js';

const CANDIDATE = /Nina Barbosa/i;

/** Coluna do kanban cujo cabeçalho contém o rótulo do estágio. */
function stageColumn(page, stageRe) {
  return page.locator('.kanban-scroll > div > div').filter({
    has: page.locator('span', { hasText: stageRe }),
  }).first();
}

/** Estágios sem modal de extras (reject/hire). Prefer targets distinct from source. */
const SAFE_TARGETS = [
  { re: /Entrevista|Interview/i, id: 'interview' },
  { re: /Triagem|Screening/i, id: 'screening' },
  { re: /Novo|New/i, id: 'new' },
  { re: /Teste concluído|Test completed/i, id: 'test_completed' },
];

test.describe('vacancy kanban drag-and-drop', () => {
  test('HR moves candidate card between pipeline columns', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/login');
    await fillLogin(page, HR);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    const sidebar = page.locator('#dashboard-sidebar');
    await sidebar.getByRole('button', { name: /vagas|vacancies/i }).click();
    await expect(page).toHaveURL(/tab=vacancies/);

    const listRes = await page.request.get('/api/admin/vacancies?page=1&pageSize=20');
    expect(listRes.ok()).toBeTruthy();
    const listBody = await listRes.json();
    const rows = Array.isArray(listBody?.items) ? listBody.items : [];
    const openVacancy = rows.find(
      (v) =>
        v &&
        String(v.status || '').toLowerCase() === 'open' &&
        /engenheiro|fullstack|plataforma/i.test(String(v.title || ''))
    );
    expect(openVacancy?.id).toBeTruthy();

    await page.goto(`/dashboard?tab=vacancies&vacancyDetail=${openVacancy.id}`);
    await expect(page).toHaveURL(/vacancyDetail=/);
    await expect(page.getByText(/pipeline de candidatos|candidate pipeline/i)).toBeVisible({
      timeout: 20_000,
    });

    const card = page
      .locator('.kanban-scroll div[draggable="true"]')
      .filter({ hasText: CANDIDATE })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });

    // Coluna atual = ancestral de estágio que contém o card
    let sourceMeta = null;
    for (const s of SAFE_TARGETS) {
      const col = stageColumn(page, s.re);
      if ((await col.locator('div[draggable="true"]').filter({ hasText: CANDIDATE }).count()) > 0) {
        sourceMeta = s;
        break;
      }
    }
    expect(sourceMeta).toBeTruthy();

    const targetMeta = SAFE_TARGETS.find((s) => s.id !== sourceMeta.id);
    expect(targetMeta).toBeTruthy();

    const fromCol = stageColumn(page, sourceMeta.re);
    const toCol = stageColumn(page, targetMeta.re);

    const patchPromise = page.waitForResponse(
      (res) => {
        if (res.request().method() !== 'PATCH') return false;
        const u = res.url();
        return (
          (/\/api\/admin\/assessments\/\d+/.test(u) ||
            /\/api\/admin\/vacancies\/\d+\/candidates\//.test(u)) &&
          res.ok()
        );
      },
      { timeout: 20_000 }
    );

    await html5DragAndDrop(card, toCol);
    await patchPromise;

    await expect(toCol.getByText(CANDIDATE)).toBeVisible({ timeout: 15_000 });
    await expect(fromCol.getByText(CANDIDATE)).toHaveCount(0);
  });
});

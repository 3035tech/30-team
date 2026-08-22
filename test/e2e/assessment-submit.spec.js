/**
 * B-001 — Preenchimento completo do assessment até tela de resultado.
 * Cobre /t/{token} (empresa) com e-mail único; Likert 1–5 via .cand-scale-btn.
 */

import { test, expect } from '@playwright/test';
import { TOK, uniqueCandidateEmail } from './fixtures.js';

const QUESTION_TOTAL = 54;
/** Fade 280ms + paint; leave headroom for slow CI. */
const ANSWER_SETTLE_MS = 400;

async function fillStartForm(page, { name, email }) {
  await expect(page.getByRole('button', { name: /começar|start/i })).toBeVisible({ timeout: 20_000 });

  await page.getByPlaceholder(/Ex:\s*Maria Silva/i).fill(name);
  await page.getByPlaceholder(/maria@empresa\.com/i).fill(email);

  const consent = page.locator('.cand-flow-card input[type="checkbox"]').first();
  await consent.check();

  await expect(page.getByRole('button', { name: /começar|start/i })).toBeEnabled();
  await page.getByRole('button', { name: /começar|start/i }).click();
}

async function answerAllLikert(page) {
  await expect(page.getByText(/questão\s+1\s+de\s+54|question\s+1\s+of\s+54/i)).toBeVisible({
    timeout: 15_000,
  });

  for (let i = 0; i < QUESTION_TOTAL; i += 1) {
    const progress = page.getByText(
      new RegExp(`questão\\s+${i + 1}\\s+de\\s+54|question\\s+${i + 1}\\s+of\\s+54`, 'i')
    );
    await expect(progress).toBeVisible({ timeout: 10_000 });

    const option = page.locator('button.cand-scale-btn').nth(2);
    await expect(option).toBeVisible();
    await option.click();

    if (i < QUESTION_TOTAL - 1) {
      await page.waitForTimeout(ANSWER_SETTLE_MS);
    }
  }
}

test.describe('assessment full submit', () => {
  test(' /t token — fill all Likert answers and see thank-you result', async ({ page }) => {
    test.setTimeout(180_000);

    const email = uniqueCandidateEmail('assess');
    const name = `E2E Assess ${Date.now().toString(36)}`;

    await page.goto(`/t/${TOK.company}`);
    await fillStartForm(page, { name, email });

    const resultsResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/api/results') &&
        res.request().method() === 'POST' &&
        res.status() >= 200 &&
        res.status() < 300,
      { timeout: 60_000 }
    );

    await answerAllLikert(page);
    await resultsResponse;

    await expect(page.getByRole('heading', { name: /obrigado|thank you/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/respostas foram registradas|answers (were )?recorded|rh usará|hr (will|team)/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /concluir|done|finish/i })).toBeVisible();
    await expect(page.getByText(/não foi possível registrar|save error|retry|tentar enviar/i)).toHaveCount(0);
  });
});

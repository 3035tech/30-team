/** Tokens / creds alinhados ao seed demo Todos os Dados (DTOV). */

export const TOK = {
  company: 'd0d0todosdadose5f60718293a4b5c6d7e8f01',
  vacancyOpen: 'e1e1todosdadose5f60718293a4b5c6d7e8f02',
  report: 'a3a3todosdadose5f60718293a4b5c6d7e8f04a3a3todosdadose5f60718',
  aeInvite: 'b4b4todosdadose5f60718293a4b5c6d7e8f05',
};

export const HR = {
  email: 'hr@todos-os-dados.demo',
  password: process.env.DEMO_TODOS_PASSWORD || 'DemoTodosDados!2026',
};

export const PUBLIC = {
  jobsIndex: '/jobs',
};

/** E-mail único por run — evita colisão em links com require_candidate_email. */
export function uniqueCandidateEmail(prefix = 'e2e') {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}.${stamp}@e2e.30team.test`;
}

export async function fillLogin(page, { email, password } = HR) {
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/senha|password/i).fill(password);
  await page.getByRole('button', { name: /entrar|sign in/i }).click();
}

/**
 * HTML5 DnD for React handlers that use dataTransfer.setData/getData.
 * Playwright mouse dragTo often skips DataTransfer; this exercises the real onDrop path.
 */
export async function html5DragAndDrop(source, target) {
  const handle = await target.elementHandle();
  if (!handle) throw new Error('html5DragAndDrop: target not found');
  await source.evaluate((src, tgt) => {
    const dt = new DataTransfer();
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    tgt.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
    tgt.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    tgt.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    src.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, handle);
}

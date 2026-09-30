const {test, expect} = require('@playwright/test');
test('drop saves hierarchy with subtree, rejects cycles, clears manager and keeps tree on failure', async ({page}) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const people = [
    {id: 1, name: 'Ana Diretora', managerCandidateId: null},
    {id: 2, name: 'Bruno Gestor', managerCandidateId: null},
    {id: 3, name: 'Carla Analista', managerCandidateId: 2},
  ];
  const writes = [];
  let fail = false;
  let releaseRefresh;
  const refreshGate = new Promise(resolve => { releaseRefresh = resolve; });
  await page.route('**/api/admin/org-chart**', async route => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      writes.push(body);
      if (fail) return route.fulfill({status: 500, json: {error: 'Não foi possível salvar o gestor.'}});
      people.find(p => p.id === body.candidateId).managerCandidateId = body.managerCandidateId;
      return route.fulfill({json: {ok: true, ...body}});
    }
    if (writes.length === 1) await refreshGate;
    const nodes = people.map(p => ({...p, children: []}));
    for (const node of nodes) nodes.find(p => p.id === node.managerCandidateId)?.children.push(node);
    return route.fulfill({json: {roots: nodes.filter(p => !p.managerCandidateId), total: 3, withManager: nodes.filter(p => p.managerCandidateId).length}});
  });
  const card = id => page.locator(`[data-person-id="${id}"]`);
  const handle = id => card(id).locator('button[draggable]');
  await page.goto('/org-chart');
  await expect(card(3)).toBeVisible();
  await handle(2).dragTo(handle(1));
  await expect.poll(() => writes.length).toBe(1);
  await expect(card(2)).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  await expect(handle(2)).toBeDisabled();
  releaseRefresh();
  await expect(handle(2)).toBeEnabled();
  expect(writes[0]).toMatchObject({candidateId: 2, managerCandidateId: 1, companyId: 1});
  await expect(card(3)).toBeVisible();
  expect((await card(3).boundingBox()).y).toBeGreaterThan((await card(2).boundingBox()).y);
  expect((await card(2).boundingBox()).y).toBeGreaterThan((await card(1).boundingBox()).y);
  // Reload must use persisted hierarchy, including the moved person's descendants.
  await page.reload();
  await expect(card(3)).toBeVisible();
  await handle(1).dragTo(handle(3));
  expect(writes).toHaveLength(1);
  await handle(2).dragTo(handle(1)); // unchanged manager is a no-op
  expect(writes).toHaveLength(1);
  await handle(2).dragTo(page.locator('[data-org-root-drop]'));
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1].managerCandidateId).toBeNull();
  await expect(card(2)).toBeVisible();
  expect((await card(2).boundingBox()).y).toBe((await card(1).boundingBox()).y);
  fail = true;
  await handle(2).dragTo(handle(1));
  await expect(page.getByRole('alert').filter({hasText: 'Não foi possível salvar'})).toContainText('Não foi possível salvar o gestor.');
  expect((await card(2).boundingBox()).y).toBe((await card(1).boundingBox()).y);
  fail = false;
  await expect(page.getByRole('complementary')).toHaveCount(0);
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await handle(2).dragTo(handle(1));
  await expect.poll(() => writes.length).toBe(4);
  expect(writes[3]).toMatchObject({candidateId: 2, managerCandidateId: 1});
  await expect(card(3)).toBeVisible();
  expect((await card(2).boundingBox()).y).toBeGreaterThan((await card(1).boundingBox()).y);
  await card(3).getByRole('button', {name: 'Abrir Carla Analista na Equipe', exact: true}).click();
  expect(await page.evaluate(() => window.__orgNav)).toEqual({tab: 'team', candidate: '3', roster: 'internal'});
  await page.screenshot({path: test.info().outputPath('org-drag.png'), fullPage: true});
  expect(errors).toEqual([]);
});

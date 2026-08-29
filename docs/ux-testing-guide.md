# UX/UI — Guia de Testes Manuais

Checklist para validar as melhorias implementadas. Execute em **desktop** (Chrome/Safari) e **mobile** (iOS Safari/Android Chrome).

---

## ✅ Fase C: Testes

### 1. **Dark Mode**

**Desktop:**
- [ ] Toggle no header muda tema instantaneamente
- [ ] Refresh preserva preferência (localStorage)
- [ ] Cores legíveis (canvas, ink, borders)
- [ ] Type badges mantêm vivacidade
- [ ] Shadows visíveis mas suaves

**Mobile:**
- [ ] Toggle acessível (44px min)
- [ ] Transição smooth em scroll

**Edge Cases:**
- [ ] Primeira visita: default light (preferência só em `localStorage` `team30_dark_mode`; não segue `prefers-color-scheme`)
- [ ] Limpar localStorage: volta ao default light

---

### 2. **Busca Global (Cmd+K)**

**Desktop:**
- [ ] `Cmd+K` (Mac) / `Ctrl+K` (Win) abre modal
- [ ] Input com foco imediato
- [ ] Busca após 300ms de digitação
- [ ] 3 categorias: Candidatos, Vagas, Grupos
- [ ] `↑` `↓` navega resultados
- [ ] `Enter` seleciona e navega
- [ ] `Esc` fecha modal

**Mobile:**
- [ ] Modal responsivo (max-w full - 2rem)
- [ ] Teclado não cobre resultados
- [ ] Touch scroll funciona

**Edge Cases:**
- [ ] Query < 2 chars: sem resultados
- [ ] Query vazia: limpa resultados
- [ ] Sem resultados: empty state
- [ ] >5 resultados por categoria: trunca

**API:**
```bash
curl -H "Cookie: team30_session=..." \
  "http://localhost:3000/api/admin/search?q=joao"
```

---

### 3. **Atalhos de Teclado**

**Desktop:**
- [ ] `?` abre help modal
- [ ] `j` / `k` navega lista (quando implementado)
- [ ] `g` + `h` vai Overview
- [ ] `g` + `t` vai Equipe
- [ ] `g` + `v` vai Vagas
- [ ] `g` + `a` vai Analytics
- [ ] `Esc` fecha modais
- [ ] Indicador "g aguardando..." aparece

**Mobile:**
- [ ] Help modal responsivo
- [ ] Atalhos mostram Win/Mac corretos

**Edge Cases:**
- [ ] Atalhos não disparam em inputs
- [ ] `Esc` funciona em inputs (fecha, não dispara ação)
- [ ] `g` timeout de 1s

---

### 4. **Loading States**

**Componentes:**
- [ ] `<Skeleton>` renderiza gray pulse
- [ ] `<CardSkeleton count={3}>` renderiza 3 cards
- [ ] `<TableSkeleton rows={5} columns={4}>` renderiza tabela
- [ ] `<ProgressBar progress={50}>` mostra 50%
- [ ] `<Spinner size="lg">` anima corretamente
- [ ] `<LoadingOverlay isVisible>` cobre tela

**Uso Real:**
- Substituir spinners em:
  - [ ] Export CSV (ProgressBar)
  - [ ] Lista carregando (CardSkeleton)
  - [ ] Envio de email (LoadingOverlay)

---

### 5. **Confirmações + Undo**

**ConfirmActionDialog:**
- [ ] Modal danger com border vermelho
- [ ] `requiresTyping` exige input correto
- [ ] "Cancelar" fecha sem ação
- [ ] "Confirmar" executa callback
- [ ] Loading state no botão

**UndoToast:**
- [ ] Toast aparece no bottom-center
- [ ] Progress bar decrementa em 5s
- [ ] "Desfazer" chama onUndo
- [ ] "X" confirma ação (pendingAction)
- [ ] Auto-confirma após 5s

**Uso Real:**
- Testar em:
  - [ ] Deletar vaga (confirm + undo)
  - [ ] Remover candidato (confirm)

---

### 6. **Mobile Fixes**

**Sidebar:**
- [ ] Overlay cobre tela toda
- [ ] Sidebar z-index > overlay
- [ ] Body scroll lock quando aberta
- [ ] Swipe fecha sidebar

**Kanban:**
- [ ] Scroll horizontal touch-friendly
- [ ] Drag funciona (se implementado)
- [ ] Cards não selecionam texto durante drag

**Forms:**
- [ ] Inputs 44px min-height
- [ ] Font-size 16px (sem zoom iOS)
- [ ] Labels espaçadas
- [ ] Buttons 44px min

**Modals:**
- [ ] 90dvh max-height (não corta)
- [ ] Drawer vem de baixo
- [ ] Body lock quando aberto

**Tables:**
- [ ] Scroll horizontal
- [ ] Sombra direita indica mais conteúdo

**Safe Areas:**
- [ ] Notch não corta sidebar
- [ ] Bottom bar não corta footer

---

### 7. **Onboarding (já testado)**

- [ ] Tooltips aparecem só 1x
- [ ] Checklist no Overview < 100%
- [ ] Tour modal opt-in
- [ ] Empty states acionáveis

---

## 🧪 Smoke Tests (Automatizáveis)

Criar testes E2E com Playwright:

```js
// test/e2e/ux-smoke.spec.js
test('Dark mode toggle works', async ({ page }) => {
  await page.goto('/dashboard');
  const toggle = page.locator('[aria-label*="Ativar modo"]');
  await toggle.click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('Cmd+K opens search', async ({ page }) => {
  await page.goto('/dashboard');
  await page.keyboard.press('Meta+K');
  await expect(page.locator('[placeholder*="Buscar"]')).toBeVisible();
});

test('Keyboard shortcuts help', async ({ page }) => {
  await page.goto('/dashboard');
  await page.keyboard.press('?');
  await expect(page.locator('text=Atalhos de Teclado')).toBeVisible();
});
```

---

## 🐛 Regressão (Não Quebrar)

- [ ] Login/logout funcionam
- [ ] Tabs navegam corretamente
- [ ] Filters aplicam
- [ ] Kanban drag-and-drop
- [ ] Assessment flow completo
- [ ] Export CSV
- [ ] Email notifications

---

## 📊 Métricas de Sucesso

Após 2 semanas em produção, medir:

| Métrica | Baseline | Target |
|---------|----------|--------|
| Taxa abandono D7 | ~40% | ~20% |
| Tempo 1ª ação | ~5min | ~2min |
| Uso mobile | ~5% | ~25% |
| Tickets "como fazer" | ~15/mês | ~5/mês |
| Uso dark mode | 0% | ~30% |
| Uso Cmd+K | 0 | >100 buscas/mês |

---

## ✅ Checklist Final

Antes de marcar UX como "done":

- [ ] Todos os testes manuais passam
- [ ] Mobile testado em iOS + Android real
- [ ] Dark mode sem flicker
- [ ] Atalhos não conflitam
- [ ] Loading states substituídos em 3+ lugares
- [ ] Confirmações em 2+ deletes críticos
- [ ] Documentação atualizada
- [ ] Guia no HelpTab (pt-BR + en)

---

## 🚀 Deploy

**Pre-deploy:**
1. Rodar `npm run build` local (verificar erros)
2. Testar em staging se disponível
3. Fazer backup de localStorage (dark_mode, tooltips_seen)

**Post-deploy:**
1. Smoke test em produção (login, Cmd+K, dark mode)
2. Monitorar erros (Sentry/console)
3. Coletar feedback primeiros usuários

**Rollback:**
Se critical bug:
```bash
git revert <commit-hash>
git push origin main
```

Componentes são todos opt-in, então podem ser desabilitados sem revert completo.

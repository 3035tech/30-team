# Polish web MVP: trabalho em andamento

## Estado atual: seletores customizados validados

A migração dos selects visíveis foi concluída nos consumidores restantes.
A busca em app encontra apenas o select oculto de SelectField (contrato de
formulário) e uma menção em comentário. APIs, SQL, regras de domínio e
dependências não foram alterados. O calendário DateField continua nativo.

Evidências desta etapa:
- npm run build: passou, compilação completa e geração de rotas.
- npx playwright test --config test/ui-controls/playwright.config.js:
  passou, 1 teste Chromium com teclado, foco/ref, disabled, typeahead,
  Escape, required, FormData, reset, propagação de clique e mesma seleção.
- Capturas 375/768/1440 px geradas sem overflow; light 375 e dark 1440
  inspecionadas. Fixture isolada, não equivale à homologação das telas reais.
- Navegação e guia de ajuda: 6 testes unitários passaram.
- git diff --check: passou.

Pipeline desta etapa: Test passou na primeira rodada; revisão final sem
bloqueador identificado no escopo validado. DTOV dispensado nesta etapa
somente UI. O E2E de signup foi adaptado, mas não executado com backend.

Pendências: calendário customizado, auditoria autenticada tela a tela,
fluxos reais (inclusive editor e dialogs), links, estados e aceite de release.
Nenhum commit, push ou deploy. Os registros abaixo são históricos e não
substituem este estado atual; não há aceite global do MVP para produção.

## Atualização: ambiente recomposto

O bloqueio de dependências descrito abaixo foi resolvido com npm ci:
636 pacotes instalados, zero vulnerabilidades reportadas e zero arquivos
dataless em node_modules. package.json e package-lock.json não foram alterados.
Next 16.3.3 iniciou o preview isolado normalmente; Playwright 1.62.1 carregou.

O cenário isolado passou no Chromium: teclado, opção desabilitada, Escape,
typeahead, required, FormData, reset, overflow em 375/768/1440 px e ausência
de erros JavaScript. Capturas light/dark em /private/tmp/team30-web-polish.ysd29g;
a captura de 375 px foi inspecionada. Isso não homologa telas completas.

O npm sinalizou scripts ainda não aprovados de @sentry/cli, fsevents e
unrs-resolver; não foram autorizados automaticamente. Build completo e
integrações específicas continuam pendentes. Nenhum deploy executado.

## Pedido
Auditar todas as telas, funções, formulários, botões, alinhamento, componentes
e links, com acabamento customizado e preparação para produção.

## Escopo confirmado nesta rodada
- Repositório web separado do app; trabalho inicial limpo.
- 35 arquivos page e 34 arquivos JSX com selects encontrados.
- Lidos padrões de componentes, navegação, UI e pipeline de validação.
- Backlog existente: docs/BACKLOG-UI-AUDIT-ALL-SCREENS.md. Ele contém
  hipóteses e entregas históricas, não prova de homologação atual.
- Arquivos app/lib/docs/test foram hidratados do iCloud.

## Primeira implementação, NÃO VALIDADA
SelectField: popup próprio, teclado, foco, opções desabilitadas, grupos,
clique externo, posição por viewport e contrato de evento/formulário preservado
por select oculto (nenhum menu nativo visível nesse componente).

Integrado em AdminListFilters, LanguageSelect, BrStateSelect, BrCitySelect,
PromptFormDialog, dashboard-shared (pager/mais abas), AnalyticsTab.
Seletores de áreas dos comparativos recebem largura integral no grid existente.

Não foram migrados todos os selects. DateField ainda usa calendário nativo.
Não foram adicionados campos de domínio nem alteradas APIs, autorização ou SQL.
Não afirmar que todas as telas/botões/links foram exercitados.

## Direção visual
Preservar tokens de marca, tipografia e componentes canônicos do 30 Grow.
Padronizar primeiro controles e acessibilidade, depois composição por tela.
Sem segundo kit visual, sem remover HTML semântico, sem copiar layout mobile.
Referência externa solicitada ao responsável; ainda não fornecida.

## Bloqueio de validação
- 13.919 arquivos de node_modules encontrados como dataless.
- Preview Next temporário não chegou ao estado Ready.
- Playwright falhou no carregamento: TypeError: debugPkg is not a function,
  em playwright-core/lib/coreBundle.js. Não é evidência de falha do componente.
- Nenhum teste visual, screenshot, build ou aceite de produção concluído.
- git diff --check passou para o primeiro patch.
- dev-test-validate: Test blocked, primeira rodada, limite 3.
- DTOV não iniciado: alterações somente UI, sem prova de banco nesta rodada.
- Preview temporário e cenário Playwright estão em
  /private/tmp/team30-web-polish.ysd29g/preview. Não integram o produto.

## Retomada obrigatória
1. Recompor dependências a partir do lockfile em ambiente local estável,
   preferencialmente fora de pasta sujeita a descarregamento do iCloud.
2. Rodar cenário isolado e revisar screenshots em 375, 768 e 1440 px,
   light/dark, teclado, reset, required e integração com dialogs.
3. Corrigir regressões antes de ampliar a migração.
4. Validar telas autenticadas com dados de staging/DTOV e papéis adequados.
5. Percorrer o backlog por tela e registrar confirmado/provável/testado.
6. Tratar calendário customizado, campos restantes, links, botões e estados
   por fluxo. Não inventar campos sem contrato/requisito.
7. Build, regressão e checklist de release antes de qualquer publicação.

Nenhum commit, push ou deploy executado. Não promover este WIP para produção.

# RH — P3: consistência visual

## Status de fechamento

**Concluído no escopo do documento do RH e validado localmente.** A última execução integral passou nos 14 testes de navegador em 1,1 minuto, sem bloqueio de login, além de 46 testes unitários e 50 testes de segurança. Build de produção aprovado e verificações de whitespace aprovadas nos arquivos alterados. Os incidentes das rodadas anteriores, registrados abaixo para rastreabilidade, foram resolvidos.

Foram geradas 68 capturas na matriz de 17 vistas × dois temas × duas resoluções, além das capturas dos fluxos funcionais e estados vazios. Revisão visual cobriu todos os módulos citados e as correções encontradas, incluindo contraste do botão da IA, títulos duplicados, notas formatadas e valores completos em Vagas. Não há pendência conhecida de implementação/validação deste P3. Não houve deploy.

Comando final aprovado:

```sh
BASE_URL=http://localhost:3014 npx playwright test test/e2e/p3-visual-consistency.spec.js test/e2e/okr-hierarchy.spec.js test/e2e/p2-clarity.spec.js test/e2e/p0-vacancy-edit.spec.js test/e2e/p1-dependents.spec.js test/e2e/competency-categories.spec.js test/e2e/p1-formal-cycle.spec.js test/e2e/p1-people-navigation.spec.js
```

Capturas finais: `/private/tmp/p3-final-<vista>-<light|dark>-<1365|390>.png`. Implementação preserva regras, dados e permissões; os testes funcionais usam apenas o DTOV local.

## Escopo e direção

Padronização nos componentes compartilhados do painel e portal do colaborador, sem mudanças de banco, cálculos, permissões ou contratos de API.

- Paleta preservada: fundo #F5F4F7, fundo alternativo #EDEBF2, superfície #FFFFFF, texto #1A1625, marca #8930B8 e #76339B. Os equivalentes escuros continuam controlados pelas variáveis existentes.
- Tipografia centralizada em `lib/ui-typography.js`: página 24px, seção 20px, card 16px, corpo/ação 14px, apoio/rótulo/status 13px. Fonte de interface existente, sem novas fontes ou dependências.
- Espaçamento na escala existente de 4px: título próximo do conteúdo, 12–16px dentro dos grupos e 24px entre seções; cards com padding responsivo.
- Sem redesenho de identidade: hierarquia, contraste, proximidade e prioridade das ações orientaram os ajustes.

## Implementação

- Tokens compartilhados `S`, cabeçalhos, tabelas, formulários, diálogos, blocos recolhíveis e estados vazios usam a escala comum.
- O título principal do painel passa a ser h1. Um contexto informa esse título aos cabeçalhos internos: repetições textuais são omitidas; seções distintas permanecem como h2. Componentes fora do painel mantêm seu título de página.
- Rótulos e breadcrumbs deixam de depender de caixa alta, letras espaçadas e texto de baixo contraste.
- Inputs usam 16px em telas pequenas e 14px no desktop; mantém-se o comportamento dos controles e a navegação por teclado.
- Status quebram linha quando necessário; cores de texto de aviso, informação, sucesso e erro recebem contraste maior no tema claro, preservando as cores semânticas no escuro.
- Estados vazios compactos, alinhados à esquerda, com os mesmos callbacks, links e restrições de antes.
- Links dos cards de módulos são secundários. A ação de pendência permanece visualmente prioritária.
- Microtextos PT/EN do início, cursos e chegada são mais diretos. Datas de tarefas, cursos, pesquisas e jornada passam a usar apoio legível.
- Contadores continuam separados dos títulos; estado de expansão e persistência existentes são preservados.

## Validação local

Ambiente: cópia de validação em `/private/tmp/30grow-security-build.vbEpXn`, servidor de produção local na porta 3014, banco DTOV. Nenhuma publicação em produção.

Teste novo: `test/e2e/p3-visual-consistency.spec.js`.

- Gestão de Pessoas, Vagas, Avaliações, Cargos e OKRs: título único de página, tamanho, sentence case, breadcrumb e largura desktop/mobile.
- Competências: navegação pela aba real dentro de Avaliações, título de seção e responsividade.
- Diálogo de ciclo: digitação, tamanho responsivo do controle, ausência de overflow e cancelamento por Escape, sem salvar o registro visual.
- Portal: expansão por teclado, estado vazio de chegada simulado somente na resposta de leitura, expansão de PDI/Pesquisas/1:1, navegação para cursos e PDI.
- Tema claro/escuro: contraste mínimo 4,5:1 medido no texto do estado vazio e badges visíveis das pendências; não constitui auditoria automática de contraste de toda a aplicação.
- Capturas em desktop e 390px revisadas visualmente; títulos repetidos e fonte divergente dos diálogos encontrados na primeira revisão foram corrigidos.

Regressões: 7 cenários de navegador de P0/P1/P2 (edição e persistência de vaga, dependentes, OKR hierárquico/check-ins/histórico/ciclo fechado, 9-Box, motivadores, pesos e recuperação de falhas), 16 testes unitários de clareza/OKR e 50 testes de segurança passaram durante esta revisão.

Resultado final: build de produção aprovado. A suíte completa passou duas vezes (10/10). Após o último ajuste, restrito às classes de datas de pesquisas/jornada, a repetição passou nos 7 cenários de regressão e no cenário P3 do portal; os outros 2 cenários P3 pararam no login antes de abrir a interface. Diagnóstico HTTP confirmou `429 RATE_LIMIT`, `Retry-After: 308`: as execuções acumuladas atingiram os 25 logins por IP em 15 minutos. Esses dois cenários haviam passado sobre o mesmo código administrativo na rodada anterior. Nenhuma proteção foi desabilitada, nenhum contador Redis foi apagado e nenhum código de autenticação foi modificado.

Comando da suíte de navegador (10 testes):

```sh
BASE_URL=http://localhost:3014 npx playwright test test/e2e/p3-visual-consistency.spec.js test/e2e/okr-hierarchy.spec.js test/e2e/p2-clarity.spec.js test/e2e/p0-vacancy-edit.spec.js test/e2e/p1-dependents.spec.js
```

Capturas locais: `/private/tmp/p3-*-mobile.png`, `/private/tmp/p3-employee-*-desktop.png`. O cenário vazio não altera o banco; fixtures dos testes funcionais são removidas pelos próprios testes.

Limites: validação em Chromium; não equivale a testar cada permissão, conteúdo ou navegador da plataforma. P3 não envolve migração ou deploy.

## Fechamento complementar — revisão por módulo

A revisão complementar removeu exceções de 11–12px, rótulos decorativos em caixa alta e texto de baixo contraste nos módulos do documento. As classes de avisos/erros preservam cores semânticas com variantes adequadas ao tema escuro. A escala existente foi aplicada sem mudar handlers, consultas ou cálculos.

`test/unit/p3-ui-consistency.test.js` verifica os oito papéis tipográficos e impede o retorno dessas classes antigas em 29 arquivos: portal, PDI, Cursos, Pesquisas, Jornada e seus componentes internos, avaliações formais, Competências/Categorias, Gestão de Pessoas/1:1/dossiê, Vagas, Cargos, OKR, 9-Box, Motivadores, pesos, notas formatadas, indicadores, seletor de idioma e cabeçalhos. Na lista de cursos, a ação por curso ficou secundária para não competir com a continuação destacada. Menu lateral e filtros compartilhados também foram alinhados ao padrão.

A suíte P3 passou a capturar módulos administrativos e do colaborador, detalhes de pessoas e estados vazios/conteúdo, em 1365×900 e 390×844, nos dois temas. Sessões de autenticação são reutilizadas em memória por essa suíte; não se aumenta o limite nem se grava token em arquivo.

Verificações desta rodada: 46 testes unitários aprovados (30 de consistência e 16 existentes), 50 testes de segurança aprovados.

A revisão de capturas corrigiu ainda: duplicação dos títulos de Vagas/PDI/Leitura integrada, textos técnicos de Cursos/Vagas, cabeçalho de perfil fora da escala e fonte divergente em notas formatadas. As capturas usam `animations: 'disabled'` para não registrar cores e posições intermediárias das transições de tema/responsividade.

O teste de contraste ampliado detectou 3,48:1 no botão flutuante da IA em tema escuro; o texto e o ícone passaram a acompanhar o contraste escuro do botão primário. O teste cobre botões primários habilitados e visíveis em cada vista da matriz.

O cenário funcional de avaliações/PDI inicialmente fechava o perfil ao pressionar Escape após redimensionar a tela. O diagnóstico isolou essa ação no teste; substituímos por uma asserção de menu fechado, preservando o Escape da aplicação. A repetição isolada passou em 4,8s. O teste de categorias agora remove também os próprios IDs de competência/categoria criados, sem limpar dados de outras execuções.

A checagem de contraste usa uma leitura atômica dos elementos visíveis: botões mudam de estado durante o carregamento e locators posicionais coletados antes podiam apontar para um botão que já não existia. Corrigido somente no teste. Prazo e faixa salarial nos cards de Vagas deixam de truncar valores; uma asserção móvel verifica quebra de linha e largura do conteúdo.

# Polish web: cinco frentes (2026-09-19)

## Implementado
- DP: falha de consulta é um estado explícito com retry; não se apresenta como
  cadastro vazio e não apaga o badge de navegação por uma falha de rede.
- DateField: calendário próprio, data/hora, navegação por teclado, limites
  min/max/step preservados pelo input oculto, retorno de foco e pt-BR/en.
- SelectField: menu acima dos modais; interação com hora/minuto não fecha o
  calendário externo por propagação de pointerdown.
- PromptFormDialog: formulário semântico, validação de constraints, foco inicial,
  ciclo de Tab, retorno de foco, confirmação única por abertura e ações com wrap.
- Botões de diálogo: altura de toque canônica. Editor rico: ações por clique
  também funcionam com ativação de teclado.
- Provas locais adicionadas para controles e navegação por perfis.

## Evidências
- Chromium isolado: 3 testes passaram (seleção, calendário, formulário real).
- Capturas 375/768/1440 e dark geradas; calendário light 375 e dark inspecionados.
- DTOV reset: migrações, seed demonstrativo e smoke passaram.
- Regressão inicial SQL/libs: 76 passaram, zero falhas.
- HTTP parcial: autenticação, revogação, vagas, grupos, exportação e amostras
  de isolamento tenant A/B passaram até o ponto em que o ambiente parou.
- git diff --check passou após o patch inicial.

## Bloqueio / não homologado
O Next local em 127.0.0.1:3010 parou de responder; health teve timeout de 10 s.
Leituras locais também bloquearam. Arquivos lib/help-sections.js e
tailwind.config.js estavam marcados compressed,dataless pelo iCloud.
Foi solicitada hidratação dos diretórios app/lib/test e da configuração;
não foi suficiente para concluir esta execução. Não inferir causa do DP de
produção a partir desse problema de ambiente local.

Pipeline: blocked, rodada 1/3. Teste isolado passou; integração ampla incompleta.
Build final desta rodada não executado. Revisão final/aceite global pendentes.
O novo web-polish-surfaces.spec.js ainda precisa ser executado por completo:
25 abas de RH em duas larguras, 5 abas administrativas, 5 telas de colaborador,
API real de DP e falha 500 simulada seguida de recuperação.

## Retomar
Usar uma cópia de trabalho local estável (ou manter os arquivos baixados no
iCloud) antes de reiniciar a regressão. Com ambiente estável:
1. npm run dtov:full-app
2. npx playwright test --config test/ui-controls/playwright.config.js
3. npm run build
4. Inspecionar capturas autenticadas e corrigir somente os problemas comprovados.
5. Revisar permissões, acessibilidade e formulários completos antes de release.

Nenhuma API, SQL, dependência ou regra de negócio foi alterada. Sem deploy.
A revisão automática de rotas não substitui testar todos os botões, estados,
tecnologias assistivas ou os processos completos de cada módulo.

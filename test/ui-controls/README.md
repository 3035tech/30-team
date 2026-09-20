# Controles web: prova isolada

Executar da raiz: `npx playwright test --config test/ui-controls/playwright.config.js`.

Usa as dependências e componentes reais do repositório. Inicia Next somente
em 127.0.0.1:3098, sem .env do produto, banco, autenticação ou chamadas de negócio.
O servidor é encerrado pelo Playwright. Não existe rota de teste em app/.

Cobertura: teclado, opções desabilitadas, Escape, typeahead, required,
FormData/reset, ref, propagação de clique em cards e ausência de nova mutação
ao escolher o valor atual. Capturas em 375/768/1440 px e dark mode ficam em results/.
Não substitui E2E das telas autenticadas nem teste de leitor de tela.

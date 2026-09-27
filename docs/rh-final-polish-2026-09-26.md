# Revisão final de consistência — RH

Escopo: revisão local de P0–P3, sem nova reformulação visual. Preservados componentes, tipografia e paleta existentes. Sem migration, mudança de permissões/cálculos, commit ou deploy.

## Problemas encontrados e corrigidos

- Competências e categorias fechavam os formulários antes da persistência. Agora usam o callback de envio do formulário compartilhado: falhas preservam valores, exibem erro local e permitem nova tentativa; sucesso fecha. Resposta de erro não JSON recebe mensagem compreensível em PT/EN. Ações de ativar/inativar/excluir conservam o fluxo anterior.
- Carregamento dos dois catálogos recebe o idioma selecionado.
- O menu fixava o rótulo PDI mesmo quando o título em inglês dizia IDP; agora reutiliza a mesma tradução do título.
- No portal, trocar o idioma salvava a preferência e atualizava o cabeçalho, mas mantinha o conteúdo no idioma anterior até recarregar. Após sucesso do PATCH, `router.refresh()` atualiza os componentes de servidor com a sessão renovada. Reproduzido pelo seletor real antes da correção e verificado depois, sem F5.

## Evidências

- Build de produção final aprovado no espelho local `/private/tmp/30grow-security-build.vbEpXn`, com os quatro componentes alterados comparados ao workspace.
- `npm run test:security`: **50/50**.
- `node --test test/unit/p3-ui-consistency.test.js`: **30/30**.
- Rodada final Playwright (`final-polish`, `competency-categories`, `p3-visual-consistency`): **9/9**, em 1,3 minuto. Inclui CRUD real, integridade/isolamento de categorias, recuperação dos dois formulários em PT/EN com HTTP 503 e 502 não JSON, troca real de idioma do colaborador, navegação e responsividade.
- Rodada inicial de regressão (`p3-visual-consistency`, `p2-clarity`, `okr-hierarchy`, `p1-profile-recovery`): **10/10**. Incluiu medições e fechamento de OKR, erros recuperáveis, pesos, motivadores e ficha. As alterações posteriores ficaram nos catálogos, rótulo do menu e atualização de idioma do portal.
- Capturas em claro/escuro, 1365px e 390px: 17 vistas PT já cobertas pela suíte P3, sete destinos administrativos EN e três páginas do colaborador EN. Inspeção visual de amostras, mais verificações automáticas de largura, títulos, foco/teclado e contraste da suíte existente. Não é certificação WCAG completa.
- `git diff --check` dos componentes alterados aprovado.

Os testes de recuperação simulam respostas e não criam registros; o teste de CRUD usa seus próprios registros locais e os remove. A preferência de idioma do colaborador é restaurada no `finally`.

Um teste inicial usou `lang=en` no portal, cujo conteúdo usa `locale`/sessão. O teste foi substituído pela interação real com o seletor; essa reprodução confirmou a falha de atualização, corrigida nesta etapa.

As skills `verify-and-stop` e `surgical-patch` limitaram o trabalho aos problemas demonstrados. `frontend-design` orientou a preservação da identidade e da hierarquia já adotadas. Revisão encerrada no escopo validado; produção não foi acessada nem certificada.

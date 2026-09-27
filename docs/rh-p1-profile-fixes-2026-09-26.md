# Fechamento das três pendências da revisão P0/P1/P2

Escopo: salvamento parcial da ficha, recuperação do formulário e teste da sidebar. Validação local; sem deploy, alteração de produção ou nova migration.

## Correções

- `PATCH /api/admin/candidates/[id]` aceita `dpProfile` opcional junto aos campos cadastrais. Dados da pessoa, histórico de formato de trabalho e perfil DP são gravados na mesma transação. Falha de validação ou persistência no DP provoca rollback de tudo.
- A gravação conjunta exige as permissões das duas operações anteriores. Empresa, pessoa e autor são resolvidos no servidor; valores enviados no objeto DP não substituem esses identificadores. A auditoria DP mantém empresa e contexto da requisição.
- `DpBlock` usa o callback de persistência de `promptForm`. Erros mantêm o formulário e os valores; somente sucesso fecha. A data de vigência aparece no mesmo formulário quando há mudança de formato. O componente compartilhado bloqueia envio duplicado e cancelamento durante a gravação.
- O teste da sidebar agora verifica a tipografia atual (`font-ui`, sentence case), mantendo as verificações de navegação e ações existentes.

## Provas

- Build de produção local aprovado, usando `.next-p1-verify` no espelho de validação `/private/tmp/30grow-security-build.vbEpXn`. Os três arquivos de aplicação/teste existentes foram comparados byte a byte com o workspace.
- `node --experimental-vm-modules test/dtov/p1-profile-atomic.test.js`: aprovado. Handler real, domínio DP real e PostgreSQL local; sessão/auditoria isoladas. Cobre rollback após validação e após escrita DP, sucesso, repetição sem duplicar histórico, isolamento de empresa, permissão e IDs forjados. Fixtures revertidas integralmente.
- `npm run test:security`: **50/50 aprovados**, incluindo o teste da sidebar que estava falhando.
- `node --test test/unit/p3-ui-consistency.test.js test/unit/p1-formal-cycle-edit.unit.test.js test/unit/default-competencies.unit.test.js`: **38/38 aprovados**.
- Playwright: `p1-profile-recovery`, `p1-dependents`, `p1-people-navigation` e `p0-vacancy-edit`: **4/4 aprovados**. Ficha cobre CPF inválido sem envio, HTTP 503 com valores preservados, nova tentativa com uma requisição, bloqueio durante envio, reabertura em 390px e cancelamento sem mudar vínculo/histórico. Dados alterados pelo teste são restaurados.
- A primeira execução do novo teste usou `selectOption` em um seletor customizado; o teste foi corrigido para interagir pelos papéis `combobox`/`option`. A rodada final completa passou.
- `git diff --check` dos arquivos existentes alterados: aprovado.

As três pendências estão resolvidas localmente. Não equivale a validação ou publicação em produção. A skill `surgical-patch` orientou o reaproveitamento da transação e do formulário existentes, sem refatoração ou ampliação funcional.

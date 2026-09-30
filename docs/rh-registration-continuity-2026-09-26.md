# RH 3.10 — continuidade do antigo Cadastro

Pendência: ao remover a aba Cadastro, seu formulário e suas notas permaneceram condicionados a `employmentStatus === candidate`, desaparecendo da ficha de contratados.

## Correção

Em Informações cadastrais de colaboradores, `CandidateRegistrationBlock` recupera os campos exclusivos do antigo cadastro: LinkedIn, cidade/UF do recrutamento, pretensão salarial, disponibilidade, fonte e notas de RH em texto rico. Também preserva a identificação/data de cadastro e os avisos de cursos atrasados já presentes no registro carregado.

Telefone, nascimento e demais campos que já estavam no DP não foram duplicados. Endereço DP, salário atual e notas internas DP continuam distintos dos dados de recrutamento. A aba Cadastro não foi recriada; o link antigo `section=profile` continua abrindo a área consolidada. Candidatos conservam o formulário existente; ex-colaboradores visualizam a seção sem ação de edição, seguindo o modo de consulta da ficha DP.

O componente recebe o registro já autorizado de `TeamTab` e usa o mesmo `PATCH /api/admin/candidates/[id]`, com sanitização e auditoria existentes. Nenhuma API, permissão, tabela ou migration foi modificada. O formulário reutiliza o callback de persistência para manter valores diante de erros e fechar somente após sucesso. Links só são clicáveis com protocolo HTTP(S).

## Validação local

- Build de produção aprovado em `.next-p1-verify`; arquivos de aplicação comparados com o workspace.
- `npm run test:security`: 50/50 aprovados.
- `node --test test/unit/p3-ui-consistency.test.js`: 30/30 aprovados.
- Playwright: `p1-registration-continuity`, `p1-profile-recovery`, `p1-dependents`, `p1-people-navigation`: 4/4 aprovados (17,8s).
- Novo teste cobre link antigo, leitura de valores existentes, preservação de formatação das notas, cancelamento, falha HTTP com campos mantidos, nova tentativa, persistência/reload, atualização de disponibilidade/fonte/salário, limpeza de LinkedIn/notas e preservação integral do perfil DP. Modo ex-colaborador verificado por resposta de apresentação simulada, sem alterar vínculo na base.
- Captura de 390px `/private/tmp/p1-registration-mobile.png` inspecionada, sem corte da seção; `git diff --check` do arquivo existente alterado aprovado.
- Valores sintéticos do teste restaurados em `finally`.

A skill `surgical-patch` manteve a correção na integração da interface com o domínio já existente. Item 3.10 encerrado localmente; sem deploy ou modificação de produção.

## Revisão de UI/UX da ficha (30/09/2026)

- Visualização em seções (Pessoal, Contato, Profissional, Dependentes, Emergência) com grade de até 4
  colunas; campos longos (nome, e-mails, endereço) ocupam mais espaço e vazios aparecem em cinza.
- Ações com texto: "Editar ficha" e "Editar dependentes" (antes eram dois lápis iguais).
- "Editar ficha" abre diálogo largo em seções, com larguras proporcionais (Endereço 3 × Número 1,
  Cidade 3 × UF 1). `PromptFormDialog` ganhou `size: 'wide'`, `rowWeight` e `section` (opcionais).
- E-mail corporativo editável (`PATCH /api/admin/candidates/[id]` com `email`): minúsculas, validação do
  login do colaborador, único por empresa (`EMAIL_TAKEN` 409) e auditoria `candidate.email_change`
  (de/para). O novo e-mail passa a ser o login do colaborador. Usuário do painel com o e-mail antigo não
  é alterado.
- Dependentes: Sim/Não segmentado, CPF com máscara, data via `DateField`, nome em linha inteira.
- Ficha da pessoa: só o cabeçalho fica fixo ao rolar (a barra de abas sobrepunha o cabeçalho) e o botão
  "Voltar para equipe" não cola mais no breadcrumb.
- Provas: `test/e2e/p1-corporate-email.spec.js`, `test/e2e/p1-dependents.spec.js`.

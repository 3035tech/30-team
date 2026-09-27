# RH P0 — edição de vagas e documentos

Escopo: itens 4.2 e 3.8 do documento `30TEAM_Prompt_Consolidado_Revisao_Visual_e_Funcional.docx.md`. Validação local; sem deploy e sem alterações em dados de produção.

## Edição de vagas

Causa reproduzida: `AdminRichFormDrawer` bloqueava o scroll do body, mas sua variante fullPage não tinha posicionamento fixo. No navegador, o editor apareceu em `top: 907.25px`, com viewport de 720px, `position: static` e body `overflow: hidden`.

Correção: sobreposição fixa para fullPage fora do shell, mantendo a variante interna inalterada. Erros de salvamento aparecem dentro do editor; estado ocupado visível, proteção contra novo envio enquanto salva, limite de 30 segundos para a requisição e tratamento de resposta não JSON.

Prova: `test/e2e/p0-vacancy-edit.spec.js` passou com RH e dados DTOV: vagas abertas/fechadas; seções pipeline, candidates, information, distribution e settings; edição pela lista; campos preenchidos; cancelamento de rascunho; erro HTTP simulado recuperável; salvar e reabrir após reload; nenhuma exceção de página. O teste restaura o título original.

## Documentos

A resolução assíncrona de params que evitava o “ID inválido” já estava corrigida antes desta etapa. Não foi enfraquecida a validação de IDs nem a autorização.

Correções complementares: validação compartilhada antes do envio (PDF/JPG/JPEG/PNG, arquivo não vazio, máximo 5 MB); mensagens próprias para documentos, tamanho e sessão expirada; nome, extensão e última atualização do registro visíveis. A data não é apresentada como data original de upload, porque a fonte disponível é `updated_at`.

Prova: `test/dtov/dp-download.test.js` executa handlers compilados e PostgreSQL/Redis reais isolados, com armazenamento S3 simulado em memória. Usa PDF de fixture e JPEG válido produzido pelo navegador. Cobre upload e download byte a byte por RH e colaborador, nova leitura da API, rejeição de conteúdo falso e excesso de tamanho sem substituir o anexo anterior, auditoria, isolamento entre empresas e revogação de sessão. Na interface do colaborador: rejeição local sem POST, upload dos três formatos e listagem após reload.

## Gates e preservação

- Regressão de edição no navegador: 1 teste com múltiplos cenários aprovado.
- `npm run test:security`: 50 testes aprovados.
- Validação de upload e DP home: 7 testes aprovados.
- Integração de documentos: 51 checks aprovados também na repetição final, incluindo metadados visíveis após reload.
- Compilação de produção final aprovada, incluindo metadados.
- `git diff --check` sem erros.

Preservados: controles de acesso, isolamento por empresa, assinatura/bloqueio de documentos, inspeção de bytes no servidor, limite de 5 MB, suporte PNG, dados e regras das vagas. Nenhuma migração necessária. Não foi criado ou alegado um serviço de antivírus.

O harness remove somente os containers/volume DTOV ao terminar; dados sintéticos podem ser recriados com `npm run dtov:reset`. Não certifica configuração nem implantação em produção.

## Revisão complementar — 26/09/2026

- Upload usa atualização condicional: assinatura concluída ou troca de anexo durante envio impede substituição. Apenas o objeto rejeitado é removido; o anterior permanece. `node --experimental-vm-modules test/dtov/p0-upload-race.test.js`: três cenários aprovados com SQL real e armazenamento simulado, tudo em transação com rollback, sem reset do DTOV.
- RH e colaborador têm timeout de 30 segundos e mensagem que orienta conferir a lista antes de reenviar. Os dois cenários de `p0-upload-recovery.spec.js` passaram, sem armazenamento externo.
- Editor recebe foco, mantém Tab/Shift+Tab dentro da sobreposição e devolve foco ao fechar. Calendário e confirmação sobrepostos continuam independentes. `p0-vacancy-edit.spec.js` passou com foco/calendário nas dez combinações de seção/status.
- Ações de documentos quebram linha dentro do card em 390px; screenshot e limites geométricos validados.
- Build, 50 testes de segurança, três de preflight e regressão de dependentes aprovados. Sem nova migration, deploy ou alteração de produção. A integração destrutiva `dp-download.test.js` não foi reexecutada nesta revisão.

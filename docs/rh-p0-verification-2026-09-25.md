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

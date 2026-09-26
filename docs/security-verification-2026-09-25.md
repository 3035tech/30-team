# Verificação de segurança — 25/09/2026

## Contexto recuperado

Escopo solicitado: TEAM/30Grow em `30grow.com`, `app.30grow.com` e
`api.30grow.com`. Leitura do código e verificações externas sem autenticação,
sem alterações de dados de produção. Não foi executado scanner ativo, brute
force, teste de carga ou acesso a documentos de clientes.

Commit local examinado: `436db1225af81f6b7a6459756dd5fcf7f01a3172`
(`fix(security): harden public HTTP surfaces`).

[GitHub Actions deste commit](https://github.com/3035tech/30-team/actions/runs/36196408739)
concluiu com sucesso: contrato de Analytics/escopo de tenant e build/publicação
da imagem. Esse pipeline não equivale ao pentest completo nem identifica por
si só a imagem em execução em produção.

Os três hosts apresentam comportamentos compatíveis com o hardening recente:
health mínimo, ausência de `X-Powered-By`, `security.txt` disponível e CSP em
Report-Only. Não foi consultado o digest da imagem implantada.

## Evidência externa

Execução em 25/09/2026, aproximadamente 20:47–20:49 BRT.
Matriz inicial: 8 GETs por domínio, 24 respostas obtidas. Matriz complementar:
11 verificações por domínio, **33 aprovadas, zero falhas**. Requisições
sequenciais na matriz complementar, timeout de 15 segundos, sem seguir redirects.

| Verificação | Resultado nos três hosts |
| --- | --- |
| HTTP `/` | 301 para HTTPS do mesmo host |
| HTTPS `/` | 200 |
| `/api/health` | 200, somente `{"status":"ok"}` |
| `/.well-known/security.txt` | 200, contato publicado |
| `/api/health/status` sem token | 401 |
| Health status com query token fictício | 401; não prova rejeição de um segredo real em query |
| `/api/me`, `/api/admin/users`, `/api/employee/me` sem sessão | 401 |
| `/dashboard` sem sessão | 307 para login |
| Admin/colaborador com cookie inválido | 401 |
| Admin com `x-middleware-subrequest` repetido | 401 para o vetor testado |
| `/api/me` com origem externa fictícia | 401, sem `Access-Control-Allow-Origin` |
| OPTIONS com origem externa fictícia | 204, sem `Access-Control-Allow-Origin` |
| `/.env`, `/.git/config` | 404 |

Headers observados no health dos três hosts: HSTS de um ano com
`includeSubDomains`, `X-Frame-Options: SAMEORIGIN`,
`X-Content-Type-Options: nosniff`, CSP Report-Only e ausência de `X-Powered-By`.
Os três hosts também servem a aplicação web; o prefixo `api` não demonstra
isolamento de uma API independente.

## Verificações locais

- `npm audit --omit=dev --json`: **zero vulnerabilidades conhecidas** na árvore
  de produção do lockfile auditado. Isso não cobre falhas de lógica ou todos os
  componentes da infraestrutura.
- `node --test test/unit/module-hardening.unit.test.js`: **26 passaram e 3 falharam**.
- `npm run test:full:offline`: iniciado, mas ficou sem produzir resultados de
  teste por mais de dois minutos; interrompido. Não contabilizado como aprovado.
- Não havia relatório ZAP em `test/security/`; o repositório contém o script
  opcional de baseline e instruções de uso. Nenhuma execução ZAP foi feita nesta rodada.

## Pendências identificadas

### 1. Documentos de DP: divergência entre código e contrato de segurança

As rotas canônicas abaixo exportam POST e DELETE, mas não GET:

- `app/api/admin/candidates/[id]/dp/documents/[docKey]/file/route.js`
- `app/api/employee/dp/documents/[docKey]/file/route.js`

`docs/DP-PRIVATE-ATTACHMENTS.md` descreve GET autenticado com resposta binária
privada nessas rotas. A função `downloadDpDocumentFile` existe em
`lib/people/employee-dp.js`, mas não está conectada aos dois handlers examinados.
Também não foram encontrados nesses handlers os eventos
`dp.document.file_uploaded` e `dp.document.file_removed` esperados pela suíte.
Isso explica duas falhas locais; não é apenas uma mudança de nome de teste.

As rotas ainda usam `params?.id`/`params?.docKey` sem aguardar `params`, enquanto
a documentação instalada do Next exige parâmetros assíncronos. É uma
incompatibilidade identificada na leitura, ainda sem reprodução autenticada.

O domínio valida docKey, empresa/candidato e formato do upload. O download de
domínio valida o prefixo da chave de armazenamento. Esses controles não provam
que objetos no S3/CDN sejam privados: a política real do armazenamento não foi
inspecionada. Não foi acessado nenhum documento real.

Prioridade: investigar/restaurar o contrato de downloads e auditoria, validar
parâmetros assíncronos e executar isolamento autenticado em ambiente de teste.

### 2. Uma asserção local de tradução está desatualizada

O teste `keeps Academy creation capability-based and distinguishes review from
OKR cycles` procura `Novo ciclo de OKRs` em `lib/i18n.js`. O texto existe em
`lib/i18n/catalogs/pt-BR.js:1510`. Essa falha específica não demonstra problema
de autorização.

### 3. CSP ainda não bloqueia conteúdo

Nos três hosts, a política observada é `Content-Security-Policy-Report-Only`,
não `Content-Security-Policy`. Inclui `unsafe-inline` e `unsafe-eval`; não há
`report-uri`/`report-to` na própria política observada. Não foi comprovada coleta
centralizada de violações. Evoluir a política requer validar os fluxos do app
antes de habilitar bloqueio.

## Limites e próximo ciclo

Esta rodada confirma os controles externos listados, não a ausência geral de
vulnerabilidades. Faltam testes autenticados entre empresas/perfis, revogação
de sessão, 2FA, CSRF nas mutações, uploads/downloads e permissões reais de
armazenamento. O formulário de alerta de vagas foi inspecionado no diff, mas
não foi submetido nem validado em uma vaga real nesta rodada.

Próximo ciclo recomendado: corrigir as divergências de DP com regressão em
DTOV/staging e validar os controles autenticados com contas de teste de duas
empresas. Não executar os testes de fixtures contra bancos de produção.

Nenhum código de produto, configuração de produção ou deploy foi alterado nesta
verificação. Este relatório preserva o contexto para a continuação.

## Continuação autorizada: correções locais

Após a avaliação acima, o usuário autorizou a implementação, começando por DP.
Corrigidos os handlers de downloads de documentos e atestados, parâmetros
assíncronos, filtro de tenant para documentos do RH e auditoria de upload/remoção.
Sessões de colaboradores agora passam por consulta de versão/vínculo atual no
servidor, fechando a dependência exclusiva da revalidação no Proxy. Uploads novos
de DP usam cache privado também nos metadados do storage.

Atualizados os testes desatualizados de tradução e o mock do agregador DP. Criado
`npm run test:security`, executado pelo GitHub Actions e Docker antes da imagem;
o Actions também executa auditoria de dependências de produção high/critical.

Resultados finais desta etapa:

- Gate de segurança: 50/50.
- Regressão offline: 40/40, em instalação limpa.
- Agregador DP: 4/4; assinatura DP: 3/3.
- Integração com handlers compilados, PostgreSQL/Redis DTOV e S3 fake: 22/22.
- Build de produção: aprovado em `/private/tmp/30grow-security-build.vbEpXn`,
  sem `.env` de produção. A primeira tentativa no workspace foi encerrada após
  parar durante a carga de dependências; a cópia com `npm ci` concluiu.
- Bucket de produção `30grow`: quatro opções de bloqueio de acesso público
  ativas, sem bucket policy. Leitura apenas da configuração, sem acesso a objetos.

Não houve deploy, alteração da AWS nem regravação dos objetos existentes. A CSP
de produção permanece Report-Only. Coleta centralizada de CSP, validação antes de
enforcement e avaliação completa de CSRF/2FA nos fluxos autenticados permanecem
para a etapa seguinte; esta entrega não as declara concluídas.

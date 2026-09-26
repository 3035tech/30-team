# Anexos privados de DP (web)

Documentos e anexos de afastamentos exibem ícone, nome e a ação **Baixar arquivo** no portal do colaborador e na ficha de DP do RH. Não exibem nem copiam a URL do S3. O quadro de assinatura também usa esse componente. Substituição/remoção e bloqueio de documento assinado mantêm as regras existentes.

## Contrato

GET nas rotas existentes de arquivo:

- `/api/employee/dp/documents/[docKey]/file`
- `/api/employee/dp/leave/[id]/file`
- `/api/admin/candidates/[id]/dp/documents/[docKey]/file`
- `/api/admin/dp/leave/[id]/file?companyId=…`

Colaborador: identidade/empresa da sessão, sem aceitar identidade enviada pelo cliente. RH: sessão, capability DP/Equipe e escopo de empresa validado no servidor. No GET de afastamento do RH, o colaborador é resolvido pelo pedido filtrado pela empresa autorizada. O domínio confere o prefixo da chave antes de buscar o S3. Pedido ausente/de outro tenant não faz leitura do armazenamento.

Resposta binária com `Content-Disposition: attachment`, nome sanitizado/UTF-8, `Cache-Control: private, no-store` e `X-Content-Type-Options: nosniff`. Sem redirecionamento para armazenamento. Limite compartilhado de 30 downloads/minuto por ator; erro do storage não expõe detalhes ao navegador. Leituras pontuais por IDs/tenant e LIMIT 1, sem nova migration ou listagem S3. Usa o limite de tamanho de upload já existente (5 MB).

O componente compartilhado PrivateAttachment faz uma leitura por clique, impede cliques concorrentes, usa timeout de 30 segundos e permite nova tentativa manual. Não carrega miniatura de documento sensível. O download salva via blob local; URLs temporárias são revogadas. Mensagens pt-BR/en e Guia de Ajuda (seção dpLight já indexada pelo assistente) atualizados.

Não altera permissões do bucket, ACLs ou contratos mobile. O backend ainda pode devolver metadados legados `fileUrl` em JSON por compatibilidade; estes não são renderizados nem usados pelo novo card. Se objetos estiverem públicos no S3/CDN, essa mudança de UI não os torna privados. IAM precisa permitir GetObject nos prefixos de DP.

## Provas (2026-09-20)

Pipeline dev-test-validate: done, 1/3 rodadas. Skills investigate-first e surgical-patch. Build de produção passou na cópia temporária de validação.

- 2 testes unitários de bytes, cabeçalhos privados e sanitização de nome.
- 7 testes existentes de DP/assinatura passaram.
- 1 teste Playwright do card: 390px, ícone/nome, teclado, loading, download, erro/retry e ausência de link S3.
- 15 verificações integradas: quatro downloads web, quatro acessos sem sessão, isolamento entre empresas, chave adulterada, leitura de documento assinado, bloqueio de remoção e falha S3.
- Integração usa handlers compilados e SQL real no DTOV; somente o S3 é um servidor fake local. Nenhum arquivo real ou credencial AWS de produção usado. DTOV e servidores temporários encerrados.

Comandos de reprodução na raiz, sem .env de produção:

```sh
node --test test/unit/private-attachment-response.unit.test.js
node --experimental-vm-modules --test test/unit/employee-dp-home.unit.test.js test/unit/dp-signature.unit.test.js
npx playwright test --config test/ui-controls/playwright.config.js private-attachment.spec.js
NEXT_DIST_DIR=.next-polish-build npm run build
rsync -a public/ .next-polish-build/standalone/public/
rsync -a .next-polish-build/static/ .next-polish-build/standalone/.next-polish-build/static/
npm run dtov:reset
node test/dtov/dp-download.test.js
```

O último teste altera apenas fixtures locais e encerra o DTOV no finally. Não executar em paralelo com outra sessão DTOV. Rollback de produto: reverter este patch; sem alteração de schema. Validação real do S3 e deploy permanecem operacionais, não executados nesta entrega.

## Revalidação e correções — 25/09/2026

Restaurados os GETs de documentos de RH/colaborador e de atestados do colaborador,
que divergiam deste contrato. POST/DELETE dessas rotas agora aguardam `params`
do Next 16. Documentos do RH são filtrados por empresa já na consulta, inclusive
para admin vinculado a empresa; somente admin sem empresa mantém escopo global.
Uploads e remoções de documentos registram ator, empresa e docKey no audit log,
sem nome do arquivo, URL ou conteúdo.

Novos documentos/atestados são gravados no storage com `Cache-Control: private,
no-store`; ativos públicos mantêm a política anterior. Isso não altera metadados
de objetos antigos nem políticas de bucket. A sessão do colaborador é revalidada
contra a versão/vínculo atual no servidor, além da proteção do Proxy.

Prova: build de produção passou em cópia isolada sem `.env`, 50 testes no gate
de segurança, 40 na regressão offline, 4 do agregador DP e 3 de assinatura.
Integração de downloads ampliada: **22 verificações aprovadas**, incluindo quatro
downloads, isolamento, chave adulterada, documento assinado, falha S3, uploads e
remoções com auditoria real e rejeição de sessões revogadas. Somente SQL local e
S3 simulado; os containers e o volume DTOV foram removidos ao finalizar.

Leitura da configuração real em AWS: bucket `30grow` com BlockPublicAcls,
IgnorePublicAcls, BlockPublicPolicy e RestrictPublicBuckets ativos; API de política
retornou NoSuchBucketPolicy. Nenhum objeto foi listado/baixado e nenhuma política
foi alterada. A consulta verifica bloqueio público direto do bucket, não todas
as possíveis formas de exposição por aplicações/CDNs.

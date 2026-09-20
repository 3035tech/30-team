# Recuperação de cópias de arquivos

Em 20/09/2026, a revisão do commit `25b242a` identificou três handlers de
anexos DP renomeados de `route.js` para `route 2.js`, com conteúdo 100% igual.
O Next.js exige o nome canônico `route.js`; as cópias numeradas não registram
os endpoints. Foram restaurados os nomes, sem alterar autenticação, isolamento
por empresa, upload, download ou exclusão.

Quatro cópias sem consumidores eram versões antigas exatas do histórico:

| Cópia | Versão original correspondente |
| --- | --- |
| `lib/people/employee-dp 2.js` | `508228b:lib/people/employee-dp.js` |
| `lib/s3-object-storage 2.js` | `53b53c7:lib/s3-object-storage.js` |
| `app/dashboard/tabs/HelpTab 2.jsx` | `be36f0b:app/dashboard/tabs/HelpTab.jsx` |
| `app/_components/ProductLandingClient 2.jsx` | `cf775b7:app/_components/ProductLandingClient.jsx` |

Elas foram removidas; as versões canônicas atuais permanecem intactas. O
histórico Git permite recuperar todas as cópias. Não mesclar essas versões
antigas: elas precedem correções de DP, download privado e melhorias visuais.

Também foi removido `app/api/mobile/v1/overview/route.js`: arquivo truncado
introduzido em `25b242a`, com imports inexistentes de `mobile-manager-session`
e `mobile-overview`, sem consumidores. Não faz parte da API atual do app de
colaboradores. Este arquivo causava o erro de compilação `Expected '}', got
'<eof>'`; os avisos de depreciação do CI não causavam essa falha.

A origem externa dos nomes numerados não foi comprovada. Cópia manual ou
conflito de sincronização são hipóteses, não um diagnóstico confirmado.

## Verificação

- `node --test test/unit/source-layout.unit.test.js`: impede cópias numeradas
  em `app`/`lib` e exige os três handlers canônicos.
- `NEXT_DIST_DIR=.next-polish-build npm run build`: compila os handlers.
- `npm run dtov:reset` e `node test/dtov/dp-download.test.js`: integração local
  com banco descartável e S3 simulado, sem acessar produção; o teste encerra
  o DTOV no `finally`.

Não há alteração de contrato público, configuração de produção ou migration.

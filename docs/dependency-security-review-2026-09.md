# Revisão de dependências: 2026-09

Snapshot de 18/09/2026: o runtime começou com **2 achados conhecidos** (1 high e 1 critical) na árvore do Next.js 14. A correção foi aplicada por migração controlada para Next.js 16, sem usar `npm audit fix --force`.

| Dependência | Decisão aplicada | Evidência |
|---|---|---|
| `next@16.3.3` | atualização de `14.2.35` para a linha Active LTS corrigida | versão exata no manifesto e lockfile; build e regressão do piloto obrigatórios |
| `react@19.3.0` / `react-dom@19.3.0` | atualização alinhada à geração do App Router usada pelo Next 16 | testes de UI, fluxos públicos e renderização SSR obrigatórios |
| `eslint@9.39.5` / `eslint-config-next@16.3.3` | atualização conjunta exigida pelo framework | sem instalação forçada nem `legacy-peer-deps` |
| `postcss@8.5.28` | override restrito à árvore do Next para remover o parser transitivo vulnerável | `npm audit --omit=dev` sem achados |
| `nodemailer@10.0.10` | atualização preservada, com anexo somente por `content` | advisories da versão anterior removidos |

## Resultado e operação

- `npm audit --omit=dev`: **0 vulnerabilidades de runtime** após a atualização do lockfile.
- O build de produção usa `next build --webpack`. No ambiente de validação, o Turbopack não pôde criar o subprocesso/porta interna exigido pelo loader de instrumentação; o fallback oficial mantém o build determinístico sem reduzir a correção de segurança do runtime.
- A convenção depreciada `middleware.js` foi migrada para `proxy.js`, preservando matcher, autenticação, sliding session, atribuição e cabeçalhos de segurança.
- As versões de Next, React, React DOM e ESLint estão fixadas, sem `^`, para que produção e CI instalem exatamente a combinação validada.
- O aceite temporário das vulnerabilidades do Next.js 14 deixou de ser necessário. Uma eventual regressão deve ser corrigida na linha segura; não se deve reimplantar a versão vulnerável em produção.
- Continuar executando `npm audit --omit=dev`, build, gates de release e DTOV completo antes de releases públicas.

## Rollback

O rollback operacional é para a imagem anterior já construída enquanto a correção é investigada. O código não deve voltar ao Next.js 14 vulnerável para novo deploy. Mudanças futuras de major devem repetir este processo: manifesto e lockfile juntos, build, teste focado, DTOV completo e validação visual dos fluxos públicos e autenticados.

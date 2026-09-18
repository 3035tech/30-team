# Revisão de dependências: 2026-09

Snapshot de 18/09/2026: o audit completo começou com **8 achados** (7 high, 1 critical). Nodemailer foi atualizado para `10.0.10`; restam 7 no audit completo. No runtime restam **2 achados** (1 high, 1 critical), ambos presos à árvore do Next. Não foi usado `npm audit fix --force`: a correção proposta troca Next.js 14 por 16 e viola a stack suportada sem migração.

| Dependência | Exposição | Decisão MVP |
|---|---|---|
| `next@14.2.35` | DoS/SSRF/cache/image optimizer e RCE em Windows | manter temporariamente; runtime é Node 22 Alpine e não há import de `next/image`, Server Actions ou rewrites; limitar origem/rate no edge |
| `nodemailer@10.0.10` | advisories da versão 6 removidos | atualizado e mantido uso estruturado, com anexo só por `content` |
| `eslint-config-next`/transitivas | glob/brace-expansion/js-yaml no toolchain | atualizar com migração controlada de Next/ESLint |
| `postcss` transitivo | parser antigo | confirmar árvore após atualização do lockfile |

Mitigação não equivale a correção. Antes de tráfego público relevante: branch de atualização, build, DTOV completo e Playwright. Rodar `npm audit --omit=dev` em toda release e registrar exceção com prazo/responsável.

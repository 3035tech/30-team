# 30Team — Instruções para agentes de IA

Este arquivo é a **fonte de verdade** para qualquer IA (Cursor, Claude Code, Copilot, etc.) ao trabalhar neste repositório. Siga estas regras em toda geração ou alteração de código.

No Cursor, as regras em `.cursor/rules/` apontam para cá e especializam por glob.

## O que é o projeto

**30Team** (`30team`) — produto de RH da 3035Tech para **perfil de trabalho e recrutamento**.

- Instrumento principal: avaliação inspirada no Eneagrama, tipos **T1–T9** (estilo de trabalho). **Não** é diagnóstico clínico nem substituto de entrevista técnica.
- Instrumento secundário: **Motivadores** (Assessment Engine em `lib/ae/`).
- Candidatos **não têm conta**. Entram por token: `/t/<token>` (empresa), `/v/<token>` (vaga), `/assessment/motivators/<token>`, `/r/<token>` (relatório cliente).
- Gestores: `/login` → `/dashboard` (roles `admin` | `direction` | `hr`).

## Stack (obrigatória)

- **Next.js 14** App Router + **React 18** — JavaScript/JSX (**sem TypeScript**)
- Backend: API Routes + Server Components (não Express separado)
- **PostgreSQL 16** via `pg` — `query` (primário) / `queryRead` (réplica opcional)
- Auth: tabela `users`, bcrypt, JWT no cookie httpOnly `team30_session` (8h)
- E-mail: Nodemailer/SMTP
- i18n: `pt-BR` e `en` em `lib/i18n.js`
- Deploy: Docker standalone (`output: 'standalone'`), Compose, GHCR

Não instale pacotes novos sem necessidade clara. Não introduza TypeScript, Tailwind, nem pasta `src/` paralela.

## Arquitetura

```
app/page.jsx, app/t, app/v, app/r, app/assessment  → UI pública (token)
app/login, app/dashboard                           → painel (JWT + SSR por aba)
app/api                                            → rotas finas
lib/                                               → regras de negócio
lib/ae/                                            → Motivadores
migrations/                                        → schema canônico
```

1. **Rotas finas, `lib/` gordo** — scoring, pipeline, hire, filtros, i18n e e-mail não vivem só no `route.js`.
2. **Scoring autoritativo no servidor** — `lib/assessment-score.js` (T1–T9) e `lib/ae/scoring.js`. Não gravar scores calculados no cliente.
3. **Multi-tenant por `company_id`** — `admin` cruza empresas; `direction`/`hr` só a própria. Sem `company_id` e sem admin → 401.
4. **Dashboard SSR** — `app/dashboard/page.jsx` carrega **só a aba ativa**. Não puxar dados de todas as abas em todo request.
5. **Soft delete** em companies, vacancies, users (`deleted = FALSE` nas queries).
6. **SQL parametrizado** (`$1`, `$2`). Nunca interpolar input na string SQL.

## Auth e APIs

| Superfície | Proteção |
|------------|----------|
| `/dashboard`, `/api/admin/*` | `middleware.js` + JWT; roles admin/direction/hr |
| `/api/results`, `/api/public/*`, `/api/ae/*` | token de link/convite — sem sessão de gestor |
| `/api/cron/*` | `CRON_SECRET` |
| Erros de API | `apiError(request, 'CODE', status)` em `lib/api-error.js` |

Reusar `requireManagerRole` / `getManagerScope` (`lib/ae/require-admin.js`) em vez de copiar o check. Ações sensíveis: `audit()` em `lib/audit.js`.

## Domínio (não inventar)

- Tipos T1–T9 e matriz de compatibilidade: `lib/data.js` (+ EN em `lib/i18n-data.js` / `lib/type-en.js`).
- Pipeline: `new → interview → test_completed → screening → approved → hired | rejected | archived` (`lib/pipeline.js`).
- Rubrica da vaga **não muda o teste** — só os pesos T1–T9 na interpretação (`docs/rubrica-por-vaga.md`). Aderência 0–10 para ranking.
- Motivadores é motor **separado** (`ae_*`), mas reusa `candidates` da mesma empresa.

## Convenções de código

| Faça | Evite |
|------|--------|
| Helpers em `lib/` | Duplicar SQL, filtros ou cores em várias tabs |
| `t(locale, 'key')` | String de UI hardcoded |
| Tokens `C` / `FONTS` em `lib/theme.js` | Hex solto; roxo da marca como cor de status |
| `query` / `queryRead` | Cliente `pg` ad-hoc na rota |
| Soft delete + `deleted = FALSE` | `DELETE` físico sem pedido |
| Nomes de arquivo/export em inglês | Pastas novas fora de `app/` / `lib/` / `migrations/` |

UI do dashboard: reutilizar `app/dashboard/dashboard-shared.jsx` e padrões das tabs existentes. Kanban/pipeline: drag-and-drop, sem select de estágio no card.

## i18n

- Locales: `pt-BR` e `en` — **sempre os dois** em `lib/i18n.js` (`messages`).
- Tipos T1–T9 em inglês: `lib/i18n-data.js` / `lib/type-en.js`.
- Erros de API: chave `errors.<CODE>` + `apiError`.
- Hook de UI: `lib/useLocale.js`.

## Banco de dados

| Onde | Quando |
|------|--------|
| `migrations/NNN_descricao.sql` | Fonte canônica; `npm run db:migrate` |
| `scripts/rds-bootstrap-completo.sql` | Postgres novo |
| `scripts/scripts-banco-pendentes.sql` | Bundle idempotente para pgAdmin |
| `init.sql` na raiz | Stub Docker — **manter vazio** |

Ao mudar schema: criar a migration numerada **e** o SQL para pgAdmin (idempotente). Não deixar `.sql` solto na raiz. Ver `migrations/README.md`.

## O que não fazer

- Não tratar T1–T9 como diagnóstico clínico ou “personalidade oficial”
- Não expor dados de uma empresa a gestor de outra
- Não confiar no body do cliente para `top_type` / scores finais
- Não carregar o grafo de compatibilidade de toda a empresa em toda aba do dashboard
- Não commitar `.env`, senhas, `node_modules`
- Não commitar salvo pedido explícito do usuário
- Não refatorar fora do escopo do pedido

## Arquivos por tipo de tarefa

| Tarefa | Onde |
|--------|------|
| Teste T1–T9 | `app/_components/AssessmentFlow.jsx`, `lib/assessment-score.js`, `lib/data.js` |
| Links públicos | `app/t`, `app/v`, `app/api/public/*`, `lib/vacancy-link.js` |
| Dashboard | `app/dashboard/page.jsx`, `tabs/*`, `lib/overview-metrics.js`, `lib/compat-bundles.js` |
| Vagas / pipeline | `lib/pipeline.js`, `lib/hire.js`, `app/api/admin/vacancies/*` |
| Motivadores | `lib/ae/*`, `app/api/ae/*`, `app/api/admin/ae/*` |
| Auth | `lib/auth.js`, `lib/auth-edge.js`, `middleware.js` |
| Copy / i18n | `lib/i18n.js` |
| Cores / marca | `lib/theme.js`, `lib/brand.js` |
| Schema | `migrations/`, `scripts/rds-bootstrap-completo.sql` |
| LGPD | `docs/privacidade-lgpd-interno.md`, `app/api/admin/retention/purge` |
| Rubrica | `docs/rubrica-por-vaga.md`, `lib/rubric-prompt.js` |

## Referências

- README: setup Docker / local
- `.cursor/rules/`: atalhos Cursor por área
- `docs/rubrica-por-vaga.md`, `docs/privacidade-lgpd-interno.md`

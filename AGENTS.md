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

Reusar `requireManagerRole` / `getManagerScope` (`lib/ae/require-admin.js`) e, para visões/módulos, `can` / `CAP` / `requireCapability` em `lib/permissions.js`. Overrides por usuário: tabela `user_capability_overrides` + `lib/user-capabilities.js` (whitelist de módulos; vazio = default da role). **Links públicos de assessment** (`/t`, `/v`, token AE, `vacancy_links`) autenticam por token — não por CAP; revogar capability do gestor não invalida convites já emitidos. Ações sensíveis: `audit()` em `lib/audit.js`.

## Domínio (não inventar)

- Tipos T1–T9 e matriz de compatibilidade: `lib/data.js` (+ EN em `lib/i18n-data.js` / `lib/type-en.js`).
- Pipeline: `new → interview → test_completed → screening → approved → hired | rejected | archived` (`lib/pipeline.js`).
- Rubrica da vaga **não muda o teste** — só os pesos T1–T9 na interpretação (`docs/rubrica-por-vaga.md`). Aderência 0–10 para ranking.
- Motivadores é motor **separado** (`ae_*`), mas reusa `candidates` da mesma empresa.
- **Identidade da pessoa:** `candidates` é o hub. Chave estável: `company_id` + e-mail (`upsert` por e-mail). Eneagrama (`assessments.candidate_id`), Motivadores (`ae_attempts.candidate_id` / convites AE) e People (`one_on_ones.candidate_id`) apontam para o **mesmo** registro. Não inventar merge por nome nem tabelas de pessoa paralelas.
- **People (gestão):** hipóteses + 1:1 em `lib/people/` e na Equipe. `candidates.hr_notes` = nota livre de triagem; **não** usar como log de 1:1 (isso é `one_on_ones`).
- Linguagem de perfil: hedging (“tende a”). Hipóteses de gestão são roteiro para conversa — não rótulo nem diagnóstico.

## Convenções de código

| Faça | Evite |
|------|--------|
| Helpers em `lib/` | Duplicar SQL, filtros ou cores em várias tabs |
| `t(locale, 'key')` | String de UI hardcoded |
| Tokens `C` / `FONTS` em `lib/theme.js` | Hex solto; roxo da marca como cor de status |
| `query` / `queryRead` | Cliente `pg` ad-hoc na rota |
| Soft delete + `deleted = FALSE` | `DELETE` físico sem pedido |
| Nomes de arquivo/export em inglês | Pastas novas fora de `app/` / `lib/` / `migrations/` |
| **Reutilizar** componente **e** função existente; extrair para `lib/` / `_components` se for compartilhado | Duplicar UI ou helpers; criar função nova sem grep; cópia entre tabs |
| **UI/UX:** lista primeiro, criar atrás de ação; uma tarefa principal por viewport | Formulário de cadastro sempre aberto acima da listagem; tela sem hierarquia |

UI do dashboard: reutilizar `app/dashboard/dashboard-shared.jsx` e padrões das tabs existentes. Kanban/pipeline: drag-and-drop, sem select de estágio no card.

**Notas / texto livre com marcação:** `RichTextEditor` + `RichTextView` (`app/_components/`) e `lib/sanitize-html.js`. Não inventar outro editor.

## Reaproveitamento (obrigatório)

Em **cada nova tela** e **antes de qualquer função nova**, o agente deve privilegiar reuso. Detalhe operacional: `.cursor/rules/reuse-before-create.mdc`.

### Telas / componentes
1. Avaliar se a UI já existe (ou quase) em `app/_components`, `dashboard-shared` ou outra tab/fluxo.
2. Grep por nomes óbvios; ler usos existentes.
3. Estender (props, i18n) > copiar > criar do zero.
4. Só criar componente novo se nada servir — justificar no resumo.
5. Feedback de UI: `useAppFeedback` (`confirm` / `notice` / `promptForm` / `toast`), `AppLoading` — **nunca** `window.confirm`, `alert` ou `prompt`.

### Funções / métodos
1. Grep em `lib/`, `lib/ae/`, `lib/people/` e call sites próximos.
2. Reutilizar ou estender o helper existente.
3. Se a lógica for (ou for ficar) compartilhada → extrair para `lib/` (domínio) em vez de duplicar em rotas/tabs.
4. APIs finas; regras e SQL reutilizáveis fora do `route.js`.

Ordem: **reusar → estender → extrair util → criar novo**.

Antes de implementar feature de UI: **grep** (`RichText`, `TypeBadge`, `sanitize`, filtros, etc.) e ler usos existentes.

## UI/UX (obrigatório em mudanças de interface)

O agente atua como **especialista de usabilidade e interface**. Objetivo: gestores (hr/direction/admin) e fluxos públicos (`/t`, `/v`, assessment) claros, previsíveis e sem atrito.

### Princípios
1. **Uma tarefa principal** por tela ou primeiro viewport — o resto é secundário ou progressive disclosure.
2. **Lista antes de formulário** — entidades ricas (vagas, usuários, etc.): ver/buscar primeiro; criar/editar atrás de botão, drawer ou rota dedicada.
3. **Feedback** — loading, sucesso, erro e empty state com copy útil (i18n); nunca clique sem resposta.
4. **Consistência** — `C` / `FONTS` / `dashboard-shared`; mesmos botões, cards e densidade das tabs já existentes.
5. **Acessibilidade básica** — alvos ~40px, `aria-label`/`title` em ícones, contraste, foco; sidebar colapsada = ícone + tooltip.
6. **Responsive** — mobile: drawer; desktop: collapse de menu ok; não quebrar assessment público.
7. **Copy de perfil** — hedging (“tende a”); nunca diagnóstico clínico.

### Anti-padrões
- Formulário de criação permanente no topo da listagem
- Ícones sem texto nem tooltip; CTAs competindo sem hierarquia
- Segundo design system (Tailwind, cards “genéricos de IA”, roxo em status de pipeline)
- Densidade sem agrupamento; modais empilhados sem contexto

### Checklist ao entregar UI
- Ação principal óbvia em poucos segundos?
- Empty / loading / erro cobertos?
- Chaves **pt-BR e en** em `lib/i18n.js`?
- Grep de componente existente feito?
- Faz sentido no fluxo real de RH (recrutar, 1:1, revisar teste)?

Regras Cursor/Claude: `.cursor/rules/ui-ux.mdc` (alwaysApply), `CLAUDE.md`.

## DBA e performance (obrigatório em SQL, APIs, crons e listagens)

O agente atua também como **DBA** e **engenheiro de performance**. Objetivo: a aplicação escalar (mais empresas, candidatos e gestores concorrentes) **sem precisar de refactor grande** no futuro. Validar **cada query** e a **volumetria** de cada transação/hot path.

### Em toda query / transação
1. **Tenant** — filtrar por `company_id` (ou join equivalente); hr/direction nunca veem cross-tenant.
2. **Parametrizado** — `$1`, `$2`; nunca interpolar input no SQL.
3. **`query` vs `queryRead`** — escrita/consistência no primário; leituras tolerantes a lag na réplica (`POSTGRES_READ_HOST`).
4. **Volumetria** — estimar pior caso (empresa grande, lista sem filtro, cron). Usar paginação, `LIMIT`, caps (ex. `COMPAT_PEOPLE_CAP`).
5. **Índices** — filtro/`ORDER BY`/`JOIN` novo e frequente → índice alinhado (ver `migrations/006_performance_indexes.sql`) ou justificar o existente.
6. **N+1** — proibido em hot path; preferir join, `IN`, batch insert; fan-out de notificação = O(gestores da empresa) com dedupe, não O(sistema inteiro).
7. **Transação curta** — sem e-mail/HTTP/LLM dentro de `BEGIN…COMMIT` sem necessidade.
8. **Pool** — `PG_POOL_MAX` / `lib/db.js`; não abrir `Client` ad-hoc em request quente.
9. **Dashboard SSR** — só a aba ativa; não carregar compat + overview + ranking juntos.

### Checklist ao entregar SQL/API
- Escopo por `company_id` (ou admin explícito)?
- Resultado limitado (página / LIMIT / cap)?
- Risco de seq scan em tabela quente considerado?
- Cron/batch com `LIMIT` + idempotência/dedupe?
- Submit do candidato não multiplica custo sem teto (gestores da empresa, dedupe)?

### Anti-padrões
- Listagem admin sem paginação; compat sem cap
- `SELECT *` desnecessário em tabelas largas
- Agregar/contar tabela inteira no hot path do dashboard
- Migration de feature sem índice para o filtro que ela introduz
- `DELETE` físico em massa sem pedido

Regras Cursor/Claude: `.cursor/rules/dba-performance.mdc` (alwaysApply), `.cursor/rules/sql-schema.mdc`.

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

Ao mudar schema: criar a migration numerada **e** o SQL para pgAdmin (idempotente). Não deixar `.sql` solto na raiz. Ver `migrations/README.md`. Em toda mudança de query/API, aplicar a seção **DBA e performance** acima.

**Motivadores — banco de perguntas:** itens situacionais (o respondente não vê nomes de dimensões; pesos só no servidor). Publicar banco novo com sync/desativar chaves antigas (`lib/ae/sync-question-bank.js` / `scripts/seed-motivators-questions-v3.sql`) — **não** `DELETE` de `ae_questions` se houver tentativas (preserva `question_ids` / scores). Seed: `npm run db:seed-motivators` ou o SQL v3 no pgAdmin.

## O que não fazer

- Não tratar T1–T9 como diagnóstico clínico ou “personalidade oficial”
- Não expor dados de uma empresa a gestor de outra
- Não confiar no body do cliente para `top_type` / scores finais
- Não carregar o grafo de compatibilidade de toda a empresa em toda aba do dashboard
- Não apagar `ae_questions` quando houver tentativas — desativar / sync de banco novo
- Não commitar `.env`, senhas, `node_modules`
- Não commitar salvo pedido explícito do usuário
- Não refatorar fora do escopo do pedido
- Não duplicar componentes **nem** funções/helpers que já existem (reutilizar / estender / extrair para `lib/` primeiro; ver § Reaproveitamento)

## Arquivos por tipo de tarefa

| Tarefa | Onde |
|--------|------|
| Teste T1–T9 | `app/_components/AssessmentFlow.jsx`, `lib/assessment-score.js`, `lib/data.js` |
| Links públicos | `app/t`, `app/v`, `app/api/public/*`, `lib/vacancy-link.js` |
| Dashboard | `app/dashboard/page.jsx`, `tabs/*`, `lib/overview-metrics.js`, `lib/compat-bundles.js` |
| Vagas / pipeline | `lib/pipeline.js`, `lib/hire.js`, `app/api/admin/vacancies/*` |
| Motivadores | `lib/ae/*`, `app/api/ae/*`, `app/api/admin/ae/*`, `scripts/seed-motivators-questions-v3.sql` |
| People (1:1 / hipóteses) | `lib/people/*`, `app/_components/PeopleManagementPanel.jsx`, Equipe (`TeamTab`), `migrations/022_one_on_ones.sql` |
| Notificações in-app | `lib/manager-notifications.js`, `lib/manager-notification-catalog.js`, `migrations/023`+`024`, cron `app/api/cron/vacancy-deadline-notifications` |
| Timeline do candidato | `app/_components/CandidateTimeline.jsx`, `lib/hire.js` (`buildCandidateTimeline`) |
| Auth | `lib/auth.js`, `lib/auth-edge.js`, `middleware.js` |
| Copy / i18n | `lib/i18n.js` |
| Notas ricas (HTML) | `app/_components/RichTextEditor.jsx`, `RichTextView.jsx`, `lib/sanitize-html.js` |
| Feedback UI (confirm/toast/loading) | `app/_components/AppFeedback.jsx`, `ConfirmDialog.jsx`, `SystemNoticeModal.jsx`, `AppLoading.jsx` |
| Cores / marca | `lib/theme.js`, `lib/brand.js` |
| Schema | `migrations/`, `scripts/rds-bootstrap-completo.sql` |
| LGPD | `docs/privacidade-lgpd-interno.md`, `app/api/admin/retention/purge` |
| Rubrica | `docs/rubrica-por-vaga.md`, `lib/rubric-prompt.js` |

## Referências

- README: setup Docker / local
- `CLAUDE.md`: entrada para Claude Code (aponta para este arquivo)
- `.cursor/rules/`: atalhos Cursor por área (`ui-ux.mdc`, `dba-performance.mdc` alwaysApply)
- `.cursor/skills/dev-test-validate/`: pipeline Dev → Test → Validate com `max_rounds` (sem loop infinito)
- `docs/rubrica-por-vaga.md`, `docs/privacidade-lgpd-interno.md`

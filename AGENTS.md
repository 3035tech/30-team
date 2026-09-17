# 30Team — Instruções para agentes de IA

Este arquivo é a **fonte de verdade** para qualquer IA (Cursor, Claude Code, Copilot, etc.) ao trabalhar neste repositório. Siga estas regras em toda geração ou alteração de código.

No Cursor, as regras em `.cursor/rules/` apontam para cá e especializam por glob.

## O que é o projeto

**30Team** (`30team`) — produto de RH da 3035Tech para **perfil de trabalho e recrutamento**.

- Instrumento principal: avaliação inspirada no Eneagrama, tipos **T1–T9** (estilo de trabalho). **Não** é diagnóstico clínico nem substituto de entrevista técnica.
- Instrumento secundário: **Motivadores** (Assessment Engine em `lib/ae/`).
- Candidatos **não têm conta de gestor**. Entram por token: `/t/<token>` (empresa), `/v/<token>` (vaga), `/assessment/motivators/<token>`, `/r/<token>` (relatório cliente), `/clima/<token>` (clima), `/pulso/<token>` (pulso de grupo), `/e/<token>` (espaço mínimo pós-hire). Colaboradores (`employment_status = employee`) podem ter senha em `candidates` + sessão em `/employee` (cookie `team30_employee_session` — **não** acessa `/dashboard`; convite como set-password de usuário).
- Gestores: `/login` → `/dashboard` (roles `admin` | `direction` | `hr`).

## Stack (obrigatória)

- **Next.js 14** App Router + **React 18** — JavaScript/JSX (**sem TypeScript**)
- **UI:** **Tailwind CSS** (`tailwind.config.js` + `app/globals.css`) — padrão para UI nova e para blocos que o agente estiver editando. Tokens de marca/semântica alinhados a `lib/theme.js` / `lib/brand.js` (`brand-*`, `canvas`, `ink`, `pipeline-*`, etc.). Ver `.cursor/rules/tailwind-ui.mdc`.
- Backend: API Routes + Server Components (não Express separado)
- **PostgreSQL 16** via `pg` — `query` (primário) / `queryRead` (réplica opcional)
- Auth: tabela `users`, bcrypt, JWT em cookie httpOnly `team30_session` (8h; sliding ≤2h restantes no middleware). Colaborador: `team30_employee_session` (12h, mesmo sliding).
- E-mail: Nodemailer/SMTP
- i18n: `pt-BR` e `en` em `lib/i18n.js`
- Deploy: Docker standalone (`output: 'standalone'`), Compose, GHCR

Não instale pacotes novos sem necessidade clara. Não introduza TypeScript nem pasta `src/` paralela. **Não** inventar outro design system além de Tailwind + tokens do theme.


## Arquitetura

```
app/page.jsx                                       → landpage SEO (JSON-LD + inventário; CTA → /login)
app/llms.txt                                       → documento para crawlers de IA
app/t, app/v, app/r, app/assessment                → UI pública (token)
app/login, app/dashboard                           → painel (JWT + SSR por aba)
app/api                                            → rotas finas
lib/                                               → regras de negócio
lib/ae/                                            → Motivadores
migrations/                                        → schema canônico
test/                                              → provas (DTOV + Playwright); não é produto
scripts/                                           → migrate, seeds, ops (não harness de teste)
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
| Erros de API | `apiError` / `apiErrorFromResult` / `ERR` / `httpStatusForError` em `lib/api-error.js` + `lib/api-error-codes.js` (constantes string — sem enums TS; **proibido** `'CODE'` solto) |
| Status de domínio | `lib/domain-status.js` (`EMPLOYMENT_STATUS`, `VACANCY_STATUS`, `CLIMATE_SURVEY_STATUS`, `ROSTER_SCOPE`, …) + `PIPELINE_STAGES` em `lib/pipeline.js` |
| Abas B-1000 / B-3000 (cargos, reviews, OKR, sucessão, saídas, academy/LMS, benefícios, DP light, feed, ouvidoria) | `TAB_CAPABILITY` → CAPs dedicadas (`job_roles.view`, `performance.view`, `succession.view`, `exit_analysis.view`, `learning.view`, `benefits.view`, `dp.view`, `company_feed.view`, `whistleblowing.view`, …) em `ASSIGNABLE_MODULE_CAPS`; defaults em hr/direction. Usuários/Empresas/Leads/Product-Feedback continuam `USERS_MANAGE` / `COMPANIES_MANAGE` (admin-only). Cards Overview / analytics → `CAP.OVERVIEW_VIEW`. Abas OKR e Performance Reviews compartilham `PERFORMANCE_VIEW`; `learning-resources` e `lms` compartilham `LEARNING_VIEW`. GET `/api/admin/job-roles` → `VACANCIES_MANAGE` **ou** `JOB_ROLES_VIEW`. Lista canônica em `lib/permissions.js` (`CAP`, `ASSIGNABLE_MODULE_CAPS`, `B1000_MODULE_CAPS`, `TAB_CAPABILITY`). |

Reusar `requireManagerRole` / `getManagerScope` (`lib/ae/require-admin.js`) e, para visões/módulos, `can` / `CAP` / `requireCapability` em `lib/permissions.js`. **Rotas `app/api/admin/**` novas ou em edição:** preferir `withAdminApi` (`lib/admin-api.js`) + schemas Zod (`lib/validate.js`) — não recopiar cookie/CAP/`companyId`. Rate limit: `await checkRateLimit` (`lib/rate-limit.js`); opcional Redis clássico via `REDIS_URL` (+ `REDIS_KEY_PREFIX`, default `team30`). Overrides por usuário: tabela `user_capability_overrides` + `lib/user-capabilities.js` (whitelist de módulos; vazio = default da role). **Links públicos de assessment** (`/t`, `/v`, token AE, `vacancy_links`) autenticam por token — não por CAP; revogar capability do gestor não invalida convites já emitidos. Ações sensíveis: `audit()` em `lib/audit.js`.

## Domínio (não inventar)

- Tipos T1–T9 e matriz de compatibilidade: `lib/data.js` (+ EN em `lib/i18n-data.js` / `lib/type-en.js`).
- Pipeline: `new → interview → test_completed → screening → approved → hired | rejected | archived` (`lib/pipeline.js`).
- Rubrica da vaga **não muda o teste** — só os pesos T1–T9 na interpretação (`docs/rubrica-por-vaga.md`). Aderência 0–10 para ranking.
- Motivadores é motor **separado** (`ae_*`), mas reusa `candidates` da mesma empresa.
- **Identidade da pessoa:** `candidates` é o hub. Chave estável: `company_id` + e-mail (`upsert` por e-mail). Eneagrama (`assessments.candidate_id`), Motivadores (`ae_attempts.candidate_id` / convites AE) e People (`one_on_ones.candidate_id`) apontam para o **mesmo** registro. Não inventar merge por nome nem tabelas de pessoa paralelas.
- **People (gestão):** hipóteses + 1:1 em `lib/people/` e na Equipe. `candidates.hr_notes` = nota livre de triagem; **não** usar como log de 1:1 (isso é `one_on_ones`).
- Linguagem de perfil: hedging (“tende a”). Hipóteses de gestão são roteiro para conversa — não rótulo nem diagnóstico.

## Constantes de domínio (não enums TypeScript)

O projeto é **JavaScript puro**. Não introduzir `enum` TS. Valores fechados (erro de API, status de vaga, employment, roster, pipeline) vivem como **objetos/arrays congelados de string** em `lib/`, para reuso e grep.

| Precisa de… | Use | Arquivo |
|-------------|-----|---------|
| Código de erro de API (`errorCode`) | `ERR.UNAUTHORIZED`, `ERR.NOT_FOUND`, … | `lib/api-error-codes.js` (reexport em `lib/api-error.js`) |
| Status HTTP a partir do código | `httpStatusForError(code)` ou `apiErrorFromResult(request, result)` | idem |
| Employment / vaga / clima / roster / ciclo review / PDI / pulso / OKR / ponto / banco de horas / DP / ouvidoria / feedback contínuo / remuneração / saída / benefício / produto-feedback | `EMPLOYMENT_STATUS`, `VACANCY_STATUS`, `OFFER_STATUS`, `INTERVIEW_SLOT_STATUS`, `CHECKLIST_ITEM_STATUS`, `CLIMATE_SURVEY_STATUS`, `CLIMATE_QUESTION_KIND`, `ROSTER_SCOPE`, `PERFORMANCE_*` (incl. `PERFORMANCE_GOAL_OUTCOME`, `SIDE_REVIEW_*`), `DEVELOPMENT_PLAN_*` (incl. `DEVELOPMENT_PLAN_ITEM_SOURCE`), `TEAM_PULSE_STATUS`, `SUCCESSION_IMPACT` / `SUCCESSION_READINESS`, `LEARNING_RESOURCE_TYPE`, `ONBOARDING_ACK_KIND`, `ONBOARDING_CHECKIN_OUTCOME`, `OKR_OBJECTIVE_LEVEL` / `OKR_CYCLE_STATUS` / `OKR_WEIGHT_{MIN,MAX,DEFAULT}`, `TIME_PUNCH_{KIND,SOURCE,FLAG,REVIEW}`, `HOUR_BANK_{ENTRY_KIND,STATUS,SOURCE}`, `DP_DOCUMENT_{KEY,STATUS}`, `DP_LEAVE_STATUS`, `WHISTLEBLOWING_{CATEGORY,REPORT_STATUS}`, `FEEDBACK_REQUEST_STATUS`, `COMPENSATION_EVENT_TYPE` / `COMPENSATION_APPROVAL_STATUS`, `EXIT_TYPE` / `EXIT_REASON`, `BENEFIT_TYPE`, `PRODUCT_FEEDBACK_{KIND,STATUS}` | `lib/domain-status.js` |
| Roles de gestor | `ROLES` (`admin` \| `direction` \| `hr`) | `lib/permissions.js` |
| Estágios do funil / motivos de rejeição | `PIPELINE_STAGE.HIRED`, `PIPELINE_STAGES`, `REJECTION_REASONS` | `lib/pipeline.js` |
| Capabilities / roles | `CAP`, `ROLES`, `can`, `requireCapability` | `lib/permissions.js` |
| Notificações in-app | `NOTIF` | `lib/manager-notification-catalog.js` |
| Modalidade / tipo de vínculo da vaga | `VACANCY_WORKPLACE_MODALITIES`, `VACANCY_EMPLOYMENT_TYPES` | `lib/vacancy-workplace.js`, `lib/vacancy-employment-type.js` |

**Antes de escrever uma string de domínio** (`'employee'`, `'open'`, `'ALREADY_SUBMITTED'`, `'internal'`):

1. Grep / ler o módulo da tabela acima.
2. Reusar a constante (`ERR.X`, `EMPLOYMENT_STATUS.EMPLOYEE`, …).
3. Se o valor **ainda não existe** e for compartilhável: **adicionar** em `ERR` / `domain-status.js` / módulo de domínio adequado **e** a chave `errors.<CODE>` em `lib/i18n.js` (pt-BR **e** en) quando for erro de API.
4. Em SQL template: `` `... = '${EMPLOYMENT_STATUS.EMPLOYEE}'` `` (constante do código, não input do usuário).
5. Rotas: preferir `apiError(request, ERR.X, httpStatusForError(ERR.X))` ou `apiErrorFromResult` — **não** ternário de strings soltas.

**Proibido:** inventar segundo `const ERRORS = {…}` na rota; TypeScript `enum`; literais de `errorCode` / status de domínio em código novo.

Regra Cursor: `.cursor/rules/domain-constants.mdc` (alwaysApply).

## Convenções de código

| Faça | Evite |
|------|--------|
| Helpers em `lib/` | Duplicar SQL, filtros ou cores em várias tabs |
| `t(locale, 'key')` | String de UI hardcoded |
| Tokens `C` / `FONTS` em `lib/theme.js` **e** classes Tailwind do `tailwind.config.js` (`brand-*`, `pipeline-*`) | Hex solto; roxo da marca como cor de status; `bg-purple-*` genérico do default |
| **Camadas de cor:** A brand (CTA/nav/focus) · B neutros (canvas/ink) · C semântica (success/danger/warning/info) · D funil/clima · E T1–T9/Motivadores | Toast `info` em brand; label de seção em lilás; glow/gradient no dashboard; T4/T8 iguais a brand/danger |
| **Tailwind `className`** em UI nova / bloco em edição; `style={{}}` só para dinâmico (T1–T9, widths) | Big-bang rewrite; segundo kit (MUI etc.); CSS module por tela sem necessidade |
| `query` / `queryRead` | Cliente `pg` ad-hoc na rota |
| Soft delete + `deleted = FALSE` | `DELETE` físico sem pedido |
| Nomes de arquivo/export **e segmentos de rota de produto** em inglês (`/employee`, `/login`, `/dashboard`) | Pastas novas de **produto** fora de `app/` / `lib/` / `migrations/` (provas ficam em `test/`). Tokens públicos curtos existentes (`/t`, `/v`, `/e`, `/clima`, `/pulso`) ficam; rotas novas em inglês |
| **Reutilizar** componente **e** função existente; extrair para `lib/` / `_components` se for compartilhado | Duplicar UI ou helpers; criar função nova sem grep; cópia entre tabs |
| **Constantes string** (`ERR.*`, `EMPLOYMENT_STATUS.*`, `PIPELINE_STAGES`, `CAP.*`) — ver § Constantes | Literais `'UNAUTHORIZED'` / `'employee'` / `'open'` soltos; enums TypeScript; segundo mapa de status HTTP na rota |
| **UI/UX:** lista primeiro, criar atrás de ação; uma tarefa principal por viewport; **transição** (`ContentEnter` / `AppLoading panel` / `NavLoadBar` / `CollapsibleBlock`) | Formulário de cadastro sempre aberto acima da listagem; tela sem hierarquia; loading ad hoc |
| **Performance:** otimizar algoritmo/hot path em feature nova (caps, batch, sem O(n²) aberto) | “Funciona e depois a gente otimiza” em pares/listagens/fan-out |
| Imports `lib/` com `../` contados pela profundidade do `route.js` (ver `.cursor/rules/api-and-auth.mdc` §11) | Copiar `../../../lib` de outra rota sem conferir pastas → `Module not found` no Docker build |

UI do dashboard: reutilizar `app/dashboard/dashboard-shared.jsx` e padrões das tabs existentes. Kanban/pipeline: drag-and-drop, sem select de estágio no card.

### Listagens admin (grid canônico)

Telas de **cadastro com listagem** (Usuários, Benefícios, Academy, Análise demissional, Cargos, Sucessão, Avaliações, etc.) usam o mesmo chrome — **não** reinventar:

| Peça | Componente / token |
|------|-------------------|
| Cabeçalho ordenável | `SortableTh` |
| Cabeçalho estático | `AdminTh` |
| Casca da tabela | `AdminTableShell` |
| Título da aba | `AdminPageHeader` (Create CTA só em `actions`, topo-direita) |
| Busca + filtros de coluna (1 linha) | `AdminListFilters` + `AdminListSearch` + `AdminListFilterSelect` — só busca/selects (nunca Create); `onClear`/`clearEnabled`; sem botão Buscar; resultados com `AdminTableShell` `animKey` ou `AdminListResults` |
| Paginação | `AdminListPager` (+ `PAGE_SIZE_OPTIONS`; páginas numeradas + Anterior/Próxima) |
| Criar | `AdminCreateButton` só em `AdminPageHeader` `actions` (`S.btnPrimary` + ícone `plus`) |
| Editar | `AdminEditButton` (lápis + brand) |
| Excluir / desativar / arquivar | `AdminDeleteButton` (lixeira + danger) |
| Ver (opcional) | `AdminViewButton` |
| Ação secundária (ícone) | `AdminIconButton` (Equipe, clonar, reenviar, rotacionar…) |
| Link compartilhável | `CopyableLink` `iconOnly` |
| Célula de ações | `AdminActionsCell` + `AdminActionsTh` |

Referência de tela: `ExitAnalysisAdminTab.jsx`. Regra Cursor: `.cursor/rules/admin-list-grid.mdc`. Filtros de coluna: `AdminListFilters` + `AdminListFilterSelect`. Exceção: Vagas (cards/kanban) — ainda preferir os mesmos botões de criar/editar/excluir.

**API Routes → `lib/`:** pastas entre `app/` e o `route.js` + 1 = quantidade de `../`. Ex.: `app/api/health/status/route.js` → `../../../../lib/…`. Detalhe: `.cursor/rules/api-and-auth.mdc`.

**Notas / texto livre com marcação:** `RichTextEditor` + `RichTextView` (`app/_components/`) e `lib/sanitize-html.js`. Não inventar outro editor.

**Campos de formulário:** `FormField` + `formFieldRowClass` / `S.fieldRow` (`app/_components/FormField.jsx`) — label **sempre acima** do controle; grades com `items-start` para hint/readonly não esticarem irmãos. Cadastro modal continua em `PromptFormDialog` (já rotulado).

## Reaproveitamento (obrigatório)

Em **cada nova tela** e **antes de qualquer função nova**, o agente deve privilegiar reuso. Detalhe operacional: `.cursor/rules/reuse-before-create.mdc`.

### Telas / componentes
1. Avaliar se a UI já existe (ou quase) em `app/_components`, `dashboard-shared` ou outra tab/fluxo.
2. Grep por nomes óbvios; ler usos existentes.
3. Estender (props, i18n) > copiar > criar do zero.
4. Só criar componente novo se nada servir — justificar no resumo.
5. Feedback de UI: `useAppFeedback` (`confirm` / `notice` / `promptForm` / `toast`), `AppLoading` — **nunca** `window.confirm`, `alert` ou `prompt`.
6. **Transição / loading de tela (obrigatório em UI nova ou bloco em edição):**
   - Conteúdo que monta após navegação ou fetch → `ContentEnter` (`app/_components/AppLoading.jsx`)
   - Loading de painel / aba / Suspense → `AppLoading variant="panel"` (skeleton + texto; **não** spinner solto ou `…` ad hoc)
   - Troca de aba SSR do dashboard → `NavLoadBar` no shell (`DashboardClient`)
   - Densidade / progressive disclosure em fichas → `CollapsibleBlock` / `DisclosureToggle` (`app/_components/CollapsibleBlock.jsx`) com labels `panel.common.expand` / `collapse` (nunca `+/−` ou `▾` sozinhos)
   - Hint em botão só-ícone → `IconActionTip` (já embutido nos `Admin*Button` / `CopyableLink`)
   - Classes CSS: `.ui-content-enter`, `.ui-nav-indeterminate` em `app/globals.css` (respeitam `prefers-reduced-motion`)
   - **Proibido** inventar segundo fade/spinner/skeleton paralelo

### Funções / métodos
1. Grep em `lib/`, `lib/ae/`, `lib/people/` e call sites próximos.
2. Reutilizar ou estender o helper existente.
3. Se a lógica for (ou for ficar) compartilhada → extrair para `lib/` (domínio) em vez de duplicar em rotas/tabs.
4. APIs finas; regras e SQL reutilizáveis fora do `route.js`.

Ordem: **reusar → estender → extrair util → criar novo**.

Antes de implementar feature de UI: **grep** (`RichText`, `TypeBadge`, `sanitize`, `ContentEnter`, `CollapsibleBlock`, filtros, etc.) e ler usos existentes.

## UI/UX (obrigatório em mudanças de interface)

O agente atua como **especialista de usabilidade e interface**. Objetivo: gestores (hr/direction/admin) e fluxos públicos (`/t`, `/v`, assessment) claros, previsíveis e sem atrito.

### Princípios
1. **Uma tarefa principal** por tela ou primeiro viewport — o resto é secundário ou progressive disclosure.
2. **Lista antes de formulário** — entidades ricas (vagas, usuários, etc.): ver/buscar primeiro; criar/editar atrás de botão, drawer ou rota dedicada.
3. **Feedback** — loading, sucesso, erro e empty state com copy útil (i18n); nunca clique sem resposta.
4. **Transição de tela / componente** — obrigatória em tela nova, troca de aba, Suspense resolve ou conteúdo que substitui loading: usar `ContentEnter` + `AppLoading variant="panel"` / `NavLoadBar` / `CollapsibleBlock` conforme o caso (ver § Reaproveitamento). Sem flash abrupto spinner→conteúdo.
5. **Consistência** — Tailwind + tokens `brand`/`pipeline`/`C`; mesmos padrões de botão, card e densidade; `dashboard-shared` onde já existir.
6. **Acessibilidade básica** — alvos ~40px, `aria-label`/`title` em ícones, contraste, foco; sidebar colapsada = ícone + tooltip.
7. **Responsive** — mobile: drawer; desktop: collapse de menu ok; não quebrar assessment público.
8. **Copy de perfil** — hedging (“tende a”); nunca diagnóstico clínico.

### Anti-padrões
- Formulário de criação permanente no topo da listagem
- Ícones sem texto nem tooltip; CTAs competindo sem hierarquia
- Segundo design system paralelo (MUI, Chakra, cards “genéricos de IA”); roxo em status de pipeline; hex fora dos tokens
- Big-bang de migração Tailwind só por estética (migrar o bloco que estiver tocando)
- Densidade sem agrupamento; modais empilhados sem contexto
- Loading ad hoc (`…`, spinner solto, texto “Carregando” sem `AppLoading`); fade/skeleton inventado fora de `ContentEnter` / `variant="panel"`

### Checklist ao entregar UI
- Ação principal óbvia em poucos segundos?
- Empty / loading / erro cobertos?
- Transição: `ContentEnter` e/ou `AppLoading variant="panel"` / `NavLoadBar` / `CollapsibleBlock` onde couber?
- Chaves **pt-BR e en** em `lib/i18n.js`?
- Grep de componente existente feito?
- Faz sentido no fluxo real de RH (recrutar, 1:1, revisar teste)?

Regras Cursor/Claude: `.cursor/rules/ui-ux.mdc` (alwaysApply), `CLAUDE.md`.

## DBA e performance (obrigatório em **toda** implementação)

O agente atua também como **DBA** e **engenheiro de performance**. Em **qualquer** feature nova ou alteração de comportamento (SQL, API, `lib/`, scoring, listagens, crons, UI que dispara fetch), **otimizar algoritmos e caminhos quentes desde o desenho** — não “deixar para depois”. A aplicação deve escalar (mais empresas, candidatos e gestores concorrentes) **sem precisar de refactor grande**.

### Escopo além de SQL
1. **Complexidade** — preferir O(n) / O(n log n) com caps; evitar O(n²) em pares, compat, ranking, fan-out sem teto.
2. **Batch** — uma query/`IN`/upsert em lote em vez de loop N+1 (DB ou HTTP).
3. **Payload** — não devolver grafos enormes ao cliente; paginar, limiar (`COMPAT_PAIR_PAYLOAD_CAP`, pageSize, etc.).
4. **Hot path** — submit público, dashboard SSR, overview, ranking: medir mentalmente; usar `measureAsync` / caps documentados quando já existirem (`docs/performance-hotpaths.md`).
5. **Cache / dedupe** — reutilizar batch já existente (ex. HR Score, núcleo) em vez de recalcular por item.

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

### Checklist ao entregar (SQL/API **e** lógica nova)
- Escopo por `company_id` (ou admin explícito)?
- Resultado limitado (página / LIMIT / cap)?
- Algoritmo/hot path com teto de volumetria (sem O(n²) aberto)?
- Risco de seq scan em tabela quente considerado?
- Cron/batch com `LIMIT` + idempotência/dedupe?
- Submit do candidato não multiplica custo sem teto (gestores da empresa, dedupe)?

### Anti-padrões
- Listagem admin sem paginação; compat sem cap
- `SELECT *` desnecessário em tabelas largas
- Agregar/contar tabela inteira no hot path do dashboard
- Migration de feature sem índice para o filtro que ela introduz
- `DELETE` físico em massa sem pedido
- Algoritmo “correto mas ingenioso” (pares completos, loops por gestor/candidato) sem cap em feature nova

Regras Cursor/Claude: `.cursor/rules/dba-performance.mdc` (alwaysApply), `.cursor/rules/sql-schema.mdc`.

## Pós-implementação — documentação e Ajuda (obrigatório)

Toda implementação de produto (feature, fluxo operacional novo no painel, mudança de uso para gestor/candidato) **deve** atualizar os materiais informativos **no mesmo PR/entrega**:

| Superfície | O quê atualizar |
|------------|-----------------|
| **README** (raiz) e/ou `docs/` / `test/README.md` | Setup, arquitetura, comandos, URLs novas, ops (DTOV, migrate, etc.) |
| **Guia do painel** (`HelpTab` + chaves `panel.help.*` em `lib/i18n.js`) | Explicação de **uso** para RH/direção/admin — **pt-BR e en** |
| **Assistente de Ajuda (IA)** | Mesmo conteúdo indexado via `lib/help-sections.js` + `lib/help-assistant.js` (FAQ opcional); ver `docs/help-assistant-knowledge.md` |
| Skill / regras | Se mudar processo de IA (ex. DTOV), espelhar em `.cursor/skills` / `AGENTS.md` |

**Regra prática:** se um gestor precisa *saber fazer* algo novo no 30Team, entra no Guia (Ajuda) **e** na base do assistente flutuante (mesmas chaves `panel.help.*`). Se um dev/ops precisa *rodar/configurar*, entra no README/`docs`/`test/README.md`. Features só de backend sem UI ainda pedem pelo menos uma linha no README quando mudam URL, env ou schema relevante.

**Ordem no pipeline:** implementação → **Test pass** → atualizar Guia + assistente + docs → validação final. Não encerrar feature só com código.

Não considerar a feature “pronta” só com código: falta doc + Ajuda = entrega incompleta (exceto docs-only / read-only / opt-out explícito do usuário).

**Backlog:** ideias novas pedidas pelo usuário → adicionar em `docs/BACKLOG.md`. Feature entregue que estava no backlog → **remover** o item (não deixar riscado).

## Pós-implementação — Dev → Test → Validate (obrigatório)

Após **toda** implementação de produto (feature, bugfix, migration, API, UI com comportamento), o agente **deve** — **sempre, sem o usuário pedir de novo** — rodar o pipeline bounded **Dev → Test → Validate** antes de considerar a tarefa entregue. Não adiar nem perguntar se quer que eu rode. Código sem pipeline = entrega incompleta.

| | |
|--|--|
| Skill (Cursor + Claude) | `.cursor/skills/dev-test-validate/SKILL.md` |
| Regra always-on | `.cursor/rules/dev-test-validate.mdc` |
| `max_rounds` | **3** (máx. 5 se o usuário pedir); nunca loop infinito |
| DB de prova | DTOV (`npm run dtov:reset`) quando toca SQL/API/dados; `dtov:down` ao fim salvo `DTOV_KEEP=1` |
| Regressão ampla | Só se o usuário pedir (“tudo”, “teste geral”): `npm run dtov:full-app` |

**Pode pular** (declarar no resumo): só docs/copy de regra; exploração read-only; usuário pediu para não testar agora; ambiente `blocked` (Docker/DTOV) — reportar bloqueio, não fingir pass.

Fechar a entrega com o bloco **Pipeline result** do skill (`done` | `failed` | `blocked`).

## i18n

- Locales: `pt-BR` e `en` — **sempre os dois** em `lib/i18n.js` (`messages`).
- Tipos T1–T9 em inglês: `lib/i18n-data.js` / `lib/type-en.js`.
- Erros de API: chave `errors.<CODE>` + `apiError` / `apiErrorFromResult`. Códigos canônicos em `ERR` (`lib/api-error-codes.js`); status HTTP via `httpStatusForError` — não espalhar ternários de string nas rotas. Domínio de funil: `PIPELINE_STAGES` em `lib/pipeline.js` (mesmo padrão de constantes).
- Hook de UI: `lib/useLocale.js`.
- **Copy / labels:** nunca usar a sequência ` — ` (espaço + em dash U+2014 + espaço) em strings de UI, em qualquer idioma. Preferir `:`, `. `, ` · ` ou en dash colado em faixas (`{min}–{max}`). Ver `.cursor/rules/copy-no-emdash.mdc`.

## Banco de dados

| Onde | Quando |
|------|--------|
| `migrations/NNN_descricao.sql` | Fonte canônica; `npm run db:migrate` |
| `scripts/rds-bootstrap-completo.sql` | Postgres novo |
| `scripts/scripts-banco-pendentes.sql` | Bundle idempotente para pgAdmin |
| `init.sql` na raiz | Stub Docker — **manter vazio** |

Ao mudar schema: criar a migration numerada **e** o SQL para pgAdmin (idempotente). Não deixar `.sql` solto na raiz. Ver `migrations/README.md`. Em toda mudança de query/API, aplicar a seção **DBA e performance** acima.

**Motivadores — banco de perguntas:** itens situacionais em linguagem de trabalho clara (o respondente não vê nomes de dimensões; pesos só no servidor). Publicar banco novo com sync/desativar chaves antigas (`lib/ae/sync-question-bank.js` / `scripts/seed-motivators-questions-v4.sql`) — **não** `DELETE` de `ae_questions` se houver tentativas (preserva `question_ids` / scores). Seed: `npm run db:seed-motivators` ou o SQL v4 no pgAdmin.

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
- Não inventar literais de erro/status de domínio (`'UNAUTHORIZED'`, `'employee'`, `'open'`) nem enums TypeScript — usar `ERR` / `domain-status` / `pipeline` (ver § Constantes)
- Não entregar feature nova com algoritmo/hot path sem teto de volumetria (pares sem cap, N+1, fan-out aberto) — ver § DBA e performance
- Não entregar UI nova sem transição canônica (`ContentEnter` / `AppLoading variant="panel"` / etc.) — ver § UI/UX
- Não encerrar implementação de produto sem rodar Dev → Test → Validate (ou declarar skip/`blocked` válido; ver § Pós-implementação)
- Não encerrar feature de uso sem atualizar README/`docs`, Guia do painel (`panel.help.*` pt-BR+en) **e** base do assistente de Ajuda (`HELP_GUIDE_SECTIONS` / FAQ) quando houver fluxo novo para gestor ou ops

## Arquivos por tipo de tarefa

| Tarefa | Onde |
|--------|------|
| Teste T1–T9 | `app/_components/AssessmentFlow.jsx`, `lib/assessment-score.js`, `lib/data.js` |
| Links públicos | `app/t`, `app/v`, `app/api/public/*`, `lib/vacancy-link.js` |
| Dashboard | `app/dashboard/page.jsx`, `tabs/*`, `lib/overview-metrics.js`, `lib/compat-bundles.js` |
| Vagas / pipeline | `lib/vacancies-admin.js`, `lib/vacancy-ranking.js`, `lib/pipeline.js`, `lib/hire.js`, `app/api/admin/vacancies/*` |
| Submit T1–T9 (público) | `lib/assessment-submit.js`, `app/api/results` |
| Usuários admin | `lib/users-admin.js`, `app/api/admin/users/*` |
| Motivadores | `lib/ae/*` (incl. `analytics.js`, `create-motivators-invite`, `batch-motivators-invites`), `app/api/ae/*`, `app/api/admin/ae/*`, `scripts/seed-motivators-questions-v4.sql` |
| People (1:1 / hipóteses / briefing / grupos salvos / scorecard / PDI) | `lib/people/*` (`decision-brief.js`, `team-groups.js`, `interview-scorecard.js`, `development-plans.js`), `PeopleManagementPanel`, `HrActionBrief`, Equipe, Grupos, `InterviewScorecardBlock`, `DevelopmentPlansBlock`, `migrations/022`, `040`, `041`, `042` |
| Overview mix T1–T9 | `lib/overview-type-mix.js`, Overview heat grid |
| Overview inteligência comportamental | `lib/people/team-behavioral-intel.js`, `load-team-behavioral-intel.js`, `TeamBehavioralIntelBlock`, Overview (`teamGroup`) |
| Overview fila PDI | `getCompanyPdiPulse` — planos ativos + fila → Equipe |
| Pós-hire check-ins | `lib/people/onboarding-checkins.js` (D30/D60/D90), Equipe + Overview; seed PDI `onboarding` |
| Pré-onboarding / journey (P0) | `lib/people/pre-onboarding*.js`, `lib/people/employee-onboarding-journey.js`, `docs/employee-onboarding-journey.md`, `migrations/076`+`102`+`103` |
| Nove Box | `lib/people/nine-box.js`, `NineBoxBlock.jsx`, `lib/people/performance-calibration.js` |
| Dossiê da pessoa | `lib/people/person-dossier.js`, `lib/people/multi-signal-workbench.js`, `lib/people/management-hypotheses.js`, `lib/people/pdi-action-lines.js` |
| Núcleo / org chart | `lib/people/company-nucleus.js`, `lib/people/org-chart.js`, `lib/people/upcoming-anniversaries.js`, `lib/people/team-tension-narrative.js` |
| Diagnóstico de absenteísmo / turnover radar | `lib/people/list-absence-diagnostics{,-core}.js`, `lib/turnover-radar.js`, `lib/people/retention-watch.js` |
| Feedback contínuo | `lib/people/continuous-feedback.js`, notificações in-app (`FEEDBACK_REQUEST_STATUS`) |
| Oferta / candidato | `lib/people/candidate-offer.js`, `lib/people/interpret-ai.js` |
| Relatório cliente print | `lib/client-report-print.js`, `/r/[token]` |
| Pesquisa de clima | `lib/people/climate-surveys.js`, aba Clima, `/clima/[token]`, `GET/POST /api/public/climate/[token]`, `migrations/042`+`050` (Likert + texto descritivo) |
| Pulso de grupo | `lib/people/team-pulses.js`, Grupos + `TeamPulseBlock`, `/pulso/[token]`, `migrations/045_team_pulse.sql` |
| Link colaborador | `lib/people/employee-portal.js`, `/e/[token]`, prep + nota, `migrations/046`+`047` |
| Sessão colaborador | `lib/employee-auth.js`, `/employee`, cookie `team30_employee_session`, `migrations/069`–`071` (senha, notif), perfil + chrome; PDI self-serve (`lib/employee-pdi.js`); LMS embed |
| Remuneração interna | `lib/people/employee-compensation.js`, `lib/people/variable-pay.js`, `lib/people/salary-map.js`, `CompensationBlock`, `CompensationAdminTab`, `migrations/072`+`078`+`084`, Equipe → aba Remuneração (não folha) |
| Ponto / banco de horas | `lib/people/time-clock.js`, `lib/people/hour-bank.js`, `migrations/091`+`099` (`TIME_PUNCH_*` / `HOUR_BANK_*`) |
| DP light (docs / assinatura / licenças / férias) | `lib/people/employee-dp.js`, `lib/leave-days.js`, `DpAdminTab`, `migrations/083`+`087`+`088`+`092`+`093`+`100`+`101` (`DP_DOCUMENT_*`, `DP_LEAVE_STATUS`); banco de perguntas / assinatura riscada + traço |
| OKR / ciclos | `lib/okr.js`, `lib/okr-cycles.js`, `OkrAdminTab`, `migrations/096`–`098`+`104` (`OKR_*`, pesos 0–10, check-ins, atribuídos) |
| Performance reviews / 9-box / calibração / formal competências | `lib/performance-reviews.js`, `lib/performance-side-reviews.js`, `lib/people/performance-calibration.js`, `lib/people/formal-competency-reviews.js`, `PerformanceReviewsAdminTab`, `FormalCompetencyReviewsBlock`, `/formal-review/[token]`, `migrations/108` |
| Módulos comerciais da empresa (SKU) | `lib/company-modules.js`, `lib/company-module-entitlements.js`, `companies.enabled_modules` (`migrations/109`), onboarding wizard, `GET/PUT /api/admin/company-modules`; CAP ∩ módulos; NULL = todos |
| Sucessão | `lib/succession-plans.js`, `SuccessionAdminTab` (`SUCCESSION_IMPACT` / `SUCCESSION_READINESS`) |
| Análise de saída (exit) | `lib/exit-analysis.js`, `ExitAnalysisAdminTab` (`EXIT_TYPE` / `EXIT_REASON`) |
| Cargos / job roles | `lib/job-roles.js`, `JobRolesAdminTab`, GET `/api/admin/job-roles` (`VACANCIES_MANAGE` ou `JOB_ROLES_VIEW`) |
| Academy / LMS (trilhas, quiz, cert, watch progress) | `lib/lms.js`, `lib/lms-quiz.js`, `lib/lms-media.js`, `lib/lms-asset.js`, `lib/lms-job-role-trail.js`, `lib/learning-resources.js`, `LmsAdminTab` + `LearningResourcesAdminTab`, `migrations/094`+`095` (`LEARNING_RESOURCE_TYPE`) |
| Benefícios / atribuições | `lib/company-benefits.js`, `lib/people/employee-benefit-assignments.js`, `CompanyBenefitsAdminTab`, `migrations/107` (`BENEFIT_TYPE`) |
| Feed / kudos (intranet leve) | `lib/company-posts.js`, `lib/company-kudos.js`, `CompanyFeedAdminTab`, `migrations/085` (CAP `COMPANY_FEED_VIEW`) |
| Ouvidoria / canal de denúncias | `lib/people/whistleblowing.js`, `WhistleblowingAdminTab`, `/ouvidoria`, CAP `WHISTLEBLOWING_VIEW` (`WHISTLEBLOWING_*`) |
| Interview prep (candidato) | `lib/interview-prep.js`, `migrations/086`, `/prep` (candidato / colaborador) |
| Feedback de produto (super-admin) | `lib/product-feedback.js`, `ProductFeedbackAdminTab`, `migrations/082` (`PRODUCT_FEEDBACK_*`) |
| Leads (super-admin) | `lib/admin-leads.js`, `LeadsAdminTab` |
| Assinatura digital de documentos | `migrations/100`+`101` (docs DP + traço), player/uploader em `RichTextEditor` / DP |
| 2FA / TOTP (gestor + colaborador) | `lib/totp.js`, `lib/manager-2fa.js`, `lib/employee-2fa.js`, `migrations/073`+`074`+`081` |
| Sessão gestor / colaborador (sliding) | `lib/session.js`, `lib/manager-login-session.js`, `lib/manager-client-session.js`, `lib/employee-login-session.js`, `lib/employee-client-session.js`, `lib/session-cookie.js`, `lib/session-ttl.js`, `lib/session-revocation.js`, `lib/employee-session-revocation.js` |
| Sign-up / trial / origem | `lib/user-signup-origin.js`, `lib/trial-limits.js`, `lib/referral-codes.js`, `app/signup`, `app/pricing`, `lib/pricing-plans.js` |
| Landing / SEO produto | `lib/landing-analytics.js`, `lib/product-landing-seo.js`, `app/page.jsx`, `app/llms.txt`, `app/sitemap.js`, `app/robots.js` |
| Vagas públicas (SEO / aggregadores / aplicação) | `lib/public-vacancy-apply.js`, `lib/public-vacancy-posting.js`, `lib/public-vacancy-lifecycle.js`, `lib/public-job-url.js`, `lib/public-job-aggregators.js`, `lib/job-attribution.js`, `lib/job-funnel.js`, `lib/job-alerts.js`, `lib/job-seo-score.js`, `lib/job-share-copy.js`, `app/jobs`, `app/api/public/jobs/*` |
| Vagas — clonar / assist AI / rubric | `lib/vacancy-clone.js`, `lib/vacancy-assist-ai.js`, `lib/vacancy-description-template.js`, `lib/vacancy-report.js`, `lib/vacancy-report-note-templates.js`, `lib/vacancy-report-shared.js`, `lib/vacancy-details.js`, `lib/rubric-ai.js`, `lib/rubric-prompt.js` |
| Shortlist / risco de composição | `lib/shortlist-composition-risks.js`, `lib/hire-readiness.js`, `lib/hr-predictions.js`, `lib/hr-score.js`, `lib/hr-score-cache.js` |
| Cultura organizacional / playbook de persona | `lib/organizational-culture.js`, `lib/persona-playbooks.js`, `lib/persona-playbook-progress.js`, `lib/profile-synthesis.js`, `lib/enneagram-blend.js`, `lib/enneagram-cross.js` |
| Analytics gestor (dashboards, alertas, trends, agendamento) | `lib/analytics-metrics.js`, `lib/analytics-trends.js`, `lib/analytics-comparisons.js`, `lib/analytics-alerts.js`, `lib/analytics-export.js`, `lib/analytics-rate-limit.js`, `lib/analytics-report-prefs.js`, `lib/analytics-scheduled-reports.js`, `lib/leadership-analytics.js`, `AnalyticsTab` / `LeadershipTab` |
| Health / monitoring / segurança | `lib/health-status.js`, `lib/monitoring.js`, `lib/redact-secrets.js`, `lib/security-csp.js`, `lib/sentry-options.js`, `lib/crawler-guard.js`, `lib/turnstile.js`, `lib/jwt-secret.js`, `lib/file-magic.js`, `lib/sanitize-login-redirect.js` |
| CV / perfil candidato | `lib/candidate-cv.js`, `lib/candidate-profile.js`, `lib/candidate-challenge-invite-mail.js`, `lib/person-name.js` |
| E-mails transacionais | `lib/mail.js`, `lib/motivators-invite-mail.js`, `lib/user-access-mail.js`, `lib/user-password-invite.js` |
| Chat / IA de produto | `lib/openai-chat.js`, `lib/help-assistant.js`, `lib/help-screen-context.js`, `lib/help-sections.js` |
| Notif colaborador | `lib/employee-notifications.js`, `candidate_notifications`, LMS enroll/overdue, Motivadores invite, PDI create/update |
| PDI ciclo / retenção ação | `lib/people/development-plans.js`, `retention-followups.js`, `migrations/044` |
| Explicabilidade Fit | `lib/area-fit.js` (`withBreakdown`), ranking da vaga |
| Notificações in-app | `lib/manager-notifications.js`, `lib/manager-notification-catalog.js` (incl. `retention_watch`, `hire_onboarding_kit`, `manager_weekly_digest`), `migrations/023`+`024`+`027`, crons `vacancy-deadline-notifications`, `notification-retention`, `manager-weekly-digest` |
| Export CSV | `lib/export-assessments-csv.js`, `GET /api/admin/export` (cap `EXPORT_MAX_ROWS` + stream) |
| Retenção LGPD | `lib/retention.js`, `POST /api/admin/retention/purge` (lotes) |
| Links públicos | `lib/public-company-link.js`, `lib/public-vacancy-link.js`, `app/t`, `app/v` |
| Timeline do candidato | `app/_components/CandidateTimeline.jsx`, `lib/hire.js` (`buildCandidateTimeline`) |
| Erros / status HTTP | `lib/api-error.js`, `lib/api-error-codes.js` (`ERR`, `apiErrorFromResult`) |
| Status domínio (employment, vaga, clima, roster) | `lib/domain-status.js` |
| Funil / rejeição | `lib/pipeline.js` (`PIPELINE_STAGES`) |
| Copy / i18n | `lib/i18n.js` |
| Notas ricas (HTML) | `app/_components/RichTextEditor.jsx`, `RichTextView.jsx`, `lib/sanitize-html.js` |
| Feedback UI (confirm/toast/loading) | `app/_components/AppFeedback.jsx`, `ConfirmDialog.jsx`, `SystemNoticeModal.jsx`, `AppLoading.jsx` (`AppLoading`, `ContentEnter`, `NavLoadBar`, `PanelPageSkeleton`, `Spinner`), `CollapsibleBlock.jsx` (`DisclosureToggle`), `IconActionTip.jsx`, `EmptyState.jsx` |
| Tags / chips (tema Academy, etc.) | `app/_components/TagInput.jsx` (+ `type: 'tags'` no `PromptFormDialog`); `lib/tag-list.js` |
| Busca de colaborador (nome → id) | `app/_components/EntitySearchSelect.jsx` (+ `type: 'entitySearch'`); `GET /api/admin/employees/search` |
| Campos de data / datetime | `app/_components/DateField.jsx` (+ `type: 'date'` / `'datetime-local'` no `PromptFormDialog`) |
| Controles nativos (select/input/checkbox) | `app/_components/form-control-styles.js` + `.ui-select` / `.ui-field` / `.ui-checkbox` em `globals.css`; tokens `S.select` / `S.selectCompact` / `S.input` / `S.checkbox` |
| Campos de formulário (label acima) | `app/_components/FormField.jsx` (`FormField`, `formFieldRowClass`) + `S.fieldRow` |
| Links compartilháveis (copiar / abrir) | `app/_components/CopyableLink.jsx`, `lib/clipboard.js` |
| Cadastro simples (modal) | `PromptFormDialog` via `useAppFeedback().promptForm` — Users, Companies, convites |
| Cadastro rico (drawer) | `AdminRichFormDrawer` — Vagas create/edit |
| Cores / marca | `lib/theme.js`, `lib/brand.js`, **`tailwind.config.js`**, `app/globals.css`, tokens `S.*` em `dashboard-shared.jsx` |
| Listagens admin (grid) | `SortableTh`, `AdminTh`, `AdminTableShell`, `AdminPageHeader`, `AdminListFilters` / `AdminListFilterSelect` (`_components`), `AdminListSearch`, `AdminListPager`, `AdminCreateButton`, `AdminEditButton`, `AdminDeleteButton`, `AdminViewButton`, `AdminIconButton`, `AdminActionsCell` / `Th`, `CopyableLink` `iconOnly` — `dashboard-shared.jsx`; regra `.cursor/rules/admin-list-grid.mdc`; referência `ExitAnalysisAdminTab` |
| Status / chips semânticos | `app/_components/StatusToneChip.jsx` |
| Escala / medidor / KPI / callout / shell | `ScaleRatingButtons`, `MeterBar` (+ `Bar`), `StatMetricTile`, `InlineCallout`, `PublicNarrowShell`, `SegmentedControl`, `InsightListItem` |
| Logo empresa (S3) | `lib/company-logo.js`, `lib/company-logo-limits.js`, `lib/company-logo-client.js` (crop/compress), `CompanyLogoCropDialog`, `POST/DELETE …/companies/[id]/logo` |
| Schema | `migrations/`, `scripts/rds-bootstrap-completo.sql` |
| Provas (DTOV / HTTP / browser) | `test/` (`test/README.md`) — harness em `test/dtov/`, Playwright em `test/e2e/` |
| LGPD | `docs/privacidade-lgpd-interno.md`, `app/api/admin/retention/purge` |
| Security hardening | `docs/security-hardening-2026-08.md` |
| SEO / vagas públicas | `docs/job-seo-and-distribution.md`, `app/jobs`, `lib/job-indexing.js`, Guia `panel.help.publicVacancy*` |
| Guia / Help | `app/dashboard/tabs/HelpTab.jsx`, chaves `panel.help.*` em `lib/i18n.js`, `lib/help-sections.js` |
| Assistente de Ajuda (só produto) | `lib/help-assistant.js`, `HelpAssistantWidget`, `POST /api/admin/help-chat`, `docs/help-assistant-knowledge.md` |
| Backlog de ideias | `docs/BACKLOG.md` — adicionar ao pedir; remover ao implementar |

## Referências

- README: setup Docker / local
- `CLAUDE.md`: entrada para Claude Code (aponta para este arquivo)
- `.cursor/rules/`: atalhos Cursor por área (`ui-ux.mdc`, `dba-performance.mdc` alwaysApply)
- `.cursor/skills/dev-test-validate/` + `.cursor/rules/dev-test-validate.mdc`: **obrigatório** após implementação (Dev → Test → Validate, DTOV, `max_rounds`)
- `docs/rubrica-por-vaga.md`, `docs/privacidade-lgpd-interno.md`, `docs/job-seo-and-distribution.md`

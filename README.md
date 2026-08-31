# 30Team

> Perfis e dinâmica de equipe (time interno e contratações) — Next.js + Postgres + Docker/K8s

Avaliação baseada no **modelo do Eneagrama** (tipos **T1–T9**): mapa de perfil de trabalho para triagem, comparativos e conversas — **não** substitui entrevista técnica nem é diagnóstico clínico.

Também há fluxo de **Motivadores** (Assessment Engine). Rubrica por vaga: [`docs/rubrica-por-vaga.md`](docs/rubrica-por-vaga.md). LGPD interno: [`docs/privacidade-lgpd-interno.md`](docs/privacidade-lgpd-interno.md).

---

## Arquitetura

```
Navegador (React) → Next.js (App Router) → PostgreSQL 16
```

| Camada | Detalhe |
|--------|---------|
| Frontend | React + Next.js App Router + **Tailwind CSS** (tokens em `tailwind.config.js` / `lib/theme.js`) |
| Backend | API Routes + Server Components |
| Auth | Tabela `users` + JWT em cookie httpOnly (`session_version` revoga sessões) |
| Roles | `admin`, `direction`, `hr` |
| Config | `process.env` (Compose / K8s / Vercel / etc.) |

---

## Estrutura do projeto

```
30Team/
├── app/
│   ├── page.jsx                 ← Landpage SEO / early access
│   ├── signup/                  ← Self-service signup (early access)
│   ├── employee/                ← Hub colaborador (senha) + lms / dp / time-clock
│   ├── t/[token]/               ← Entrada pública por empresa (assessment)
│   ├── v/[token]/               ← Entrada pública por vaga (assessment; noindex)
│   ├── jobs/                    ← Índice + agregadores + página SEO
│   ├── companies/[companySlug]/ ← Perfil público da empresa (opt-in)
│   ├── ouvidoria/[token]/       ← Canal de ouvidoria (anônimo)
│   ├── a/unsubscribe/           ← Cancelar alerta de vagas
│   ├── a/set-password/          ← Ativação de senha (signup + reset)
│   ├── r/[token]/               ← Relatório cliente (shortlist)
│   ├── assessment/              ← Fluxos de avaliação (eneagrama / AE)
│   ├── login/                   ← Login do painel
│   ├── dashboard/               ← Painel (SSR + tabs; Guia = HelpTab)
│   └── api/                     ← results, auth, admin, ae, public, cron…
├── lib/                         ← DB, auth, i18n, pipeline, métricas, scoring…
│   ├── lms-media.js             ← Helpers LMS seguros no client (sem pg)
│   ├── help-sections.js         ← Índice do Guia / assistente IA
│   └── help-assistant.js        ← FAQ + retrieval do assistente
├── migrations/                  ← Schema versionado (fonte canônica; hoje até ~097)
├── test/                        ← Provas (DTOV + Playwright) — ver test/README.md
├── scripts/                     ← migrate, seeds, ops (não harness de teste)
├── docs/                        ← Rubrica, LGPD, help-assistant-knowledge, backlog
├── playwright.config.js
├── init.sql                     ← Stub Docker only (vazio de propósito)
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

**SQL:** na raiz só `init.sql` (montagem Docker). Schema e deltas ficam em `migrations/` e `scripts/`. Ver [`migrations/README.md`](migrations/README.md).

**Provas / regressão:** [`test/README.md`](test/README.md) — `npm run dtov:full-app` (SQL + HTTP + browser).

---

## Self-Service Signup + Onboarding (Early Access)

A partir da versão com migrations `051`, `052` e `053`:

- **Landpage** (`/`) → CTA direto para `/signup` (sem `mailto`)
- **Signup** cria automaticamente:
  - User pendente (`signup_pending = TRUE`, `onboarding_completed = FALSE`, role `direction`)
  - Company nova (ou associa a existente por `@domain` se `SIGNUP_DOMAIN_MATCH=true` — **manter false em prod**; join usa role `hr`, não `direction`)
  - Rate limit no signup (8/15min por IP); resposta `{ ok: true }` sem IDs no body
  - Token de ativação (72h) enviado por e-mail
- **Confirmação** via `/a/set-password?token=...` → usuário define senha e entra
- **Admin Leads** (`/dashboard?tab=leads`) — cohort `/signup` para contato futuro (pendentes e ativos). Em **Usuários**, cadastro normal = Origem Painel; quem veio do onboarding = Early access (também aparece em Usuários quando já está no sistema).
- **Sugestões de produto** (`/dashboard?tab=product-feedback`) — inbox super admin de ideias/bugs/UX enviados pelos gestores pelo assistente de Ajuda (“Sugerir melhoria”). Migration `082_product_feedback.sql`.
- **Jornada P0** (`102`): trilha LMS por cargo (auto-enroll no hire), decisão de experiência (`pass`/`extend`/`terminate` + prorrogação de prazos), template D1 configurável no hub DP.
- **Banco de horas** (hub DP → Banco de horas; saldo/pedido em `/employee/time-clock`) — teto por empresa, lançamento manual, créditos do ponto (≥15 min), aprovação RH, CSV mensal. Migration `099_hour_bank.sql`. **Não** é folha/acordo coletivo.
- **Mural e reconhecimento** (`/dashboard?tab=company-feed`, `/employee#feed` / `#kudos`) — avisos da empresa (rich text) + kudos peer-to-peer (≤280); notif ao destinatário; contagem no digest semanal. Migration `085_company_feed_kudos.sql`. Sem chat.
- **Prep de entrevista** (`/prep/<token>`) — perguntas hedged para o candidato (notas só no dispositivo); RH vê chip “Preparou-se”. Migration `086_interview_prep.sql`.
- **OKRs leves** (aba Pessoas → OKRs) — ciclo/área/atividade, peso 0–10, check-ins, vínculo de pessoas, hub `/employee` → Meus OKRs + notificação. Migrations `096`+`097`+`098`+`104`.
- **Ouvidoria** (`/dashboard?tab=whistleblowing`, `/ouvidoria/{token}`) — canal anônimo + triagem RH. Migration `090`.
- **Organograma** + **feedback contínuo** (Equipe/Grupos + `/employee` / `/feedback/{token}`). Migration `090`.
- **Bônus / remuneração variável** (proposta RH → aprovação; status no hub). Migration `090`.
- **Auditoria** (`/dashboard?tab=audit`) — trilha append-only (super admin). Filtro **Empresa** por nome (alinha ao filtro do painel). Ver [`docs/audit-log.md`](docs/audit-log.md).
- **Super admin sem empresa fixa:** use o filtro **Empresa** no topo (lembrado entre abas). Ops: `npm run db:create-super-admin`.
- **Wizard “Primeiros passos”** só para cohort `/signup`. Usuários do painel/legado (migration `055`) não veem o modal de early access.
- **Inteligência comportamental** na Visão geral (`behavioralIntel`): no topo (funil recolhido); filtro ou **grupo salvo** (`teamGroup`); perfis, motivadores, forças/atenções (até 5), Top 5 e ações — agregado, hedged, sem nomes.
- **Wizard de onboarding** (primeiro acesso):
  - 4 steps guiados: boas-vindas, criar vaga, convidar pessoas, recursos
  - Dismissível a qualquer momento (nunca mais aparece após completar/pular)
  - Marca `users.onboarding_completed = TRUE`
- **Trial limits** (soft caps via env):
  - `TRIAL_MAX_VACANCIES` (default 2)
  - `TRIAL_MAX_CANDIDATES` (default 50)
  - `TRIAL_MAX_USERS` (default 3)
  - `TRIAL_MAX_MOTIVATORS` (default 10)
  - `TRIAL_MAX_CLIMATE_SURVEYS` (default 2)
- **Analytics** de landpage: `landing_analytics` table + tracking de conversão (pageview → signup → ativação)

Tabelas novas:
- `users.signup_pending`, `users.signup_source`, `users.signup_metadata`, `users.onboarding_completed`
- `companies.signup_auto_created`, `companies.signup_creator_user_id`
- `landing_analytics` (events: pageview, cta_click, signup_start, signup_complete, login)

---

## Epic B-1000 — Plataforma GP (B-1001 a B-1004 entregues)

A partir da migration `054`, `055` e `056`:

### B-1001 — HR Score + Predições
- **HR Score (0-100)** consolidando 7 sinais comportamentais: perfil T1-T9 (15%), Motivadores (20%), Fit (15%), PDI (20%), Check-ins (10%), Clima (10%), Retenção (10%)
- **Predições** derivadas dos sinais: risco de turnover (low/medium/high) e áreas de gap PDI
- UI: `HrScoreCard` na Visão Geral (média empresa, por área, top/bottom 5) e `HrScoreBadge` nas listagens
- APIs: `GET /api/admin/hr-score/:candidateId`, `GET /api/admin/hr-score/company`, `POST /api/admin/hr-score/recalculate`
- Migration: `054_hr_score.sql` (tabela `hr_scores`)

### B-1002 — Radar de Rotatividade (Multi-sinal)
- **Turnover Radar** focado em 4 sinais críticos de saída: Clima (30%), Motivadores/retenção (30%), PDI concern (25%), Check-ins concern (15%)
- Calcula risco de turnover (low/medium/high) e sugere ações
- UI: `TurnoverRadarCard` na Visão Geral com distribuição low/med/high + lista top at-risk e breakdown visual de sinais
- API: `GET /api/admin/turnover-radar/company` (inclui `distribution`)
- Lib: `lib/turnover-radar.js` (calcula radar, detecta trend change para notificações futuras)
- **Viz lean P3:** ouvidoria (funil/categorias), pool de férias no inbox DP (`VacationPoolBlock`, `mode=pool`)

### B-1003 — Engenharia de Cargos (Leve)
- **Cargos (Job Roles)** com rubrica T1-T9 que podem ser herdados por vagas via FK `vacancies.job_role_id`
- CRUD completo: listar, criar, editar, desativar (soft)
- UI: `JobRolesAdminTab` (admin), campo `jobRoleId` no formulário de vagas (`VacanciesAdminTab`), componente `RubricEditor` para editar pesos visuais
- APIs: `GET/POST /api/admin/job-roles`, `GET/PATCH/DELETE /api/admin/job-roles/[id]`
- Lib: `lib/job-roles.js` (`getRubricForVacancy` resolve herança: job_role → vacancy rubric)
- Migration: `055_job_roles.sql` (tabela `job_roles`, FK em `vacancies`)

### B-1004 — Avaliação de Desempenho + Metas → PDI
- **Performance Cycles** (company-wide): rascunho → ativo → fechado
- **Goals** (metas por candidato em um ciclo): título, descrição, peso (%), outcome (`met`, `exceeded`, `develop`, `not_met`)
- **Reviews** (avaliação por candidato): draft → submitted
- **Auto PDI**: ao submeter review, metas com outcome `develop` geram automaticamente itens PDI com `source: 'performance_review'` e `performance_goal_id` linkado
- UI: `PerformanceReviewsAdminTab` (criar/listar ciclos), review form (metas + outcomes + auto-confirm de PDI)
- APIs: `/api/admin/performance-cycles` (CRUD cycles), `/api/admin/performance-goals` (CRUD goals), `/api/admin/performance-reviews` (GET/POST draft, POST submit → auto PDI)
- Lib: `lib/performance-reviews.js` (ciclos, goals, reviews, `autoGeneratePdiFromReview`)
- Migration: `056_performance_reviews.sql` (tabelas `performance_cycles`, `performance_goals`, `performance_reviews`; estende `development_plan_items.source` para incluir `'performance_review'` e adiciona FK `performance_goal_id`)

### B-1005 — Plano de Sucessão
- **Critical Roles** (papéis críticos da empresa): título, descrição, área, nível de impacto (high/critical)
- **Succession Plans** (sucessores por papel): candidato, prontidão (`not_ready`, `developing`, `ready`, `now`), notas, data-alvo
- **Readiness Score**: combina HR Score (70%) + Leadership Potential (30%) para ranquear candidatos
- Integração com `lib/hr-score.js` (B-1001) e `lib/leadership-analytics.js` (potencial de liderança já existente)
- UI: `SuccessionAdminTab` (criar/listar papéis críticos, ver contadores de sucessores)
- APIs: `/api/admin/succession/critical-roles` (CRUD roles), `/api/admin/succession/plans` (CRUD succession plans), `/api/admin/succession/critical-roles/[id]/successors` (list successors)
- Lib: `lib/succession-plans.js` (CRUD roles/plans, `calculateSuccessionReadiness`, `getPotentialSuccessors`)
- Migration: `057_succession_plans.sql` (tabelas `critical_roles`, `succession_plans`)

### B-1006 — Análise Demissional
- **Exit Records** (registro de saída): candidato alumni, data, tipo (voluntary/involuntary/mutual), motivo (16 razões: better_offer, compensation, career_growth, performance, culture_fit, manager_relationship, etc.), notas (contexto/feedback)
- **Agregação**: motivos × tipo T1–T9 × área para padrões de rotatividade
- **Insights automáticos**: categoriza em M1 (seleção: compensação não competitiva, fit cultural, desempenho) e M3/M4 (gestão: relação com gestor, falta de crescimento). Apresenta % e sugestões hedged.
- UI: `ExitAnalysisAdminTab` (registrar/listar saídas), `ExitInsightsCard` no Overview (padrões M1/M3/M4)
- APIs: `/api/admin/exit-analysis` (CRUD exit records), `/api/admin/exit-analysis/insights` (agregações + insights)
- Lib: `lib/exit-analysis.js` (CRUD, `getExitReasonAggregation`, `getExitsByTypeProfile`, `getExitInsights`)
- Migration: `058_exit_analysis.sql` (tabela `exit_records`)

### B-1007 — Cultura Organizacional
- **Leitura hedged**: sintetiza clima (Likert mean level), mix T1–T9 (arquétipo dominante, % homogeneidade), pulsos recentes (engajamento), e valores declarados (`companies.about_html`)
- **Insights categorizados**: saúde geral (positivo ≥4.0, neutro ≥3.0, atenção <3.0), arquétipo cultural (tipos dominantes ≥20%), homogeneidade (>50% em um tipo), engajamento (frequência de pulsos), alinhamento declarado × praticado
- **Sem novo instrumento**: reusa climate surveys, T1–T9 assessments, team pulses, company profile
- UI: `CultureInsightsCard` no Overview (resumo + insights completos expandíveis)
- API: `/api/admin/organizational-culture` (GET com `?summary=true` para rollup)
- Lib: `lib/organizational-culture.js` (`getOrganizationalCulture`, `getCultureSummary`, `synthesizeCultureInsights`)

### B-1008 — Academy (Learning Resources)
- **Catálogo leve** (não é LMS): título, descrição rica, temas em tags (`TagInput`), tipo, URL, duração
- **Link com PDI**: Equipe → PDI → item → botão Academy (`development_plan_resource_links`); listagem GET também para `TEAM_VIEW`
- Sem player, SCORM ou progresso
- UI: `LearningResourcesAdminTab`; APIs `/api/admin/learning-resources`; lib `lib/learning-resources.js`
- Migrations: `059_learning_resources.sql`, `063_learning_theme_tags.sql`

### B-1009 — Benefícios da Empresa (Company Benefits)
- **Catálogo informativo** de benefícios oferecidos pela empresa: nome, descrição, categoria (livre), tipo (health/dental/vision/life_insurance/retirement/vacation/flexible_hours/remote_work/gym/meal_voucher/transport_voucher/education/daycare/other)
- **Contexto de retenção/oferta**: lista serve como referência em conversas de retenção e na composição de ofertas de emprego
- **Sem adesão, sem folha, sem clube**: não há sistema de inscrição, desconto em folha ou gestão de adesão. Apenas catálogo de benefícios que a empresa oferece
- UI: `CompanyBenefitsAdminTab` (CRUD com filtro por categoria)
- APIs: `/api/admin/company-benefits` (list com `?category=`, `?categories=true`, POST), `/api/admin/company-benefits/[id]` (GET, PATCH, DELETE)
- Lib: `lib/company-benefits.js` (CRUD, `getCompanyBenefitCategories`)
- Migration: `060_company_benefits.sql` (tabela `company_benefits`)

### B-2510 — Remuneração interna (RH)
- **Histórico leve** de salário e reajustes por colaborador — **não** é folha, holerite ou ponto
- Equipe → ficha da pessoa (contratado/alumni) → aba **Remuneração**: salário vigente + timeline; import opcional da oferta aceita na vaga
- APIs: `GET/POST /api/admin/candidates/[id]/compensation`, `PATCH/DELETE …/compensation/[eventId]`
- Lib: `lib/people/employee-compensation.js`; migration `072_employee_compensation.sql`
- **Faixa de mercado (B-2711):** Cargos com `market_salary_min`/`max` + `candidates.job_role_id`; compare na Remuneração e Atenção na Overview (`084_market_salary_bands.sql`). Não é pesquisa live.

**Epic B-1000 completo** (B-1001 a B-1009) ✅

### Epic B-1200 — conectar + UX + profundidade
- Sidebar agrupado (Análise / Recrutamento / Pessoas / Catálogos / Conta / Ajuda)
- Overview Atenção: PDI atrasado, clima aberto, check-in pós-hire, papel crítico sem sucessor
- Kit de hire notifica com trecho de benefícios (`formatBenefitsForOnboarding`)
- PDI ↔ Academy na UI; tour pós-signup aponta `#overview-tab` / `#vacancies-tab` / `#team-tab` / `#help-tab`
- Fit da vaga mostra top contribuições da rubrica

---

## Banco de dados

| Arquivo / comando | Quando usar |
|-------------------|-------------|
| `npm run db:migrate` | Ambiente já existente — aplica `migrations/*.sql` pendentes |
| `scripts/rds-bootstrap-completo.sql` | Postgres novo (RDS / local) — schema completo de uma vez |
| `scripts/scripts-banco-pendentes.sql` | pgAdmin — bundle das migrações recentes (idempotente) |
| `scripts/seed-eval-20-employees.sql` | Massa de avaliação: 20 emp + **10 time interno** (PDI/clima/pulso/portal/…) + categorias/benefícios + Academy (tags) + 2 exits + 1 admin (`eval-20-demo`) |
| `scripts/seed-demo-todos-os-dados.sql` | **Seed de apresentação** (base ≤080): empresa Todos os Dados, pipeline, People/GP, LMS, clima+eNPS, pulso, `/e` + `/employee`. **Módulos novos:** rode em seguida `scripts/seed-demo-todos-os-dados-modules.sql` (DP, mural/kudos, OKR ciclos, ouvidoria, banco de horas). Inbox HR: ~12 tipos `NOTIF`; colab: tipos `EMPLOYEE_NOTIF` |
| `npm run db:seed-demo-todos-os-dados:confirm` | **Mesmo tenant via JS (canônico, até 103)** — todos os colaboradores com dados em todos os módulos; DTOV / local. Exige `CONFIRM_DEMO_PURGE=1` (já no script `:confirm`) |
| `npm run db:create-super-admin` | Cria/atualiza usuário **super admin** (sem `company_id`) via `.env` (`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` ou defaults do script). SQL espelho: `scripts/create-super-admin.sql` |
| `npm run db:seed-demo-client-jobs-board:confirm` | **Board `/jobs` para demo com cliente**: 10 empresas (`demo-board-*`) + 50 vagas públicas com descrição HTML completa; não toca Todos os Dados / Eval |

```bash
# Migrações incrementais
npm run db:migrate

# Bootstrap completo (psql / pgAdmin)
psql "$DATABASE_URL" -f scripts/rds-bootstrap-completo.sql

# Seed Eval 20 (tenant isolado slug=eval-20-demo)
# Login: admin@eval-20.demo / EvalDemo!2026
psql "$DATABASE_URL" -f scripts/seed-eval-20-employees.sql

# Seed apresentação Todos os Dados (tenant isolado slug=todos-os-dados-demo)
# Requer migrations através de 103 + areas; Motivadores opcional (db:seed-motivators)
# HR:           hr@todos-os-dados.demo / DemoTodosDados!2026          → /login
# Direction:    direction@todos-os-dados.demo / DemoTodosDados!2026   → /login
# Colaborador:  colaborador@todos-os-dados.demo / DemoTodosDados!2026 → /employee
# JS (recomendado): todos os módulos até 103, dados em cada colaborador
npm run db:seed-demo-todos-os-dados:confirm
# pgAdmin: base SQL + módulos
# psql "$DATABASE_URL" -f scripts/seed-demo-todos-os-dados.sql
# psql "$DATABASE_URL" -f scripts/seed-demo-todos-os-dados-modules.sql

# Board /jobs para demo com cliente (10 empresas · 50 vagas públicas)
# Não apaga Todos os Dados / Eval — só slugs demo-board-*
# Login exemplo: hr@demo-board-nortech.demo / DemoBoard!2026
npm run db:seed-demo-client-jobs-board:confirm
# Abrir: /jobs
```

---

## Quickstart

### 1. Configurar

```bash
cp .env.example .env
# Editar senhas, JWT_SECRET, BOOTSTRAP_ADMIN_*
```

Gerar `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Produção (Docker)

```bash
docker compose up -d
```

- App (landpage SEO/vendas): http://localhost:3000 — JSON-LD + `/llms.txt`; CTA principal **early access** (mailto); secundário login → `/login`
- Login: http://localhost:3000/login (link “Esqueceu a senha?” → e-mail `/a/set-password`, 72h; requer SMTP)
- Teste público: criar empresa no dashboard → link `/t/<token>`

### 3. Desenvolvimento (hot reload)

```bash
docker compose -f docker-compose.dev.yml up
```

### 4. Local sem Docker (Postgres já rodando)

Recomendado: **Node 22** (imagem Docker de build usa `node:22-alpine`). Node 20+ costuma funcionar; evite Node 18.

```bash
npm install
cp .env.example .env
# Ajuste POSTGRES_* / JWT_SECRET / NEXT_PUBLIC_APP_URL
npm run db:migrate
npm run dev
```

**Checklist local rápido**
1. `npm run db:migrate` até a migration mais recente (ex.: `098_okr_weights_checkins.sql`).
2. Seed de demo: `npm run db:seed-demo-todos-os-dados:confirm` (massa rica; pode não cobrir 100% dos módulos pós-080).
3. Guia/assistente: `npm run test:full:offline` inclui cobertura `panel.help.*` + FAQ.
4. Client vs server: helpers LMS de URL/PDF ficam em `lib/lms-media.js` (não importar `lib/lms.js` em componentes `'use client'`).
5. Docs do assistente: [`docs/help-assistant-knowledge.md`](docs/help-assistant-knowledge.md).

---

## Fluxos principais

### Candidato / colaborador

```
1. Assessment: abre /t/<token> (empresa) ou /v/<token> (vaga) → responde o teste
2. Página pública SEO (opcional): /jobs/<slug>-<id> → lê a vaga → CTA para o /v/…
3. Índice: /j lista vagas públicas abertas 
4. POST /api/results → grava no Postgres; vê o resultado na tela
5. Pós-hire (token): /e/<token> — PDI, combinados, prep 1:1, LMS (sem conta)
6. Sessão colaborador: Equipe → Convidar acesso (e-mail set-password) → /employee/set-password
   → login e-mail/senha em /employee/login (cookie team30_employee_session; PDI self-serve,
   hub “Hoje” + páginas dedicadas **/employee/lms**, **/employee/dp**, **/employee/time-clock**;
   LMS: layout curso (lista + player), retoma vídeo YouTube/Vimeo,
   PDF in-app, quiz, certificado print; hub resume prazos;
   jornada **Minha chegada**, **Meus OKRs**, mural/kudos/feedback,
   notifs Motivadores/PDI/LMS/OKR; não acessa /dashboard).
   Magic link opcional. Ver `docs/employee-onboarding-journey.md`. /e/<token> continua sem conta.
```

### Gestor no dashboard

```
1. /login → JWT em cookie httpOnly (TTL **8h**; claim `sv` = `users.session_version`)
2. Sliding no middleware: gestor (`/dashboard`, `/api/admin`, `/api/me`, TTL **8h**) e colaborador (`/employee`, `/api/employee`, TTL **12h**) — se a sessão ainda é válida e faltam ≤ **2h**, reemite o cookie. Sem uso pelo TTL respectivo a sessão cai; `session_version` continua revogando na hora
3. Logout / troca de senha / desativação incrementam `session_version` e invalidam JWTs antigos
4. APIs admin e SSR do painel revalidam usuário live (active, role, company) a cada request
5. /dashboard → auth leve pinta o shell (sidebar); queries da aba em Suspense (`load-dashboard-data.js`)
6. Abas: visão geral, equipe, compatibilidade, vagas, motivadores, Guia (Ajuda), etc.
7. Em Vagas: link /v/… (teste) e, se habilitado, página /jobs/{slug}-{id} (divulgação/SEO)
```

---

## Página pública da vaga (`/jobs/{slug}-{id}`)

- URL canônica indexável: `/jobs/{slug}-{id}` (id = `vacancies.id`; JobPosting JSON-LD, Open Graph / Twitter com imagem da marca).
- O link `/v/{token}` continua sendo o **assessment** (noindex; token pode rotacionar).
- Flags na vaga: página pública, permitir indexação, mostrar empresa, mostrar salário.
- Perfil da empresa (admin → Empresas): no modal criar/editar — `website`, texto “sobre”, flag **página pública de carreiras** (`public_profile_enabled`) e **logo** (crop 1:1 + compressão no cliente ≤512 KB / lado ≤768 px; origem até 20 MB; S3 → `logo_url` / `logo_key`). Canônica: `/companies/{slug}` (neutra pt/en). Sem opt-in → 404.
- Índice `/jobs`: busca, filtro de contrato, paginação; rodapé com **alerta de vagas** (`POST /api/public/job-alerts`). Cancelar: `/a/unsubscribe?token=…`. Ao publicar página pública (create ou ligar flag), dispara e-mail aos alertas ativos que casam com filtros — exige SMTP; sem SMTP é no-op e não bloqueia o save.
- Agregadores SEO (automáticos): `/jobs/remote` e `/jobs/city/{slug}` só se houver ≥ `PUBLIC_JOB_AGGREGATOR_MIN_COUNT` vagas indexáveis (default **3**); sem massa → 404. Preencher modalidade/cidade no drawer. Sem JobPosting nestas listas.
- Conteúdo exibido quando existir: título, empresa (logo se houver), tipo de contrato, modalidade/cidade, salário (flag), datas (publicação / `target_date`), descrição, CTA, share.
- Sem campos no schema hoje (omitidos de propósito): senioridade, skills/benefícios separados.
- Encerrada ou `target_date` passado: agradecimento + relacionadas + `/jobs`; sem JobPosting / noindex / sem CTA de apply.
- SEO: `robots.txt` + `sitemap.xml` (só vagas `open`, indexáveis e prazo ok; inclui agregadores que passam o limiar).
- Google Indexing API (opcional): `GOOGLE_INDEXING_ENABLED=true` + service account — push ao criar/atualizar/fechar página pública indexável (`lib/job-indexing.js`). Desligado por padrão; falha não bloqueia o save da vaga.
- Atribuição / funil: query `utm_*` e `?ref=` → cookie httpOnly `team30_job_attr` (7 dias, sem PII). Persistido em `assessments.attr_*` no submit da vaga; eventos em `job_funnel_events`. Analytics: `GET /api/admin/vacancies/[id]/analytics`.
- Referral (indicação): tabela `referral_codes`; APIs admin + **aba Indicação** no detalhe da vaga (criar, copiar `/jobs/…?ref=`, desativar, métricas). Analytics: `GET /api/admin/referral-codes/analytics`.
- Logo empresa: `S3_BUCKET` + chaves AWS (ver `.env.example`). Sem S3 o upload fica desligado; páginas públicas usam `logo_url` quando existir (incl. `hiringOrganization.logo` no JSON-LD).

Migration: `migrations/030_company_profile_public_vacancy_page.sql` (+ `031` default indexável; `032` atribuição/funil; `033` referral; `035` job alerts; `036` `companies.public_profile_enabled`; `037` workplace; `039` logo).

Doc técnica (arquitetura, envs, Indexing, funil, IA, checklist LGPD): [`docs/job-seo-and-distribution.md`](./docs/job-seo-and-distribution.md). Guia do painel: aba **Ajuda**. Assistente flutuante de Ajuda (IA): indexa o Guia — ver [`docs/help-assistant-knowledge.md`](./docs/help-assistant-knowledge.md).

---

## Analytics — Métricas de Efetividade (Epic B-1100)

A aba **Analytics** consolida **inteligência acionável** sobre recrutamento e gestão de pessoas, reutilizando dados já coletados (T1–T9, Motivadores, PDI, clima, turnover).

### Funcionalidades Principais

| Módulo | O que mede | Onde |
|--------|------------|------|
| **Métricas de Efetividade** (B-1101) | Time-to-hire, retenção 6m/12m/24m, time-to-productivity, fit contratados vs pool, aderência rubrica | `/dashboard?tab=analytics` → Métricas |
| **Tendências Temporais** (B-1102) | HR Score médio, turnover risk, clima, PDI completion, hires vs exits (últimos 6/12/24 meses) | Analytics → Tendências |
| **Comparativos** (B-1103) | Área A vs B, período antes/depois, rubrica X vs Y | Analytics → Comparar |
| **Alertas** (B-1104) | Clima -15%, turnover +20%, vagas >90 dias, HR Score <50, PDI <30% | Analytics → Alertas (proativo) |
| **Export** (B-1105) | JSON estruturado, CSV | Botão "Export" em cada visão |

### API para Integrações Externas (B-1106)

Todas as métricas são expostas via **REST API** autenticada (JWT de gestor):

```bash
# Métricas de efetividade
GET /api/admin/analytics/metrics?startDate=2025-01-01&endDate=2026-08-27

# Tendências (12 meses)
GET /api/admin/analytics/trends?months=12

# Comparar duas áreas
GET /api/admin/analytics/compare?type=areas&areaA=Engineering&areaB=Sales

# Alertas ativos
GET /api/admin/analytics/alerts

# Export CSV
GET /api/admin/analytics/export?format=csv&type=metrics
```

**Rate Limiting:** 100 req/min por usuário  
**Autenticação:** Cookie `team30_session` (JWT)  
**Roles:** `admin`, `direction`, `hr`

Documentação completa: [`docs/analytics-api.md`](./docs/analytics-api.md)

### Performance & Cache

- **HR Score Cache:** TTL 5min em memória (`lib/hr-score-cache.js`)
- **Índices otimizados:** `migrations/061_performance_indexes.sql` (15 índices estratégicos)
- **Monitoring:** Logs estruturados JSON (`lib/monitoring.js`) + métricas in-memory
- **Health Check:** `GET /api/health/metrics` (admin-only) — cache metrics, memory, request counts

### Exemplo: Comparar Fit Contratados vs Pool

```javascript
const response = await fetch('/api/admin/analytics/metrics?startDate=2026-01-01', {
  credentials: 'include',
});

const { metrics } = await response.json();
console.log(`Fit contratados: ${metrics.fitComparison.hiredAvgFit}`);
console.log(`Fit pool: ${metrics.fitComparison.poolAvgFit}`);
console.log(`Delta: +${metrics.fitComparison.delta}`);
```

### Relatórios Agendados (B-1107)

Digest semanal ou mensal automatizado por email:

```bash
# Cron job (adicionar ao crontab ou scheduler)
# Toda segunda-feira às 9h — empresas com frequency=weekly (default)
0 9 * * 1 curl -X POST "https://30team.app/api/cron/analytics-report?frequency=weekly" \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Mensal (1º do mês) — empresas com frequency=monthly
0 9 1 * * curl -X POST "https://30team.app/api/cron/analytics-report?frequency=monthly" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

Preferências por empresa: aba **Analytics** → Relatório agendado (frequência, PDF). Destinatários custom via `PATCH /api/admin/analytics/report-prefs` (`recipientUserIds`). Sem prefs = direction + admin.

**Conteúdo do email:**
- Métricas de efetividade (time-to-hire, retenção, fit)
- Tendências dos últimos 3 meses (HR Score, turnover, clima)
- Alertas ativos (climate_drop, turnover_risk_increase, etc.)
- Link direto para o dashboard

**Destinatários:** automático para todos os `direction` + `admin` da empresa ativa.

**Roadmap:** Webhooks de alertas, PDF anexo, OpenAPI spec, destinatários configuráveis.

---

## Segurança

| Aspecto | Implementação |
|---------|---------------|
| Credenciais do banco | Só no servidor |
| Autenticação | JWT httpOnly |
| Rotas do painel | Middleware + roles `admin` / `direction` / `hr` |
| Senha | `users.password_hash` (bcrypt) |
| Escrita do teste | Endpoints públicos de resultado / convite (com token de link) |
| SEO / funil | Sem candidato em sitemap/JSON-LD; analytics só autenticado — ver checklist em `docs/job-seo-and-distribution.md` |

---

## Variáveis de ambiente

Principais (lista completa em `.env.example`):

| Variável | Descrição |
|----------|-----------|
| `POSTGRES_*` | Conexão ao banco |
| `POSTGRES_READ_HOST` | Réplica só-leitura (opcional) |
| `BOOTSTRAP_ADMIN_EMAIL` / `_PASSWORD` | Admin inicial |
| `JWT_SECRET` | Assinatura do JWT (≥32 chars em produção) |
| `REDIS_URL` | Opcional — Redis clássico para rate limit (`redis://:senha@host:6379/4`). Dublin: `redis-haproxy.redis.svc` |
| `REDIS_KEY_PREFIX` | Prefixo das chaves de rate limit (default `team30`) |
| `LOG_LEVEL` | Logs JSON stdout: `debug`/`info`/`warn`/`error` (default `info`) |
| `LOG_SLOW_MS` | Threshold de query/op lenta em ms (default `1000`) |

Hot paths / EXPLAIN: [`docs/performance-hotpaths.md`](docs/performance-hotpaths.md) (`npm run dtov:explain` no DTOV). Inclui P3 colaborador (B-2802).
`MAIL_RETRY_ATTEMPTS` (default 3) em envios SMTP reais.
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | Sentry (org `3035tech-9t`, project `30team`); vazio = desligado |
| `SENTRY_AUTH_TOKEN` | Upload de source maps no `next build` (CI/prod) |
| `SENTRY_ENVIRONMENT` | Tag de ambiente no Sentry (default `NODE_ENV`) |
| `NEXT_PUBLIC_APP_URL` | URL pública (links de e-mail, Indexing, share) |
| `COOKIE_SECURE` | Força Secure (`true`/`false`) |
| `SMTP_HOST` + `MAIL_FROM` | E-mail (convites **e** job alerts ao publicar `/jobs`; sem SMTP = alerts no-op) |
| `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | Detalhe SMTP |
| `SMTP_MOCK` | `1` = captura envios em memória (sem SMTP). `DTOV=1` sem SMTP também mocka |
| `OPENAI_API_KEY` | IA (rubrica, descrição de vaga, parecer `/r`) — opcional |
| `OPENAI_RUBRIC_MODEL` | Modelo (default `gpt-4o-mini`) |
| `OPENAI_MOCK` | `1` = stub determinístico (sem API). `DTOV=1` também força mock |
| `GOOGLE_INDEXING_ENABLED` | `true` liga push Google Indexing (default off) |
| `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON` | JSON inline ou path da service account |
| `GOOGLE_INDEXING_MOCK` | `1` = não chama Google (DTOV já mocka com `DTOV=1`) |
| `PUBLIC_JOB_AGGREGATOR_MIN_COUNT` | Mínimo de vagas para publicar `/jobs/remote` e `/jobs/city/…` (default `3`) |
| `RETENTION_DAYS` | Retenção / LGPD |
| `CRON_SECRET` | Crons (lembretes, prazos de vaga, LMS overdue, retenção de notificações, digest semanal) |

---

## Deploy (VPS / EC2)

1. Docker + Compose na máquina  
2. Clone + `.env`  
3. `docker compose up -d`  
4. Reverse proxy (Nginx/Traefik) → porta 3000 + SSL  

Exemplo Nginx:

```nginx
server {
    listen 443 ssl;
    server_name app.exemplo.com;
    ssl_certificate     /etc/letsencrypt/live/app.exemplo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.exemplo.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Comandos úteis

```bash
# Dados de desenvolvimento
npm run db:seed
npm run db:clear

# Demo apresentação Todos os Dados (slug=todos-os-dados-demo; migrations ≤103)
# Colaborador: colaborador@todos-os-dados.demo / DemoTodosDados!2026 → /employee
npm run db:seed-demo-todos-os-dados:confirm
# ou: psql "$DATABASE_URL" -f scripts/seed-demo-todos-os-dados.sql
#     psql "$DATABASE_URL" -f scripts/seed-demo-todos-os-dados-modules.sql

# Provas (Postgres efêmero DTOV + HTTP + browser) — ver test/README.md
npm run dtov:reset
npm run dtov:full-app
DTOV_SKIP_BROWSER=1 npm run dtov:full-app
npm run dtov:down

# Logs
docker compose logs -f app
docker compose logs -f postgres

# psql no container
docker compose exec postgres psql -U enneagram_user -d enneagram

# Últimas avaliações
docker compose exec postgres psql -U enneagram_user -d enneagram -c \
  "SELECT c.full_name, a.top_type, a.created_at
   FROM assessments a
   JOIN candidates c ON c.id = a.candidate_id
   ORDER BY a.created_at DESC
   LIMIT 20;"

# Reset volume (dev)
docker compose down -v && docker compose up -d

# Rebuild
docker compose up -d --build
```

---

## Suporte

contact@3035tech.com · +55 51 99644-2104

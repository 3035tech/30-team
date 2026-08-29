# Backlog — 30Team

Ideias de funcionalidades **ainda não implementadas**.

## Como usar (humano + agente)

| Ação | O que fazer |
|------|-------------|
| Nova ideia | Usuário pede → agente **adiciona** item (id estável + instruções) |
| Implementada | Ao entregar → **remover** o item deste arquivo (não riscar) |
| Em andamento | Mover para “Em andamento” com nota de branch/PR se houver |
| Epic grande | Manter sub-itens; ao fechar um sub-item, apagar só ele; apagar o epic quando todos os filhos sumirem |

Não usar para bugs pontuais. Aqui só **produto / capacidade nova**.

**Antes de implementar qualquer item:** ler `AGENTS.md`, reutilizar o que já existe, rodar Dev → Test → Validate, atualizar README/Guia quando houver uso novo. Mapa do que **já existe:** [`docs/PRODUCT-FEATURES-PROMPT.md`](./PRODUCT-FEATURES-PROMPT.md).

---

## Diferenças (30Team vs produtos típicos) — base do epic B-400

Gerado a partir do mapa de features atuais (ago/2026). **Não** copiar feature de concorrente se já cobrimos o job-to-be-done com T1–T9 + Motivadores + compat.

| Família de produto | O que costumam ter | 30Team hoje | Gap / oportunidade |
|--------------------|--------------------|-------------|--------------------|
| **ATS** (Gupy, Greenhouse, Lever) | Pipeline custom, CV/LinkedIn, scorecards, calendário, oferta | Pipeline + kanban + notes + scorecard leve + pool + /j SEO + /r | Fechado no escopo B-400 (sem virar ATS genérico) |
| **Assessment puro** | Bateria própria + PDF + benchmarks | T1–T9 + Motivadores + rubrica + PDF briefing + print /r | Empacotar — **não** DISC |
| **People / engajamento** | Ciclos de review, engajamento | 1:1 + hipóteses + retention + digest + kit hire | OK no escopo atual |
| **Team analytics** | Heatmaps, org chart | Compat / Grupos / Overview heat T1–T9 | OK no escopo B-400 |
| **Carreiras / employer brand** | Portal rico | `/j` + `/c` + funil | OK |
| **Cliente / consultoria** | Portais white-label | `/r` + print/PDF | OK |

**Princípio de prioridade:** empacotar o que já medimos > fechar fricção no funil RH > novos scores ou instrumentos.

**Explicitamente fora (ainda):** conta de candidato; merge por nome; segundo hub paralelo a `candidates`. **DISC / DP** deixam de ser “proibido” — ver epic **B-2700** (**B-2720**, **B-2721+**).

---

## Aberto — Epic B-400 (empacotar perfil + fechar gaps)

_(entregue — B-401–B-412: print briefing, kit hire, fit vs núcleo, grupos salvos, digest, aging, scorecard, pool, clonar vaga, overview heat, lote Motivadores, print `/r`.)_

---

## Aberto — Epic B-500 (PDI + clima)

_(entregue — estrutura 042 + B-501–B-506 + polish UX/indicadores/visões: progresso PDI, barras clima, pulse Overview, benchmark com Δ.)_

---

## Aberto — Epic B-600 (assessment → ação)

_(entregue — B-601–B-605 + polish: revisão retenção na UI, leitura hedged do pulso, prep `/e`, Guia passo a passo.)_

---

## Aberto — qualidade / testes

_(vazio — B-001–B-006 entregues)_

---

## Aberto — Epic B-100 (SEO / distribuição pública)

_(entregue — ver `docs/job-seo-and-distribution.md`. Inclui agregadores B-119 e logo empresa via S3.)_

### B-120 — Página `/c` mais rica (carreiras da empresa)
_(entregue — hero logo+nome+CTA, breadcrumb `/j` → empresa, meta local/faixa/prazo nos cards, “sobre” com RichTextEditor no admin. Filtros leves / JSON-LD Organization ficam fora deste corte.)_

---

## Aberto — performance (audit dashboard)

### B-2800 — Hot-path performance (Perf-A + Perf-B + Perf-C) ✅ ENTREGUE

Sprint de escala sem rewrite: batch HR Score + núcleo único; `LIMIT`/página em candidatos da vaga; compat top-N pairs no payload; bloquear admin `company=all` em Overview/Compat; Overview sem LATERAL por vaga aberta (stats em batch nas 8 listadas); Turnover scan cap 500 + flag `truncated`; `area_stats` sem write-on-read no dashboard; caps job-roles/`forSelect`/leadership; ranking vaga cap 200; histograma T1–T9 só em Compat/Overview (Equipe só `COUNT`).

### B-2801 — Performance P2 (medir + EXPLAIN + baseline) ✅ ENTREGUE

Baseline documentada (`docs/performance-hotpaths.md`): SSR por aba, caps, export stream, `PG_POOL_MAX`, índices `006`/`061`. `measureAsync` nos hot paths + breadcrumb Sentry em slow; `npm run dtov:explain` (`scripts/explain-hotpaths.js`) para checklist EXPLAIN no DTOV.

### B-2802 — Performance P3 (colaborador + gaps restantes) ✅ ENTREGUE

Home/`/e` em paralelo + PDI batch; inbox de pesquisas com batch invite (sem N+1); jornada GET sem ensure; clima aggregate SQL; sucessão batch; HR Score cache wired; caps assessments/timeline; LMS lessons `ROW_NUMBER` cap; `notifyCandidates` unnest; crons em chunks paralelos; índice trigram `079`; mail retry; Cache-Control em links públicos + health. Detalhe: `docs/performance-hotpaths.md`.

### B-202 — (opcional) caps/API restantes do audit
_(fechado como “monitorar prod” — sem gap aberto claro.)_ Já entregue: vac-n1 LATERAL, export cap, purge batches, AE analytics sample, notify unnest, email unique idx (025), compat/leadership caps, indexes `061`. Reabrir só com evidência de produção.

---

## Aberto — Epic B-300 (acionar perfil)

_(entregue — B-301 briefing Equipe, B-302 briefing na vaga, B-303 notif `retention_watch`, B-304 composição do núcleo em Grupos.)_

---

## Aberto — Epic B-700 (pós-hire leve)

Escopo **deliberadamente estreito** vs “jornada completa” (LMS/AVD/desligamento ficam fora).

_(entregue — B-701 check-ins D30/D60/D90; B-702 checklist D1; B-703 proposta/aceite mínimo no funil; jornada contínua na Equipe via `HireJourneyBlock`.)_  
**Fora deste epic:** trilhas LMS, avaliação 360/AVD, desligamento formal, portal colaborador full.

---

## Aberto — Epic B-900 (Overview → decisão)

Sprint **A** entregue (atenção scorecard + hire gaps, digest, hireGapsChip).  
Sprint **B** entregue (B2 Fit na vaga, B8 nucleus fit no briefing, B9 preencher /r do briefing).  
Sprint **C** entregue (C1 mix×rubrica, C4 motivo×tipo, C5 temas clima, C10 concern∩retenção).

_(epic fechado — itens A/B/C entregues.)_

---

## Aberto — Epic B-1000 (plataforma GP sem DP)

Pedido (ago/2026): completar o ciclo **módulos geram → núcleo transforma → inteligência volta como decisão**, **sem** o Módulo 2 (DP). Hub continua `candidates`. Reusar o que já existe; não reconstruir ATS, PDI, clima, Motivadores nem Overview.

**Fora do epic B-1000 na época (DP):** admissão documental, GED, ponto, férias, holerite, app folha/ponto. Absenteísmo no radar ficou de fora até haver fonte DP. **Agora rastreados em B-2700** (DISC **B-2720**, DP **B-2721–B-2727**, benefícios clube **B-2731**) — um produto/login, não segundo app tipo Tangerino.

**Já coberto (não reimplementar):**

| Bloco da arquitetura | 30Team hoje |
|----------------------|-------------|
| M1 Portal / funil / perfil | `/j` `/c` `/v` `/t`, pipeline, rubrica, T1–T9, Motivadores, Fit, `/r` |
| M3 PDI + jornada leve | PDI, 1:1, check-ins D30/D60/D90, `/e`, seed concern→PDI |
| M4 Clima + retenção parcial | `/clima`, pulso `/pulso`, `retention_watch` (Motivadores) |
| Núcleo parcial | Overview, núcleo T1–T9 do time (`company-nucleus`), intel comportamental, Fit vs núcleo |

**Sinal DP omitido de propósito:** absenteísmo. Radar e HR Score usam só sinais já no produto (clima, Motivadores/retenção, PDI, check-in concern, fit).

### Ordem de entrega (conectar antes de expandir)

1. **B-1001 — Núcleo HR Score + predições** (liga os módulos)
2. **B-1002 — Radar de rotatividade multi-sinal** (M4; alimenta o núcleo)
3. **B-1003 — Engenharia de cargos leve** (M1; cargo → rubrica/fit)
4. **B-1004 — Avaliação de desempenho + metas → PDI** (M3; gap vira plano)
5. **B-1005 — Plano de sucessão** (M3; usa HR Score + prontidão)
6. **B-1006 — Análise demissional** (M4; fecha o loop seleção/gestão)
7. **B-1007 — Cultura organizacional** (M4; leitura hedged, não survey isolada)
8. **B-1008 — Academy leve** (M3; trilhas/ações ligadas ao PDI — **não** LMS)
9. **B-1009 — Benefícios (catálogo leve)** (M4; **não** clube/folha)

### B-1001 — Núcleo: HR Score + predições ✅ ENTREGUE

_(migration 054 + lib/hr-score.js + APIs + UI Equipe/Overview)_ Consolida 7 sinais em score 0–100. Predições: risco, gaps PDI.


### B-1002 — Radar de rotatividade (multi-sinal) ✅ ENTREGUE

_(lib/turnover-radar.js + API `/api/admin/turnover-radar/company` + TurnoverRadarCard UI)_ Calcula risco de turnover (low/medium/high) consolidando 4 sinais críticos: clima (30%), retention Motivadores (30%), PDI atraso/concern (25%), check-ins concern (15%). Lista top at-risk na Overview com drill-down por sinal. **Polish P-1020:** notificação `turnover_risk_change` ao piorar (hook em `recalculateCompanyScores` / GET HR Score); links Equipe com `candidate=` + filtro `filter=turnover_risk`.

### B-1003 — Engenharia de cargos leve ✅ ENTREGUE (UI+rubric+FK wired)

_(migration 055 + lib/job-roles.js + APIs REST + i18n + JobRolesAdminTab drawer/RubricEditor + vacancies.job_role_id on create/update)_ Tabela `job_roles` com rubrica T1-T9. Vagas herdam cargo via FK `job_role_id` (persistido no create e no PATCH). CRUD completo (list, create, update, deactivate). UI admin com `AdminRichFormDrawer` + `RubricEditor`; prévia compacta da rubrica ao selecionar cargo na vaga.

### B-1004 — Avaliação de desempenho + metas → PDI ✅ ENTREGUE

_(migration 056 + lib/performance-reviews.js + APIs + UI PerformanceReviewsAdminTab)_ Ciclo leve (gestor → colaborador; não 360). Metas no ciclo com outcome (`met`, `exceeded`, `develop`, `not_met`). Outcome `develop` gera item PDI automaticamente com `source: 'performance_review'` e `performance_goal_id`. Tabelas `performance_cycles`, `performance_goals`, `performance_reviews`. UI admin de ciclos + review form (draft → submitted).

### B-1005 — Plano de sucessão ✅ ENTREGUE

_(migration 057 + lib/succession-plans.js + APIs + UI SuccessionAdminTab)_ Papéis críticos (`critical_roles`) com sucessores (`succession_plans`) + prontidão (`not_ready`, `developing`, `ready`, `now`). Readiness score combina HR Score (70%) + Leadership Potential (30%). Integra com `lib/hr-score.js` e `lib/leadership-analytics.js`. UI admin de papéis críticos + contador de sucessores.

### B-1006 — Análise demissional ✅ ENTREGUE

_(migration 058 + 065 enums ampliado + lib/exit-analysis.js + APIs + UI ExitAnalysisAdminTab + ExitInsightsCard no Overview)_ Registro de saída (`exit_records`) com tipo (voluntary/involuntary/mutual), motivo (**taxonomia fechada multi-segmento** em `EXIT_REASON`) e notas. Agregação por motivo × tipo T1–T9 × área. Insights M1/M3/M4 (compensação/benefícios, fit, gestor, carga/burnout, carreira, desempenho). Card no Overview com % e sugestões hedged. Motivo/tipo **não** são cadastrais por empresa.

### B-1007 — Cultura organizacional ✅ ENTREGUE

_(lib/organizational-culture.js + API `/api/admin/organizational-culture` + CultureInsightsCard no Overview)_ Leitura hedged a partir de clima + mix T1–T9 + pulso + valores declarados (`companies.about_html`). Síntese automática em categorias (climate, type_mix, pulse, alignment) com força (strong/medium/high concern) e hedging. Card no Overview com resumo (health overall, dominant archetype) + drill-down para insights detalhados. Sem segundo instrumento, apenas consolidação de dados existentes.

### B-1008 — Academy leve (não LMS) ✅ ENTREGUE

_(migration 059 + lib/learning-resources.js + APIs + LearningResourcesAdminTab)_ Catálogo simples de recursos de aprendizagem (título, descrição, tema, tipo, URL, duração). Tipos: course, article, video, book, workshop, mentoring, other. PDI pode linkar recursos via `development_plan_resource_links` (muitos-para-muitos) ou referenciar no texto. Sem player, sem SCORM, sem acompanhamento de progresso — apenas catálogo de ações/trilhas que o gestor pode apontar no plano de desenvolvimento.

### B-1009 — Catálogo de benefícios (não clube/folha) ✅ ENTREGUE

_(migration 060 + 062 categorias + 065 enums ampliado + lib/company-benefits.js + APIs + CompanyBenefitsAdminTab)_ Catálogo simples de benefícios da empresa (nome, descrição, **categoria cadastral por empresa**, tipo enum multi-segmento) para contexto de retenção/oferta. Tipos fechados em `BENEFIT_TYPE` (saúde, PLR, home office, cesta, etc. + other). Sem adesão, sem desconto em folha, sem "clube". CRUD com filtros por categoria.

---

## Epic B-1100 (Analytics avançado) — ✅ 100% COMPLETO

Transformar dados comportamentais em **inteligência acionável** para decisões estratégicas de RH. Foco: métricas de efetividade, tendências, comparativos e alertas proativos.

**Progresso:** 7/7 features entregues (100%)

**Princípios:**
- Reusar dados já coletados (T1–T9, Motivadores, PDI, clima, turnover)
- Export estruturado (não só CSV genérico)
- Dashboards focados em **decisão**, não vanity metrics
- Alertas baseados em thresholds (não só notificação pontual)

**Fora deste Epic:** BI genérico (Metabase/Looker embed), data lake, ML custom, dashboards 100% customizáveis pelo usuário final.

### B-1101 — Métricas de efetividade (hiring ROI) ✅ ENTREGUE

_(lib/analytics-metrics.js + API /api/admin/analytics/metrics + AnalyticsTab UI)_ 

Dashboard com métricas de **impacto real** do processo seletivo:
- **Time-to-hire** (dias: vaga aberta → contratação)
- **Time-to-productivity** (dias até HR Score > 60 ou primeira review positiva)
- **Custo-por-contratação** (opcional: campo manual)
- **Taxa de retenção** (% contratados que ficam 6m/12m/24m)
- **Fit médio contratados** vs **fit médio pool**
- **Aderência rubrica** (fit T1–T9 contratados vs expectativa da vaga)

**Onde:** nova aba **Analytics** no dashboard (ou sub-aba da Overview)

**Saída:**
- Cards com número + Δ período anterior
- Gráfico de tendência (últimos 6/12 meses)
- Drill-down por vaga/área/gestor
- Export de métricas

**Reuso:**
- `vacancies` (created_at, deadline)
- `candidates` + `hire_date` (já existe via B-700)
- `hr_scores` (B-1001)
- `assessments` + rubrica da vaga
- `vacancy_links` (funil)

### B-1102 — Tendências temporais (time series) ✅ ENTREGUE

_(lib/analytics-trends.js + API /api/admin/analytics/trends + UI com toggle Tendências)_

Gráficos de **evolução ao longo do tempo** (últimos 6/12/24 meses):
- HR Score médio do time (mensal)
- Turnover risk (% alto risco, mensal)
- Clima médio (mensal)
- PDI completion rate (mensal)
- Contratações × desligamentos (mensal)

**Onde:** aba Analytics, sub-seção "Tendências"

**Saída:**
- Line charts (últimos 12/24 meses)
- Marcadores de eventos (ex: "ciclo de review Q2")
- Filtro por área/grupo
- Export PNG/CSV

### B-1103 — Comparativos (área, período, rubrica) ✅ ENTREGUE

_(lib/analytics-comparisons.js + API /api/admin/analytics/compare + UI com toggle Comparar)_

**Comparar** métricas entre segmentos side-by-side:
- Área A vs Área B (clima, HR Score, turnover)
- Período A vs Período B (antes/depois de ação)
- Rubrica A vs Rubrica B (fit médio, retenção)
- Gestor A vs Gestor B (time-to-hire, retenção)

**Onde:** aba Analytics, sub-seção "Comparativos"

**Saída:**
- Tabela side-by-side
- Bar chart comparativo
- Testes de significância (opcional: t-test se N > 30)
- Export

### B-1104 — Alertas e anomalias ✅ ENTREGUE

_(lib/analytics-alerts.js + API /api/admin/analytics/alerts)_

**Detecção proativa** de padrões anormais com thresholds configuráveis:
- Clima caiu > 15% em 1 mês (área/empresa)
- Turnover risk subiu > 20% em 1 trimestre
- Time-to-hire > 90 dias (vaga específica)
- HR Score médio < 50 (área)
- PDI completion < 30% (empresa)

**Onde:** notificações in-app + email digest

**Saída:**
- Alerta com contexto (o quê mudou, onde, quando)
- Link para drill-down
- Sugestão de ação (ex: "Revisar clima na área X")

**Reuso:** `manager_notifications` (já existe), novo tipo `ANALYTICS_ALERT`

### B-1105 — Export estruturado (JSON/Excel) ✅ ENTREGUE

_(lib/analytics-export.js + API /api/admin/analytics/export)_

Export **rico** além do CSV básico:
- JSON (API-friendly, estruturado)
- Excel com múltiplas abas (overview, detalhes, gráficos)
- Filtros aplicados no export (não dump completo)

**Onde:** botão "Export" em cada visão de Analytics

**Saída:**
- Arquivo baixável
- Metadados (período, filtros, gerado em X)
- Formato escolhido pelo usuário (CSV/JSON/XLSX)

**Reuso:** `lib/export-assessments-csv.js` (já existe), estender

### B-1106 — API de métricas (externas/integrações) ✅ ENTREGUE

_(lib/analytics-rate-limit.js + aplicado em todas as 5 rotas + docs/analytics-api.md)_

API REST autenticada (JWT) para expor métricas:
- `GET /api/admin/analytics/metrics` (HR Score, clima, turnover)
- `GET /api/admin/analytics/trends` (time series)
- `GET /api/admin/analytics/compare` (segmentação)
- `GET /api/admin/analytics/alerts` (anomalias)
- `GET /api/admin/analytics/export` (JSON/CSV)

**Implementado:**
- ✅ Autenticação JWT de gestor (mesmo padrão `/api/admin/*`)
- ✅ Rate limiting (100 req/min por user_id)
- ✅ Headers HTTP (`X-RateLimit-*`, `Retry-After`)
- ✅ Documentação completa (endpoints, exemplos cURL/JS/Python)
- ✅ Multi-tenant isolado por `company_id`

**Uso:** integrações com BI externo (Metabase, Looker), automações, Slack, webhooks

### B-1107 — Relatórios agendados (email/PDF) ✅ ENTREGUE

_(lib/analytics-scheduled-reports.js + API /api/cron/analytics-report)_

**Envio automático** de relatórios de Analytics:
- Weekly/monthly digest com métricas de efetividade inline
- HTML responsivo (não requer PDF reader)
- Tendências (últimos 3 meses): HR Score, turnover, clima
- Alertas ativos destacados (severity high/medium/info)
- Destinatários automáticos: `direction` + `admin` da empresa
- Multi-idioma (pt-BR / en)

**Implementado:**
- ✅ Email HTML inline (métrica cards, trend table, alerts)
- ✅ Cron job (`POST /api/cron/analytics-report`)
- ✅ Rate: processa até 50 empresas/execução
- ✅ Reutiliza estrutura de `manager-weekly-digest`
- ✅ CTA direto para `/dashboard?tab=analytics`

**Uso:** cron semanal (`?frequency=weekly`) ou mensal (`?frequency=monthly`). Preferências por empresa: frequência, destinatários (user ids) e anexo PDF (`company_analytics_report_prefs`, migration `064`; UI em Analytics).

_(B-1107 polish entregue — prefs + PDF simples sem puppeteer + filtro de frequência no cron.)_

---

## Aberto — Epic B-1200 (conectar + UX + signup + profundidade)

_(entregue — B-1201–B-1204: Overview attention ← PDI/clima/sucessão/onboarding; hire-kit + benefícios; PDI↔Academy; sidebar agrupado; EmptyState CTAs; tour `#*-tab`; fit strip com contribuições.)_

**Fora deste corte (permanece fora):** LMS, folha, DISC, conta de candidato, segundo design system.

---

## Aberto — Assistente de Ajuda (escopo estrito)

_(entregue — B-1301: gate pré-FAQ/LLM + recusa i18n `offTopic`/`offTopicAgain`; pós-LLM `helpAnswerLooksOffTopic`; system prompt reforçado; tip Guia `tipsStep12`.)_

---

## Aberto — Epic B-2600 (diagnóstico operacional com IA)

Copiloto no painel para perguntas do tipo **“por que o João não aparece na minha lista?”** — não misturar com o assistente de Ajuda (só Guia).

**Princípios (obrigatório):**
- Escopo sempre pelo **`company_id` da sessão** (JWT / CAP); nunca confiar no texto do usuário para tenant; admin só com empresa selecionada.
- **Sem SQL gerado pelo LLM** — tool calling sobre funções tipadas em `lib/` (`queryRead`, parametrizado, `LIMIT`/caps).
- Somente leitura; audit de acesso; rate limit; sem vazar PII além do que o gestor já pode ver na tela (respeitar CAP, ex. remuneração).
- IA só **redige** a resposta a partir do JSON do diagnóstico (hedged); não “adivinha” nem escreve no banco.

### B-2601 — Diagnóstico “por que não vejo X?” (MVP Equipe) ✅ ENTREGUE
**Entregue (UX+API MVP):** `lib/people/list-absence-diagnostics.js` (razões: no_match / homonyms / wrong_roster / alumni / soft_filters / no_assessment) + `POST /api/admin/help-diagnose` (`withAdminApi`, CAP `team.view`, rate limit, audit) + CTA “Por que não aparece?” na Equipe (EmptyState quando busca vazia) via `useAppFeedback` notice/confirm. Guia `panel.help.teamStep7`. Sem SQL gerado por LLM.

**Depois do MVP (não bloquear):** mesmo padrão para Vagas/pipeline e Banco de talentos; redação IA hedged sobre o JSON (epic B-2600).

---

## Aberto — Logo da empresa (UX de upload)

_(entregue — B-1401: crop 1:1 + compressão cliente ≤512 KB / lado ≤768 px; origem até 20 MB; servidor mantém MIME+tamanho.)_

## Aberto — Controles de formulário (primitivos)

_(entregue — B-1402 tokens + B-1403 migração dos selects ad hoc: page-size, pipeline Equipe, reject reason, grupos, signup, recommendation relatório; `S.selectCompact`.)_

---

## Aberto — Tema / layout dark

### B-1501 — Dark mode completo e confiável _(usable no painel — follow-ups)_
Toggle + `.dark` + tokens Tailwind estão **usáveis no dashboard** (cards `S.card`/`bg-surface`, borders ink, sidebar/drawer mobile, dialogs, tabelas, `bg-white/*` leftovers, `--canvas-alt`). Não reescrever `theme.js` `C.*` globalmente.

**Corrigido nesta passagem (polish #12):**
1. Pipeline kanban: `PIPELINE_STAGE_COLORS_DARK` + `getKanbanStages(locale, { isDark })` (Equipe + Vagas) — texto/borda legíveis no dark.
2. Charts/meters: classes `ui-meter-track` / `ui-meter-fill` / `ui-analytics-bar` + regras em `dark-mode.css` (track mais forte, fills saturados/brilhantes).
3. Chrome: remapeamento extra de `bg-white` no dashboard + Help overlay leftovers.

**Ainda aberto:**
1. PDF / print e fluxos públicos (`/t`, `/v`, assessment) — atmosfera light-first (`color-scheme: light` em careers + assessment).
2. Persistência `localStorage` + anti-flash já existem — só revalidar após mudanças grandes de chrome. Docs: não confundir com `prefers-color-scheme`.

**Fechado neste corte:** chips T1–T9 / Compare (`TypeBadge` + `typeChipSurfaceStyle` / `typeScoreCellStyle` + classes `ui-type-*` no dark).

**Fora:** segundo tema custom por empresa; modo “auto” OS (opcional depois).

---

## Aberto — Epic B-1900 (gaps do roteiro cliente oculto × 30Team)

_(entregue — B-1901 dossier Equipe; B-1902 complementaridade/tensão Overview+Grupos; B-1903 workbench multi-sinal Overview; B-1904 IA interpretativa hedged em dossier/tensão/workbench. Ver Guia `b1900Packaging`.)_

---

## Aberto — Epic B-2000 (aprofundar módulos “leves”)

_(entregue — B-2001 radar `actions[]`; B-2002 Performance↔1:1 CTA; B-2003 PDI sugestões Academy; B-2004 Cultura snippet+CTAs; B-2005 Sucessão/Exit CTAs; B-2006 Banco talentos abrir pessoa + filtro T1–T9. Ver Guia `b2000LightDepth`.)_

Profundidade **média** entregue: conectar e enriquecer o que já existe — **sem** LMS, DISC, ATS ou portal colaborador full.

**Fora (permanece):** feedback formal contínuo tipo Feedz; taxonomia de valores; LMS com conclusão; convite Motivadores em massa.

---

## Aberto — Epic B-2100 (UX / consistência — rápido)

_(entregue — B-2101 empty states CTA + copy nos B-1000; B-2102 Vagas chrome `AdminEdit`/`AdminDelete`; B-2103 dark `bg-surface` leftovers + Analytics sem `C.*` em texto; B-2104 Guia `demoRoteiro` 7 passos. Ver Guia `demoRoteiro`.)_

Corte **rápido/barato**: consistência de chrome e dark no painel + roteiro demo no Guia. **Sem** forçar tabela em Vagas; print/público continuam light-first (resto em B-1501).

---

## Aberto — Epic B-2200 (roster empty + Overview lazy + busca em grids)

_(entregue — B-2201 `RosterEmptyHint` em Equipe/Compat/Comparar/Grupos/Liderança; B-2202 Overview “Sinais operacionais” lazy (fetch só ao expandir); B-2203 busca por nome em Cargos/Avaliações/Sucessão/Exit/Academy/Benefícios + Empresas `q` API.)_

### Epic B-2300 — Aniversários ✅ ENTREGUE
_(entregue — `candidates.birth_date` + `companies.anniversary_date` (`066`); tempo de casa = `candidates.start_date` (hire); card Overview `BirthdaysCard` + `GET /api/admin/upcoming-anniversaries`; Equipe edita nascimento; Empresas edita aniversário institucional; seed demo/eval com datas na janela.)_

### Epic B-2400 — LMS básico ✅ ENTREGUE (MVP)
_(entregue — `067` `lms_courses` / `lms_lessons` / `lms_enrollments` / `lms_lesson_completions`; menu LMS → Cursos; matrícula; progresso no `/e`. **Fora:** quiz, certificado, SCORM, player, login colaborador. Academy continua catálogo PDI separado.)_

### Epic B-2401 — LMS próximo corte ✅ ENTREGUE
_(entregue — `068` turmas/prazo/obrigatório + `development_plan_lms_links`; matrícula em lote (todos/grupo); PDF S3; reordenar/editar aulas; reset/desmarcar; notifs enrolled/overdue/completed; Overview/Equipe atraso; PDI↔curso com matrícula opcional e auto-done no PDI ao concluir; cron `lms-overdue-notifications`; resumo ops no curso. **Fora ainda:** quiz, certificado, SCORM, trilha multi-curso.)_

### Epic B-2500 — Login colaborador + sessão LMS ✅ ENTREGUE
_(entregue — `069`/`070`/`071`; set-password; hub; chrome tema/idioma/notif; perfil + senha; `candidate_notifications`; LMS enroll/overdue → inbox colaborador.)_

### Epic B-2501 — Sessão colaborador + packaging consultoria ✅ ENTREGUE (corte 2)
_(migration `077`; prep 1:1 em `/employee`; clima/pulso autenticado + histórico; playbooks operacionais por persona no dashboard; `/r` com templates técnica/liderança/operacional + riscos de composição na shortlist. **Ainda fora:** folha/ponto/docs completos (DP).)_

### Epic B-2510 — Remuneração interna leve ✅ ENTREGUE
_(migration `072`; `employee_compensation_events`; Equipe → aba Remuneração; salário vigente + timeline; import da oferta aceita; alumni só leitura. **Não** é folha/holerite/ponto.)_

### Aberto — Epic B-2501 (resto)
~~Ideias ainda abertas pela sessão (não `/e` token):~~
~~1. **Prep 1:1 na sessão** — nota ao gestor sem depender do `/e`.~~
~~2. **Clima / pulso autenticado** — responder pesquisas logado + histórico.~~
3. **Fora ainda neste epic:** DP completo e DISC — ver **B-2720+** / **B-2721+** no epic B-2700; remuneração interna leve entregue em B-2510; não misturar com `users` role.

_(Itens 1–2 entregues no corte 2 B-2501 + playbooks + `/r` consultoria.)_

---

## Aberto — Epic B-2700 (gaps vs Sólides — ago/2026)

Fonte: varredura pública [solides.com.br](https://solides.com.br) (home, soluções, planos, ponto/folha/Profiler/benefícios/NR-1). Marketing ≠ produto logado; preços por colab são sinais de terceiros.

### Já cobrimos (job-to-be-done — **não** reabrir como cópia Sólides)

| Família Sólides | 30Team hoje |
|-----------------|-------------|
| ATS leve (portal, funil Kanban, banco, carreiras `/jobs` `/companies`, indicação, share UTM) | Vagas + pipeline + Talent Bank + SEO + referral |
| Match vaga × pessoa | Rubrica T1–T9 + Fit + ranking (sem “triagem de CV por IA”) |
| Engenharia de cargos | `job_roles` + rubrica herdada na vaga |
| Matcher / comparar pessoas | Compat + Comparativo + intel comportamental |
| Gestão comportamental (fio condutor) | **T1–T9 + Motivadores** hoje; DISC/Profiler-like → **B-2720** |
| App colaborador leve | `/employee` + `/e` hoje; folha/ponto no app → ondas DP **B-2721+** |
| Benefícios (catálogo) | Company benefits hoje; cartão/marketplace → **B-2731** |
| People analytics | Analytics B-1100 + Overview + digests |
| IA assistida | Help + interpretativa hedged + workbench (não “40+ agentes” nem Folh.AI ainda) |

**Cunha estratégica:** Sólides vende “all-in-one” com **dois logins** (RH × Tangerino/DP). Se formos a DP + DISC, preferir **um produto / um `candidates` / um login** — não repetir a dívida de aquisição.

### Ordem sugerida (ondas)

1. GTM + fricção ATS/engajamento (**B-2701–B-2716**)
2. Instrumento adicional DISC-like (**B-2720**) — opcional ao T1–T9, não substituto
3. DP em fatias (**B-2721–B-2730**) — ponto → férias/banco → docs/admissão → folha/eSocial por último
4. Benefícios “clube” / cartão (**B-2731**) e NR-1 (**B-2714**) conforme demanda regulatória/parceiro

### Gaps — itens abaixo

### B-2701 — Empacotamento / preço público (GTM) ✅ ENTREGUE
`/pricing` + landpage/signup links; planos early-access + add-ons “em breve”; Guia `panel.help.pricing*`.

### B-2702 — eNPS (pulse de engajamento) ✅ ENTREGUE
`question_kind=enps` (0–10 → −100…+100); Overview + ClimateTab; migration `080`.

### B-2703 — Matriz 9Box (performance × potencial) ✅ ENTREGUE
`lib/people/nine-box.js` + `NineBoxBlock` na aba Avaliações; HR Score × potencial (leadership).

### B-2704 — Avaliação 180° / 360° (opcional no ciclo) ✅ ENTREGUE
Flags no ciclo + `performance_side_reviews` (self/peer por token); `/avaliacao/[token]`.

### B-2705 — Avaliação de experiência (D30/D60/D90 formal) ✅ ENTREGUE
Outcomes `pass`|`fail`|`extend` nos check-ins; PDI/retenção em fail/extend.

### B-2706 — Triagem / parse de CV + match assistido (ATS leve) ✅ ENTREGUE
Upload PDF S3 + extract (`pdf-parse`); sugestão de campos; text-match ≠ Fit T1–T9; `CandidateCvBlock`.

### B-2707 — Agenda de entrevistas (calendário leve) ✅ ENTREGUE
`interview_slots` + UI na vaga; notif gestores + e-mail candidato.

**Polish de adoção (ago/2026):** Overview eNPS clicável + empty gate; badge eNPS no Clima; 9Box i18n/`CollapsibleBlock` + CTA Equipe; dossier com `PerformanceReviewBlock` + sideReview counts; outcomes D30–D90 com help leve vs formal; ranking Fit vs textMatch separados; CV/slots `CopyableLink` (`url`); Help steps `cvUpload`/`interviewSlots` (pt+en); slots colapsáveis quando vazios.

### B-2708 — Recrutamento conversacional WhatsApp (além do share)
Hoje: botões share WhatsApp com UTM. Sólides: funil WhatsApp para micro/PME.
1. MVP: templates de mensagem + deep-link `/v` / `/jobs` + tracking referral já existente.
2. Depois: webhook provedor (Twilio/Z-API) opt-in — **só** se houver decisão de custo/ops; rate limit; sem spam.
3. Pode reutilizar canal WhatsApp de ponto (**B-2721**) só com opt-in e templates separados.

### B-2709 — Simulador / prep de entrevista para o candidato
Sólides: Copilot Carreira. Nós: prep 1:1 é do colaborador/gestor.
1. Página token na vaga: perguntas derivadas da rubrica/briefing (hedged); respostas só para o candidato (não grava score clínico).
2. Opcional: gestor vê “preparou-se” sem conteúdo sensível.
3. i18n; pode oferecer trilha DISC (**B-2720**) além da rubrica T1–T9.

### B-2710 — Checagem de antecedentes (integração)
1. Flag + provedor externo (API) no estágio screening/approved; status na ficha.
2. Audit; sem armazenar relatório completo se o provedor hospedar.
3. Fora do MVP se não houver parceiro — manter como integração, não build in-house.

### B-2711 — Pesquisa salarial / benchmarks de mercado
Sólides: avulso. Temos remuneração interna só.
1. Campos opcionais: faixa de mercado manual ou import CSV por cargo/`job_roles`.
2. Comparar salário vigente × faixa (Equipe Remuneração + Overview gap).
3. Sem marketplace de benefícios.

### B-2712 — Intranet / feed interno leve
Sólides: Intranet + SuperApp. Temos hub colaborador sem mural.
1. Posts da empresa (admin/hr): título, rich text, audiência empresa; lista em `/employee`.
2. Sem chat; sem rede social completa.
3. Soft delete; paginação.

### B-2713 — LMS profundidade (quiz / certificado)
Já listado como fora de B-2401 — **promover a item** se priorizarmos paridade Academy Sólides.
1. Quiz por aula; certificado PDF ao concluir curso obrigatório.
2. Ainda sem SCORM/player proprietário.
3. Reusar enrollments/completions.

### B-2714 — NR-1 / riscos psicossociais (conformidade)
Sólides 2026: PGR + eSocial S-2240. Urgência regulatória de venda.
1. Decisão: (a) parceria/white-label, ou (b) módulo leve inventário + questionário + laudo export — **sem** prometer validade jurídica sozinhos.
2. Se (b): reusar clima/Likert; export PDF; audit; Guia “não substitui SESMT”.
3. Integração eSocial alinhada à onda folha (**B-2726**) se ambos existirem.

### B-2715 — Multi-CNPJ / hierarquia enterprise
Sólides fraco em enterprise; oportunidade se atacarmos o gap inverso (PME → grupo).
1. Grupo econômico: várias `companies` sob conta holding; admin vê agregados; hr fica no tenant.
2. Escopo DBA forte (índices, caps); não quebrar isolamento atual.
3. Só após demanda real de cliente.

### B-2716 — Feedback contínuo (reconhecimento / feed)
Já “fora” em B-2000 tipo Feedz — registrar como gap Sólides/engajamento.
1. MVP: kudos leves (de→para, texto curto) visíveis no `/employee` + digest.
2. Sem substituir 1:1/PDI.
3. Prioridade baixa vs 2702–2705.

---

### Onda instrumento — DISC / Profiler-like

### B-2720 — Instrumento comportamental tipo DISC (além de T1–T9)
Sólides: Profiler (DISC + teorias) como fio condutor. Hoje só T1–T9 + Motivadores.
1. Banco de perguntas + scoring no servidor (`lib/` dedicado, espelhar padrão `lib/ae/`); tipos/dimensões DISC (ou subset) com linguagem **hedged** (“tende a”).
2. Convite por token (como Motivadores); resultado na ficha `candidates`; opcional reaplicar ~6 meses.
3. Plugar em Fit/Matcher/radar/9Box **como sinal adicional**, sem apagar T1–T9; i18n; Guia “não é diagnóstico clínico”.
4. Decisão legal/IP: conteúdo próprio ou licença — não copiar Profiler.

---

### Onda DP (Departamento Pessoal) — unificado no mesmo produto

Princípios: mesmo tenant `company_id` + hub `candidates`; CAP novas (`dp.ponto`, `dp.folha`, …); `/employee` consome holerite/ponto sem segundo login. Fatias abaixo — **não** big-bang.

### B-2721 — Ponto digital (MVP)
1. Batida web/app + geolocalização opcional; espelho do dia; aprovação de inconsistências pelo gestor.
2. Escalas simples (turno fixo); export CSV.
3. Facial / offline / WhatsApp ponto = fase 2 do mesmo item ou follow-up.

### B-2722 — Banco de horas / horas extras
1. Regras configuráveis por empresa; saldo por colaborador; lançamentos manuais + derivados do ponto (**B-2721**).
2. Aprovação RH; relatório mensal.
3. Depende de B-2721 para cálculo automático.

### B-2723 — Férias e afastamentos
1. Solicitação no `/employee`; saldo; aprovação gestor/RH; calendário do time.
2. Tipos: férias, atestado, licença (taxonomia fechada).
3. Integra eventos de folha quando **B-2726** existir.

### B-2724 — Admissão digital + GED + assinatura
1. Checklist pós-hire (docs: RG, contrato, etc.); upload S3; status por documento.
2. Assinatura eletrônica (provedor) com trilha de auditoria; validade jurídica = via parceiro, não “inventar ICP”.
3. Liga funil `hired` → pasta do colaborador no mesmo `candidate_id`.

### B-2725 — Equipe de campo (rota / check-in / reembolso)
1. Check-in geolocalizado em visitas; rota do dia; fotos opcionais.
2. Reembolsos com comprovante + aprovação.
3. Reusar ponto (**B-2721**) onde fizer sentido.

### B-2726 — Folha de pagamento + eSocial + holerite
1. Eventos de folha (proventos/descontos) a partir de ponto/férias/banco; fechamento mensal.
2. Integração eSocial (Portaria 671 / eventos relevantes) — provável parceiro ou motor dedicado; escopo jurídico pesado.
3. Holerite digital no `/employee`; central do contador (acesso read-only por CAP).
4. **Folh.AI / BPO** = add-on depois (agentes + fila humana).

### B-2727 — WhatsApp operacional DP
1. Lembretes de batida, aprovação de férias, envio de holerite link (opt-in).
2. Mesmo provedor que **B-2708** se possível; templates e filas separados de recrutamento.

---

### Onda benefícios “clube” (além do catálogo)

### B-2731 — Benefícios operacionais (cartão / parceiros / telemedicina)
Além do catálogo B-1009.
1. Decisão: parceria (Mastercard multibenefícios, Unimed, etc.) vs build mínimo de elegibilidade + deep-link.
2. Módulo reembolso de benefício; telemedicina via parceiro embed.
3. Empréstimo consignado / seguro = só marketplace; não carregar risco de crédito in-house.

---

## Aberto — Observabilidade

### B-1701 — Logs estruturados (infra) ✅ ENTREGUE (básico)
JSON stdout via `lib/monitoring.js` ligado a Postgres (`lib/db.js`), Redis (`lib/rate-limit.js`) e S3 (`lib/s3-object-storage.js`). Env: `LOG_LEVEL`, `LOG_SLOW_MS`.

### B-1702 — Sentry (erros de app) ✅ ENTREGUE (SDK)
`@sentry/nextjs` + `instrumentation.js` + `sentry.*.config.js` + `app/global-error.jsx`. Org `3035tech-9t` / project `30team`. Ativar com `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_DSN` server) e opcional `SENTRY_AUTH_TOKEN` no build (source maps).

---

## Aberto — Polish residual (pós waves 1–12 / demo beta)

_(B-2901–B-2906 + adoção/packaging + B-2904 dark T1–T9/Compare — entregues ago/2026. Polish residual vazio.)_

**Skip (explícito):** aliases `/climate`/`/pulse`; DISC/DP.

---

## Notas

- Qualidade/testes **B-001–B-006** entregues.
- Epic **B-100** fechado (SEO, funil, referral, job alerts, agregadores, logo S3).
- **Logo S3:** código pronto; falta só credenciais de produção (`S3_BUCKET` + chaves — ver `.env.example`).
- Epic **B-300** fechado.
- Epic **B-500** fechado (PDI + clima: estrutura + B-501–B-506).
- Epic **B-600** fechado (assessment → ação + polish de revisão/pulso/`/e`/Guia).
- Epic **B-800** / **B-801** entregue (assistente de ajuda no painel — FAQ + retrieval + LLM barato).
- Epic **B-900** entregue (Sprint A/B/C — Overview atenção + Fit/briefing/report + mix/rubrica/clima).
- Polish paleta **P2** entregue (`font-ui` chrome, ícones toast/notice, sync cores Motivadores `052`).
- **Onboarding Contextual** (Melhoria #1 — Sprint Quick Wins) entregue: tooltips contextuais, checklist de progresso (7 tarefas), empty states acionáveis, tour guiado opcional (5 steps). Ver `docs/onboarding-contextual.md`.
- **UX/UI — Categoria Completa** (Melhorias #3-#9) parcialmente: Undo/Confirmação, Loading, Mobile (drawer corrigido), Cmd+K, atalhos. **Modo escuro:** usable no painel; follow-ups (print/público/C.* inline) → **B-1501**.

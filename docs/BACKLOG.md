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

**Explicitamente fora (não abrir item):** segundo instrumento tipo DISC; conta de candidato; merge por nome; segundo hub paralelo a `candidates`.

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

### B-202 — (opcional) caps/API restantes do audit
Já entregue na maior parte: vac-n1 LATERAL, export cap, purge batches, AE analytics sample, notify unnest, email unique idx (025), compat/leadership caps. Revisitar só se métricas de produção pedirem.

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

**Fora (DP — não abrir item):** admissão documental, gestão de documentos, ponto, férias, ocorrências/saúde, holerite, quadro de tarefas RH legal, app do colaborador full (folha/ponto). Absenteísmo **não** entra como sinal do radar até haver fonte fora de DP.

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

_(lib/turnover-radar.js + API `/api/admin/turnover-radar/company` + TurnoverRadarCard UI)_ Calcula risco de turnover (low/medium/high) consolidando 4 sinais críticos: clima (30%), retention Motivadores (30%), PDI atraso/concern (25%), check-ins concern (15%). Lista top at-risk na Overview com drill-down por sinal. Notificações proativas e integração completa na Equipe podem ser adicionadas em próximo ciclo.

### B-1003 — Engenharia de cargos leve ✅ CORE ENTREGUE

_(migration 055 + lib/job-roles.js + APIs REST + i18n)_ Tabela `job_roles` com rubrica T1-T9. Vagas podem herdar cargo via FK `job_role_id`. CRUD completo (list, create, update, deactivate). UI de cadastro/listagem pendente para próximo ciclo.

### B-1004 — Avaliação de desempenho + metas → PDI ✅ ENTREGUE

_(migration 056 + lib/performance-reviews.js + APIs + PerformanceReviewsAdminTab)_ Ciclo leve (gestor → colaborador). Metas no ciclo. Gap/outcome `develop` gera item PDI automaticamente.

### B-1005 — Plano de sucessão ✅ ENTREGUE

_(migration 057 + lib/succession-plans.js + APIs + SuccessionAdminTab)_ Papéis críticos + sucessor(es) + prontidão. Reusa HR Score (B-1001).

### B-1006 — Análise demissional ✅ ENTREGUE

_(migration 058 + lib/exit-analysis.js + APIs + ExitAnalysisAdminTab + ExitInsightsCard)_ Registro de saída (motivo + texto). Agrega motivos × tipo/área.

### B-1007 — Cultura organizacional

Leitura hedged a partir de clima + mix T1–T9 + pulso. Valores declarados (texto rico da empresa, já há “sobre”) vs praticada (sinais). Sem segundo instrumento.

### B-1008 — Academy leve ✅ ENTREGUE

_(migration 059 + lib/learning-resources.js + APIs + LearningResourcesAdminTab)_ Catálogo de ações/trilhas que o PDI pode apontar. Não LMS.

### B-1009 — Catálogo de benefícios (não clube/folha)

Lista de benefícios da empresa (nome, ativo) para contexto de retenção/oferta. Sem adesão, sem desconto em folha, sem “clube”.

---

## Aberto — Epic B-1100 (Analytics avançado) — 71% COMPLETO

Transformar dados comportamentais em **inteligência acionável** para decisões estratégicas de RH. Foco: métricas de efetividade, tendências, comparativos e alertas proativos.

**Progresso:** 5/7 features entregues (71%)

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

### B-1106 — API de métricas (externas/integrações)

**O quê:** **API REST** para expor métricas:
- `GET /api/admin/analytics/metrics` (HR Score, clima, turnover)
- `GET /api/admin/analytics/trends` (time series)
- `GET /api/admin/analytics/comparisons` (segmentação)

**Autenticação:** JWT de gestor (mesmo padrão `/api/admin/*`)

**Saída:**
- JSON estruturado
- Paginação
- Rate limiting
- Documentação OpenAPI/Swagger (opcional)

**Uso:** integrações com BI externo, automações, webhooks

### B-1107 — Relatórios agendados (email/PDF)

**O quê:** **Envio automático** de relatórios:
- Weekly/monthly digest de métricas
- PDF com gráficos + resumo executivo
- Destinatários: direction/admin (configurável)

**Onde:** config em Settings ou aba Analytics

**Saída:**
- Email com PDF anexo
- HTML inline (charts + tabelas)
- Botão "Ver no dashboard" (link direto)

**Reuso:** `lib/mail.js`, crons (já há `manager-weekly-digest`)

---

## Em andamento

**B-1100 — Analytics avançado** (preparando B-1101)

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

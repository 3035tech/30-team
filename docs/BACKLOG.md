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
| **ATS** (Gupy, Greenhouse, Lever) | Pipeline custom, CV/LinkedIn, scorecards, calendário, oferta | Pipeline fixo + kanban + notes + /j SEO + relatório /r | SLA por estágio, scorecard estruturado, pool/banco de talentos, clonar vaga — **sem** virar ATS genérico |
| **Assessment puro** (DISC, Big Five vendors) | Bateria própria + PDF + benchmarks | Eneagrama T1–T9 + Motivadores v4 + rubrica + PDF briefing | Empacotar resultado — **não** novo instrumento DISC |
| **People / engajamento** (Lattice, Culture Amp) | Ciclos de review, engajamento contínuo, goals | 1:1 + hipóteses + `retention_watch` + briefing + kit hire | Digest gestor, lembrete de 1:1 |
| **Team analytics** | Heatmaps, org chart, “ideal team” | Compat / Comparativo / Grupos / Liderança + núcleo + fit vs time no ranking | Grupos salvos, overview com mapa de tipos |
| **Carreiras / employer brand** | Portal rico, blog, employee stories | `/j` + `/c` + funil + indicação | OK por enquanto; só polish se métricas pedirem |
| **Cliente / consultoria** | Portais white-label | `/r` shortlist + parecer | One-pager imprimível / PDF do `/r` |

**Princípio de prioridade:** empacotar o que já medimos (acionar perfil) > fechar fricção no funil RH > novos scores ou instrumentos.

**Explicitamente fora (não abrir item):** segundo instrumento tipo DISC; conta de candidato; merge por nome; segundo hub paralelo a `candidates`.

---

## Aberto — Epic B-400 (empacotar perfil + fechar gaps)

_(entregues: **B-401** print/PDF do briefing · **B-402** kit pós-hire · **B-403** fit vs núcleo no ranking.)_

### B-404 — Grupos salvos (squads)
**Por quê:** Aba Grupos é sessão efêmera; tools de team design salvam “squads”.  
**O quê:** Persistir núcleos nomeados por `company_id` (base + membros por `candidate_id`/`assessment_id`), listar/abrir/editar. Reusar UI de GroupTab. Migration + tenant + soft delete.  
**Onde:** `lib/people/` ou `lib/` + API admin fina + GroupTab.  
**Não fazer:** org chart completo.

### B-405 — Digest semanal do gestor (retenção + 1:1 em atraso)
**Por quê:** Culture Amp etc. empurram ação por e-mail; `retention_watch` só no sino.  
**O quê:** Cron opcional: resumo semanal (e-mail e/ou notif agregada) com pessoas em `retention_watch` recentes + candidatos sem 1:1 há N dias (cap por empresa). Reusar catalog de notifs + mail.  
**Onde:** `app/api/cron/…` + flags env.  
**Não fazer:** spam diário; fan-out O(sistema).

### B-406 — SLA / aging no pipeline
**Por quê:** ATS mostram “dias no estágio”; 30Team tem kanban sem alerta de envelhecimento.  
**O quê:** Badge “N dias” no card; filtro/ordenação; opcional notif se staging > limiar configurável (default por stage). Dados já na timeline/`pipeline`.  
**Onde:** kanban vaga + Equipe; i18n.  
**Não fazer:** BPM/workflow engine.

### B-407 — Scorecard de entrevista estruturado (leve)
**Por quê:** Notes ricas existem; falta checklist alinhado ao briefing (perguntas do `buildInterviewQuestions`).  
**O quê:** Template por vaga ou por pessoa: perguntas do briefing + nota 1–5 + comentário curto; grava em tabela ligada a `candidate_id` + `vacancy_id`. Aparece no expand.  
**Onde:** reutilizar perguntas do decision-brief; RichText só no comentário se precisar.  
**Não fazer:** formulário de 40 critérios; integração calendário.

### B-408 — Banco / pool de talentos (reuso de candidatos)
**Por quê:** ATS têm talent pool; hoje candidato vive na vaga — reabrir em outra vaga é manual.  
**O quê:** Ação “adicionar à vaga X” a partir da Equipe / busca por e-mail na empresa; preservar assessments. Upsert já existe por e-mail.  
**Onde:** API candidates + UI Equipe/Vagas.  
**Não fazer:** marketplace cross-tenant.

### B-409 — Clonar vaga
**Por quê:** Fricção operacional óbvia vs ATS.  
**O quê:** Duplicar vaga (título “(cópia)”, rubrica, flags públicas off por default, sem candidatos). Drawer ou ação “Mais…”.  
**Onde:** `POST` admin vacancies clone.  
**Não fazer:** clonar pipeline/candidatos.

### B-410 — Overview: mapa de tipos do time (heat)
**Por quê:** Visão geral ainda é snapshot genérico; o diferencial T1–T9 não aparece como “saúde de composição”.  
**O quê:** Bloco na Visão geral: distribuição T1–T9 do coorte filtrado + 1 frase hedged (ex. concentração / lacunas). Reusar métricas/overview + `TYPE_DATA`.  
**Onde:** `OverviewTab` + `lib/overview-metrics.js`.  
**Não fazer:** dashboard BI pesado.

### B-411 — Convite em lote Motivadores (time interno)
**Por quê:** Convite AE é 1 a 1; assessment vendors fazem campanha.  
**O quê:** Selecionar N pessoas da Equipe (time interno) → criar convites AE com cap + dedupe e-mail. Reusar `create-motivators-invite`.  
**Onde:** MotivatorsAdminTab ou Equipe.  
**Não fazer:** SMS/WhatsApp gateway.

### B-412 — (opcional) PDF do relatório cliente `/r`
**Por quê:** Cliente recebe link; reunião presencial pede anexo.  
**O quê:** Botão “versão para imprimir/PDF” na página `/r` (CSS print) ou generate no painel.  
**Onde:** `app/r/[token]`.  
**Não fazer:** white-label multi-marca complexo.

---

## Aberto — qualidade / testes

_(vazio — B-001–B-006 entregues)_

---

## Aberto — Epic B-100 (SEO / distribuição pública)

_(entregue — ver `docs/job-seo-and-distribution.md`. Inclui agregadores B-119 e logo empresa via S3.)_

---

## Aberto — performance (audit dashboard)

### B-202 — (opcional) caps/API restantes do audit
Já entregue na maior parte: vac-n1 LATERAL, export cap, purge batches, AE analytics sample, notify unnest, email unique idx (025), compat/leadership caps. Revisitar só se métricas de produção pedirem.

---

## Aberto — Epic B-300 (acionar perfil)

_(entregue — B-301 briefing Equipe, B-302 briefing na vaga, B-303 notif `retention_watch`, B-304 composição do núcleo em Grupos.)_

---

## Em andamento

_(vazio)_

---

## Notas

- Qualidade/testes **B-001–B-006** entregues.
- Epic **B-100** fechado (SEO, funil, referral, job alerts, agregadores, logo S3).
- **Logo S3:** código pronto; falta só credenciais de produção (`S3_BUCKET` + chaves — ver `.env.example`).
- Epic **B-300** fechado.
- Epic **B-400:** B-401–B-403 entregues (ago/2026); próximos: **B-404 → B-405** ou funil **B-406–B-409**.

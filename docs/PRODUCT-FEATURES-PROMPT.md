# Prompt — funcionalidades atuais do 30Team

Copie o bloco abaixo para um chat / agente quando precisar de contexto de **produto já entregue** (não de backlog). Data de referência: **ago/2026**. Fonte: `AGENTS.md`, Guia (`HelpTab` / `panel.help.*`), `docs/BACKLOG.md` (epics fechados).

---

```
Você está trabalhando no 30Team (30team) — produto de RH da 3035Tech para perfil de trabalho e recrutamento.

## O que é (e o que NÃO é)
- Instrumento principal: avaliação inspirada no Eneagrama, tipos T1–T9 (estilo de trabalho).
- Instrumento secundário: Motivadores (Assessment Engine).
- NÃO é diagnóstico clínico, NÃO substitui entrevista técnica, NÃO é DISC nem cópia de baterias proprietárias.
- Linguagem de produto: hedging (“tende a”, “há indícios”). Hipóteses ≠ rótulo definitivo.
- Candidatos NÃO têm conta. Gestores: login → /dashboard (roles admin | direction | hr).

## Stack (resumo)
Next.js 14 App Router + React 18 JSX (sem TypeScript) + PostgreSQL 16 + JWT cookie team30_session + Tailwind (tokens brand/pipeline) + i18n pt-BR e en. Multi-tenant por company_id. Scoring autoritativo no servidor. Soft delete em companies/vacancies/users.

## Identidade da pessoa
Hub = tabela candidates (company_id + e-mail). O mesmo candidate_id une:
- Eneagrama (assessments)
- Motivadores (ae_attempts / convites AE)
- People (one_on_ones, hipóteses, briefing)

## Links públicos (token; fora do ACL do gestor)
| URL | Uso |
|-----|-----|
| /t/{token} | Assessment Eneagrama da empresa (time interno; noindex) |
| /v/{token} | Assessment Eneagrama da vaga (candidato; noindex) |
| /assessment/motivators/{token} | Motivadores |
| /j , /j/{slug}-{id} | Anúncio SEO da vaga (marketing; distinto do teste) |
| /j/remoto , /j/cidade/{slug} | Agregadores públicos (massa mínima) |
| /c/{companySlug} | Carreiras da empresa (opt-in) |
| /r/{token} | Relatório shortlist para o cliente |
| /clima/{token} | Pesquisa de clima anônima (um uso por convite) |
| /pulso/{token} | Pulso curto de grupo (anônimo, um uso) |
| /e/{token} | Espaço mínimo do colaborador (PDI + combinados; sem conta) |
| /a/set-password , /a/unsubscribe | Setup de senha / cancelar job alert |

Nunca misturar: /t = time; /v = teste candidato; /j = anúncio; /c = carreiras; /r = cliente.

## Painel — abas / módulos (CAP)
Visão geral · Equipe · Compatibilidade · Comparativo · Grupos · Liderança · Vagas · Motivadores · Clima · Empresas (admin) · Usuários (admin) · Guia · Meu perfil.
Overrides por usuário (whitelist de módulos). Links públicos já emitidos NÃO são invalidados ao revogar CAP do gestor.

## Funcionalidades entregues (por área)

### Auth e acesso
- Login JWT; roles admin / direction / hr.
- Convite de usuário com /a/set-password (72h) ou senha no cadastro; reenvio de convite.
- Módulos visíveis customizáveis; defaults por role.
- Logout / troca de senha / desativar usuário → sessão derrubada (session_version).
- i18n do painel (pt-BR / en); perfil do gestor (nome, idioma, senha).

### Visão geral
- Snapshot / métricas da empresa (coorte filtrável).
- Mapa heat T1–T9 + frase hedged de composição (concentração / lacunas).

### Equipe
- Lista + kanban de roster; filtros Time interno / Candidatos de vaga / Todos + área, vaga, T1–T9, pipeline, busca.
- Detalhe da pessoa: Briefing e 1:1 · Estilo · Histórico · Cadastro.
- **Adicionar à vaga** (pool): vincula candidato existente a outra vaga aberta.
- Timeline do candidato (cadastro, convites, testes, estágios).
- Export CSV de avaliações (cap de linhas + stream).
- Marcar funcionário / status de pipeline na Equipe.

### People (gestão) — epic B-300
- Briefing de decisão (HrActionBrief): alertas, faça/evite, perguntas de entrevista, dicas de composição com o time — a partir de Eneagrama + Motivadores. **Imprimir / PDF** (one-pager).
- Mesmo briefing no detalhe do candidato na vaga (“Notas / ações”).
- Hipóteses de gestão (tom “tende a”) + registro de 1:1 (data, notas ricas, próximos passos) — separado de hr_notes de triagem.
- Notificação in-app retention_watch quando Motivadores apontam sinais de retenção; deep-link para Equipe; limiar `RETENTION_WATCH_MIN_SCORE` (padrão 55); card + Atenção na Visão geral (14d); **fluxo acionável** (pergunta + plano PDI + revisão).
- Notificação hire_onboarding_kit ao marcar contratado (abrir briefing na Equipe).
- **PDI:** planos + itens na Equipe; editar/arquivar; seed da síntese; vínculo opcional a 1:1; checkbox feito; barra de progresso; nasce ativo; **ciclo** (período); **responsável**; **converter próximos passos do 1:1**; Overview lista + fila.
- **Check-ins pós-hire (D30/D60/D90):** criados no hire; bloco na Equipe; Overview atrasados/próximos 14d; outcome develop/concern → item PDI (`onboarding`).
- **Pulso de grupo:** Grupos → grupo salvo → `/pulso/{token}` (curto, anônimo; não substitui Clima).
- **Link do colaborador:** `/e/{token}` (sem conta) — PDI, combinados, prep 1:1 (**marcar preparação** + nota ao gestor).
- Ranking: **explicar Fit** (pesos × T1–T9; exclusões).
- Retenção: lista de acompanhamentos + **marcar revisão** com nota.
- Pulso: interpretação hedged + mix T1–T9 do grupo.
- **Clima:** perguntas editáveis; links em lote / e-mail; médias só após mínimo de respostas; barras por pergunta; benchmark com média geral e Δ; pulse na Visão geral.

### Clima (estrutura B-500)
- Aba **Clima** (`climate.view`): campanhas anônimas por empresa; perguntas Likert; abrir/encerrar; link `/clima/{token}` (um uso); médias agregadas por pergunta (sem PII) com mínimo de respostas; lote/e-mail; comparativo.

### Análises de perfil
- Compatibilidade: pares / matriz de sinergia–tensão–neutro (com caps).
- Comparativo: lado a lado de perfis.
- Grupos: base + membros; tensões internas; composição do núcleo; **grupos salvos** por empresa (B-404).
- Liderança: analytics de liderança (caps).
- Ranking da vaga: aderência rubrica + coluna vs time interno (sinergia/tensão — B-403).

### Vagas e recrutamento
- CRUD em drawer (lista primeiro): título, status, posições, data-alvo, contrato, modalidade/UF/cidade IBGE, faixa salarial, descrição rica.
- Assistência de descrição: template de seções + “Criar/melhorar com IA” (OpenAI opcional).
- Rubrica por vaga: pesos T1–T9 (não muda o teste); aderência 0–10; sugestão/geração com IA opcional.
- Links: /v (teste) e /j (página pública, flags: ativar, indexar, mostrar empresa, salário).
- Score de completude SEO no drawer.
- Cadastro de candidatos (e-mail = chave); convite eneagrama por e-mail; notes ricas de triagem; **scorecard 1–5** (perguntas do briefing).
- Pipeline kanban: new → interview → test_completed → screening → approved → hired | rejected | archived (drag-and-drop; rejeição com motivo; hire com data de início; auto-close ao preencher posições). Badge “N d” (aging ≥7/≥14) no kanban da vaga e da Equipe.
- Clonar vaga (cópia de campos + rubrica; sem candidatos; página pública off).
- Ranking de fit / aderência na vaga (+ coluna vs time interno quando houver núcleo).
- Funil analytics (views → apps → entrevistas → hires; UTM/ref) — precisa página pública.
- Indicação: códigos ?ref= (escopo vaga ou empresa).
- Relatório cliente /r: shortlist + parecer (≥80 chars); modelos / IA opcional; validade 7/14/30 dias; revogar; editar parecer de link ativo; **Imprimir / PDF** (versão limpa).
- Notificações: prazo da vaga, vaga fechada, teste concluído, kit pós-hire, digest semanal, etc.

### Página pública / SEO (epic B-100)
- Índice /j (busca, filtro contrato, paginação); JobPosting JSON-LD; sitemap/robots.
- Share WhatsApp/LinkedIn/copiar com UTM; cookie de atribuição sem PII.
- Job alerts por e-mail + unsubscribe.
- Agregadores /j/remoto e /j/cidade/{slug} (limiar de massa).
- Perfil /c/{slug} (opt-in em Empresas: site, sobre, logo S3).
- Google Indexing API (opt-in via env; mock em DTOV).
- URLs legadas /vagas /empresas /vaga/… → 308.

### Motivadores (AE)
- Banco situacional v4 (linguagem de trabalho; dimensões só no servidor).
- 13 dimensões + grupos de leitura; insights faça/evite; NÃO entra no ranking de aderência da vaga.
- Dashboard RH + Convites (1 a 1 ou lote do time interno, cap 25) + Resultados; config avançada do banco (permissão).
- Sync/desativar perguntas; nunca DELETE de ae_questions com tentativas.

### Empresas e usuários (admin)
- Empresas: drawer (site, logo S3, sobre, opt-in carreiras /c).
- Usuários: criar em 2 passos (identidade → módulos); editar; reenviar convite; soft delete.

### Notificações e ops
- Sino in-app (Eneagrama/Motivadores concluídos, retention_watch, kit pós-hire, digest semanal, prazo, vaga fechada).
- Crons: lembretes de convite, deadline de vaga, retenção de notificações, digest semanal do gestor (CRON_SECRET).
- Retenção LGPD: purge em lotes (admin).
- Health endpoints; audit de ações sensíveis.
- Feedback UI: confirm/notice/promptForm/toast (nunca window.confirm/alert).

### Qualidade / provas
- DTOV (Postgres efêmero) + HTTP smoke + Playwright; npm run test:full:offline / dtov:full-app.
- Guia do painel (HelpTab) + README/docs atualizados com features de uso.

## Regras duras ao propor/implementar
1. Reutilizar componentes (app/_components, dashboard-shared) e helpers (lib/) antes de criar.
2. i18n pt-BR + en; tokens Tailwind/theme; sem segundo design system; sem TypeScript/src/.
3. Tenant company_id; SQL parametrizado; query vs queryRead; paginação/caps; sem N+1.
4. Após implementação de produto: docs/Guia + Dev→Test→Validate (DTOV quando tocar SQL/API/dados).
5. Não inventar DISC, conta de candidato, merge por nome, ou segundo hub de pessoa paralelo a candidates.
6. Backlog aberto está em docs/BACKLOG.md — itens removidos = já entregues (não reimplementar).

## Onde olhar no código
- Domínio / regras: AGENTS.md
- People/briefing: lib/people/*, app/_components/HrActionBrief.jsx, PeopleManagementPanel.jsx
- Motivadores: lib/ae/*, app/api/ae/*, app/api/admin/ae/*
- Vagas/pipeline: lib/pipeline.js, lib/hire.js, app/dashboard/vacancies/*, app/api/admin/vacancies/*
- Público SEO: docs/job-seo-and-distribution.md, app/j, lib/job-*
- Guia: app/dashboard/tabs/HelpTab.jsx + panel.help.* em lib/i18n.js
```

---

## Uso sugerido

| Contexto | Como usar |
|----------|-----------|
| Ideação / roadmap | “Com base neste mapa do 30Team, proponha a próxima feature de maior valor sem duplicar o que já existe.” |
| Implementação | Colar o prompt + pedido específico; reforçar “reusar antes de criar”. |
| Onboarding de agente | Colar no início da sessão junto com `AGENTS.md`. |

Atualize este arquivo quando um epic relevante fechar (ex.: novo módulo no painel ou superfície pública nova).

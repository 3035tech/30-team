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

**Antes de implementar qualquer item:** ler `AGENTS.md`, reutilizar o que já existe, rodar Dev → Test → Validate, atualizar README/Guia quando houver uso novo.

---

## Aberto — qualidade / testes (sessão anterior)

### B-001 — E2E Playwright: preenchimento completo do assessment
Rodar no Chromium `/t` ou `/v` até submeter e ver resultado (não só shell). Smoke atual só abre a tela.

### B-002 — E2E Playwright: drag-and-drop do kanban de vaga
Arrastar candidato entre colunas no detalhe da vaga (gestor logado).

### B-003 — Provas SMTP / OpenAI (real ou mock)
DTOV com Mailhog/mock SMTP e stub OpenAI para assistentes; smoke atual não chama externo de verdade.

### B-004 — HTTP smoke People / 1:1 sempre cobertos
Garantir GET candidato + one-on-ones mesmo se a 1ª vaga da lista não tiver candidatos.

### B-005 — Migrar `scripts/test-*.js` para `test/`
Alinhar one-offs (`test-ae-scoring`, `test-motivators-invite-flow`) ao pacote `test/`.

### B-006 — A11y login: `label` ↔ `input`
`htmlFor`/`id` em `/login` (hoje o nome acessível é o placeholder).

---

## Aberto — Epic B-100: SEO, indexação, distribuição e analytics de vagas públicas

**Objetivo:** transformar cada vaga publicada em página pública otimizada (Google Search / Google Jobs / share / campanhas / referral) e criar base para medir canais → candidatos → contratações.

**Estado atual (já existe — reutilizar, não duplicar):**

| Já tem | Onde |
|--------|------|
| Página pública `/j/{slug}-{id}` (+ redirect legado `/vaga/...`) | `app/vagas/[jobKey]`, `app/vaga/...`, `lib/public-vacancy-posting.js` |
| Índice `/vagas` (lista simples, cap 48) | `app/vagas/page.jsx` |
| Meta title `{Título} | {Empresa}`, description, robots, OG + Twitter | `postingDocumentTitle` / `generateMetadata` |
| JSON-LD JobPosting (open + index + prazo ok; sem TELECOMMUTE inventado) | `buildJobPostingJsonLd` |
| Encerrada / `target_date` passado: UX fechada, noindex, sem apply/JSON-LD | `publicVacancyShowsClosedExperience` |
| `robots.txt` + `sitemap.xml` (vagas indexáveis) | `app/robots.js`, `app/sitemap.js` |
| Google Indexing API (opt-in via env) | `lib/job-indexing.js` + ganchos vacancies API |
| Share in-page (WhatsApp / LinkedIn / copiar + UTM) | `PublicVacancyShareBar`, `lib/job-share-copy.js` |
| Flags: página, index, empresa, salário | migration `030`/`031`, drawer de vaga |
| Assessment `/v/{token}` (noindex) | separado da página SEO |
| Copiar links no **dashboard** | `VacanciesAdminTab` |
| Company `website` / `about_html` | sem logo de empresa no DB |

**Gaps principais:** agregadores (B-119 — adiar até campos remoto/cidade); logo / local / modalidade (campos ainda inexistentes).

**Regras de implementação do epic:**

1. Stack: Next.js 14 JSX (sem TS), Postgres, rotas finas + `lib/` gordo, i18n pt-BR+en, tokens `C`/`FONTS`.
2. Status de vaga no 30Team hoje: `open` \| `closed` (+ soft `deleted`). **Não** inventar DRAFT/PAUSED/EXPIRED como enum paralelo — mapear: open≈published; closed≈closed; expiração via `target_date` se existir; draft = página pública desligada.
3. Candidatura pública = CTA → `/v/{token}` (assessment), não inventar segundo fluxo de apply.
4. Multi-tenant: sempre `company_id`; analytics admin com `CAP` / `requireCapability`.
5. Sem credenciais no repo; falha Google Indexing **não** bloqueia publicar vaga.
6. Migrations novas numeradas (`032+`); espelhar em `scripts-banco-pendentes` / bootstrap quando schema mudar.
7. Docs finais: `docs/job-seo-and-distribution.md` + Guia (`panel.help.*`) + README env.
8. Testes: DTOV + libs offline + HTTP/browser conforme o item.
9. Ordem: implementar **sub-itens na ordem B-101 → B-131** (fases 1–8 do spec).

---

### Fase 1 — SEO e Google

**Entregue nesta fase:** URL canônica (B-101), conteúdo estruturado disponível no schema (B-102), title/description/canonical (B-103), ciclo encerrada/prazo (B-106).

---

### Fase 2 — Indexação Google

**Entregue:** `lib/job-indexing.js` (URL_UPDATED / URL_DELETED) + ganchos fire-and-forget em create/update/close/delete de vagas. Env `GOOGLE_INDEXING_ENABLED` (default off) + `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON`. Mock em DTOV.

---

### Fase 3 — Distribuição / share

**Entregue:** share in-page (WhatsApp / LinkedIn / copiar) + `lib/job-share-copy.js` com UTM. Sem item aberto nesta fase.

---

### Fase 4 — Analytics e atribuição

**Entregue:** cookie UTM/`ref` (`team30_job_attr`) → `assessments.attr_*` + `candidates.source` grosso; `job_funnel_events` (view/apply/pipeline); `GET /api/admin/vacancies/[id]/analytics`. Migration `032`.

#### B-115b — (opcional) UI analytics no detalhe da vaga
**Entregue:** aba “Funil” no detalhe da vaga (números + top sources via `GET …/analytics`).

---

### Fase 5 — Referral

**Entregue:** `referral_codes` + APIs admin + analytics por código; `?ref=` via cookie/assessment (Fase 4). Migration `033`. **UI:** aba Indicação no detalhe da vaga (criar/copiar/desativar + métricas).

---

### Fase 6 — Crescimento orgânico

#### B-118 — `/j` com busca, filtros e paginação
**Entregue:** índice `/j` com `?q=`, `employmentType`, `page`/`pageSize`; `listOpenPublicVacancies` paged; empty filtrado i18n.

#### B-119 — Páginas agregadoras SEO (com guarda de qualidade)
**Instruções:**
- Rotas tipo `/vagas/remoto`, `/vagas/{cidade}`, etc. **somente** se count ≥ limiar configurável (ex. 3 vagas) — **proibir** milhares de combinações vazias.
- Cada página: title, description, canonical, H1, intro curta, lista, paginação; sem JobPosting.
- Começar com 1–2 agregadores seguros (ex. remoto se campo existir; senão adiar até haver dado).
- Critério: agregador sem massa suficiente → 404 ou redirect para `/vagas`, nunca página vazia indexável.

#### B-120 — Página pública da empresa `/c/{companySlug}`
**Entregue:** canônica neutra `app/c/[companySlug]` + `resolvePublicCompanyBySlug` (exige `public_profile_enabled`); legado `/empresas/{slug}` → 308; opt-in no cadastro Empresas; link no índice `/j` quando perfil ligado.

#### B-121 — Job Alerts (base)
**Entregue:** tabela `job_alerts` (035); `POST /api/public/job-alerts` + unsubscribe; formulário no rodapé de `/j`; `/a/unsubscribe?token=`. **Disparo SMTP:** `scheduleJobAlertDispatch` no create/update de vaga (só transição para página pública aberta; SMTP off = no-op).

---

### Fase 8 — Otimização

#### B-122 — JobSeoScoreService (determinístico)
**Entregue:** `lib/job-seo-score.js` + checklist no drawer de vaga (`VacancyPublicFlagsFields`); teste DTOV offline.
#### B-123 — Abstração futura de IA para conteúdo de vaga
**Instruções:**
- **Não** criar código morto. Só documentar em `docs/job-seo-and-distribution.md` que `lib/vacancy-assist-ai.js` já cobre draft/improve description; futuros `generateMetaDescription` / `suggestSkills` estendem esse módulo.
- Se precisar de interface, 1 arquivo fino reexport — sem stubs vazios.
- Critério: doc clara; zero dependência nova.

---

### Transversal (fazer junto das fases)

#### B-124 — Documentação `docs/job-seo-and-distribution.md`
Arquitetura, fluxos, JSON-LD, sitemap, Indexing API, envs, tracking, referral, analytics, score, como testar e validar JSON-LD (Google Rich Results).

#### B-125 — Guia do painel + README
**Parcial:** Guia do painel atualizado (Funil, Indicação, score SEO, /j /c job alerts, parecer, shell). Falta fechar README/`.env.example` (Indexing, SMTP alerts) se ainda incompleto.

#### B-126 — Suite de testes do epic
Cobrir: slugify (acentos/especiais); JobPosting variantes; sitemap só ativas; UTM/referral persistence; SEO score; Indexing mock. Rodar `dtov:full-app` ao fechar cada fase relevante.

#### B-127 — Segurança / LGPD checklist do epic
Nada de candidato em sitemap/JSON-LD/analytics público; admin analytics com CAP; sem IP em claro; UTMs/ref ok de armazenar.

---

## Aberto — performance (audit dashboard)

### B-202 — (opcional) caps/API restantes do audit
Já entregue na maior parte: vac-n1 LATERAL, export cap, purge batches, AE analytics sample, notify unnest, email unique idx (025), compat/leadership caps. Revisitar só se métricas de produção pedirem.

---

## Em andamento

_(vazio)_

---

## Notas

- Itens **B-001–B-006**: gaps de teste/a11y da sessão DTOV/Playwright.
- Epic **B-100 / B-101–B-127**: SEO/distribuição/analytics. Referral UI + job-alert SMTP no publish já entregues (Fase 5/6). Restos: B-119, B-123–B-127, B-001–B-006, campos logo/local/modalidade.
- Ao concluir o epic inteiro: apagar a seção B-100 e filhos; manter só o que restar em Aberto.

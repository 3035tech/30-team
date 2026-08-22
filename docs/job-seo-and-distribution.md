# SEO, distribuição e analytics de vagas públicas

Documento técnico do epic de páginas públicas (`/j`, `/c`, share, funil, indicação, job alerts, Indexing API).  
Uso no painel (RH): Guia → seções **Vagas** e **Página pública da vaga**. Setup: `README.md` + `.env.example`.

**Não substitui** parecer jurídico nem política de privacidade pública. Checklist LGPD do epic: § [Segurança / LGPD](#segurança--lgpd-checklist-do-epic).

---

## Mapa de URLs

| URL | Público? | Função |
|-----|----------|--------|
| `/j` | Sim | Índice de vagas abertas indexáveis (busca, filtro, paginação) |
| `/j/{slug}-{id}` | Sim | Página SEO da vaga (canônica). `id` = `vacancies.id` |
| `/c/{companySlug}` | Sim (opt-in) | Carreiras da empresa (`companies.public_profile_enabled`) |
| `/a/unsubscribe?token=…` | Sim | Cancelar job alert |
| `/vaga/…`, `/vagas`, `/empresas/…` | — | Legado → **308** para `/j` / `/c` |
| `/v/{token}` | Sim | Assessment Eneagrama da vaga (**noindex**; não é marketing) |
| `/t/{token}` | Sim | Assessment empresa / time interno (**noindex**) |
| `/r/{token}` | Sim | Relatório ao cliente (token; **noindex**) |

Candidatura na página pública = CTA → `/v/{token}` (mesmo fluxo de assessment). Não há segundo “apply”.

---

## Flags e ciclo de vida

Status de vaga no 30Team: `open` \| `closed` (+ soft `deleted`). Sem enum DRAFT/PAUSED paralelo.

| Conceito | Mapeamento |
|----------|------------|
| Publicada / indexável | `open` + `public_page_enabled` + `public_allow_index` + prazo (`target_date`) ok |
| Rascunho / não divulgar | página pública desligada |
| Encerrada | `closed` ou `target_date` passado → UX fechada, noindex, sem JobPosting, sem CTA |

Flags na vaga (drawer): página pública, permitir indexação, mostrar empresa, mostrar salário.  
Salário no relatório cliente (`/r`) é flag **separada** (`client_report_show_salary`).

Empresa: `website`, `about_html`, `public_profile_enabled` (opt-in para `/c/{slug}`).

Score de completude (determinístico): `lib/job-seo-score.js` → `computeJobSeoScore` (checklist no drawer).

---

## Conteúdo e SEO on-page

- **Title / description / canonical / robots / OG+Twitter**: `generateMetadata` nas rotas `/j` e `/j/[jobKey]`.
- **JSON-LD JobPosting**: `buildJobPostingJsonLd` — só se open + index + prazo ok; sem `TELECOMMUTE` inventado; sem dados de candidato.
- **Encerrada**: agradecimento + vagas relacionadas + link `/j`; sem apply / JSON-LD.
- **Sitemap / robots**: `app/sitemap.js`, `app/robots.js` — só URLs públicas indexáveis (vagas; empresa `/c` quando opt-in).

Validar JobPosting: [Google Rich Results Test](https://search.google.com/test/rich-results) com a URL `/j/…` em staging/produção.

---

## Google Indexing API

| Env | Default | Papel |
|-----|---------|--------|
| `GOOGLE_INDEXING_ENABLED` | off (`false`) | Liga push URL_UPDATED / URL_DELETED |
| `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON` | — | JSON inline **ou** path do arquivo da service account |
| `GOOGLE_INDEXING_MOCK` | — | `1` = não chama Google (log em memória). `DTOV=1` força mock |

Código: `lib/job-indexing.js`. Ganchos fire-and-forget em create/update/close/delete de vagas.  
**Falha do Google nunca bloqueia** salvar a vaga.  
Requer `NEXT_PUBLIC_APP_URL` correto (URL absoluta no notify).

Service account no Google Cloud: API “Indexing” habilitada; owner/verified do domínio Search Console.

---

## Share e atribuição

- **Share in-page**: WhatsApp / LinkedIn / copiar (`PublicVacancyShareBar`, `lib/job-share-copy.js`) com UTM.
- **Cookie** `team30_job_attr` (httpOnly, ~7 dias): `utm_*` e/ou `?ref=` — **sem PII / sem IP**.
- Persistência no submit do assessment da vaga: `assessments.attr_*`; `candidates.source` grosso.
- Eventos: `job_funnel_events` (view, apply_start, pipeline…).
- Painel: aba **Funil** no detalhe da vaga → `GET /api/admin/vacancies/[id]/analytics` (CAP de vagas).

---

## Indicação (referral)

- Tabela `referral_codes` (migration `033`).
- UI: aba **Indicação** no detalhe da vaga (criar, copiar `/j/…?ref=CODIGO`, desativar, métricas).
- Escopo: só a vaga ou empresa inteira.
- APIs: `GET/POST /api/admin/referral-codes`, `PATCH …/[id]`, `GET …/analytics`.
- `?ref=` entra no mesmo cookie/funil da atribuição.

---

## Job alerts

- Tabela `job_alerts` (migration `035`).
- Cadastro: formulário no rodapé de `/j` → `POST /api/public/job-alerts`.
- Cancelar: `/a/unsubscribe?token=…`.
- Disparo: `scheduleJobAlertDispatch` ao **criar** ou **ligar** página pública aberta (não a cada edit trivial).
- **SMTP** (`SMTP_HOST` + `MAIL_FROM`): sem SMTP → **no-op** (não falha o save). Com SMTP → e-mail em lote (cap interno).

---

## Assistentes de IA (vaga / relatório) — B-123

Módulo único: **`lib/vacancy-assist-ai.js`** (OpenAI via `lib/openai-chat.js`).

| Função exportada | Uso no produto |
|------------------|----------------|
| `suggestVacancyDescriptionAi` | Drawer: criar/melhorar descrição |
| `suggestExecutiveNoteAi` | Relatório cliente: parecer |
| `suggestShortlistAi` | Relatório: sugerir shortlist |
| `suggestCandidateFieldsAi` | Relatório: por quê / alertas / probes |
| `summarizeInterviewNotesAi` | Notas de entrevista |

Env: `OPENAI_API_KEY`, `OPENAI_RUBRIC_MODEL` (default `gpt-4o-mini`). Sem chave → `RUBRIC_AI_NOT_CONFIGURED` (503).

**Extensões futuras** (`generateMetaDescription`, `suggestSkills`, etc.): **estender este módulo** (ou 1 reexport fino). Não criar stubs vazios nem segundo cliente OpenAI.

Fluxo sempre: sugerir → RH revisa → salvar. Linguagem hedged; sem diagnóstico clínico.

---

## Arquivos-chave

| Área | Onde |
|------|------|
| URL / slug | `lib/public-job-url.js` |
| Resolve posting | `lib/public-vacancy-posting.js` |
| Lifecycle / closed UX | `lib/public-vacancy-lifecycle.js` |
| JSON-LD / meta | posting helpers + `app/j/**` |
| Indexing | `lib/job-indexing.js` |
| Funil / attr | `lib/job-attribution*.js`, `job_funnel_events` |
| Alerts | `lib/job-alerts.js` |
| Score | `lib/job-seo-score.js` |
| Empresa pública | `lib/company-profile.js`, `app/c/[companySlug]` |
| Migrations | `030`–`036` (ver `migrations/`) |

---

## Como testar (dev / DTOV)

```bash
npm run dtov:reset
npm run dtov:full-app   # inclui mock Indexing, SQL funil/referral, HTTP /j, redirects
```

Provas offline no `test/dtov/full-regression.js`: slug/canonical, JobPosting guards, SEO score, Indexing mock, job-alerts gates, listagem `/j` paged.

Manual: abrir `/j/…` → Rich Results Test; Funil/Indicação no painel com HR demo DTOV.

---

## Segurança / LGPD (checklist do epic)

Marcar mentalmente em cada mudança de superfície pública:

| # | Regra | OK? |
|---|--------|-----|
| 1 | Sitemap / JSON-LD / HTML público **não** expõem candidato (nome, e-mail, telefone, scores individuais) | |
| 2 | Analytics de funil/referral só no **painel** (JWT + CAP Vagas); APIs admin com `requireCapability` | |
| 3 | Cookie `team30_job_attr` e `job_funnel_events`: **sem IP em claro**, sem PII | |
| 4 | UTM / `ref` / códigos de indicação: ok armazenar (origem de campanha agregada) | |
| 5 | `/t`, `/v`, `/r`: **noindex**; tokens não entram no sitemap | |
| 6 | Job alerts: e-mail com consentimento implícito do formulário; unsubscribe sempre disponível | |
| 7 | Indexing API / SMTP: segredos só em env; falha externa não derruba save da vaga | |
| 8 | Multi-tenant: queries de analytics/referral filtradas por `company_id` (hr/direction) | |

Complemento geral: [`docs/privacidade-lgpd-interno.md`](./privacidade-lgpd-interno.md).

---

## Lacunas conhecidas (não inventar)

- Agregadores SEO tipo `/j/remoto` ou por cidade (**B-119**): adiar até existir campo remoto/cidade no schema.
- Logo de empresa, senioridade, skills/benefícios como entidades separadas: ainda sem colunas.

# `test/` — pacote de provas (não é produto)

Separado de `scripts/` (migrate/seed/ops) e de `app/` / `lib/` (código do 30Team).

```
test/
  dtov/                 # Postgres efêmero + regressão SQL/HTTP
    docker-compose.dtov.yml
    harness.js          # reset | up | down | migrate | seed | smoke
    fixtures/           # massa demo (catalog.json + seeders)
    full-regression.js  # SQL + libs offline
    http-smoke.js       # APIs / páginas via fetch (People/1:1 via candidato fixture)
    run-full-app.js     # orquestra SQL → Next :3010 → HTTP → Playwright
  e2e/                  # Playwright (Chromium) — layout e navegação
    browser-smoke.spec.js
    assessment-submit.spec.js   # B-001: /t assessment completo → resultado
    vacancy-kanban-dnd.spec.js  # B-002: DnD kanban da vaga (HR)
    fixtures.js         # tokens/creds + helpers (login, e-mail único, HTML5 DnD)
  unit/                 # One-offs / unitários (sem Playwright)
    ae-scoring.js       # scoring Motivadores offline
    motivators-invite-flow.js  # bootstrap + insert de convite (precisa Postgres)
    decision-brief.js          # estrutura do briefing acionável (B-301)
```

Config Playwright na raiz: `playwright.config.js` (`testDir: ./test/e2e`).

Wrappers legados em `scripts/test-*.js` só reexportam `test/unit/*`.

## Comandos

| npm | O quê |
|-----|--------|
| `dtov:reset` | Sobe Postgres :55432, migrate, seed, smoke SQL |
| `dtov:full` | Reset + regressão SQL/libs |
| `dtov:full-app` | Reset + SQL + Next + HTTP + browser |
| `test:http` | Só HTTP (app já no ar) |
| `test:browser` | Só Playwright (app já no ar) |
| `test:ae-scoring` | Unitário offline do scoring Motivadores |
| `test:full:offline` | Só libs offline (inclui SMTP/OpenAI mock + Indexing) |
| `db:test-motivators` | Fluxo de convite Motivadores (Postgres + migrate) |
| `DTOV_SKIP_BROWSER=1 …` | Pula Chromium no full-app |

### Mocks SMTP / OpenAI (B-003)

Sem serviços externos: envios de e-mail e assistentes de IA usam stub in-process.

| Env | Comportamento |
|-----|----------------|
| `SMTP_MOCK=1` | `sendTransactionalMail` grava em memória (`__getMailMockLog`); `isMailConfigured()` = true |
| `DTOV=1` sem `SMTP_HOST`+`MAIL_FROM` | mesmo mock SMTP automático |
| `OPENAI_MOCK=1` ou `DTOV=1` | `openAiChatCompletion` devolve stub (JSON pesos / HTML); health marca `mocked` |
| SMTP real opcional | apontar `SMTP_*` para Mailhog (`1025`) se quiser captura via UI — **não** está no compose DTOV |

Prova: `npm run test:full:offline` (checks `smtp-mock-capture` e `openai-mock-assistants`).

Provas relevantes à página pública / funil / referral (epic B-100 / **B-126**):

| Camada | Cobertura |
|--------|-----------|
| Offline libs | `slugify` (acentos), JobPosting (open/closed/noindex/expirada), share UTM, cookie atribuição, referral normalize, canonical `/j`, Indexing mock, **SMTP mock** (`SMTP_MOCK` / DTOV sem SMTP), **OpenAI mock** (`OPENAI_MOCK` / `DTOV=1`), SEO score, job-alerts gates, índice `/j` paged — `full-regression.js` |
| SQL | sitemap só abertas indexáveis; funil/referral seed — fixture `public-vacancy-page` |
| HTTP | `/j`, redirects legado, `team30_job_attr`, analytics, referral CRUD — `http-smoke.js` |
| Browser | páginas públicas + navegação vagas — `browser-smoke.spec.js` |
| Browser | assessment completo (/t) até thank-you — `assessment-submit.spec.js` (~3 min; 54 Likert) |
| Browser | kanban vaga DnD (Nina new→interview) — `vacancy-kanban-dnd.spec.js` |

Rodar tudo: `npm run dtov:full-app`.

Só Playwright (app + DTOV já no ar em `:3010`):

```bash
npm run test:browser
# ou um spec:
npx playwright test test/e2e/assessment-submit.spec.js
npx playwright test test/e2e/vacancy-kanban-dnd.spec.js
```

**Flakes:** assessment depende do fade ~280ms entre questões (timeout do spec 180s). Kanban usa `DataTransfer` sintético (HTML5) porque o `dragTo` do Playwright nem sempre preenche `dataTransfer` nos handlers React; o spec é idempotente (move Nina a partir da coluna atual).

## Onde **não** colocar

- Seeds de demo “reais” / migrate → continuam em `scripts/`
- Código de produto → `app/`, `lib/`, `migrations/`
- Artefatos Playwright (`test-results/`, `playwright-report/`) → gitignored

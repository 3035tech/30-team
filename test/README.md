# `test/` — pacote de provas (não é produto)

Separado de `scripts/` (migrate/seed/ops) e de `app/` / `lib/` (código do 30Team).

```
test/
  dtov/                 # Postgres efêmero + regressão SQL/HTTP
    docker-compose.dtov.yml
    harness.js          # reset | up | down | migrate | seed | smoke
    fixtures/           # massa demo (catalog.json + seeders)
    full-regression.js  # SQL + libs offline
    http-smoke.js       # APIs / páginas via fetch
    run-full-app.js     # orquestra SQL → Next :3010 → HTTP → Playwright
  e2e/                  # Playwright (Chromium) — layout e navegação
    browser-smoke.spec.js
    fixtures.js         # tokens/creds do demo Todos os Dados
```

Config Playwright na raiz: `playwright.config.js` (`testDir: ./test/e2e`).

## Comandos

| npm | O quê |
|-----|--------|
| `dtov:reset` | Sobe Postgres :55432, migrate, seed, smoke SQL |
| `dtov:full` | Reset + regressão SQL/libs |
| `dtov:full-app` | Reset + SQL + Next + HTTP + browser |
| `test:http` | Só HTTP (app já no ar) |
| `test:browser` | Só Playwright (app já no ar) |
| `DTOV_SKIP_BROWSER=1 …` | Pula Chromium no full-app |

Provas relevantes à página pública / funil: fixture `public-vacancy-page` (seed + `job_funnel_events`), checks em `full-regression.js` (JobPosting, UTM share, attribution cookie, analytics SQL) e `http-smoke.js` (`/api/public/job-funnel`, `/api/admin/vacancies/:id/analytics`).

## Onde **não** colocar

- Seeds de demo “reais” / migrate → continuam em `scripts/`
- Código de produto → `app/`, `lib/`, `migrations/`
- Artefatos Playwright (`test-results/`, `playwright-report/`) → gitignored

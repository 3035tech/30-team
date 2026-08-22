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

Provas relevantes à página pública / funil / referral (epic B-100 / **B-126**):

| Camada | Cobertura |
|--------|-----------|
| Offline libs | `slugify` (acentos), JobPosting (open/closed/noindex/expirada), share UTM, cookie atribuição, referral normalize, canonical `/j`, Indexing mock, SEO score, job-alerts gates, índice `/j` paged — `full-regression.js` |
| SQL | sitemap só abertas indexáveis; funil/referral seed — fixture `public-vacancy-page` |
| HTTP | `/j`, redirects legado, `team30_job_attr`, analytics, referral CRUD — `http-smoke.js` |
| Browser | páginas públicas + navegação vagas — `browser-smoke.spec.js` |

Rodar: `npm run dtov:full-app`.

## Onde **não** colocar

- Seeds de demo “reais” / migrate → continuam em `scripts/`
- Código de produto → `app/`, `lib/`, `migrations/`
- Artefatos Playwright (`test-results/`, `playwright-report/`) → gitignored

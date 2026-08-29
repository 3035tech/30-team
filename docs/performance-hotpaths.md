# Performance hot paths (B-2800 / B-2801 / B-2802)

Checklist operacional após os sprints Perf-A/B/C e P3 (colaborador). Não substitui o DBA checklist em `AGENTS.md`.

## Baseline P2 (já no produto)

| Peça | Onde |
|------|------|
| SSR só da aba ativa | `app/dashboard/page.jsx` + `load-dashboard-data.js` |
| Caps compat / intel | `COMPAT_PEOPLE_CAP`, `COMPAT_PAIR_PAYLOAD_CAP` |
| Vagas paginadas | `lib/vacancies-admin.js` |
| Índices | `migrations/006_performance_indexes.sql`, `061_performance_indexes.sql`, `079_candidates_name_trgm.sql` |
| Pool PG | `PG_POOL_MAX` em `lib/db.js` |
| Export streamado + cap | `lib/export-assessments-csv.js` / `EXPORT_MAX_ROWS` |
| Slow query log | `LOG_SLOW_MS` + `lib/monitoring.js` / `lib/db.js` |

## P3 — colaborador + gaps (B-2802)

| Peça | Onde |
|------|------|
| Home colaborador paralelo + PDI batch | `lib/employee-home.js`, `listActiveDevelopmentPlansWithItems` |
| Portal `/e` | `lib/people/employee-portal.js` |
| Inbox pesquisas (batch invite + reads) | `lib/employee-surveys.js` — 1 upsert batch, sem N+1 |
| Jornada GET sem ensure | `getEmployeeOnboardingJourney({ ensure })` — ensure no hire/admin |
| Clima aggregate SQL + benchmark batch | `lib/people/climate-surveys.js` |
| Sucessão readiness batch | `lib/succession-plans.js` |
| HR Score cache TTL | `getHrScore` → `hr-score-cache.js`; invalidate em `saveHrScore` |
| Caps assessments / timeline | `candidates/[id]` LIMIT 30; `buildCandidateTimeline` caps |
| LMS lessons por curso | `ROW_NUMBER` ≤ `LMS_LESSON_CAP` |
| `notifyCandidates` unnest | `lib/employee-notifications.js` |
| Crons em chunks paralelos (20) | LMS overdue + vacancy deadlines |
| Mail retry (até 3) | `lib/mail.js` / `MAIL_RETRY_ATTEMPTS` |
| HTTP cache público curto | `/api/public/vacancy-link`, `company-link`; `/api/health` max-age=5 |
| Code-splitting dashboard | já via `next/dynamic` em `DashboardClient` |
| CDN | infra (Cloudflare na borda) — sem mudança de app |

## Medir (P2)

Env:

- `LOG_SLOW_MS` — default `1000` (queries e `measureAsync`)
- `LOG_LEVEL` — `info` / `warn` / …

Operações nomeadas (warn + breadcrumb Sentry se DSN):

- `dashboard.overviewMetrics`
- `dashboard.compatBundles`
- `hrScore.recalculateCompany`
- `turnover.getCompanyRisks`
- `vacancies.listCandidates`
- `vacancies.ranking`

Buscar em logs JSON: `"message":"Slow operation detected"` ou `"Slow Postgres query"`.

## EXPLAIN checklist (DTOV)

```bash
npm run dtov:reset
npm run dtov:explain
npm run dtov:down
```

Script: `scripts/explain-hotpaths.js` (recusa host ≠ DTOV).

Aceite manual: planos sem Seq Scan óbvio nas tabelas quentes (`assessments`, `candidates`, `vacancy_candidates`, `ae_attempts`) no tenant demo. Seq Scan em demo pequeno pode ser ok — revalidar com volume real.

## Caps de referência (após B-2800 / B-2802)

| Cap | Valor |
|-----|-------|
| Compat people | 150 |
| Compat pair payload | 120 |
| Vacancy candidates page | ≤300 |
| Vacancy ranking | 200 |
| Job roles list | 500 |
| Companies `forSelect` | 500 |
| Leadership scores sample | 800 |
| Leadership potentials scan | 500 |
| Turnover employee scan | 500 |
| Candidate assessments (detail API) | 30 |
| Timeline events | 120 |
| LMS lessons / course (employee list) | 60 |
| Employee notify batch | 200 |
| Cron notify chunk | 20 |

# Performance hot paths (B-2800 / B-2801)

Checklist operacional após os sprints Perf-A/B/C. Não substitui o DBA checklist em `AGENTS.md`.

## Baseline P2 (já no produto)

| Peça | Onde |
|------|------|
| SSR só da aba ativa | `app/dashboard/page.jsx` + `load-dashboard-data.js` |
| Caps compat / intel | `COMPAT_PEOPLE_CAP`, `COMPAT_PAIR_PAYLOAD_CAP` |
| Vagas paginadas | `lib/vacancies-admin.js` |
| Índices | `migrations/006_performance_indexes.sql`, `061_performance_indexes.sql` |
| Pool PG | `PG_POOL_MAX` em `lib/db.js` |
| Export streamado + cap | `lib/export-assessments-csv.js` / `EXPORT_MAX_ROWS` |
| Slow query log | `LOG_SLOW_MS` + `lib/monitoring.js` / `lib/db.js` |

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

## Caps de referência (após B-2800)

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

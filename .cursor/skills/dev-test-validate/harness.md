# DTOV harness — Postgres temporário para /dev-test-validate

## O que é

Banco **efêmero** em Docker (`test/dtov/docker-compose.dtov.yml`): Postgres porta **55432** (`enneagram_dtov`) + Redis porta **56379** (`REDIS_URL` / prefixo `team30_dtov` exportados pelo harness).

- **Início do pipeline:** `npm run dtov:reset` (down -v → up → migrate → seed → smoke)
- **Durante as rounds:** o volume persiste (Test → Dev → Test reusa os dados)
- **Fim do pipeline:** `npm run dtov:down` (apaga volume), salvo `DTOV_KEEP=1`

Nunca aponta para o Postgres de dev/prod: o harness exige `DTOV=1` + host/port/db/user fixos.

Código de prova vive em **`test/`** (não em `scripts/`). Ver [`test/README.md`](../../../test/README.md).

## Comandos

```bash
npm run dtov:reset    # ciclo completo
npm run dtov:up
npm run dtov:migrate
npm run dtov:seed
npm run dtov:smoke
npm run dtov:down
npm run dtov:status
```

Seed com subset: `node test/dtov/harness.js seed --only=public-vacancy-page` (baseline já precisa existir).

## Regressão ampla (caça bugs)

```bash
npm run dtov:full           # reset + SQL/lib only
npm run dtov:full-app       # reset + SQL/lib + Next :3010 + HTTP + Playwright browser
DTOV_SKIP_RESET=1 npm run dtov:full-app   # reusa DTOV já seedado
DTOV_KEEP=1 npm run dtov:full-app         # não dá down no fim
DTOV_SKIP_BROWSER=1 npm run dtov:full-app # só SQL + HTTP (sem Chromium)
```

`dtov:full-app` cobre login HR/admin, dashboard tabs, APIs de vagas/candidatos/AE/export/notificações, páginas públicas (`/t` `/v` `/r` `/jobs`), health e crons (auth), **mais** navegação/layout no Chromium (`test/e2e/browser-smoke.spec.js`).

Só browser (servidor já no ar): `BASE_URL=http://127.0.0.1:3010 npm run test:browser`.

Script HTTP: `test/dtov/http-smoke.js`. Playwright: `playwright.config.js` + `test/e2e/`.

## Catálogo de fixtures

`test/dtov/fixtures/catalog.json` lista módulos:

| id | papel |
|----|--------|
| `baseline` | áreas + motivadores + seed demo “Todos os Dados” (módulos até 103) |
| `public-vacancy-page` | flags `/vaga`, site/about da empresa (feature 030) |

### Feature nova → nova massa

1. Entender o schema/API/UI que o Test precisa exercitar.
2. Criar `test/dtov/fixtures/<nome>.js` exportando `async function seed(client, ctx)`.
3. Registrar em `catalog.json` com `dependsOn`, `covers`, e `smoke[]` (SQL `SELECT 1 … LIMIT 1`).
4. Preferir **UPDATE/INSERT** em cima do baseline a reescrever o demo inteiro.
5. Rodar `npm run dtov:reset` e confirmar smokes verdes antes do Test de produto.

## Segurança

- Credenciais só locais (`dtov` / `dtov_local_only`).
- `assertDtovTarget` aborta se host/porta/db não forem os do DTOV.
- Não usar este harness contra RDS.

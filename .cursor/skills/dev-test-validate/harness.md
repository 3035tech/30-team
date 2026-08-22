# DTOV harness — Postgres temporário para /dev-test-validate

## O que é

Banco **efêmero** em Docker (`docker-compose.dtov.yml`), porta **55432**, DB `enneagram_dtov`.

- **Início do pipeline:** `npm run dtov:reset` (down -v → up → migrate → seed → smoke)
- **Durante as rounds:** o volume persiste (Test → Dev → Test reusa os dados)
- **Fim do pipeline:** `npm run dtov:down` (apaga volume), salvo `DTOV_KEEP=1`

Nunca aponta para o Postgres de dev/prod: o harness exige `DTOV=1` + host/port/db/user fixos.

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

Seed com subset: `node scripts/dtov/harness.js seed --only=public-vacancy-page` (baseline já precisa existir).

## Regressão ampla (caça bugs)

```bash
npm run dtov:full           # reset + full-regression.js
DTOV=1 npm run test:full    # só a suíte no DTOV já seedado
npm run test:full:offline   # libs sem banco
```

Script: `scripts/dtov/full-regression.js` — SQL no tenant demo + smokes de lib (ACL, sanitize, JobPosting, scoring).

## Catálogo de fixtures

`scripts/dtov/fixtures/catalog.json` lista módulos:

| id | papel |
|----|--------|
| `baseline` | áreas + motivadores + seed demo “Todos os Dados” |
| `public-vacancy-page` | flags `/vaga`, site/about da empresa (feature 030) |

### Feature nova → nova massa

1. Entender o schema/API/UI que o Test precisa exercitar.
2. Criar `scripts/dtov/fixtures/<nome>.js` exportando `async function seed(client, ctx)`.
3. Registrar em `catalog.json` com `dependsOn`, `covers`, e `smoke[]` (SQL `SELECT 1 … LIMIT 1`).
4. Preferir **UPDATE/INSERT** em cima do baseline a reescrever o demo inteiro.
5. Rodar `npm run dtov:reset` e confirmar smokes verdes antes do Test de produto.

## Segurança

- Credenciais só locais (`dtov` / `dtov_local_only`).
- `assertDtovTarget` aborta se host/porta/db não forem os do DTOV.
- Não usar este harness contra RDS.

# Database SQL layout

| Location | Purpose |
| --- | --- |
| `migrations/*.sql` | Canonical numbered schema changes (`scripts/migrate.js`) |
| `scripts/rds-bootstrap-completo.sql` | Full bootstrap for a new Postgres |
| `scripts/scripts-banco-pendentes.sql` | Operator bundle for pgAdmin (pending deltas) |
| `scripts/seed-*.sql` | Seed / one-off data scripts |
| `init.sql` (repo root) | Docker `docker-entrypoint-initdb.d` stub only — keep empty |

Do not leave ad-hoc `.sql` files at the repo root.

## Idempotência (obrigatório)

Arquivos em `migrations/` devem poder ser reexecutados no pgAdmin sem erro de “already exists”:

| DDL | Como |
|-----|------|
| Tabela | `CREATE TABLE IF NOT EXISTS` |
| Índice | `CREATE INDEX IF NOT EXISTS` / `CREATE UNIQUE INDEX IF NOT EXISTS` |
| Coluna | `ADD COLUMN IF NOT EXISTS` |
| Constraint CHECK/UNIQUE nomeada | `DROP CONSTRAINT IF EXISTS …` e em seguida `ADD CONSTRAINT` (Postgres não tem `ADD CONSTRAINT IF NOT EXISTS`) |
| Índice em tabela/coluna que pode não existir ainda | criar só se tabela e colunas existirem (ver `061_performance_indexes.sql`) |

Não referenciar coluna de outro padrão (`deleted` vs `active`) sem ela existir na tabela.

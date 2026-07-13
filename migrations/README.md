# Database SQL layout

| Location | Purpose |
| --- | --- |
| `migrations/*.sql` | Canonical numbered schema changes (`scripts/migrate.js`) |
| `scripts/rds-bootstrap-completo.sql` | Full bootstrap for a new Postgres |
| `scripts/scripts-banco-pendentes.sql` | Operator bundle for pgAdmin (pending deltas) |
| `scripts/seed-*.sql` | Seed / one-off data scripts |
| `init.sql` (repo root) | Docker `docker-entrypoint-initdb.d` stub only — keep empty |

Do not leave ad-hoc `.sql` files at the repo root.

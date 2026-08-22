---
name: dev-test-validate
description: >-
  Orchestrates a bounded Dev → Test → (fix) → Final validation loop after
  feature or bugfix work, with an ephemeral local Postgres (DTOV) seeded for
  integration proofs. Also supports optional full regression (`dtov:full` /
  `test:full`) when the user asks for a broad bug hunt across the demo tenant.
  Use when the user asks for "dev-test-validate", "pipeline de testes",
  "roda o pipeline", "validate after changes", "teste geral", "regressão",
  or a develop/test/fix cycle with a hard round limit (never infinite).
---

# Dev → Test → Validate (bounded)

Parent agent owns the loop. Subagents do one job each. **Never** run without a round cap.

## Defaults

| Knob | Default | Override |
|------|---------|----------|
| `max_rounds` | **3** | User may set 1–5 only |
| Same failure ×2 | **stop** | No silent retry |
| Scope expand | **forbidden** in fix rounds | Ask user |
| DTOV DB | **on** when change touches SQL/API/lib data | Skip only for pure UI/copy/docs with no DB proof |

## Ephemeral DB (DTOV)

Before the first **Test** round that needs data, boot the harness:

```bash
npm run dtov:reset
```

Details: [harness.md](harness.md) · compose: `docker-compose.dtov.yml` · fixtures: `scripts/dtov/fixtures/`.

| Moment | Action |
|--------|--------|
| Pipeline start (DB-touching) | `dtov:reset` — wipe volume, migrate, seed catalog, SQL smoke |
| Between rounds | **Keep** container/volume (state persists for re-test) |
| Pipeline end | `dtov:down` unless user set `DTOV_KEEP=1` |
| Docker missing / port busy | Test → **`blocked`** (do not invent a remote DB) |

**Safety:** harness only accepts `127.0.0.1:55432` / `enneagram_dtov` / user `dtov`. Never point it at RDS or the normal `.env` Postgres.

### New feature → new fixture mass

If acceptance needs rows the catalog does not cover:

1. Map schema + happy-path queries the Test will run.
2. Add `scripts/dtov/fixtures/<feature>.js` with `export async function seed(client, ctx)`.
3. Register in `scripts/dtov/fixtures/catalog.json` (`dependsOn`, `covers`, `smoke`).
4. Prefer enriching **baseline** (demo Todos os Dados) over a second full tenant.
5. Re-run `npm run dtov:reset` until fixture smokes pass, then continue product Test.

Dev may create the fixture file in the **same** fix round when Test reports `blocked: missing fixture for …`. That is not scope expand — it is test infrastructure.

## Roles

### 0. Harness (parent or `shell` subagent)

- Run `dtov:reset` when gates need DB.
- On failure → **blocked** with Docker/port/migration hint.
- Export/print DTOV env so Test subprocesses use the ephemeral DB.

### 1. Dev (`generalPurpose` or main thread)

- Implement or fix **only** what acceptance / test report requires.
- Prefer existing patterns (`AGENTS.md`, reuse-before-create).
- Do not start new features mid-loop.
- May add/adjust DTOV fixtures when Test is blocked on missing mass.

### 2. Test (read-only intent on **product** code; may run commands)

- Prefer proofs against DTOV when SQL/API involved (see [gates.md](gates.md)).
- Run the **smallest** proof set for the change.
- Output exactly one status: `pass` | `fail` | `blocked`.
- On `fail`: actionable list (command, exit, file/error). **No product edits.**
- On `blocked`: missing env/migration/Docker/fixture — stop loop, report.
- May run `dtov:smoke` / SQL against DTOV; must not rewrite fixtures unless asked to unblock via Dev.

### 3. Final validation (after Test `pass`)

- One pass only: scope creep, security/tenant, public-token invariant, leftover TODOs, fixture catalog still coherent.
- Prefer `code-reviewer` / Bugbot / Security Review when user asked for review depth.
- **Do not** reopen feature work; file follow-ups as bullets.

## Loop (mandatory)

```
round = 0
Dev (initial or resume from user)
Harness: dtov:reset if DB proofs needed (once per pipeline; skip if already up for this run)
while true:
  round += 1
  if round > max_rounds:
    STOP → report "max_rounds exceeded" + last Test fail
    teardown dtov unless DTOV_KEEP=1
  Test  (use DTOV env when applicable)
  if pass → Final validation → teardown dtov → STOP done
  if blocked → teardown optional → STOP blocked
  if fail:
    fingerprint = normalize(primary error)
    if fingerprint == previous_fingerprint:
      STOP → "same failure twice, no progress"
    previous_fingerprint = fingerprint
    if round == max_rounds:
      STOP → hand last fail to user
    Dev (fix only from Test report; fixture OK if blocked-on-mass) → continue
```

## Stop conditions (hard)

Stop immediately when any is true:

1. Test `pass` and Final validation finished  
2. `round > max_rounds`  
3. Same failure fingerprint twice in a row  
4. Test asks for out-of-scope / product redesign  
5. Tool/env blocked (Docker down, migration not applied, no secrets, DTOV unsafe target)  
6. User says stop  

**Never** use `/loop` or timers to retry this pipeline.

Always attempt `dtov:down` on stop (except `DTOV_KEEP=1`).

## Subagent prompts (compact)

**Harness prompt:** “reset DTOV via npm run dtov:reset; on docker failure STATUS blocked; no product edits”.

**Test prompt must include:** acceptance criteria, files touched, commands to prefer, “edit product code: no”, “use DTOV env for DB proofs”, “edit code: no”.

**Dev fix prompt must include:** Test report verbatim, “only fix listed failures”, “do not expand scope” (fixture mass for listed gap is allowed).

**Final prompt must include:** diff summary, “no new features”, checklist from [gates.md](gates.md) § Final.

## Report to user (end state)

```markdown
## Pipeline result: done | failed | blocked

- rounds used: N / max_rounds
- DTOV: reset | skipped | blocked | kept
- Test: pass | fail | blocked
- Final: ok | issues (bullets)
- Next (only if failed/blocked): …
```

## Full regression (optional — bug hunt)

When the user asks for **teste geral**, **regressão completa**, **full regression**, or “caça bug passado”:

```bash
npm run dtov:full          # reset DTOV + suíte ampla
# ou, DB já seedado:
DTOV=1 npm run test:full
npm run test:full:offline  # só libs, sem Postgres
```

This is **not** the default focused Test gate. It runs SQL integrity across the demo tenant (users, pipeline, AE, 1:1, /vaga, tokens) plus offline lib checks. Still not a browser E2E of every screen.

## Anti-patterns

- Infinite or uncapped retries  
- Test agent rewriting product code  
- Dev ignoring Test report and “cleaning up” unrelated files  
- Final validation starting a new rewrite  
- Re-running full suite when a focused gate failed for a clear reason  
- Seeding or migrating the **developer** Postgres from this pipeline  
- Skipping `dtov:down` and leaving an orphaned container without telling the user  

## 30Team

Default gates and invariants: [gates.md](gates.md).  
Harness detail: [harness.md](harness.md).

---
name: dev-test-validate
description: >-
  Orchestrates a bounded Dev → Test → (fix) → Final validation loop after
  feature or bugfix work. Use when the user asks for "dev-test-validate",
  "pipeline de testes", "roda o pipeline", "validate after changes", or a
  develop/test/fix cycle with a hard round limit (never infinite).
---

# Dev → Test → Validate (bounded)

Parent agent owns the loop. Subagents do one job each. **Never** run without a round cap.

## Defaults

| Knob | Default | Override |
|------|---------|----------|
| `max_rounds` | **3** | User may set 1–5 only |
| Same failure ×2 | **stop** | No silent retry |
| Scope expand | **forbidden** in fix rounds | Ask user |

## Roles

### 1. Dev (`generalPurpose` or main thread)
- Implement or fix **only** what acceptance / test report requires.
- Prefer existing patterns (`AGENTS.md`, reuse-before-create).
- Do not start new features mid-loop.

### 2. Test (read-only intent; may run commands)
- Run the **smallest** proof set for the change (see [gates.md](gates.md) for 30Team).
- Output exactly one status: `pass` | `fail` | `blocked`.
- On `fail`: actionable list (command, exit, file/error). **No product edits.**
- On `blocked`: missing env/migration/tool — stop loop, report.

### 3. Final validation (after Test `pass`)
- One pass only: scope creep, security/tenant, public-token invariant, leftover TODOs.
- Prefer `code-reviewer` / Bugbot / Security Review when user asked for review depth.
- **Do not** reopen feature work; file follow-ups as bullets.

## Loop (mandatory)

```
round = 0
Dev (initial or resume from user)
while true:
  round += 1
  if round > max_rounds:
    STOP → report "max_rounds exceeded" + last Test fail
  Test
  if pass → Final validation → STOP done
  if blocked → STOP blocked
  if fail:
    fingerprint = normalize(primary error)
    if fingerprint == previous_fingerprint:
      STOP → "same failure twice, no progress"
    previous_fingerprint = fingerprint
    if round == max_rounds:
      STOP → hand last fail to user
    Dev (fix only from Test report) → continue
```

## Stop conditions (hard)

Stop immediately when any is true:

1. Test `pass` and Final validation finished  
2. `round > max_rounds`  
3. Same failure fingerprint twice in a row  
4. Test asks for out-of-scope / product redesign  
5. Tool/env blocked (DB down, migration not applied, no secrets)  
6. User says stop  

**Never** use `/loop` or timers to retry this pipeline.

## Subagent prompts (compact)

**Test prompt must include:** acceptance criteria, files touched, commands to prefer, “edit code: no”.

**Dev fix prompt must include:** Test report verbatim, “only fix listed failures”, “do not expand scope”.

**Final prompt must include:** diff summary, “no new features”, checklist from [gates.md](gates.md) § Final.

## Report to user (end state)

```markdown
## Pipeline result: done | failed | blocked

- rounds used: N / max_rounds
- Test: pass | fail | blocked
- Final: ok | issues (bullets)
- Next (only if failed/blocked): …
```

## Anti-patterns

- Infinite or uncapped retries  
- Test agent rewriting product code  
- Dev ignoring Test report and “cleaning up” unrelated files  
- Final validation starting a new rewrite  
- Re-running full suite when a focused gate failed for a clear reason  

## 30Team

Default gates and invariants: [gates.md](gates.md).

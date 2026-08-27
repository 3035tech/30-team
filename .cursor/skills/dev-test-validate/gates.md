# 30Team — gates for dev-test-validate

Use the **smallest** set that covers the change. Skip gates that cannot apply.

## DTOV (when SQL / API / lib data / public pages need proof)

1. `npm run dtov:reset` once per pipeline (or `dtov:status` green + already seeded this run).
2. All DB commands must inherit DTOV env (`POSTGRES_HOST=127.0.0.1`, port `55432`, DB `enneagram_dtov`, `DTOV=1`).
3. `npm run dtov:smoke` (or harness smoke) green before claiming integration pass.
4. New feature without rows → add fixture under `test/dtov/fixtures/` + `catalog.json` (see [harness.md](harness.md)); Test `blocked` until mass exists.
5. Tear down: `npm run dtov:down` at end unless `DTOV_KEEP=1`.
6. Docker missing / compose fail → **`blocked`**, not fail-loop.

## Always (any dashboard/API change)

1. `node --input-type=module` smoke for touched `lib/*.js` if pure logic (e.g. `permissions.js`).
2. Grep regressions:
   - no `window.confirm` / `alert` / `prompt` in `app/`
   - no new hardcoded UI strings without `lib/i18n.js` pt-BR **and** en (if UI touched)
3. If auth/ACL touched: public token paths must **not** import `CAP` / `requireCapability`
   (`app/api/public`, `app/api/ae`, pages `/t` `/v` `/r` `/assessment` `/jobs`).

## Permissions / users (etapas ACL)

1. Migration `026_user_capability_overrides.sql` present; remind to run migrate (DTOV `dtov:migrate` covers this on reset).
2. Smoke (prefer SQL against DTOV users from baseline demo):
   - role defaults: hr has vacancies, not users.manage
   - customized whitelist: missing overview.view → denied; vacancies.view implies manage
   - non-admin never gets ADMIN_ONLY_CAPS
3. Admin routes use `verifySessionWithCapabilities` or `await getSessionPayload()` (not bare `verifyToken` alone).

## SQL / migrations

1. New migration numbered; mirrored in `scripts/scripts-banco-pendentes.sql` when that bundle is used.
2. Parametrized SQL; tenant `company_id` on multi-tenant reads/writes.
3. No N+1 in new list endpoints (batch/`ANY`).
4. If migration adds columns used by public/demo flows, extend a DTOV fixture (or baseline) so smoke covers them.

## UI

1. Empty / loading / error covered if new surface.
2. Reused feedback components (`useAppFeedback`), not browser dialogs.

## Public vacancy pages (`/jobs`)

1. Fixture `public-vacancy-page` seeded (open indexed + closed public).
2. Closed path: thanks + link to other open public vacancies (no JobPosting index).
3. Flags gate company/salary; apply CTA uses `/v/{token}` without CAP.

## Final validation checklist

- [ ] Acceptance criteria met; no drive-by refactors
- [ ] Public assessment links invariant held
- [ ] Tenant isolation not weakened
- [ ] i18n both locales if copy added
- [ ] **README / `docs/` / `test/README.md`** updated for new setup, URLs, or ops
- [ ] **Guia do painel** (`HelpTab` + `panel.help.*` pt-BR+en) updated for new manager-facing flows
- [ ] Migrations/docs noted for operator if schema changed
- [ ] DTOV catalog updated if new durable data shape was introduced
- [ ] DTOV torn down (or user informed if kept)

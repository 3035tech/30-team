# 30Team — gates for dev-test-validate

Use the **smallest** set that covers the change. Skip gates that cannot apply.

## Always (any dashboard/API change)

1. `node --input-type=module` smoke for touched `lib/*.js` if pure logic (e.g. `permissions.js`).
2. Grep regressions:
   - no `window.confirm` / `alert` / `prompt` in `app/`
   - no new hardcoded UI strings without `lib/i18n.js` pt-BR **and** en (if UI touched)
3. If auth/ACL touched: public token paths must **not** import `CAP` / `requireCapability`
   (`app/api/public`, `app/api/ae`, pages `/t` `/v` `/r` `/assessment`).

## Permissions / users (etapas ACL)

1. Migration `026_user_capability_overrides.sql` present; remind to run `npm run db:migrate` if table missing (`42P01` → `blocked`, not fail-loop).
2. Smoke:
   - role defaults: hr has vacancies, not users.manage
   - customized whitelist: missing overview.view → denied; vacancies.view implies manage
   - non-admin never gets ADMIN_ONLY_CAPS
3. Admin routes use `verifySessionWithCapabilities` or `await getSessionPayload()` (not bare `verifyToken` alone).

## SQL / migrations

1. New migration numbered; mirrored in `scripts/scripts-banco-pendentes.sql` when that bundle is used.
2. Parametrized SQL; tenant `company_id` on multi-tenant reads/writes.
3. No N+1 in new list endpoints (batch/`ANY`).

## UI

1. Empty / loading / error covered if new surface.
2. Reused feedback components (`useAppFeedback`), not browser dialogs.

## Final validation checklist

- [ ] Acceptance criteria met; no drive-by refactors
- [ ] Public assessment links invariant held
- [ ] Tenant isolation not weakened
- [ ] i18n both locales if copy added
- [ ] Migrations/docs noted for operator if schema changed

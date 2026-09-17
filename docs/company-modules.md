# Company module entitlements

Commercial packs above per-user CAP. Early-adopter onboarding can pick modules; legacy tenants keep all.

## Defaults

| Stored value | Meaning |
|---|---|
| `companies.enabled_modules` **NULL** | All modules (legacy / skip wizard / all checkboxes) |
| Non-null text[] | Allow-list; `core` always implied in app |

## Who edits

| Who | Where |
|---|---|
| Early access / self-service manager | Onboarding wizard · **Meu perfil** (`GET/PUT /api/me/company-modules`) |
| Super-admin | Empresas → editar/criar → Módulos comerciais (`GET/PUT /api/admin/company-modules`) |

## Rules

- Manager CAP ∩ company modules (session + `can` / tab gate).
- Module off → hide UI surfaces; employee home/nav hide sections. No upsell chips in menus. Dedicated employee APIs stay reachable by URL if known.
- Public assessment tokens stay valid regardless of module.
- Admin-only tabs (`users`, `companies`, …) stay available.
- Compensation stays under **core**.
- Checkboxes grouped visually (core / people / hire / ops); storage keys stay flat.

## Keys

See `COMPANY_MODULE` in `lib/company-modules.js`.

Schema: `migrations/109_company_module_entitlements.sql`.

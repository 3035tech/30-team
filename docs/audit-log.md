# Audit log (operacional)

Trilha **append-only** de ações sensíveis no painel e autenticação.

## Quem vê

- Aba **Auditoria** no menu Conta — **somente super admin** (`role = admin` sem `company_id` fixa), mesmo critério da aba Leads.
- API: `GET /api/admin/audit-log` (paginada, filtros).

## Schema

Tabela `audit_log` (migration `075_audit_log_enrich.sql`):

| Campo | Uso |
|-------|-----|
| `actor_user_id` | Gestor |
| `actor_candidate_id` | Colaborador |
| `actor_kind` | `manager` \| `employee` \| `system` \| `public` |
| `company_id` | Tenant quando aplicável |
| `action` | Ex. `auth.login`, `vacancy.update` |
| `target_type`, `target_id` | Entidade afetada |
| `request_path`, `request_ip` | Onde (API) |
| `metadata` | JSON (sem senhas/tokens) |

## Gravar eventos

```js
import { audit, auditFromRequest, AUDIT_ACTOR_KIND } from '../lib/audit.js';

await auditFromRequest(request, {
  actorUserId: userId,
  actorKind: AUDIT_ACTOR_KIND.MANAGER,
  companyId,
  action: 'vacancy.update',
  targetType: 'vacancy',
  targetId: vacancyId,
  metadata: { title: '…' },
});
```

Best-effort: falha no insert **não** quebra o fluxo principal.

## Cobertura

Dezenas de rotas admin já chamam `audit()`. Novas rotas sensíveis devem usar `auditFromRequest` quando houver `Request` disponível.

Retenção: sem purge automático hoje — definir política ops (ex. 12–24 meses) se o volume crescer.

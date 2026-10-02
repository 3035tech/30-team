# Audit log (operacional)

Trilha **append-only** de ações sensíveis no painel e autenticação.

## Quem vê

- Aba **Auditoria** no menu Conta — **somente super admin** (`role = admin` sem `company_id` fixa), mesmo critério da aba Leads.
- Filtro **Empresa** por nome (lista das empresas; alinha ao filtro do painel / sticky). Não digite id numérico.
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

## Alterações cadastrais (diferença por campo, LGPD)

`metadata.changes` = lista `[{ field, from?, to? }]` montada por `diffAuditFields` (`lib/audit-changes.js`), só com os campos que mudaram:

| Ação | Onde | Campos com `from`/`to` | Campos só “alterado” (sem valor) |
|------|------|------------------------|----------------------------------|
| `candidate.profile_update` | `PATCH /api/admin/candidates/[id]` | nome, e-mail corporativo, matrícula, forma de contratação, ponto por colaborador | e-mail pessoal, estado civil, histórico, notas de RH, telefone, LinkedIn, cidade/UF, pretensão, disponibilidade, origem, nascimento, admissão |
| `dp.profile.updated` | gestor (`/dp` e ficha) **e** colaborador (`/api/employee/dp`, `/api/mobile/v1/employee/dp`, `actor_kind = employee`) | nenhum | CPF, RG, dependentes, endereço, contato de emergência, notas internas |
| `user.update` | Usuários | e-mail, função, ativo, empresa, módulos | senha |

Minimização (LGPD): dado pessoal nunca vai para a auditoria; só o nome do campo. CPF, CEP e telefones são comparados por dígitos (reformatação não conta como mudança). O diff usa a leitura anterior já feita na transação (`FOR UPDATE` na ficha; leitura por PK no DP), sem consulta por campo. A aba Auditoria mostra “campo: antes → depois” ou “alterado (valor não registrado)”.

Retenção: sem purge automático hoje — definir política ops (ex. 12–24 meses) se o volume crescer.

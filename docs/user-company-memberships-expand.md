# Employer multiempresa: fase expand

A migration `115_user_company_memberships.sql` adiciona a base reversível para uma identidade gestora atuar em mais de uma empresa.

## Escopo desta fase

- cria `user_company_memberships`;
- preserva role, active e deleted no backfill inicial;
- permite roles diferentes por empresa;
- adiciona índices para lookup por usuário e por empresa;
- não muda login, JWT, autorização, APIs ou dashboard;
- mantém `users.company_id` e `users.role` como fonte de verdade.

Super admins sem `company_id` não recebem membership no backfill. Isso preserva o comportamento global atual.

## Aplicação

```bash
npm run db:migrate
```

A migration é idempotente. O backfill usa `ON CONFLICT DO NOTHING` para que uma repetição futura não sobrescreva estado mais novo do membership.

## Verificação

```bash
npm run dtov:reset
DTOV=1 node --test test/unit/user-company-memberships.unit.test.js
DTOV=1 node test/dtov/user-company-memberships.dtov.test.js
npm run dtov:down
```

O teste comprova paridade com usuários legados, ausência de duplicidade, segundo membership com role diferente, repetição segura do backfill e preservação das colunas atuais.

## Rollback

Enquanto nenhum writer novo usar a tabela, o rollback é:

```sql
DROP TABLE IF EXISTS user_company_memberships;
DELETE FROM schema_migrations
WHERE name = '115_user_company_memberships.sql';
```

Executar somente após confirmar que nenhum endpoint ou job passou a gravar memberships. Depois que dual-write começar, não remover a tabela; desativar os novos readers/writers e preservar os dados para reconciliação.

## Próxima fase, não incluída

A etapa seguinte introduzirá serviços de domínio e dual-write controlado. Alterações de sessão, seleção/troca de empresa e eventual remoção de colunas legadas exigem gates separados.

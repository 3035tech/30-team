# Runbook de release

Procedimento mínimo para homologação e produção. O schema canônico vive em `migrations/`; o bootstrap cria a base histórica e **não substitui** `npm run db:migrate`.

Operação, alertas, restore, SMTP e S3: `docs/pilot-operations-runbook.md`.

## Antes do deploy

1. Confirmar backup recente e restaurável do PostgreSQL.
2. Registrar a imagem/tag atualmente em produção para rollback.
3. Rodar build e provas focadas do PR.
4. Em banco novo: aplicar `scripts/rds-bootstrap-completo.sql`.
5. Aplicar todas as migrations com `npm run db:migrate`.
6. Executar `npm run db:validate-schema` contra o mesmo banco.
7. Executar `npm run ops:pilot-preflight -- --write-storage` em homologação.

O validador é somente leitura. Ele falha se alguma migration canônica não estiver registrada ou se faltar tabela/coluna essencial dos fluxos de empresa, usuário, pessoa, vaga, avaliação, funil ou LMS.

## Deploy

1. Aplicar migrations compatíveis antes de subir a nova imagem.
2. Subir a imagem de forma gradual, mantendo ao menos uma instância saudável.
3. Verificar `/api/health`, login e o smoke da jornada principal.
4. Observar erros 5xx, queries lentas e espera no pool PostgreSQL.

## Rollback

1. Reimplantar a tag anterior da aplicação.
2. Não remover colunas/tabelas automaticamente: migrations do 30Team são expansivas e a versão anterior deve tolerar campos adicionais.
3. Restaurar backup apenas diante de corrupção/perda confirmada e com janela de manutenção aprovada.
4. Registrar causa, intervalo afetado e migrations aplicadas.

## pgAdmin

Quando o ambiente exigir execução manual, usar `scripts/scripts-banco-pendentes.sql`, conferir a transação e depois executar `npm run db:validate-schema` de um host autorizado. Scripts `rh2-*-pgadmin.sql` são cortes históricos e não substituem o bundle atual.

## Prova local segura

```bash
npm run dtov:reset
env POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55432 POSTGRES_DB=enneagram_dtov \
  POSTGRES_USER=dtov POSTGRES_PASSWORD=dtov_local_only POSTGRES_SSL=false \
  npm run db:validate-schema
npm run dtov:down
```

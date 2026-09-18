# Operação do piloto

Runbook enxuto para o primeiro cliente. Não depende de Sentry; use o provedor de logs e alertas disponível no ambiente. Sentry permanece fora desta versão.

## Resposta e alertas

| Evento | Nível | Resposta | Evidência mínima |
|---|---:|---:|---|
| Login, avaliação ou dashboard indisponível | P0 | 15 min | horário, rota, request id, release |
| 5xx acima de 2% por 5 min | P0 | 15 min | rota, contagem, release |
| PostgreSQL indisponível/pool saturado | P0 | 15 min | conexões, espera, query lenta |
| Falha SMTP, S3 ou cron | P1 | 1 h | código sanitizado, tentativa, tenant |
| Erro isolado com contorno | P2 | dia útil | passos e usuário afetado |

Nunca copiar token, cookie, senha, documento, resposta de avaliação ou texto de ouvidoria para ticket/log.

## Preflight de homologação

```bash
npm run db:validate-schema
npm run ops:pilot-preflight -- --write-storage
PILOT_SMOKE_EMAIL=qa@empresa.com npm run ops:pilot-preflight -- --send-email
```

`--write-storage` cria e remove objetos opacos nos prefixos reais de logo, LMS e DP. Use `PILOT_PREFLIGHT_COMPANY_ID` com um tenant de homologação. O envio é opt-in. Conferir recebimento, spam, remetente e links; bounce é conferido no provedor SMTP.

## Backup e restore de prova

Registre frequência, retenção, criptografia, região e responsável pelo backup automático. Restaure mensalmente em banco isolado, nunca sobre produção.

```bash
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" --file=/tmp/30team-pilot.dump
createdb 30team_restore_probe
pg_restore --no-owner --no-acl --dbname=30team_restore_probe /tmp/30team-pilot.dump
DATABASE_URL=postgresql://.../30team_restore_probe npm run db:validate-schema
dropdb 30team_restore_probe
```

Registre data, duração, tamanho, migration máxima e resultado, sem credenciais. Após deploy: `/api/health`, login, vaga pública, pipeline e preflight sem envio. Rollback volta a tag anterior; não reverta migration destrutivamente. Restore só diante de perda/corrupção confirmada.

## Reset seguro de acesso

1. Confirmar identidade pelo canal acordado.
2. Revogar sessões (`session_version`) antes do novo acesso.
3. Usar redefinição; nunca comunicar senha em texto.
4. Auditar ator, empresa, horário e motivo, sem token/senha.


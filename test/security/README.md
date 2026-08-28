# Security tests (manual / CI optional)

Complemento ao DTOV (`test/dtov/http-smoke.js`) para varredura externa.

## OWASP ZAP baseline

Requer Docker e app no ar (staging recomendado — **não** aponte para produção sem aviso).

```bash
BASE_URL=https://staging.team.example.com ./scripts/security-zap-baseline.sh
```

Saída: `test/security/zap-report.html` (HTML local).

O script usa `-I` (não falha o CI por alertas médios/baixos); revise o relatório manualmente.

## O que o DTOV já cobre

| Área | Prova |
|------|--------|
| Sessão revogada | `auth/notifications-revoked`, `auth/dashboard-revoked-middleware` |
| Health tokens | `health/status-authed`, `health/status-query-rejected` |
| Signup + set-password | bloco `signup/*` em `http-smoke.js` |
| Colaborador | `employee/login`, `employee/home` |
| Remuneração interna | `compensation/*` |
| Sanitizer HTML | `full-regression.js` → `lib/sanitize-html` |

Detalhe das mudanças: `docs/security-hardening-2026-08.md`.

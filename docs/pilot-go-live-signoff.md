# Aceite de go-live do piloto

Registro único para fechar o primeiro cliente. Não marque uma evidência externa sem executá-la no ambiente de homologação ou produção correspondente.

| Gate | Evidência | Responsável | Data | Resultado |
|---|---|---|---|---|
| Código, schema, SEO e conteúdo | `npm run release:pilot-check` | Engenharia |  |  |
| Tenant A × tenant B + jornada visual | `npm run release:pilot-check -- --full` | Engenharia/QA |  |  |
| S3: logo, PDF LMS e documento DP | `npm run ops:pilot-preflight -- --write-storage` | Infra |  |  |
| SMTP e entrega real | `PILOT_SMOKE_EMAIL=... npm run ops:pilot-preflight -- --send-email` | Infra |  |  |
| Backup e restore isolado | procedimento em `pilot-operations-runbook.md` | Infra |  |  |
| Termos e Política de Privacidade | URL e versão aprovadas | Jurídico/DPO |  |  |
| Retenção, subprocessadores e canal do titular | checklist de privacidade aprovado | Jurídico/DPO |  |  |
| Canal e SLA do piloto | `pilot-support-runbook.md` comunicado ao cliente | Produto/Suporte |  |  |

## Critérios de parada

- Não liberar se a matriz cross-tenant falhar ou expuser existência/dados de outra empresa.
- Não liberar upload se qualquer prefixo S3 retornar `AccessDenied`.
- Não prometer e-mail operacional até confirmar recebimento, remetente e links no SMTP real.
- Não publicar texto jurídico gerado pela equipe técnica sem aprovação responsável.
- Não copiar dados pessoais ou sensíveis para este registro; use apenas ids de execução e resultado.

# Privacidade e dados sensíveis no piloto

Checklist interno. Não substitui revisão jurídica nem deve virar Termos/Política pública sem aprovação.

| Classe | Exemplos | Persistência | Acesso / tratamento |
|---|---|---|---|
| Identificação | nome, e-mail, currículo | `candidates`, S3 | tenant; corrigir/exportar; anonimizar/excluir conforme obrigação |
| Avaliações | respostas, T1–T9, Motivadores | `assessments`, `answers`, `ae_*` | tenant/link autorizado; não tratar como diagnóstico |
| Recrutamento | vaga, etapa, nota, oferta | vacancies/pipeline/offer | tenant; revogar links e reter por prazo aprovado |
| DP | documentos, licenças, ponto | `employee_*`, S3 | capabilities DP/People; prazo legal/contratual |
| Remuneração | salário, reajuste, variável | compensation tables | capability dedicada e auditoria |
| Cultura | clima, pulso, ouvidoria | climate/pulse/whistleblowing | acesso específico; preservar anonimato |
| Autenticação | hash, sessão, 2FA | users/sessões/audit | usuário/admin; nunca exportar segredo |

Objetos usam `companies/{companyId}/...` e nome opaco. Tokens são credenciais e não entram em analytics, tickets ou logs.

## Pedido do titular

1. Registrar identidade validada, empresa, escopo e prazo.
2. Localizar por `company_id` + e-mail; nunca mesclar por nome.
3. Exportar apenas dados do titular e explicar fontes/finalidades.
4. Corrigir na fonte canônica, mantendo auditoria sem conteúdo sensível.
5. Para exclusão, verificar retenção; revogar links/sessões; preferir soft delete/anonimização e remover objetos aprovados.
6. Confirmar sem anexar dados pessoais ao ticket.

## Gate humano antes do cliente

- [ ] Responsável/canal de privacidade definidos.
- [ ] Bases, finalidades, prazos e subprocessadores aprovados.
- [ ] Termos e Política públicos aprovados e coerentes com módulos.
- [ ] Exportação/correção/exclusão ensaiadas em homologação.
- [ ] Logs pesquisados por token, senha, documento, respostas e SQL params.
- [ ] Remuneração, DP e ouvidoria validados na matriz tenant.
- [ ] Retenção de backup/S3 documentada com o provedor.


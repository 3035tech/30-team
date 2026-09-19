# Política operacional de retenção e exclusão

Documento interno do 30Team para o piloto. A versão pública está em `/privacy`. Este documento orienta engenharia e operação, mas os prazos legais e contratuais precisam de aprovação do controlador e da assessoria jurídica antes do go-live.

## Princípios

1. Manter apenas o necessário para a finalidade informada.
2. Escopar toda operação por `company_id`; identificar a pessoa por empresa + e-mail, nunca apenas por nome.
3. Revogar acesso antes de remover conteúdo: sessões, convites e links públicos.
4. Preferir exclusão lógica ou anonimização quando houver dependências, histórico ou obrigação de preservação.
5. Usar exclusão física somente em rotina aprovada, limitada em lotes e com evidência de execução.
6. Nunca apagar conteúdo sujeito a litígio, investigação, auditoria ou obrigação legal ativa.

## Matriz mínima

| Classe | Enquanto ativa | Encerramento / pedido | Automação atual |
|---|---|---|---|
| Conta de gestor e vínculos | vigência do acesso | revogar sessão, desativar e aplicar soft delete após validação | revogação de sessão; soft delete |
| Candidato, candidatura e avaliação | processo seletivo + prazo aprovado pela empresa | exportar/corrigir; anonimizar ou excluir se elegível | `RETENTION_DAYS` + purge em lotes para avaliações antigas e órfãos elegíveis |
| Currículo e anexos de recrutamento | processo + prazo aprovado | remover objeto e referência após verificar vínculo | exige rotina operacional/S3 lifecycle validado |
| Colaborador e gestão | vínculo + prazo contratual/legal | restringir como alumni; excluir/anonimizar somente o que não precisa ser preservado | soft delete e escopo tenant; sem purge genérico |
| Remuneração | vínculo + prazo legal/contratual aprovado | acesso restrito; não apagar automaticamente | capability dedicada + auditoria |
| DP, ponto, férias e documentos | conforme natureza do documento e obrigação aplicável | preservar ou eliminar por classe documental aprovada | capability dedicada; S3 exige lifecycle aprovado |
| Clima e pulso | campanha + período analítico aprovado | preservar agregado; remover vínculo quando aplicável | sem purge genérico |
| Ouvidoria | prazo da investigação e preservação jurídica | acesso restrito; anonimato preservado; descarte aprovado por caso/classe | sem purge automático; texto fora de analytics |
| Auditoria e segurança | janela operacional/contratual aprovada | minimizar e expurgar conforme política do ambiente | logs estruturados; prazo depende do provedor |
| Backups | ciclo técnico do provedor | dado desaparece quando a cópia é sobrescrita | confirmar janela e restore no provedor |

## Rotina disponível

`lib/retention.js` executa exclusão física em lotes de avaliações anteriores ao corte e depois remove candidatos realmente órfãos. O tamanho e o número máximo de lotes são limitados por `RETENTION_BATCH_SIZE` e `RETENTION_MAX_BATCHES`.

Antes de executar em produção:

1. registrar empresa/escopo, responsável, base e período aprovado;
2. gerar contagem de impacto e confirmar backups;
3. executar em janela controlada com `CRON_SECRET`;
4. conferir truncamento e repetir somente se aprovado;
5. registrar totais, horário e operador sem copiar conteúdo pessoal para o ticket.

O purge existente não é uma rotina universal de eliminação. Remuneração, DP, ouvidoria, objetos S3 e backups exigem decisão específica.

## Gate antes do primeiro cliente

- Definir em contrato ou anexo os prazos por classe.
- Confirmar lifecycle de S3 e janela de backups com o provedor.
- Ensaiar exportação, correção e exclusão com dados fictícios.
- Registrar aprovação no `docs/pilot-go-live-signoff.md`.

# Backlog RH — observações dos testes (Colaborador · Gestor/Direção · RH)

Fonte canônica: `30TEAM_Backlog_Consolidado_Observacoes.docx` (testes Maria + Duda: Colaborador, Gestor/Direção, RH). **Só** essas melhorias. Não misturar com o backlog de produto genérico (`docs/BACKLOG.md`).

## Como usar

| Ação | O que fazer |
|------|-------------|
| Implementar | Agente segue o prompt + aceite; depois **remove** o item (não riscar) |
| Em andamento | Mover para “Em andamento” com branch/PR |
| Decisão de produto | Parte 2: fechar os [pontos cruzados](#pontos-cruzados) antes de codar |

**Regra geral (recorrente nos testes):** telas mais limpas; menos texto explicativo redundante; títulos autoexplicativos; hierarquia visual consistente; ação principal óbvia.

**Ordem sugerida:** (1) bugs/correções objetivas → (2) limpeza visual e nomenclaturas → (3) ciclo de vida e permissões → (4) recrutamento e acesso → (5) PDI/OKR/1:1/avaliação → (6) dashboards e IA → (7) Benefícios, Clima, Remuneração, Sucessão.

---

## Parte 1 — Ajustes objetivos (baixa complexidade aparente)

Validar dependências técnicas antes de executar. IDs: `B-RH1-*`.

_(Parte 1 concluída: B-RH1-01…20 removidos após implementação.)_

---

## Parte 2 — Análise, regra de negócio e testes

IDs: `B-RH2-*`. Decisões em [`docs/RH2-decisions.md`](./RH2-decisions.md).

_(Entregues e removidos: B-RH2-01…11, 13–14, 16–20. Diferidos documentados: 12, 15.)_

### B-RH2-12 — Pipeline configurável

**Prompt:** Incluir etapa “Encaminhado para gestão” / “Análise da gestão”. Avaliar colunas Kanban configuráveis por empresa (renomear, reordenar DnD, novas etapas).

**Aceite:** Etapas obrigatórias vs custom; impacto em relatórios/automações/permissões; migração ao alterar/excluir coluna.

**Origem:** Duda/Gestor pp.8 e 11. **Diferido:** schema + migração (ver RH2-decisions).

### B-RH2-15 — Avaliação de desempenho

**Prompt:** Ciclos com foco em competências; autoavaliação e modelos 90°/180°/360° com papéis. Área geral: criação, status, prazos, histórico. Perfil: resultados e feedbacks.

**Aceite:** Anonimato quando couber; permissões; escalas; consolidação multi-avaliador; reabertura; visualização.

**Origem:** Duda/Gestor pp.15–16. **Diferido:** ciclo formal multi-avaliador.

---

## Pontos cruzados

Fechados em [`docs/RH2-decisions.md`](./RH2-decisions.md) (ciclo de vida, perfis, fronteiras de módulos, UI, IA, auditoria).

---

## Notas

- Este markdown: Parte 1 concluída; Parte 2 entregue salvo itens diferidos (12/15). Anexos visuais ficam no `.docx`.
- Motivadores (B-RH2-20): após deploy, republicar copy com `npm run db:seed-motivators-all` (desativa chaves antigas; não apaga tentativas).
- Constantes de domínio (ondas 1–3): `lib/domain-status.js` + `ROLES` em `permissions.js`. Sem schema. B-RH2-12/15 continuam bloqueados sem aceite de produto.

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

IDs: `B-RH2-*`. Fechar [pontos cruzados](#pontos-cruzados) antes de implementar.

### B-RH2-01 — Redesenhar home do colaborador

**Prompt:** Home como painel compacto: mural/comunicados, aniversários/datas em calendário, checklist lateral só com pendências reais. Concluídos fora da área principal; resto em seções secundárias.

**Aceite:** Responsividade; prioridade da info; estados vazio/concluído/pendente; menos rolagem sem esconder ações importantes.

**Origem:** Duda/Colaborador pp.1 e 3.

### B-RH2-02 — Redesenhar Visão Geral (gestor/RH)

**Prompt:** Painel de decisão. “Atenção agora” mais acionável (calendário/tags clicáveis). Eneagrama e Motivadores comparáveis. Aniversários (pessoal + empresa) em calendário. “Recrutamento Funil” → “Vagas em aberto” com cards e resumo de etapas.

**Aceite:** Clareza no 1º acesso; densidade por viewport; navegação a partir de alertas; consistência individual × agregado.

**Origem:** Duda/Gestor pp.1–4.

### B-RH2-03 — “Sinais operacionais” e risco

**Prompt:** Reavaliar retenção/rotatividade. Score não pode parecer “verdade” sobre intenção de sair nem fazer gestor ignorar baixo risco. Se mantido: sinal auxiliar com contexto e fatores observáveis.

**Aceite:** Metodologia, frescor dos dados, explicabilidade, vieses de uso; orienta conversa, não substitui.

**Origem:** Duda/Gestor pp.3–4 e p.11.

### B-RH2-04 — Fronteira PDI · OKRs · 1:1 · feedbacks

**Prompt:** Mapear e documentar função de cada módulo antes de mudar UI. Evitar sobreposição. PDI = desenvolvimento individual; OKRs = objetivos mais amplos; 1:1 = combinados/acompanhamento; feedbacks = histórico.

**Aceite:** Fluxo ponta a ponta com exemplos, permissões, estados e vínculos **antes** da implementação visual.

**Origem:** Duda/Colaborador pp.1–2; Duda/Gestor pp.12 e 16.

### B-RH2-05 — Permissões integração 30/60/90

**Prompt:** Colaborador acompanha datas, reuniões e andamento, mas **não** conclui sozinho checkpoints D30/D60/D90. Definir quem valida (gestor/RH) e como registrar conclusão.

**Aceite:** Permissões por perfil; notificações; reabertura; ausência do gestor; histórico de quem concluiu.

**Origem:** Duda/Colaborador p.1.

### B-RH2-06 — Inclusão e acesso de colaboradores (fora do funil)

**Prompt:** Fluxo independente do recrutamento para cadastrar colaborador e dar acesso. Sem exigir vaga/testes. Explicitar quando o convite sai e o que RH vs colaborador preenche.

**Aceite:** Criação manual; importação futura; convite/reenvio; edição de e-mail; permissões; vínculo com histórico de candidato se existir.

**Origem:** Duda/Colaborador p.3; Duda/Gestor p.13; Maria p.2.

### B-RH2-07 — Perfil da pessoa e dados cadastrais

**Prompt:** Separar cadastro, gestão, estilo/comportamento, histórico, remuneração, jornada e descanso. Renomear “DP” → “Informações cadastrais” (ou equivalente). Área de “Descanso remunerado” para formatos de vínculo. Motivadores em “Estilo”.

**Aceite:** Campos obrigatórios; permissões view/edit; histórico de alterações; CLT/estágio/cooperado/PJ.

**Origem:** Duda/Gestor pp.12–13.

### B-RH2-08 — Dossiê, HR Score e leitura assistida

**Prompt:** Reavaliar Dossiê. Explicar ou remover HR Score se a função não for clara. Clima organizacional no dossiê individual? Preservar leitura assistida com menos jargão.

**Aceite:** Propósito de cada indicador; origem; privacidade; risco de inferência indevida; utilidade para gestor/RH.

**Origem:** Duda/Gestor pp.12–13.

### B-RH2-09 — “Preparar conversa” (IA)

**Prompt:** Redesign da saída: poucas orientações acionáveis ligadas aos dados reais; útil para 1:1. Blocos atuais (“Convergências”, “Como liderar”, “Pontos para validar”) não estão entregando.

**Aceite:** Qualidade com combinações T1–T9/Motivadores; sem repetição; cada recomendação usável na conversa.

**Origem:** Maria p.3.

### B-RH2-10 — Preparação do colaborador para 1:1

**Prompt:** Clarificar “Preparar o próximo 1:1” / “Atualizar preparação”: o que muda após envio, visibilidade gestor×colaborador, quando fica concluída e como aparece na reunião.

**Aceite:** Estados antes/depois; edição; visibilidade; histórico; feedback visual após salvar.

**Origem:** Duda/Colaborador p.2.

### B-RH2-11 — Recrutamento e disparo de testes

**Prompt:** Candidatura começa na página pública + dados iniciais. Após triagem, RH/gestor escolhe quem recebe Eneagrama/Motivadores. Remover atalho que manda direto ao teste antes da inscrição. Reavaliar prep de entrevista do candidato se não houver caso de uso.

**Aceite:** Candidatura sem teste; disparo individual/lote; status; lembretes; consentimento; reenvio; mobile.

**Origem:** Duda/Gestor pp.7–9.

### B-RH2-12 — Pipeline configurável

**Prompt:** Incluir etapa “Encaminhado para gestão” / “Análise da gestão”. Avaliar colunas Kanban configuráveis por empresa (renomear, reordenar DnD, novas etapas).

**Aceite:** Etapas obrigatórias vs custom; impacto em relatórios/automações/permissões; migração ao alterar/excluir coluna.

**Origem:** Duda/Gestor pp.8 e 11.

### B-RH2-13 — Aderência, Indicação e Relatório da vaga

**Prompt:** Aderência com campos estruturados + uma ação clara de IA. Reavaliar Indicação. Relatório compreensível para usuário externo (o que preencher e o que sai).

**Aceite:** Mapear entrada → processamento → saída; validar com quem não conhece a lógica interna.

**Origem:** Duda/Gestor p.10.

### B-RH2-14 — Benefícios por colaborador

**Prompt:** Se o módulo permanecer, ligar ao perfil: quais benefícios cada pessoa recebe, valor, início/alteração, histórico ao longo do vínculo.

**Aceite:** Catálogo da empresa; elegibilidade; histórico; permissões; mudança de vínculo.

**Origem:** Duda/Gestor p.15.

### B-RH2-15 — Avaliação de desempenho

**Prompt:** Ciclos com foco em competências; autoavaliação e modelos 90°/180°/360° com papéis. Área geral: criação, status, prazos, histórico. Perfil: resultados e feedbacks.

**Aceite:** Anonimato quando couber; permissões; escalas; consolidação multi-avaliador; reabertura; visualização.

**Origem:** Duda/Gestor pp.15–16.

### B-RH2-16 — Clima: distribuição, edição e arquivamento

**Prompt:** Publicação sem gestão confusa de links. Distribuir com segurança; acompanhar quem recebeu sem quebrar anonimato. Após publicar, bloquear edição/remoção de perguntas; mudanças = arquivar + nova versão. Área de arquivadas.

**Aceite:** Anonimato; rastreio de convite sem associação indevida à resposta; estados rascunho/publicada/encerrada/arquivada; histórico.

**Origem:** Duda/Gestor pp.16–19.

### B-RH2-17 — Mapa salarial e alertas

**Prompt:** Menos texto; indicadores que apoiem decisão. Avaliar remover “Bônus e PLR” se fora de escopo. Alerta opcional: ≥12 meses sem reajuste.

**Aceite:** Fonte dos dados; critérios/exceções; privacidade; como o mapa complementa a lista (percebida como útil).

**Origem:** Duda/Gestor pp.14–15.

### B-RH2-18 — Jornada do colaborador

**Prompt:** Manter Jornada; timeline cronológica, simples e acionável. Menos texto confuso; diferenciar eventos automáticos × manuais.

**Aceite:** Leitura rápida; filtros por tipo; origem; consistência com desligamento, promoção, vínculo, reajuste.

**Origem:** Duda/Gestor p.12.

### B-RH2-19 — Consolidar abas de compatibilidade/time

**Prompt:** Revisar “Time e composição”, “Fit vs time interno”, “Compatibilidade”, “Comparativo”, “Grupos”. Consolidar quando houver sobreposição.

**Aceite:** Mapear pergunta que cada aba responde; eliminar duplicidade sem perder dados; validar com RH/gestor.

**Origem:** Duda/Gestor pp.13 e 15.

### B-RH2-20 — Linguagem das afirmativas de Motivadores

**Prompt:** Revisar linguagem (menos formal/rebuscada) **sem** alterar o construto. Preservar equivalência entre itens.

**Aceite:** Revisão do responsável pelo instrumento + teste de compreensão antes de substituir o banco.

**Origem:** Duda/Gestor p.13.

---

## Pontos cruzados

Fechar antes da Parte 2:

1. **Ciclo de vida:** candidato → contratado → colaborador ativo → desligado/arquivado (telas e permissões por estágio).
2. **Perfis:** o que Colaborador, Gestor/Direção e RH veem, editam, concluem e disparam.
3. **Arquitetura de módulos:** PDI, OKR, 1:1, feedback, avaliação, jornada e como se conectam.
4. **Interface:** menos texto técnico; mais contexto acionável; bastidor/IA só quando necessário.
5. **IA:** saídas curtas, específicas, rastreáveis aos dados; apoio à conversa, não “conclusão” sobre a pessoa.
6. **Auditoria:** cadastro, convite, integração, salário, benefícios, avaliações, desligamento → data + responsável.

---

## Em andamento

_(vazio)_

---

## Referência

- Word (fonte, com prints): [`docs/30TEAM_Backlog_Consolidado_Observacoes.docx`](./30TEAM_Backlog_Consolidado_Observacoes.docx) (~2,5 MB)
- Este markdown: Parte 1 concluída (`B-RH1-*`) + 20 itens Parte 2 (`B-RH2-*`) + pontos cruzados + ordem sugerida. Anexos visuais ficam no `.docx` (Maria 1–3, Duda Colaborador 1–3, Duda Gestor 1–19).

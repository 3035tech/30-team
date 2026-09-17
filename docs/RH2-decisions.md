# Parte 2 RH — decisões (pontos cruzados + fronteiras)

Documento de produto para desbloquear `B-RH2-*` (ver `docs/BACKLOG-RH-TESTES.md`).  
Não substitui o Guia do painel; Guia e FAQ devem espelhar o que for uso de gestor.

## Pontos cruzados (fechados)

### 1. Ciclo de vida

| Estágio | `employment_status` | Onde vive | O que RH/gestor faz |
|---------|---------------------|-----------|---------------------|
| Candidato | `candidate` | Funil da vaga / Equipe (roster recruiting ou all) | Triagem, testes sob convite, oferta, hire |
| Colaborador ativo | `employee` | Equipe (roster `internal`), `/employee` | 1:1, PDI, OKR, DP, check-ins D30/60/90 (gestor conclui) |
| Desligado | `alumni` | Análise demissional + roster `all` | Histórico; não aparece como equipe ativa |
| Contratação fora do funil | `employee` direto | Equipe → “Incluir colaborador” | Sem vaga/teste obrigatório; convite de acesso opcional |

### 2. Perfis (quem faz o quê)

| Ação | Colaborador | Gestor / Direção / RH |
|------|-------------|------------------------|
| Ver datas D30/60/90, reunir, ack | sim | sim |
| **Concluir** checkpoint D30/60/90 | **não** | sim (`completed_by_user_id`) |
| Reabrir checkpoint | não | sim (volta a `pending`) |
| Preparar 1:1 (nota) | sim | vê no painel |
| Disparar Eneagrama/Motivadores | não | sim, após inscrição / seleção |
| Soft apply público | visitante | vê no funil `new` |

### 3. Arquitetura de módulos (B-RH2-04)

| Módulo | Pergunta que responde | Não é |
|--------|----------------------|-------|
| **PDI** | O que esta pessoa desenvolve neste ciclo? | Meta de área / OKR |
| **OKR** | Quais objetivos da área/empresa e atividades atribuídas? | Plano individual de desenvolvimento |
| **1:1** | O que combinamos e acompanhamos na conversa? | Avaliação formal 360° |
| **Feedback contínuo** | Histórico de reforço/ajuste entre reuniões | Substituição do 1:1 |
| **Jornada / check-ins** | Marcos pós-hire (D30/60/90) e onboarding | PDI completo |
| **Avaliação de desempenho** | Ciclo formal com papéis (futuro B-RH2-15) | 1:1 ad hoc |

Vínculos: outcome “develop/concern” no check-in pode semear item de PDI; 1:1 pode apontar item de PDI; OKR não grava em PDI automaticamente.

### 4. Interface

- Lista antes de formulário; progressive disclosure (`CollapsibleBlock`).
- Menos texto técnico; CTAs com verbo + objeto (“Enviar Eneagrama”, “Incluir colaborador”).
- Bastidor/IA só sob ação explícita; saída hedged (“tende a”).

### 5. IA

- Apoio à conversa (perguntas, 2–4 bullets acionáveis ligados a dados).
- Não diagnosticar intenção de saída nem “conclusão” sobre a pessoa.
- Rastreabilidade: cada bullet deve citar fonte (T-type, Motivadores, 1:1, check-in).

### 6. Auditoria

Já via `audit()` em ações sensíveis; Part 2 exige responsável + data em: inclusão de colaborador, disparo de teste, conclusão/reabertura de check-in, convite de acesso.

## Escopo entregue

| ID | Entrega |
|----|---------|
| B-RH2-04 | Este mapa (doc + Guia) |
| B-RH2-05 | Reabrir check-in; mostrar quem concluiu; copy: colaborador só ack |
| B-RH2-06 | Incluir colaborador sem vaga + convite de acesso opcional |
| B-RH2-10 | Prep 1:1: `preparedAt` atualiza a cada envio; estados claros |
| B-RH2-11 | Soft apply já existe; disparo em lote no detalhe da vaga; convite e-mail = Eneagrama explícito |
| B-RH2-01 | Home colaborador: 1ª visita abre só pendências (`tasks`); demais seções recolhidas |
| B-RH2-02 | Overview: “Vagas em aberto” + “Estágios do funil”; copy de atenção/sinais |
| B-RH2-03 | HR Score / radar: linguagem hedged; título “Sinais de retenção”; badges com title auxiliar |
| B-RH2-07 | “DP” → “Informações cadastrais”; Motivadores no radar da aba **Estilo** |
| B-RH2-08 | Dossiê: propósito do HR Score; clima explícito como sinal anônimo da empresa |
| B-RH2-09 | `conversationActions` em `buildProfileSynthesis` (2–4 bullets + fonte) no brief / Estilo |
| B-RH2-13 | Relatório cliente / aderência / indicação: mantidos; polish de copy já alinhado ao Guia (sem redesign estrutural nesta onda) |
| B-RH2-17 | Mapa salarial: menos texto; Bônus/PLR permanece módulo separado (Remuneração), fora do mapa |
| B-RH2-18 | Jornada: hint curto D1→D90→PDI |
| B-RH2-19 | Abas Analysis nomeadas por pergunta: Encaixe em pares / Comparativo T1–T9 / Grupos / Liderança (sem merge destrutivo) |

## Diferido (próximas ondas / dono)

| ID | Motivo |
|----|--------|
| B-RH2-12 | Pipeline configurável por empresa = schema + migração de estágio + relatórios/automações |
| B-RH2-14 | Benefícios por colaborador = modelo catálogo↔vínculo↔histórico ainda não fechado |
| B-RH2-15 | Avaliação 90/180/360 = ciclo formal multi-avaliador (escopo grande; 1:1/PDI cobrem o ad hoc) |
| B-RH2-16 | Clima versionado (arquivar + nova versão; convite sem quebrar anonimato) = estados + UX de publicação |
| B-RH2-20 | Banco Motivadores: copy/pesos exigem validação do dono do instrumento (sync sem DELETE) |

## Mapa das abas de análise (B-RH2-19)

| Aba | Pergunta |
|-----|----------|
| Encaixe em pares | Quem tende a se complementar / atritar em trabalho conjunto? |
| Comparativo T1–T9 | Como cada pessoa pontua nos nove estilos lado a lado? |
| Grupos | Qual o mix / pulso deste subconjunto salvo? |
| Liderança | Sinais de liderança / núcleo no recorte |
| Equipe | Roster + estágio + gestão da pessoa (não é compat) |

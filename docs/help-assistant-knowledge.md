# Assistente de Ajuda — base de conhecimento

O botão flutuante **“Pergunte à IA”** / **“Ask AI”** (canto inferior direito) abre um **chat com assistente de IA** do produto. Não confundir com a aba **Ajuda** do menu (Guia em texto fixo). A fonte de verdade continua o **Guia do painel** (`panel.help.*` em `lib/i18n.js`), indexada por `lib/help-assistant.js`.

## Arquitetura

| Camada | O quê |
|--------|--------|
| **Guia** | `HelpTab` + chaves `panel.help.{section}Title/Body/StepN` (pt-BR **e** en) |
| **Seções canônicas** | `lib/help-sections.js` → `HELP_GUIDE_SECTIONS` (ordem do índice) |
| **Retrieval** | `buildHelpChunks()` lê todas as seções canônicas no locale |
| **FAQ** | `FAQ` em `lib/help-assistant.js` + `panel.helpAssist.faq*` (resposta instantânea, sem LLM) |
| **LLM** | OpenAI opcional; contexto = top 4 chunks lexicais do Guia |

**Regra:** o assistente **não** tem base paralela. Se está no Guia, entra no retrieval; FAQ só acelera perguntas frequentes.

## Checklist obrigatório — toda feature nova para gestor/RH

Após **Test pass** (pipeline Dev → Test → Validate), antes de dar a entrega como pronta:

1. **Guia** — adicionar ou estender seção em `lib/i18n.js`:
   - `{section}Title`, `{section}Body`, `{section}Step1…` em **pt-BR e en**
   - Se for fluxo novo: incluir `{section}` em `HELP_GUIDE_SECTIONS` (`lib/help-sections.js`) se ainda não existir
   - Ajustar `HELP_SECTION_STEP_COUNTS` se houver passos novos
2. **Assistente de Ajuda**
   - Garantir que a seção está em `HELP_GUIDE_SECTIONS` (indexação automática via `buildHelpChunks`)
   - Se a pergunta for muito comum (“como…”, “onde…”), adicionar entrada em `FAQ` + `panel.helpAssist.faq*` (pt-BR+en)
   - Ampliar vocabulário em `PRODUCT_HINT` (`lib/help-assistant.js`) se surgirem termos novos do domínio
3. **Docs técnicas** (quando aplicável) — `README` / `docs/` para setup, URLs, migrations
4. **Prova** — `npm run test:full:offline` inclui `help-assistant` + `validateHelpGuideCoverage`

## Onde documentar por tipo de feature

| Público | Onde |
|---------|------|
| Gestor precisa *saber fazer* | Guia + FAQ opcional |
| Colaborador (`/employee`) | Seção `employeeHome` no Guia (RH convida/configura) |
| Super admin (auditoria, leads, sugestões) | Seção `access` (passos 10–11) + `productFeedback` |
| DP leve (ficha / docs / férias / saldo) | Seção `dpLight` + FAQ `faqDpLight` / `faqLeaveBalance` |
| Mural / kudos | Seção `companyFeed` + FAQ `faqCompanyFeed` |
| Prep de entrevista | Seção `interviewPrep` + FAQ `faqInterviewPrep` |
| Dev/ops (migrate, env, DTOV) | README / `docs/` / `test/README.md` |

## Exemplos de seções

| Tema | Seção Guia |
|------|------------|
| Jornada D1 + D30/D60/D90 | `b700Onboarding` + `employeeHome` |
| Login colaborador / Minha chegada | `employeeHome` (`/e` token ~30d vs `/employee` senha) |
| 2FA gestor/employee | `access` (Step10) |
| Filtro de empresa / sticky (admin + super admin) | `access` (Step6) + `dashboardCohort` + FAQ `faqDashboardCohort` |
| Auditoria (super admin) | `access` (Step11) + FAQ `faqAudit` |
| Remuneração interna | `compensation` (faixa de mercado do cargo + compare) |
| Cargos | `b1000JobRoles` (rubrica + faixa mercado opcional) |
| LMS / cursos | `lmsBasic` |
| Primeira semana (risco · fit · PDI) | `firstWeek` |
| Roteiro demo | `demoRoteiro` |
| HR Score | `b1000HrScore` |
| Radar de rotatividade | `b1000TurnoverRadar` |
| **Para que serve cada tela** | `screens` (mapa aba → função + conexões) |
| Motivadores (mapa radar no perfil) | `motivators` + FAQ `faqMotivators` |

**FAQ rápido — mapa de telas / contexto:** “para que serve cada tela”, “mapa de abas” → `faqScreens` + seção `screens`. Com a aba aberta, o widget envia `activeTab` / `activeSection`; perguntas “para que serve esta tela”, “dicas desta aba”, “o que posso fazer aqui” e “dicas do sistema” usam `lib/help-screen-context.js` (sem LLM). Sugestões do chat: chips da tela atual + chips de sistema (`suggestThisScreen`, `suggestSystemTips`, …).

**FAQ rápido — remuneração:** perguntas com “salário/aumento/reajuste + colaborador/equipe” (ou “lista de salários”) caem em `faqCompensation`. Link canônico da lista: `/dashboard?tab=compensation`; ficha: Equipe → Remuneração (`&section=compensation`). Folha/holerite continua fora de escopo.

**FAQ rápido — coorte admin:** “escolher empresa”, “visão geral vazia”, “comparar pede empresa” → `faqDashboardCohort`. HR Score / radar / cargos → `faqHrScore`, `faqTurnoverRadar`, `faqJobRoles`.

Detalhe operacional da jornada colaborador: [`employee-onboarding-journey.md`](./employee-onboarding-journey.md).

Performance (ops): [`performance-hotpaths.md`](./performance-hotpaths.md) — `LOG_SLOW_MS`, `npm run dtov:explain`.

## Manutenção do prompt de produto

Atualize [`PRODUCT-FEATURES-PROMPT.md`](./PRODUCT-FEATURES-PROMPT.md) quando um epic relevante fechar — útil para agentes externos; o assistente in-app usa o Guia, não esse arquivo.

## Referências

- `AGENTS.md` § Pós-implementação
- `.cursor/skills/dev-test-validate/gates.md` § Final validation
- `lib/help-assistant.js`, `lib/help-sections.js`, `HelpAssistantWidget.jsx`

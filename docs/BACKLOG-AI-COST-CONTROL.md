# Backlog — Controle de custo de IA (B-2700)

Registro da análise de out/2026 para tratar no futuro. **Nada aqui está implementado.** Ao entregar um sub-item, remover daqui e do resumo em `docs/BACKLOG.md`.

## Estado atual (out/2026)

- **Cliente único:** `lib/openai-chat.js` → `openAiChatCompletion({ messages, temperature, maxTokens, responseFormat })`, POST fixo em `https://api.openai.com/v1/chat/completions`.
- **Modelo:** `OPENAI_RUBRIC_MODEL` (default `gpt-4o-mini`). Mock com `OPENAI_MOCK=1` ou `DTOV=1`.
- **Funcionalidades que chamam LLM** (todas por clique de gestor, nada roda sozinho/cron):

| Funcionalidade | Arquivo | `maxTokens` | Rota / rate limit por usuário |
|---|---|---|---|
| Sugestão de rubrica (vaga e cargo) | `lib/rubric-ai.js` | 900 | `admin/vacancies/[id]/rubric-ai`, `admin/job-roles/rubric-ai` · 20/15 min |
| Assistentes da vaga (5 prompts: rascunho, descrição, shortlist, campos de fit etc.) | `lib/vacancy-assist-ai.js` | 500–1400 | `admin/vacancies/[id]/assist-ai` 30/15 min · `admin/vacancies/assist-ai` 20/15 min |
| Interpretação de sinais da pessoa | `lib/people/interpret-ai.js` | 700 | `admin/people/interpret-ai` |
| Assistente de Ajuda | `lib/help-assistant.js` | 360 | `admin/help-chat` · 40/h |
| Tradução de catálogo (offline, dev) | `scripts/i18n-translate-catalog.mjs` | — | script local |

- **Sem LLM (custo zero):** leitura de currículo (`candidate-cv`), temas de clima (`climate-themes`). `lib/health-status.js` só faz ping em `/v1/models`.
- **Lacunas:** sem teto por empresa, sem registro de tokens/custo (o campo `usage` da resposta é ignorado), sem cache, sem kill switch, URL do fornecedor fixa no código.

## Ordem de grandeza de custo (estimativa; validar preços atuais)

- Chamada típica ≈ 3k tokens de entrada + 700 de saída. No `gpt-4o-mini` ≈ **< US$ 0,001 por chamada** (~US$ 1 por mil chamadas).
- Empresa média usando bastante: centavos a poucos reais/mês. Margem folgada frente a `PUBLIC_PRICING_TIERS`.
- **Risco real:** abuso/loop (usuário ou script martelando o assistente) sem teto por empresa, não o uso normal.

## Fornecedor e modelo (recomendação)

Todo uso é geração de texto/JSON em português (sem imagem, áudio ou embeddings) → qualquer fornecedor grande cobre 100% do sistema.

1. **Ficar na OpenAI** com o modelo mais barato da linha mini/nano vigente (código já pronto, JSON mode estável, bom pt-BR). Conferir modelos e preços no painel antes de trocar.
2. **Alternativa mais barata:** Google Gemini Flash / Flash-Lite (endpoint compatível com o formato OpenAI).
3. **Sem lock-in:** OpenRouter (gateway compatível com OpenAI; troca de modelo só por URL + chave + nome do modelo).

## Ação imediata (sem código)

- [ ] No painel da OpenAI: projeto dedicado ao 30Grow com **limite mensal de gasto** e **alertas** (ex.: US$ 20, aviso em 50% e 80%).

## Itens de implementação

### B-2701 — Registrar consumo de IA
- Tabela `ai_usage_events` (`company_id` FK, `user_id`, `feature` com `CHECK` de domínio, `model`, `prompt_tokens`, `completion_tokens`, `cost_micros`, `created_at`). Índice `(company_id, created_at)`.
- Gravar a partir de `usage` da resposta em `openAiChatCompletion` (insert único, fora de transação longa; falha de log não quebra a feature).
- Constante de features em `lib/` (não literais soltos).

### B-2702 — Teto mensal por empresa
- Antes da chamada: somar consumo do mês (índice acima) e bloquear ao estourar com erro amigável (`ERR` novo + i18n pt-BR/en: "Limite de IA do mês atingido").
- Teto pode crescer com a faixa do plano (argumento comercial: "inclui X usos de IA/mês").
- Admin pode ajustar teto por empresa.

### B-2703 — Kill switch + fornecedor configurável
- Env `AI_ENABLED=0` desliga todas as chamadas (UI mostra estado indisponível, não erro genérico).
- Teto global mensal opcional (env).
- Env `OPENAI_BASE_URL` (default OpenAI) para apontar a OpenRouter / Gemini compatível sem mudar código.

### B-2704 — Modelo por funcionalidade
- Env/config por feature: nano/Flash-Lite para Ajuda e textos simples; mini só para rubrica e interpretação.

### B-2705 — Cache de respostas repetidas
- Redis (Upstash, já opcional no projeto) por hash de `feature + modelo + entrada normalizada`, TTL 24h, escopo por `company_id` quando houver dado da empresa no prompt.
- Alvos: perguntas de Ajuda, rubrica do mesmo cargo.

### B-2706 — Tela de consumo (admin)
- Listagem paginada por empresa/mês/feature (padrão `AdminTableShell` + `AdminListPager`), com tokens e custo estimado.

**Sugestão de corte:** B-2701 + B-2702 + B-2703 juntos (tudo passa por `lib/openai-chat.js`); B-2704/B-2705/B-2706 depois.

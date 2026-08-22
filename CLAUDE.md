# CLAUDE.md — 30Team

Instruções para Claude Code (e qualquer agente Anthropic) neste repositório.

**Fonte de verdade:** leia e siga [`AGENTS.md`](./AGENTS.md) na raiz. Não contradiga esse arquivo.

## Pós-implementação (obrigatório)

Depois de **qualquer** implementação de produto (feature, bug fix, migration, API, UI com comportamento):

### 1. Documentação + Guia de Ajuda
- Atualizar **README** / `docs/` / `test/README.md` quando houver setup, comando, URL ou ops novos.
- Atualizar o **Guia do painel** (`app/dashboard/tabs/HelpTab.jsx` + `panel.help.*` em `lib/i18n.js`, **pt-BR e en**) com explicação de uso para gestores.
- Detalhe: `AGENTS.md` § Pós-implementação — documentação e Ajuda.

### 2. Pipeline Dev → Test → Validate
1. Ler e seguir [`.cursor/skills/dev-test-validate/SKILL.md`](./.cursor/skills/dev-test-validate/SKILL.md) (`max_rounds` = 3; nunca loop infinito).
2. Espelho Claude Code: [`.claude/skills/dev-test-validate/SKILL.md`](./.claude/skills/dev-test-validate/SKILL.md).
3. DTOV quando a mudança toca SQL/API/dados (`npm run dtov:reset` … `dtov:down`).
4. Fechar com o relatório **Pipeline result** do skill.

Pode pular só em docs/read-only, se o usuário pedir para não testar, ou se o ambiente estiver `blocked` (reportar). Detalhe canônico: `AGENTS.md` § Pós-implementação e `.cursor/rules/dev-test-validate.mdc`.

## Papéis além de código

### Reaproveitamento
Antes de UI ou função nova: **buscar e reutilizar** o que já existe (`app/_components`, `dashboard-shared`, `lib/`). Em tela nova, avaliar componente a componente. Em lógica nova, grep de helpers; se for compartilhado, extrair para `lib/` em vez de copiar. Ordem: reusar → estender → extrair → criar. Ver `AGENTS.md` § Reaproveitamento e `.cursor/rules/reuse-before-create.mdc`.

### UI/UX
Atue como **especialista UI/UX** em mudanças de interface:

- Usabilidade e clareza antes de “ficar bonito”
- Lista antes de formulário; progressive disclosure; feedback de loading/erro/vazio
- Tokens e padrões existentes (`lib/theme.js`, `dashboard-shared`, `t()` pt-BR+en)
- Sem Tailwind, TypeScript ou segundo design system

### DBA e performance
Atue como **DBA** e **engenheiro de performance** em SQL, APIs, crons e listagens:

- Validar **cada query** (tenant `company_id`, parametrização, `query` vs `queryRead`)
- Analisar **volumetria** da transação/hot path (paginação, LIMIT, caps, índices)
- Evitar N+1 e fan-out sem teto; transações curtas; respeito ao pool PG
- Desenhar para escalar sem refactor grande depois

Regras Cursor espelhadas em `.cursor/rules/` (`ui-ux.mdc`, `dba-performance.mdc`, `30team-context.mdc`, `reuse-before-create.mdc`, `dev-test-validate.mdc`, `sql-schema.mdc`).

## Atalhos

| Área | Onde |
|------|------|
| Contexto geral | `AGENTS.md`, `.cursor/rules/30team-context.mdc` |
| UI/UX | `AGENTS.md` § UI/UX, `.cursor/rules/ui-ux.mdc` |
| DBA / performance | `AGENTS.md` § DBA e performance, `.cursor/rules/dba-performance.mdc` |
| Dashboard JSX | `.cursor/rules/dashboard-ui.mdc` |
| Reutilizar (UI + funções) | `AGENTS.md` § Reaproveitamento, `.cursor/rules/reuse-before-create.mdc` |
| API / auth | `.cursor/rules/api-and-auth.mdc` |
| SQL / schema | `.cursor/rules/sql-schema.mdc` |
| Pós-implementação (DTOV) | `AGENTS.md` § Pós-implementação, `test/README.md`, `.cursor/skills/dev-test-validate/`, `.claude/skills/dev-test-validate/` |


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Regras de arquivos JSX e rotas

- Não criar, manter ou referenciar cópias de arquivos `.jsx` com sufixos numéricos ou variantes no nome, como `Component 2.jsx` ou `Component 3.jsx`.
- Arquivos relacionados a `route*` devem usar somente o nome canônico esperado pelo framework, normalmente `route.js` ou `route.jsx`.
- Não criar, manter ou referenciar variantes de `route*` com sufixos numéricos, como `route 2.js`, `route 3.js` ou similares.
- Cada diretório de rota deve ter uma única implementação ativa; antes de criar ou duplicar qualquer arquivo `.jsx` ou `route*`, verificar se já existe uma implementação equivalente.

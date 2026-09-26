# Categorias de competências — entrega local

## Escopo

Cadastro por empresa em Avaliações → Competências → Gerenciar categorias.
Busca, paginação, filtro de ativas/todas, criação, edição, ativação/inativação e exclusão confirmada.
As competências usam um seletor de categorias e persistem `category_id`, não texto livre.

## Integridade e permissões

- Mesma permissão existente do catálogo: `PERFORMANCE_VIEW`, com empresa resolvida pela sessão.
- Nome único por empresa, desconsiderando maiúsculas e espaços nas extremidades; inclui categorias inativas.
- FK composta `(category_id, company_id)` impede vínculos entre empresas.
- Inativação preserva vínculos; novas atribuições a categorias inativas são rejeitadas.
- Edição de competência pode preservar a categoria inativa já vinculada ou removê-la.
- Exclusão de categoria vinculada é bloqueada pela API e pela FK; a tela oferece inativação.
- Mutações transacionais e auditadas; locks sincronizam atribuição e alteração de categoria.

## Banco e implantação

A migration 126 não cria mais `category TEXT` em bases novas. A 129 cria `competency_categories` e o relacionamento.
Se o rascunho anterior da 126 já foi aplicado, a 129 copia os nomes existentes uma única vez, sem apagar dados.
Reexecutar a migration não recria vínculos removidos nem altera categorias já cadastradas.
O campo textual antigo, quando já existente em ambiente local, fica sem leitores/escritores; não é criado em bases novas.
Aplicar migrations antes da aplicação nova. Não remover tabela/coluna no rollback; preservar os dados cadastrados.

## Verificação

- Build de produção completo: passou (`.next-p1-build`, ambiente temporário).
- Revalidação em 26/09: build `.next-p1-verify` passou; os dois testes E2E passaram na porta 3014 (19,5 s), incluindo ações mobile sem rolagem horizontal.
- 8 testes unitários existentes/defaults de competências: passaram.
- `test/e2e/competency-categories.spec.js`: CRUD de navegador, cancelamentos, persistência, seletor, erros de duplicidade, inativação, exclusão, isolamento de empresa e FK real.
- Mesmo teste reexecuta a migration duas vezes dentro de transação e verifica preservação de dados.
- `test/e2e/p1-competency-catalog.spec.js`: regressão de edição/inativação e preservação dos snapshots de avaliações.

Todos os testes funcionais usam apenas PostgreSQL/Redis sintéticos DTOV e servidor local compilado. Sem deploy ou migration em produção.
Esta entrega cobre categorias; não declara o P1 inteiro concluído.

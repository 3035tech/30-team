# Organização: primeira entrega

O painel web oferece `Organização` no grupo Pessoas para usuários com `team.view`.
O app continua exclusivo do colaborador; não recebe gestão administrativa.

## Uso

- Criar unidade: nome obrigatório (até 100 caracteres), unidade superior opcional.
- Editar nome ou hierarquia, sem alterar cargos, gestores ou permissões.
- Equipe → pessoa → Unidade / departamento → Salvar. Vínculo opcional; também pode ser removido de ex-colaboradores.
- Equipe: filtro por unidade exata ou Sem unidade, aplicado no servidor antes da contagem/paginação. Mantém a semântica existente da listagem de avaliações; a contagem de colaboradores por unidade pode incluir pessoas ainda sem avaliação.
- Organização → Ver na Equipe limpa filtros de avaliação anteriores para não esconder resultados.
- Organograma permanece por gestor direto e acrescenta o nome da unidade.
- Arquivamento preserva o registro e exige ausência de vínculos (inclusive ex-colaboradores) e subunidades ativas. Sem exclusão física ou reativação nesta entrega.

## Deploy e rollback

Aplicar `121_organization_units.sql` pelo runner padrão **antes** de publicar a aplicação.
O delta idempotente está espelhado em `scripts/scripts-banco-pendentes.sql`.
A migração cria `org_units` e uma coluna nullable em candidates: não atribui departamentos a dados existentes.
Rollback: voltar a imagem anterior, mantendo tabela e coluna. Não remover schema nem vínculos; versões antigas ignoram o campo novo.

## Segurança, concorrência e custo

- `withAdminApi`, `TEAM_VIEW`, Zod e escopo de empresa em todas as operações. A unidade não concede acesso.
- FKs compostas impedem pais/vínculos de outra empresa. Escritas serializam por linha de empresa para impedir ciclos e corrida entre vínculo/arquivamento.
- Máximo 500 unidades ativas e 20 níveis. Verificação da floresta limitada a 500 × 20 passos; sem N+1 SQL. Lista agregada com índice candidates(company_id,org_unit_id).
- Primário para leituras imediatamente após edição. Filtro SSR preserva o roteamento de réplica já existente na Equipe.
- Rate limit de 60 mutações/minuto por gestor/empresa. Sem retry automático de mutações.
- Auditoria usa audit_log existente (best-effort) com ator, empresa, IDs e operação. Não registra mensagens ou dados pessoais. Não substitui histórico temporal de lotação.
- Sem novos pacotes; controles, formulário, paginação, feedback e transições reutilizam componentes existentes. Textos pt-BR/en e erros/retry explícitos.

## Prova local

`npm run dtov:reset`, build padrão com `NEXT_DIST_DIR=.next-polish-build`,
`node test/dtov/organization.test.js`, e `npm run dtov:down`.
Fixtures locais usam somente DTOV. Nenhum teste aponta para produção.

Validação desta entrega: build de produção, 13 testes unitários, 42 verificações
HTTP/SQL/navegador (incluindo tenant A × B, concorrência de reparenting, FK,
migração repetida, vínculo preservando cargo/gestor e retry). Revisão visual em
390 px e 1365 px; ações empilhadas no mobile para preservar a leitura dos nomes.

Fora do escopo: filiais, centros de custo, posições/headcount, aprovações, transferência em massa e histórico temporal completo de lotação.

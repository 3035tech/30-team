# Revisão UI/UX dos OKRs — 29/09/2026

## Avaliação

A hierarquia ciclo → área → objetivo → resultado-chave corresponde ao modelo de trabalho. O principal problema era densidade: todos os objetivos expandidos, caixas dentro de caixas e controles de configuração competindo com acompanhamento. Não há necessidade de novas páginas para corrigir isso.

## Ajustes realizados

- Cabeçalho padrão do dashboard, com objetivo da tela e ação de criar ciclo.
- Contexto do ciclo agrupado: seleção, período, estado e progresso.
- Filtro de área, mantendo a opção de visão completa. Trocar ciclo limpa o filtro e o histórico aberto.
- Objetivos recolhíveis com componente compartilhado: o primeiro inicia aberto, os demais mostram resumo com responsável, prazo, quantidade de resultados e percentual.
- Menos bordas aninhadas. O percentual do objetivo aparece uma única vez.
- Inicial, meta e atual continuam lado a lado; check-in e histórico permanecem junto ao resultado ao qual pertencem.
- No celular, seleção do ciclo ocupa uma linha inteira; ações se reorganizam abaixo. Não foi criada uma navegação paralela para mobile.
- Correções de suporte à experiência: português de Portugal deixa de cair em inglês; respostas de uma empresa anterior não substituem a atual; seleção de ciclo/área fica bloqueada durante operações; falha de atualização após uma gravação bem-sucedida é comunicada sem incentivar repetir a gravação.

## Decisão sobre novas telas

Manter acompanhamento no mesmo espaço. Criação e edição continuam em diálogo, e o histórico recente permanece contextual. Uma tela dedicada ao histórico completo ou análise entre ciclos só se justifica com essa necessidade de produto: hoje a consulta traz até 40 eventos, sem paginação histórica completa. Não inventar gráficos temporais ou novos fluxos sem dados e critérios de aceite.

Não converter toda a hierarquia numa tabela plana: perderia o vínculo visual entre objetivos e resultados. A comparação de medições já usa colunas consistentes dentro de cada resultado. Para grandes volumes, avaliar uma visão tabular alternativa a partir de uso real.

## Limites e próximos pontos

- Traduções espanholas completas desse componente continuam pendentes: o bloco ainda usa pares PT/EN locais. Esta revisão corrige PT-PT, mas não equivale a migrar todo o conteúdo ao catálogo.
- O histórico permanece limitado aos 40 eventos recentes, conforme contrato existente.
- Edição de título/período do ciclo e renomeação de área merecem um fluxo próprio de configuração em uma próxima entrega. Não exigem, por si só, páginas novas.
- Nenhuma alteração de schema, cálculo ou autorização nesta revisão.

## Verificação

- 16 testes unitários focados aprovados.
- DTOV com PostgreSQL local aprovado: CRUD, cálculos, histórico, isolamento entre empresas, responsáveis, bloqueio de ciclos fechados e preservação da migration.
- Três cenários Playwright isolados aprovados: resposta atrasada ao trocar empresa; gravação bem-sucedida seguida de falha de recarga; filtro de área, expandir/recolher e apresentação em 1440/390px.
- Capturas desktop/mobile inspecionadas visualmente.
- Fluxo integrado local `test/e2e/okr-hierarchy.spec.js` aprovado: criação/edição, check-in do RH e colaborador, histórico, API mobile e ciclo encerrado. A primeira execução perdeu o ciclo selecionado durante a sessão de desenvolvimento; a repetição com as páginas compiladas passou. Nenhum deploy realizado.

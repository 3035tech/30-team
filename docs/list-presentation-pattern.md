# Listas de gestão: padrão de apresentação

Revisão de 29/09/2026. Use tabela quando o usuário precisa comparar registros com os mesmos campos e executar ações por registro. Reutilize `AdminTableShell`, `AdminTh` e `AdminActionsTh`; mantenha busca, filtros, paginação, permissões e estados vazios existentes. Não adicionar ordenação apenas na página atual de uma coleção paginada pelo servidor.

No celular, a tabela deve rolar dentro de uma região acessível por teclado, sem alargar a página. Informações longas podem ficar em detalhes expansíveis. Cabeçalhos novos passam pelo catálogo de traduções.

## Conversões realizadas

| Área | Apresentação |
| --- | --- |
| PDI da equipe | Pessoa, plano, prazo, situação, progresso e ação. Busca e paginação de servidor preservadas. |
| Convites de vagas | Candidato, situação, lembretes e ações. Reenvio e remoção preservados. |
| Modelos de pipeline | Modelo, uso e ações; etapas permanecem em linha expansível. |
| Canais de ouvidoria | Canal, prazo, situação e acesso ao link público. |

## Formatos preservados por função

- Casos prioritários do PDI: resumo de até quatro casos, antes da tabela completa.
- Campanhas de Clima: lista de seleção que controla um painel de detalhes.
- Organograma: hierarquia visual, não coleção plana.
- Relatos de ouvidoria e históricos: conteúdo narrativo e sequência de eventos.
- Kanban: etapas e movimentação visual.

## Outros candidatos localizados, ainda sem conversão

A localização no código não equivale a aceite funcional. Estes componentes precisam de avaliação e validação próprias:

- `CompetencyCatalogBlock`: catálogo editável de competências.
- `OrganizationTab`: cadastro de unidades organizacionais (separado do organograma).
- `HourBankAdminBlock`: pendências e saldos; a lista de saldos atualmente limita a exibição a 40 pessoas.
- `VariablePayInboxBlock`: fila de aprovação de remuneração variável.
- `EmployeeHourBankSection` e `EmployeeFormalReviewsSection`: registros de horas e avaliações.
- `BenefitAssignmentsBlock`, `CompensationBlock` e `EmployeeDpSection`: coleções com detalhes e ações; avaliar tabela com expansão sem perder comprovantes e contexto.
- Categorias de benefícios e relatório de turmas LMS: avaliar volume e finalidade antes de substituir chips/resumos.

## Validação

Cenário isolado em `test/ui-controls/lists.spec.js`, usando componentes reais e respostas de API simuladas. Cobre estrutura tabular, abrir/criar PDI, busca e paginação, lembrete de convite, expansão do pipeline, canais e contenção horizontal em desktop/celular. Não substitui o aceite integrado com banco e autenticação reais.

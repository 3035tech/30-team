# OKRs por área — implementação e validação local

## Aceite funcional

- Hierarquia preserva áreas: ciclo → área → objetivo → resultado-chave.
- Objetivo: título, descrição, responsável opcional e prazo dentro do ciclo.
- Resultado-chave: título, unidade, valor inicial, meta, valor atual, prazo, peso inteiro 0–10 e 1–20 responsáveis contratados. Até 40 objetivos por área e 8 resultados-chave por objetivo.
- Progresso = `(atual − inicial) / (meta − inicial)`, limitado a 0–100%; aceita crescimento, redução e valores negativos. Inicial e meta não podem ser iguais. Valores armazenados com duas casas decimais.
- Objetivo usa média ponderada dos resultados-chave; peso zero é excluído. Área usa média de objetivos com medição; ciclo usa média de áreas com medição. Nós vazios não representam 0% e não entram nas médias.
- RH cria, edita, exclui e registra medições. Colaboradores vinculados registram valor atual e comentário no portal. Histórico exibe os 40 eventos mais recentes, com autor, data e fotografia dos valores/unidade vigentes; editar a meta não reescreve eventos anteriores.
- Encerrar ciclo bloqueia objetivos, resultados-chave, check-ins, criação/exclusão de áreas e exclusão do ciclo. É possível reabrir. Exclusões confirmadas removem entidades descendentes e seu histórico.
- Interface reutiliza componentes e estilos existentes, com estados vazio/erro/carregamento e comportamento responsivo. Ajuda PT/EN atualizada.

## Modelagem e limites de compatibilidade

Migration `133_okr_area_objectives.sql` apenas expande o esquema. Reutiliza `okr_objectives` e `okr_key_results`; adiciona FKs de área e responsável, valores `NUMERIC(14,2)`, prazo `DATE` e peso `INT` com CHECK. Responsáveis N:N e eventos são tabelas relacionais próprias, com FKs compostas por empresa. Não armazena entidades nem relacionamentos em JSON/TEXT. `event_kind` usa TEXT com CHECK de três valores fixos; título, descrição, unidade livre e comentário são texto de conteúdo.

Áreas, atividades, check-ins antigos e objetivos legados não são apagados ou convertidos automaticamente. `area_id IS NULL` e `start_value IS NULL` identificam os registros legados. A tela mostra atividades anteriores separadamente, fora dos novos cálculos. O antigo domínio de objetivos e seus escritores ficam restritos ao legado para não contornar bloqueios e histórico do modelo novo.

`/api/admin/okr/hierarchy` centraliza leitura e comandos do novo domínio, com empresa e autor resolvidos pela sessão. Operações de escrita usam transação e bloqueiam o ciclo antes de atualizar os filhos; o fechamento usa o mesmo bloqueio. Prazos de objetivo não podem excluir KRs existentes; alterar o período do ciclo não pode excluir objetivos existentes.

Portal do colaborador recebe KRs atribuídos junto às atividades existentes, com IDs de apresentação prefixados para evitar colisão. API mobile mantém `activities` e acrescenta `keyResults`; aceita `keyResultId/currentValue` sem retirar o contrato antigo. **O aplicativo mobile externo não está neste repositório e sua interface não foi alterada.** Não inclui novos disparos de notificações, bônus automático nem conversão de registros antigos.

## Provas

- `node --test test/unit/okr-metrics.test.js test/unit/okr-cycles.unit.test.js test/unit/p2-clarity.unit.test.js`: 16 testes de cálculo e regressão.
- `node test/dtov/okr-hierarchy.test.js`: PostgreSQL real local, fixtures e replay da migration dentro de transação revertida; idempotência/preservação, CRUD, metas crescentes/decrescentes, fotografia histórica, isolamento de empresa, FK de responsável, check-in não atribuído, bloqueio de escritores legados e ciclos encerrados, limites de prazo e exclusão em cascata.
- `npm run test:security`: 50 testes existentes de segurança.
- `BASE_URL=http://localhost:3014 npx playwright test test/e2e/okr-hierarchy.spec.js test/e2e/p2-clarity.spec.js`: criação e edição de objetivo/KR, check-in do RH e colaborador pela interface, API mobile autenticada, preservação de medições ao editar meta, histórico, bloqueio em ciclo encerrado e quatro regressões P2. Capturas desktop/390px e verificação de ausência de rolagem horizontal.
- Compilação de produção local; sem deploy.

## Implantação e retorno

1. Aplicar a migration aditiva antes da nova aplicação. Ela foi aplicada somente no DTOV local nesta tarefa.
2. Concluir a atualização dos escritores/API antes de liberar a nova tela; não permitir instâncias antigas escrevendo novos KRs durante atualização mista.
3. Validar criação e check-in de um KR de aumento e outro de redução na homologação.
4. Em rollback, voltar a aplicação e suspender a edição dos novos OKRs; **manter a migration e seus dados**. A versão anterior não oferece a nova hierarquia. Não há etapa de DROP, conversão reversa ou eliminação de legado autorizada.

As skills lean-build e migration orientaram a reutilização do domínio existente, o escopo restrito e a expansão aditiva sem conversão semântica de dados antigos.

## Polish posterior — experiência sem alterar o modelo

- Preservada a identidade visual: canvas `#F5F4F7`, superfície `#FFFFFF`, texto `#1A1625`, marca `#8930B8` e secundário `#EDEBF2`; tipografia existente `font-ui`/`font-display`, alinhamento à esquerda. A skill frontend-design orientou a hierarquia da informação, não a criação de um tema novo.
- Medições agrupadas em três colunas (inicial, meta, atual), números formatados pelo idioma e barra de progresso em linha própria no celular. Texto auxiliar usa contraste maior. Edição/exclusão ficam em “Mais ações”, com expansão nativa acessível por teclado.
- Histórico separa autor/data, valor medido, progresso e meta original. Avisos de salvamento são locais e não se empilham sobre o conteúdo.
- `promptForm` oferece um callback opcional `submit`: a persistência pode concluir antes de fechar a janela. Falhas mantêm os valores, mostram erro e permitem nova tentativa; envio duplicado e cancelamento durante envio são bloqueados. Fluxos que não fornecem callback conservam seu contrato anterior.
- Validação de meta igual ao valor inicial e de intervalos de datas acontece junto aos campos. Inputs numéricos respeitam os limites e o passo informados. O seletor de responsável recebe ID e rótulo selecionados, sem usar placeholder como valor.
- Portal do colaborador também preserva o formulário de check-in em caso de falha e formata medições por idioma.
- A skill surgical-patch delimitou as alterações à apresentação e aos componentes responsáveis pelo formulário. Nenhuma migration, fórmula, permissão de negócio ou API foi alterada nesta etapa.
- O teste `okr-hierarchy.spec.js` inclui falha simulada de salvamento com recuperação, valores preservados, responsável ao reabrir, erro de meta no campo, aviso único e medições com vírgula em PT-BR. As regressões próximas são P0/vagas, P1/dependentes e as quatro verificações anteriores de P2.
- Resultado final do polish: build de produção local aprovado; 16 testes unitários focados, 50 testes de segurança e 7 testes de navegador aprovados. Verificados também recolhimento de ações por teclado e recuperação do check-in do colaborador após erro simulado. Capturas desktop/mobile inspecionadas. Nenhuma publicação em produção.

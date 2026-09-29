# Revalidação do RH após atualização — 29/09/2026

Resultado: **os quatro grupos de correções da auditoria anterior e o alinhamento das abas do DP passaram na versão publicada, no escopo abaixo**. Nenhuma nova falha funcional foi reproduzida nessa amostra. Não equivale à homologação integral de todas as operações do produto.

## Ambiente e método

- Chrome, `https://team.3035service.com`, conta Admin Eval 20, empresa Eval 20 Funcionários (16).
- Aba recarregada antes dos testes. A versão mostrou as novas alterações de interface. O SHA publicado não foi consultado; o repositório local estava em `bc65e399`.
- Referência: documento consolidado do RH e `docs/rh-browser-check-2026-09-29.md`.
- Navegação real, abertura/cancelamento de formulários, teclado, inspeção do DOM e capturas desktop/móvel.
- Nenhuma gravação de negócio, upload, envio de convite, execução de IA, renovação de link ou publicação. Valores experimentais foram cancelados. Nenhuma alteração de código nesta rodada.

## Resultados

| Ponto | Evidência na versão publicada | Resultado |
| --- | --- | --- |
| Abas do DP | Pendências, Férias e afastamentos, Documentos, Ponto e banco de horas e Admissão mantiveram o topo da navegação em **245,078 px** no desktop e **301,076 px** na tela estreita. Cabeçalhos/ações aparecem abaixo das abas. | Passou |
| Cargo com pesos legados | Analista de Produto abriu com T1=2, T3=2, T5=3, T6=1; demais zero; total 8%. Digitar 37 em T1 atualizou o slider. Cancelar e reabrir restaurou os pesos originais. | Passou para leitura, sincronização e cancelamento |
| Editor de cargo | Descrição preenchida, fonte `system-ui` e instrução curta da IA; botão Novo cargo com capitalização padronizada. | Passou |
| Escape na busca de gestor | Perfil Ana Beatriz Nogueira permaneceu aberto ao usar Escape no campo e na opção Amanda Ribeiro Torres. `aria-expanded=false` após fechar; gestor atual preservado. | Passou |
| Estrutura do perfil | Resumo, 1:1, Feedback contínuo, Jornada, Remuneração e Informações cadastrais disponíveis; histórico de 1:1 carregado; feedback separado. | Passou para navegação/leitura |
| Jornada | Checklist contratação com quatro itens; D30/D60/D90; resultado de avaliação em estado vazio; PDI existente com 1/2 itens. | Passou para leitura |
| Remuneração | Sem histórico antes de Registrar remuneração; benefícios separados. | Passou |
| Ficha e vínculo | Dados preenchidos e grupos cadastrais presentes; texto simplificado de assinatura e CPF; escolher CLT revelou Data de vigência e desabilitou Salvar até preenchê-la. Alteração cancelada. | Passou para apresentação/validação do formulário |
| Dependentes | Sim revelou nome, CPF, parentesco, nascimento e ações adicionar/remover. Cancelamento funcionou. | Passou para comportamento condicional |
| Motivadores | Mapa seguido de cinco resultados 69/68/66/57/57; sem bloco Top motivadores (resumo). | Passou |
| Avaliações | Menu Avaliações; abas Avaliações, Competências e 9-Box. | Passou |
| Catálogo vazio | Orientação curta e Ir para competências; atalho abriu cadastro com Nova competência e Adicionar competências de exemplo. Novo ciclo também mostrou a instrução. | Passou |
| Formulário de ciclo | Opções 90°/180°/360° presentes; 360° e autoavaliação selecionáveis independentemente; datas, instruções, escala e perguntas presentes. Cancelado. | Passou para abertura e seleção |
| 9-Box | Nove células, eixos explícitos, 27 pessoas posicionadas. Como interpretar a matriz abriu pelo Enter. | Passou para apresentação e ajuda por teclado |
| OKRs | Ciclo Terceiro Semestre em estado sem áreas; seleção de Segundo Semestre mostrou Tecnologia/RH/Comercial e duas atividades anteriores. Novo objetivo abriu com título, descrição, responsável e prazo. Cancelado. | Passou para navegação/leitura/abertura |
| Edição de vagas | Vaga aberta #22 e fechada #21: abrir editor e cancelar em Pipeline, Candidatos, Informações, Divulgação e Configurações. **10 combinações** com título preenchido, sem travamento. | Passou |
| Textos de vagas | Breadcrumb Recrutamento / Vagas, rótulo Cidade e orientação Selecione o estado e busque a cidade. | Passou |
| Tela estreita | Editor de vaga com conteúdo e ações visíveis; abas do DP estáveis, com rolagem horizontal interna da navegação. Nenhum transbordamento horizontal da página na amostra. | Passou na largura observada |
| Console | Consultas de erros/avisos durante e ao final retornaram lista vazia. | Sem entradas capturadas |

## Limites e observações

- Override móvel solicitado: 390 × 844. A largura CSS efetiva retornada pelo navegador foi **433 px**; `scrollWidth` ficou entre 416 e 433 px. Esta prova vale para a largura observada. Override restaurado ao concluir.
- A sessão administrativa não dá acesso ao portal do colaborador: `/employee` redirecionou ao login com sessão encerrada. Não houve teste autenticado desse portal.
- Salvar e recarregar dados de negócio, uploads/downloads, convites, IA, respostas de avaliações, publicação/encerramento de ciclos e medições de KR não foram executados em produção. A prova local anterior de persistência dos pesos continua registrada separadamente; não foi reapresentada como teste publicado.
- Catálogo de competências e ciclos formais estão vazios na empresa 16; não foi possível validar resultados preenchidos ou resultado → PDI com essa amostra.
- A vaga #22 continua aberta com link expirado, corretamente sinalizado pela interface. Nenhum link foi renovado.
- Não houve nova execução de build, testes unitários ou npm audit nesta rodada: o objetivo foi conferir o sistema publicado, e os resultados locais anteriores não substituem essa prova.

## Capturas

- Desktop DP: `/private/tmp/rh-publicado-dp.png`
- Cargo com pesos legados: `/private/tmp/rh-publicado-cargo.png`
- Editor de vaga em tela estreita: `/private/tmp/rh-publicado-vaga-mobile.png`
- DP em tela estreita: `/private/tmp/rh-publicado-dp-mobile.png`

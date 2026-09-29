# Revisão de UI/UX da visão do colaborador

Data: 29/09/2026. Escopo: navegação e apresentação do portal autenticado do colaborador.

## Diagnóstico

A estrutura por tarefas, desenvolvimento e rotina é adequada. O principal problema era a localização das informações: muitos blocos expandidos na página inicial, ficha cadastral antes das ações de DP, itens concluídos competindo com o próximo passo do PDI e indicações que nem sempre correspondiam ao estado real.

A revisão no Chrome incluiu início (conteúdo e seções), PDI, DP e cursos, ponto e a estrutura do perfil. Foram usados apenas navegação e leitura no sistema publicado. Nenhum documento, assinatura, marcação de ponto, mensagem ou dado cadastral foi enviado ou alterado em produção.

## Ajustes implementados

| Área | Problema | Ajuste |
| --- | --- | --- |
| Layout | Área útil estreita em telas grandes, com margens excessivas | Início e telas dedicadas usam limite de largura consistente de 72rem; textos de orientação mantêm largura de leitura |
| Início | Número de pendências e pesquisas sem acesso direto | Resumos passam a abrir a seção correspondente, inclusive ao clicar novamente no mesmo destino |
| Início | “Pontos de atenção” não indicava sua origem | Links com contagem por módulo; módulos desabilitados não entram no total |
| Pesquisas | Contagem só era atualizada ao expandir a seção | Consulta do resumo independente da expansão; valor desconhecido não aparece como zero |
| Seções | Preferência antiga parcial podia abrir novas seções automaticamente | Seções sem preferência explícita começam recolhidas, exceto tarefas; botão para recolher as seções sem limpar dados |
| Prazos | Tarefas vencidas do PDI e chegada apareciam apenas como abertas | Status textual de atraso e destaque visual para qualquer tarefa vencida |
| Menu | Avaliações formais estavam na página, mas ausentes no menu | Entrada “Avaliações” no grupo Desenvolvimento, respeitando habilitação do módulo |
| Acessibilidade | Menu recolhido dependia do título do ícone | Rótulo acessível explícito para cada link |
| PDI | Concluídos misturados às ações pendentes | Filtros Pendentes / Concluídos / Todos, com contagens; pendentes por padrão |
| PDI | Próximo passo dependia da ordem de retorno da API | Pendências ordenadas por prazo; título completo, sem truncamento no resumo; atraso identificado |
| DP | Cadastro, documentos e férias empilhados | Abas do componente padrão do sistema, começando por documentos; formulário e estado de anexos preservados ao trocar de aba |
| DP | Hierarquia de títulos pulava nível | Títulos dos painéis passam a nível 2 |
| Cursos | Banner de continuar podia apontar para curso concluído | Banner só aparece quando a matrícula correspondente ainda não está concluída; revisão e certificado continuam disponíveis |
| Ponto | Área de marcação solta e título de banco de horas com outra tipografia | Blocos delimitados e tipografia consistente; ações de ponto preservadas |
| Idiomas | Novos controles precisavam acompanhar os catálogos | Novas mensagens em PT-BR/inglês e variantes regionais aplicáveis; português europeu herda o português e espanhol europeu herda o espanhol compartilhado |

## Decisões de experiência

- Não é necessário criar mais rotas para resolver a densidade atual. DP já tem página própria e ganha navegação interna por assunto.
- PDI do colaborador é uma lista de ações pessoais, não um cadastro administrativo. Filtros, prazo e ação principal tornam essa lista mais útil do que uma tabela larga no celular.
- Histórico e itens concluídos continuam acessíveis, mas deixam de competir com pendências.
- Perfil mantém campos de contato e segurança em grupos separados; esta revisão não muda regras de autenticação.
- Mural, reconhecimentos, pesquisas, avaliações e combinados mantêm seus fluxos existentes. Não foram reescritos formulários nem alteradas regras de negócio.

## Validação e limites

- Cenários isolados com dados sintéticos: **2 aprovados** (`npx playwright test --config test/ui-controls/playwright.config.js employee.spec.js`). Cobrem resumo de pesquisas com seção fechada, atraso, recolher/reabrir, filtros e ordem do PDI, troca de abas do DP por teclado, supressão do banner de curso concluído e largura de 390px, além do perfil descrito abaixo.
- Cenário integrado local **pendente, não aprovado integralmente**: `BASE_URL=http://127.0.0.1:3014 npx playwright test test/e2e/web-polish-surfaces.spec.js -g 'employee DP'`. Recuperação de erro de DP e inspeção de início/DP em 390px passaram; a execução parou em `/employee/time-clock` porque um painel permaneceu em “Carregando…” por mais de 30 segundos. A passagem completa por cursos/perfil e 1440px ainda precisa ser concluída. A API de início respondeu HTTP 200 em uma consulta independente (aproximadamente 9 segundos); não há evidência suficiente para atribuir a demora de Ponto a esta alteração visual.
- Verificações estáticas: sintaxe dos 20 arquivos JS/JSX conferidos válida e `git diff --check` sem problemas.
- Conferência visual no Chrome com dados locais: resumo de pesquisas e nova organização do DP. A automação do Chrome foi bloqueada por uma interface de extensão durante a navegação posterior; os testes locais independentes não dependem dessa extensão.
- Esta validação de UI não substitui testes completos de envio de documentos, assinatura, férias, marcação de ponto e respostas a pesquisas. Esses fluxos não foram executados em produção.
- Sem migrations e sem alterações no contrato das APIs. Publicação depende do fluxo normal de commit/push/deploy.

## Alinhamento de perfil com RH/admin

Solicitação adicional incorporada na mesma revisão:

- Colaborador usa Conta e Segurança no mesmo `PanelSubNav` do perfil de RH/admin, substituindo três sanfonas diferentes.
- Painéis, cabeçalhos e botão/menu superior usam `ProfileUi`, compartilhado com RH/admin, para evitar divergência visual posterior.
- “Meu perfil” fica no rodapé lateral, próximo de Sair, nas três visões. O destaque ativo e espaçamento dos demais links do colaborador seguem o padrão do painel.
- Trocar abas mantém o rascunho dos campos. Email do colaborador permanece somente leitura. Senha e 2FA continuam nos endpoints e regras do colaborador.
- Administração de módulos e assinatura não é exposta ao colaborador. A troca de empresa existente permanece disponível apenas quando há mais de um vínculo elegível.
- Teste isolado adicional aprovado: abas Conta/Segurança, preservação de rascunho, email bloqueado, menu Meu perfil/Sair, ausência de abas administrativas e ausência de qualquer requisição de escrita durante essa navegação.
- Cabeçalho mobile: rótulo visual de idioma oculto em telas pequenas, mantendo o nome acessível do controle; idioma, tema, notificações e perfil cabem na mesma linha. Alinhamento dos botões conferido por teste e captura em 390px.

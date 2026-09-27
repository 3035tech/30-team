# RH P2 — clareza sem alteração de classificação

## Escopo e decisões

- 3.9: perfil / Estilo, Mapa de Motivadores. Cinco pontuações positivas mais altas; desempate existente pelo identificador; explicações curtas para as 13 dimensões. Removido resumo repetido. Nenhuma resposta, pontuação ou interpretação salva é reescrita.
- 6.1: aba 9-Box dentro de Avaliações. Desempenho horizontal, potencial vertical. Os IDs das nove classificações existentes são apenas transpostos na apresentação: `[3,6,9]`, `[2,5,8]`, `[1,4,7]`. Legenda acessível por teclado, sem decisão automática.
- 7.1: controles com nomes completos, percentual, associação acessível e sincronização slider/número. O modelo existente tem nove tipos T1–T9, não 27 subtipos. Pesos independentes de 0 a 100; `normalizeRubric` já arredonda para inteiros. Não se exige soma de 100, nem se modifica persistência.
- 8.1: seleção com período, hierarquia de títulos, responsáveis explícitos, atividades recolhíveis, erro recuperável separado do estado vazio. Removido título OKRs duplicado.

## Limite de produto em OKRs

A primeira etapa preservou `okr-cycles` (ciclo → áreas → atividades). Em seguida, o usuário autorizou a evolução funcional, mantendo os objetivos separados por área. A nova implementação é ciclo → área → objetivos → resultados-chave, com metas numéricas, responsáveis e histórico próprio. Evidências, compatibilidade e implantação estão em [rh-okr-hierarchy-verification-2026-09-26.md](rh-okr-hierarchy-verification-2026-09-26.md).

## Design e modelagem

Reutilizados os tokens existentes: canvas #F5F4F7, superfície #FFFFFF, texto #1A1625, marca #8930B8, secundário #EDEBF2. Tipografia de interface existente, títulos e conteúdo alinhados à esquerda; agrupamento por entidade e rótulos permanentes, sem novo tema. Sem tabelas, migrations, dependências ou configuração nova: o conteúdo adicionado é texto explicativo fixo e mapeamento de apresentação.

## Provas reproduzíveis

- `node --test test/unit/p2-clarity.unit.test.js test/unit/motivators-radar.unit.test.js test/unit/enps-nine-box.test.js test/unit/okr-cycles.unit.test.js`: classificação de todas as células, Top 5/desempate sem mutação e cálculos existentes.
- `BASE_URL=http://localhost:3014 npx playwright test test/e2e/p2-clarity.spec.js`: eixos/pessoas com fixture de nove células; Top 5 no perfil; cargo sintético com edição/reabertura e soma >100; erro/recuperação OKR; capturas desktop/mobile. Fixtures visuais não certificam dados de produção.
- Sem deploy ou alteração de produção. A evolução funcional de OKRs autorizada posteriormente possui relatório separado, vinculado acima.

Resultado final local: build aprovado; 16 testes unitários focados e 50 de segurança aprovados; seis testes de navegador aprovados (quatro P2, edição de vagas P0 e dependentes P1). Capturas de 390px inspecionadas e rolagem horizontal da página verificada. A primeira rodada detectou largura das abas no mobile e uma expectativa de teste incompatível com o arredondamento já existente; ambos foram ajustados antes da rodada final.

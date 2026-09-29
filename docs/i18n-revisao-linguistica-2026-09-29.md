# Revisão linguística e regional — 29/09/2026

## Resultado

A aplicação ainda não está integralmente localizada. A inspeção estrutural dos
catálogos e a amostra contextual de RH identificaram mistura de idiomas,
traduções literais e conceitos brasileiros apresentados como genéricos. Esta
revisão não equivale à leitura manual de cada mensagem nem à localização
jurídica do produto.

No início da revisão: 6.074 strings no catálogo pt-BR, 6.073 no en-US, 17
substituições em pt-PT e 163 em es-419. Esses números abrangem os catálogos
centrais, não o catálogo separado da landing page, e não medem porcentagem de
tradução: textos portugueses podem legitimamente ser compartilhados. O
fallback do espanhol para inglês, porém, deixa grande parte do painel em outro
idioma. Também foram encontradas 162 linhas com decisões binárias de idioma
em `app` (não são 162 defeitos confirmados).

## Ajustes feitos nesta entrega

- Separação entre es-ES (🇪🇸 Español (España)) e es-419
  (🌎 Español (Latinoamérica)); mantém `es` como alias latino-americano.
- Espanha herda os textos comuns em espanhol e substitui termos regionais.
  A seleção é preservada nas sessões Edge, HTML e metadados Open Graph.
- Organograma novo localizado nas cinco variantes, com nomenclatura própria
  para gestor/chefia, cargo/puesto e equipe/equipa.
- Organização e controles frequentes recebem vocabulário espanhol; Portugal
  passa a usar Guardar, A carregar, Equipa e Telemóvel nos pontos revisados.
- Busca de entidades deixa de escolher apenas entre inglês e português.
- Tipo de vínculo substitui Formato de trabalho no cadastro brasileiro;
  inglês usa Employment type. CLT e RG continuam identificados como brasileiros
  nos rótulos regionais alterados.
- Inglês: Employee details, Add employee, Talent pool (rótulos), Time off and
  leave, Time tracking and balances, Team vacation balances e Not provided.
- Notificação de entrevista ganha tradução inglesa e espanhola; antes o título
  herdava português.

## Convenções de vocabulário

| Conceito | Brasil | Portugal | Inglês EUA | Espanha | América Latina |
|---|---|---|---|---|---|
| Superior hierárquico | Gestor direto | Chefia direta | Direct manager | Responsable directo | Jefe directo |
| Posição profissional | Cargo | Função | Job title | Puesto | Cargo |
| Equipe | Equipe | Equipa | Team | Equipo | Equipo |
| Telefone pessoal | Celular | Telemóvel | Mobile phone | Teléfono móvil | Celular |
| Vagas | Vagas | Ofertas de emprego | Job openings | Ofertas de empleo | Vacantes |
| Remuneração | Remuneração | Remuneração | Compensation | Retribución | Compensación |
| Saldo coletivo de férias | Saldo de férias da equipe | Saldo de férias da equipa | Team vacation balances | Saldos de vacaciones del equipo | Saldos de vacaciones del equipo |

A tabela é uma convenção editorial, não uma declaração de que alternativas
seriam incorretas. “Colaborador” é comum em produtos latino-americanos;
“Employee” costuma ser mais claro no cadastro de empregados em inglês.
América Latina não é um único país: termos como licença médica/incapacidade
exigem definição do mercado e do significado do campo antes de adaptação.

## Pendências identificadas

1. Completar os catálogos espanhóis: ainda há fallback inglês em vários módulos.
2. Migrar decisões `locale === 'en'`/`startsWith('en')` para chaves localizadas;
   `FormalCompetencyReviewsBlock.jsx` ainda contém textos inline em português.
3. Revisar contexto das ocorrências inglesas restantes de Collaborator, RH,
   DP, Hour bank e Talent bank em ajuda/textos longos. Não substituir globalmente
   identificadores técnicos nem colaboradores externos por empregados.
4. Completar adaptação pt-PT em módulos ainda herdados do Brasil.
5. Regionalizar o modelo de documentos/endereço separadamente da língua:
   CPF de 11 dígitos, CEP de 8 dígitos, UF, IBGE, RG e CLT são dados brasileiros.
   Não renomear CPF como NIF/SSN ou RG como DNI sem mudar validação/modelo.
6. Revisar telas completas em cada mercado após completar os catálogos,
   incluindo pluralização, erros, emails, ajuda e textos da landing page.
   A landing espanhola ainda compartilha conteúdo entre as duas variantes.

## Referências de uso real

As escolhas foram comparadas com terminologia de produtos de RH; as fontes
indicam uso contextual, não regras universais:

- [BambooHR — Employee records](https://www.bamboohr.com/platform/hr-data-and-reporting/employee-records): employee records e time off.
- [Factorial Portugal — Portal do colaborador](https://factorialhr.pt/portal-colaborador): equipa, colaborador e ausências.
- [Buk — Gestão de pessoas](https://supportcenter.buk.cl/hc/es-419/categories/36342351203099-Gesti%C3%B3n-de-Personas): ficha del colaborador e gestión de vacaciones.
- [Personio Espanha — Ausencias](https://www.personio.es/funciones/ausencias/): vacaciones, ausencias e empleados.

Os testes automatizados verificam resolução de variantes e termos selecionados;
passarem não comprova que todos os textos da aplicação estejam traduzidos.

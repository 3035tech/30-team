# CEP no app do colaborador

`GET /api/mobile/v1/employee/dp/postal-address?cep=93701255` reutiliza
`lookupCep` do portal web sob autenticação bearer mobile. Não consome o cookie
web nem cria uma segunda implementação de consulta ao ViaCEP.

Request: exatamente um parâmetro `cep`, com oito dígitos. Response:
`{ cep, street, neighborhood, city, state }`, `Cache-Control: no-store`.
Autenticação obrigatória; rate limit 30 consultas/min por empresa + empregado
resolvidos pela sessão. Parâmetros extras (incluindo empresa) e duplicados são
rejeitados. Erros usam o catálogo canônico. Sem gravação de dados, log de CEP
ou nova query de negócio; autenticação e rate limiter existentes são mantidos.

O app preenche endereço/cidade/UF apenas mediante ação explícita e mantém o
número separado. Falha do provedor permite retry/manual. CPF, telefone e CEP
usam máscaras visuais, mantendo valores em dígitos. A validade do número usa
a migration 123 já existente; versões antigas que omitem o campo preservam
o valor armazenado. O número nunca é extraído dos endereços legados.

Implantar o backend antes do novo build mobile. O endpoint aditivo pode
permanecer durante rollback do app. Nenhuma migration nova neste incremento.
Guia/assistente web não mudam, pois não há nova ação gerencial no portal.

Provas: `node --experimental-vm-modules --test
test/unit/mobile-postal-address.unit.test.js` cobre anônimo, sessões A/B,
parâmetros inválidos/duplicados, rate limit, CEP ausente e falha do provedor,
com dependências simuladas. Build e regressão `dp-address-timeline.test.js`
com DTOV local validam compatibilidade de endereço/ponto. Nenhum teste usa
produção ou o ViaCEP real.

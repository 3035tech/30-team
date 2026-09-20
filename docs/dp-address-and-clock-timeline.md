# Número do endereço e timeline do ponto

- DP do colaborador e ficha DP do RH: campo Número separado do Endereço,
  opcional, textual e limitado a 20 caracteres. Aceita 30, 30A, s/n etc.
- O CEP preenche apenas os campos existentes de endereço/cidade/UF. Nunca
  sobrescreve o número digitado. Nenhum endereço legado é dividido automaticamente.
- APIs web, RH e mobile expõem `profile.addressNumber`. Enviar string vazia
  (ou null) limpa o campo; omitir preserva o valor atomicamente no UPSERT.
  Clientes antigos continuam salvando sem apagar o novo número. Não altera
  a interface do app mobile nesta entrega, apenas compatibilidade de contrato.
- Número é dado de endereço: mesmas permissões e isolamento de empresa da ficha,
  sem inserir o conteúdo em logs ou notificações. GET não adiciona query ou índice.
- Ponto web: timeline vertical sem alterar a ordem cronológica enviada pela API,
  horários, alertas, geolocalização ou regra de entrada/saída. Data em formato local.
  Sem registros mostra vazio; falha de carregamento oferece nova tentativa.

## Deploy / rollback

Aplicar `123_dp_address_number.sql` (`npm run db:migrate`) antes do web. Também
disponível em `scripts/scripts-banco-pendentes.sql`. Migration aditiva e idempotente.
Para rollback, voltar à imagem anterior e manter a coluna: escritores antigos
não a atualizam. Não remover a coluna com números preenchidos.

## Prova

DTOV somente: `npm run dtov:reset`, build `.next-polish-build`, executar
`node test/dtov/dp-address-timeline.test.js`, finalizar com `npm run dtov:down`.
Inclui persistência, limites, omissão por clientes antigos, isolamento, formulário
com CEP, timeline responsiva e atualização após registrar ponto no banco temporário.

# Licença early access por empresa

Uma empresa recebe uma licença gratuita de um ano a partir do primeiro cadastro
de gestor com `signup_source = early_access`, mesmo antes da ativação por e-mail.
O perfil mostra a licença acima das abas, para todos os gestores dessa empresa.
Empresas sem esse cadastro não recebem uma licença automaticamente.

## Regras

- Número `30T-EA-000001`: identificador sequencial, não segredo nem credencial.
  Sequências PostgreSQL podem ter lacunas por rollback ou conflito, sem duplicação.
- `users` AFTER INSERT emite a licença na mesma transação do cadastro. A chave
  primária `company_id` impede múltiplas licenças sob concorrência.
- Login, reenvio de convite, novos gestores, troca de senha e atualização de perfil
  não alteram o número nem renovam a validade.
- Início é `users.created_at`; fim é um ano calendário em UTC, não 365 dias.
  Um cadastro em 29/02 vence em 28/02 do próximo ano no mesmo horário UTC.
  O perfil exibe data e hora no fuso local do navegador.
- `/api/me` calcula o vencimento no banco e retorna apenas a licença da empresa
  obtida do usuário autenticado, sem aceitar empresa ou datas enviadas pelo cliente.
- Vencimento apenas exibe aviso no perfil. Não há cobrança, renovação automática,
  e-mail/cron, bloqueio de gestor, limite de colaboradores ou licença de empregado.
  Autenticação, vínculo ativo e permissões normais permanecem obrigatórios.
- Não libera criação de novas empresas para gestores early access.
- Portal do colaborador: Sair no rodapé lateral e no menu de perfil reutiliza o
  mesmo componente. Falha no logout mantém a tela e oferece nova tentativa.

## Deploy e rollback

1. Aplicar `122_company_early_access_license.sql` via `npm run db:migrate` antes
   de publicar o novo web. O delta também está em `scripts/scripts-banco-pendentes.sql`.
2. A migration preenche empresas existentes a partir do menor `created_at` dos
   gestores early access, inclusive desativados/excluídos, e nunca sobrescreve uma
   licença existente. Reexecução é idempotente.
3. Publicar web. A trigger também cobre instâncias antigas durante o rollout.
4. Verificar Perfil com empresa early access e testar logout do colaborador.

Rollback: voltar à imagem web anterior mantendo tabela, função e trigger. São
aditivas, sem dependência de middleware, autorização ou endpoints de empregado.
Não apagar licenças para fazer rollback: preservar números e datas emitidos.

## Custo e prova

Leitura do perfil acrescenta um LEFT JOIN pela PK `company_id`, no máximo uma
linha, sem request adicional ou varredura de usuários. Backfill agrega usuários
uma única vez na migration; emissão normal faz uma inserção com conflito único.

Prova local: `npm run dtov:reset`, build com `NEXT_DIST_DIR=.next-polish-build`,
`node --test test/unit/company-license.unit.test.js` e
`node test/dtov/company-license.test.js`; encerrar com `npm run dtov:down`.
Nunca executar os testes DTOV no banco de produção.

# Ponto: visão do gestor (fase 1)

DP → Ponto (`TimeClockWorkspace`) com três abas. Capacidade: `dp.view` ou `team.view` (mesmo ACL do ponto MVP).

## Controle de ponto

- Lista paginada de colaboradores (busca, filtro por unidade, marcador de dias a revisar nos últimos 31 dias): `GET /api/admin/time-clock/people`.
- Espelho por período (≤ 62 dias, limitado a hoje): `GET /api/admin/time-clock/mirror?candidateId&from&to`. Por dia: ocorrência, marcações, trabalhado, extra, falta e saldo corrido do banco (lançamentos aprovados).
- Ações (`POST /api/admin/time-clock/mirror`, `action`):
  - `adjust`: anula até 12 marcações (`voided_at`, `voided_by_user_id`, `void_reason`) e inclui até 4 novas com `source = manager`. A original nunca é apagada.
  - `justify` / `unjustify`: uma justificativa por pessoa/dia (`employee_time_day_justifications`, motivo em domínio fechado).
- Todas as ações vão para `audit_log` (`time_clock.day_*`).

## Banco de horas

Saldos paginados com cargo e caminho da unidade (`GET /api/admin/hour-bank?offset`). Fila de aprovação, lançamento manual e CSV continuam no `HourBankAdminBlock`.

## Fechamento

- `GET/POST/PATCH /api/admin/time-clock/closures` (listar, criar, cancelar com motivo).
- Só período já encerrado no fuso da escala, até 92 dias. Escopo: empresa inteira ou uma unidade (vale para subunidades).
- Sobreposição rejeitada na mesma unidade ou quando um dos dois é da empresa inteira (serializado com `FOR UPDATE` na empresa).
- Dia fechado bloqueia ajuste, justificativa, revisão de marcação e marcação manual (`TIME_CLOCK_PERIOD_CLOSED`, 409).

## Ponto por colaborador

- `candidates.time_clock_override BOOLEAN NULL` (migration 140): `NULL` segue o vínculo (`work_format`), `TRUE`/`FALSE` é exceção do RH. Sem ponto por padrão: `pj` e `cooperative`. CLT, estágio e vínculo vazio têm ponto (comportamento anterior preservado).
- Regra única em `lib/people/time-clock-eligibility.js` (`resolveTimeClockEligibility` + `timeClockEnabledSql`). `getTimeClockAccess` (`lib/people/time-clock.js`) junta módulo DP da empresa e regra da pessoa numa query.
- Edição: DP → Editar → Controle de ponto (`PATCH /api/admin/candidates/[id]` com `timeClockOverride`: `null` / `true` / `false`; exige `dp.view` ou `team.view`). Mudança gera `candidate.time_clock_override` no `audit_log` com de/para.
- Portal: seção, atalho, badge e card de boas-vindas somem (`timeClockEnabled` em `GET /api/employee/home`); `/employee/time-clock` redireciona para `/employee`. Mobile: `features.timeClock` em `GET /api/mobile/v1/employee/home`.
- API: `GET/POST /api/employee/time-clock` e mobile recusam com `TIME_CLOCK_DISABLED` (403), inclusive quando o módulo DP está desligado na empresa (antes não checava).
- Gestor: lista mostra "Sem controle de ponto" (essas pessoas vão para o fim); espelho não calcula falta nem horas faltantes, mas mostra marcações antigas. Ajuste de dias passados pelo RH (`source = manager`) continua permitido.

## Localização da batida

- Obrigatória em toda batida do colaborador. Web: o portal sempre pede a localização (sem checkbox) e `POST /api/employee/time-clock` recusa sem coordenadas válidas com `GEOLOCATION_REQUIRED` (400). Mobile já exigia (`INVALID_DATA`, contrato mantido). Ajuste do RH (`source = manager`) não tem localização.
- `parsePunchCoordinates` (`lib/time-clock-format.js`, puro) valida faixa e formato; `createTimePunch` grava com 6 casas (`latitude`/`longitude` em `employee_time_punches`).
- Antes desta mudança o cabeçalho `Permissions-Policy: geolocation=()` (em `proxy.js` e `next.config.js`) bloqueava a localização no navegador, então batidas web antigas não têm coordenadas. Agora é `geolocation=(self)`.
- Gestor: no detalhe do dia do espelho, cada batida do colaborador tem "Ver local no mapa" (`CollapsibleBlock`). O mapa é um iframe do OpenStreetMap (sem chave de API) montado só ao abrir, então as coordenadas só saem para o OpenStreetMap quando o gestor pede. CSP: `frame-src` inclui `https://www.openstreetmap.org`.
- LGPD: o portal avisa "A localização é registrada a cada batida". A finalidade é comprovar o local do registro de ponto; não há rastreio contínuo, só o ponto no momento da batida.

## Regras assumidas

- Dias úteis seg–sex; escala única da empresa; tolerância = carência de atraso da escala.
- Dias antes da admissão contam como descanso.
- Sem escala por colaborador nem calendário de feriados (feriado entra via justificativa). Fase 2 em `docs/BACKLOG.md` (B-2721).

## Deploy

Aplicar `migrations/137_time_clock_manager.sql` (aditiva; colunas novas nulas em `employee_time_punches` + 2 tabelas). Rollback: a UI nova para de funcionar, os dados antigos ficam intactos.

`migrations/140_candidate_time_clock_override.sql`: coluna nula aditiva em `candidates`; ninguém perde o ponto até o vínculo ser PJ/Cooperado. Atenção: colaboradores **já cadastrados** como PJ ou Cooperado deixam de ver o ponto no deploy (é a regra pedida); para mantê-los, marque "Sempre ativo" no perfil.

## Prova

- `node --test test/unit/time-clock-manager.unit.test.js`
- DTOV: `test/dtov/time-clock-manager.dtov.test.js`, `time-clock.dtov.test.js`, `hour-bank.dtov.test.js`

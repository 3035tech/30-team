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

## Regras assumidas

- Dias úteis seg–sex; escala única da empresa; tolerância = carência de atraso da escala.
- Dias antes da admissão contam como descanso.
- Sem escala por colaborador nem calendário de feriados (feriado entra via justificativa). Fase 2 em `docs/BACKLOG.md` (B-2721).

## Deploy

Aplicar `migrations/137_time_clock_manager.sql` (aditiva; colunas novas nulas em `employee_time_punches` + 2 tabelas). Rollback: a UI nova para de funcionar, os dados antigos ficam intactos.

## Prova

- `node --test test/unit/time-clock-manager.unit.test.js`
- DTOV: `test/dtov/time-clock-manager.dtov.test.js`, `time-clock.dtov.test.js`, `hour-bank.dtov.test.js`

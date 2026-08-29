# Jornada de chegada do colaborador

Visão do colaborador em `/employee` para o ritual pós-contratação já gerenciado pelo RH na Equipe.

## Gestor (Equipe → Jornada)

| Bloco | Tabela | Itens |
|-------|--------|-------|
| Checklist D1 | `employee_pre_onboarding_items` | kit, folha de acessos, call RH, onboarding gestor |
| Check-ins | `employee_onboarding_checkins` | D30, D60, D90 |

RH marca itens como feito/pulado, registra notas e pode colar **link Meet** (calls D1 e check-ins).

Migration `076_employee_onboarding_journey.sql`: key `access_sheet`, colunas `meet_url` e `employee_ack_at`.

## Colaborador

- `GET /api/employee/home` inclui `journey` + tarefas próximas (14 dias).
- `GET/PATCH /api/employee/onboarding` — leitura e confirmação (`employee_ack_at`).
- UI: seção **Minha chegada** em `EmployeeHomeClient` (`EmployeeOnboardingJourneySection`).

Confirmações do colaborador **não** alteram status do RH — só registram ack para visibilidade.

## API admin (existente)

- `PATCH …/pre-onboarding` — `{ action: 'setMeetUrl', itemId, meetUrl }` ou status normal com `meetUrl` opcional.
- `PATCH …/onboarding-checkins` — idem para check-ins.

## i18n

Chaves `employeeHome.journey*` e `panel.preOnboarding.item.access_sheet` (pt-BR + en).

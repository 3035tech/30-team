-- 137: Visão do gestor no ponto (espelho por período, ajuste, justificativa, fechamento).
--
-- Modelagem:
-- * Marcação nunca é editada nem apagada (trilha tipo Portaria 671): o gestor desconsidera
--   a original (voided_*) com motivo e inclui a correta como nova linha source='manager'.
--   Colunas na própria marcação porque o void é 0..1 por marcação, sem histórico próprio.
-- * Justificativa (abono) é 0..1 por pessoa/dia com motivo de domínio fechado (CHECK),
--   editável → tabela própria com UNIQUE (company_id, candidate_id, work_on).
-- * Fechamento é entidade própria (número, período, filtro opcional por unidade, situação,
--   quem fechou/cancelou). Fechamento concluído trava ajustes/justificativas do período.
--   Sobreposição é validada na aplicação sob lock da empresa (evita btree_gist).

ALTER TABLE employee_time_punches
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS void_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE employee_time_punches
  DROP CONSTRAINT IF EXISTS employee_time_punches_void_chk;
ALTER TABLE employee_time_punches
  ADD CONSTRAINT employee_time_punches_void_chk CHECK (
    (voided_at IS NULL AND void_reason IS NULL)
    OR (voided_at IS NOT NULL AND char_length(btrim(void_reason)) BETWEEN 1 AND 500)
  );

COMMENT ON COLUMN employee_time_punches.voided_at IS
  'Marcação desconsiderada pelo gestor (não entra em cálculos). A linha é preservada para histórico.';
COMMENT ON COLUMN employee_time_punches.created_by_user_id IS
  'Gestor que incluiu a marcação (source=manager). NULL para batida do próprio colaborador.';

CREATE TABLE IF NOT EXISTS employee_time_day_justifications (
  id                  BIGSERIAL PRIMARY KEY,
  company_id          BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id        BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  work_on             DATE NOT NULL,
  reason              TEXT NOT NULL,
  note                TEXT NOT NULL DEFAULT '',
  created_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_time_day_justifications_reason_chk
    CHECK (reason IN ('medical_certificate', 'excused_absence', 'holiday', 'day_off', 'other')),
  CONSTRAINT employee_time_day_justifications_note_len
    CHECK (char_length(note) <= 500),
  CONSTRAINT employee_time_day_justifications_unique
    UNIQUE (company_id, candidate_id, work_on)
);

COMMENT ON TABLE employee_time_day_justifications IS
  'Abono do dia no espelho de ponto: zera horas faltantes do dia. Não altera marcações.';

CREATE TABLE IF NOT EXISTS time_clock_closures (
  id                    BIGSERIAL PRIMARY KEY,
  company_id            BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_start          DATE NOT NULL,
  period_end            DATE NOT NULL,
  org_unit_id           INTEGER,
  status                TEXT NOT NULL DEFAULT 'closed',
  note                  TEXT NOT NULL DEFAULT '',
  closed_by_user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  closed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at          TIMESTAMPTZ,
  cancel_reason         TEXT,
  CONSTRAINT time_clock_closures_org_unit_fk
    FOREIGN KEY (org_unit_id, company_id) REFERENCES org_units(id, company_id),
  CONSTRAINT time_clock_closures_period_chk
    CHECK (period_end >= period_start AND period_end - period_start <= 92),
  CONSTRAINT time_clock_closures_status_chk
    CHECK (status IN ('closed', 'cancelled')),
  CONSTRAINT time_clock_closures_cancel_chk CHECK (
    (status = 'closed' AND cancelled_at IS NULL AND cancel_reason IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL
        AND char_length(btrim(cancel_reason)) BETWEEN 1 AND 500)
  ),
  CONSTRAINT time_clock_closures_note_len CHECK (char_length(note) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_time_clock_closures_company_active
  ON time_clock_closures (company_id, period_start, period_end)
  WHERE status = 'closed';

CREATE INDEX IF NOT EXISTS idx_time_clock_closures_company_list
  ON time_clock_closures (company_id, id DESC);

COMMENT ON TABLE time_clock_closures IS
  'Fechamento do ponto por período (empresa toda ou uma unidade e suas subunidades). Concluído trava ajustes; cancelar destrava.';

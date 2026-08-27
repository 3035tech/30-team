-- 058 — Exit analysis (B-1006, Epic B-1000)
-- Registro de saída (motivo + texto) + agregação motivos × tipo/área.
-- Insights: o que corrigir na seleção (M1) e gestão (M3/M4).

-- Registros de saída (alumni)
CREATE TABLE IF NOT EXISTS exit_records (
  id                   BIGSERIAL PRIMARY KEY,
  candidate_id         BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  exit_date            DATE NOT NULL,
  exit_type            TEXT NOT NULL,
  exit_reason          TEXT NOT NULL,
  notes                TEXT NOT NULL DEFAULT '',
  created_by_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id),
  CONSTRAINT exit_records_type_chk CHECK (exit_type IN ('voluntary', 'involuntary', 'mutual')),
  CONSTRAINT exit_records_reason_chk CHECK (
    exit_reason IN (
      -- Voluntary
      'better_offer', 'career_growth', 'compensation', 'work_life_balance', 
      'relocation', 'personal', 'study', 'entrepreneurship',
      -- Involuntary
      'performance', 'conduct', 'restructuring', 'position_eliminated',
      -- Both
      'culture_fit', 'manager_relationship', 'lack_of_challenge', 'other'
    )
  ),
  CONSTRAINT exit_records_notes_len CHECK (char_length(notes) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_exit_records_company_date
  ON exit_records (company_id, exit_date DESC);

CREATE INDEX IF NOT EXISTS idx_exit_records_candidate
  ON exit_records (candidate_id);

COMMENT ON TABLE exit_records IS
  'Registros de saída de colaboradores (alumni). Um registro por candidato. Usado para análise demissional.';

COMMENT ON COLUMN exit_records.exit_type IS
  'voluntary = pediu demissão; involuntary = dispensado; mutual = acordo';

COMMENT ON COLUMN exit_records.exit_reason IS
  'Motivo principal da saída. Ver constraint para taxonomia completa.';

COMMENT ON COLUMN exit_records.notes IS
  'Notas de saída: contexto, feedback, o que poderia ser diferente. Hedging: "tende a ter deixado por...".';

-- Índice para agregar motivos × tipo T1-T9
CREATE INDEX IF NOT EXISTS idx_exit_records_analysis
  ON exit_records (company_id, exit_type, exit_reason);

COMMENT ON INDEX idx_exit_records_analysis IS
  'Agregação: motivos × tipo × área. Join com assessments.top_type e candidates para análise.';

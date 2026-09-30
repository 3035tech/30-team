-- 135: Recontratação de ex-colaboradores (alumni → employee) sem apagar a saída.
--
-- Modelagem: cada passagem pela empresa que termina gera uma linha em exit_records
-- (histórico relacional, não JSONB). A volta fecha a saída aberta com rehired_at,
-- preservando motivo/tipo para turnover. Regra de integridade:
-- no máximo UMA saída aberta (rehired_at IS NULL) por pessoa, em vez de uma saída por pessoa.

ALTER TABLE exit_records
  ADD COLUMN IF NOT EXISTS rehired_at DATE;

ALTER TABLE exit_records
  ADD COLUMN IF NOT EXISTS rehired_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE exit_records
  DROP CONSTRAINT IF EXISTS exit_records_rehired_after_exit_chk;
ALTER TABLE exit_records
  ADD CONSTRAINT exit_records_rehired_after_exit_chk
  CHECK (rehired_at IS NULL OR rehired_at >= exit_date);

-- Remove o UNIQUE (candidate_id) original (nome gerado pelo Postgres pode variar).
DO $$
DECLARE
  v_name TEXT;
BEGIN
  FOR v_name IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_attribute att
        ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
     WHERE con.conrelid = 'public.exit_records'::regclass
       AND con.contype = 'u'
       AND array_length(con.conkey, 1) = 1
       AND att.attname = 'candidate_id'
  LOOP
    EXECUTE format('ALTER TABLE exit_records DROP CONSTRAINT %I', v_name);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_exit_records_open_candidate
  ON exit_records (candidate_id)
  WHERE rehired_at IS NULL;

COMMENT ON TABLE exit_records IS
  'Saídas de colaboradores (uma linha por passagem encerrada). No máximo uma saída aberta (rehired_at IS NULL) por candidato. Usado para análise demissional e turnover.';

COMMENT ON COLUMN exit_records.rehired_at IS
  'Data de retorno quando a pessoa foi reativada/recontratada. NULL = saída em aberto (pessoa segue alumni).';

COMMENT ON INDEX uq_exit_records_open_candidate IS
  'Garante no máximo uma saída aberta por pessoa; saídas anteriores ficam como histórico.';

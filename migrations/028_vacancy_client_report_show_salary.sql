-- 028: flag por vaga — exibir pretensão salarial no relatório do cliente (/r)
-- Default FALSE: modelo outsourcing/consultoria não vaza pretensão do profissional ao cliente final.

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS client_report_show_salary BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN vacancies.client_report_show_salary IS
  'Se TRUE, o relatório público /r inclui pretensão salarial do candidato. FALSE = omitir (padrão, típico de outsourcing).';

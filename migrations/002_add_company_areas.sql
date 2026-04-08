-- 002_add_company_areas.sql
-- Expand fixed areas for a typical tech company (3035tech)

BEGIN;

INSERT INTO areas (key, label)
VALUES
  ('produto', 'Produto'),
  ('cs', 'Customer Success'),
  ('atendimento', 'Atendimento/Suporte'),
  ('marketing', 'Marketing'),
  ('operacoes', 'Operações/Projetos'),
  ('juridico', 'Jurídico/Compliance')
ON CONFLICT (key) DO NOTHING;

COMMIT;


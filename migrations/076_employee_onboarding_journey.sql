-- Jornada de chegada visível ao colaborador: folha de acessos, link Meet, confirmação do colaborador.

ALTER TABLE employee_pre_onboarding_items
  DROP CONSTRAINT IF EXISTS employee_pre_onboarding_item_key_chk;

ALTER TABLE employee_pre_onboarding_items
  ADD CONSTRAINT employee_pre_onboarding_item_key_chk
  CHECK (item_key IN ('welcome_kit', 'access_sheet', 'rh_onboarding_call', 'manager_onboarding'));

ALTER TABLE employee_pre_onboarding_items
  ADD COLUMN IF NOT EXISTS meet_url TEXT,
  ADD COLUMN IF NOT EXISTS employee_ack_at TIMESTAMPTZ;

ALTER TABLE employee_onboarding_checkins
  ADD COLUMN IF NOT EXISTS meet_url TEXT,
  ADD COLUMN IF NOT EXISTS employee_ack_at TIMESTAMPTZ;

COMMENT ON COLUMN employee_pre_onboarding_items.meet_url IS 'Link Meet (calls RH/gestor); opcional';
COMMENT ON COLUMN employee_pre_onboarding_items.employee_ack_at IS 'Colaborador confirmou recebimento/ciente';
COMMENT ON COLUMN employee_onboarding_checkins.meet_url IS 'Link Meet do check-in D30/D60/D90';
COMMENT ON COLUMN employee_onboarding_checkins.employee_ack_at IS 'Colaborador confirmou presença/ciente';

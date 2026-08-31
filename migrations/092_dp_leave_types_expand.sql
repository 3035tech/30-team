-- 092: Expand DP leave types (registrar ausência) — keep existing values valid.

ALTER TABLE employee_leave_requests
  DROP CONSTRAINT IF EXISTS employee_leave_type_chk;

ALTER TABLE employee_leave_requests
  ADD CONSTRAINT employee_leave_type_chk
  CHECK (leave_type IN (
    'vacation',
    'sick',
    'parental',
    'bereavement',
    'marriage',
    'medical_appointment',
    'compensatory',
    'unpaid',
    'other'
  ));

COMMENT ON COLUMN employee_leave_requests.leave_type IS
  'Closed taxonomy: vacation/sick/parental/bereavement/marriage/medical_appointment/compensatory/unpaid/other.';

INSERT INTO schema_migrations (name) VALUES ('092_dp_leave_types_expand.sql')
ON CONFLICT (name) DO NOTHING;

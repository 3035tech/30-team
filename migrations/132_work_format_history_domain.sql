-- A fixed application domain is CHECK-constrained, not a configurable lookup table.
-- Do not reinterpret unknown values: fail migration if history violates the domain.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'employee_work_format_history'::regclass AND conname = 'employee_work_format_history_previous_check') THEN
    ALTER TABLE employee_work_format_history ADD CONSTRAINT employee_work_format_history_previous_check
      CHECK (previous_format IS NULL OR previous_format IN ('clt', 'intern', 'cooperative', 'pj'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'employee_work_format_history'::regclass AND conname = 'employee_work_format_history_new_check') THEN
    ALTER TABLE employee_work_format_history ADD CONSTRAINT employee_work_format_history_new_check
      CHECK (new_format IS NULL OR new_format IN ('clt', 'intern', 'cooperative', 'pj'));
  END IF;
END $$;

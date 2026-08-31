-- =============================================================================
-- DEMO "Todos os Dados" — módulos pós-080 (DP, mural, OKR, ouvidoria, ponto)
-- Rodar DEPOIS de seed-demo-todos-os-dados.sql (tenant slug=todos-os-dados-demo).
-- Preferência: o seed JS já inclui este pacote (npm run db:seed-demo-todos-os-dados:confirm).
-- =============================================================================
-- psql "$DATABASE_URL" -f scripts/seed-demo-todos-os-dados-modules.sql
-- Idempotente o bastante para reexecutar (WHERE NOT EXISTS / ON CONFLICT).

BEGIN;

DO $$
DECLARE
  v_company_id BIGINT;
  v_hr_id BIGINT;
  v_emp RECORD;
  v_i INT := 0;
  v_from BIGINT;
  v_to BIGINT;
  v_n INT;
  v_cycle_id BIGINT;
  v_area_id BIGINT;
  v_act_id BIGINT;
  v_course_id BIGINT;
  v_channel_id BIGINT;
  v_survey_id BIGINT;
  v_role_id BIGINT;
BEGIN
  SELECT id INTO v_company_id FROM companies
   WHERE slug = 'todos-os-dados-demo' AND deleted = FALSE LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa todos-os-dados-demo não encontrada. Rode o seed principal primeiro.';
  END IF;

  SELECT id INTO v_hr_id FROM users
   WHERE company_id = v_company_id AND LOWER(email) = 'hr@todos-os-dados.demo' AND deleted = FALSE
   LIMIT 1;

  SELECT id INTO v_role_id FROM job_roles
   WHERE company_id = v_company_id AND active = TRUE ORDER BY id LIMIT 1;

  SELECT COUNT(*)::int INTO v_n FROM candidates
   WHERE company_id = v_company_id AND employment_status = 'employee';

  -- Organograma simples + cargo
  IF v_role_id IS NOT NULL THEN
    UPDATE candidates SET job_role_id = v_role_id
     WHERE company_id = v_company_id AND employment_status = 'employee' AND job_role_id IS NULL;
  END IF;

  UPDATE candidates c SET manager_candidate_id = m.id
    FROM candidates m
   WHERE c.company_id = v_company_id AND m.company_id = v_company_id
     AND m.full_name = 'Elena Ferreira'
     AND c.full_name IN ('Lucas Colaborador', 'Diego Martins')
     AND c.id <> m.id;

  -- Template D1
  INSERT INTO company_pre_onboarding_templates (
    company_id, item_key, label_pt, label_en, owner_role, sort_order, active, due_offset_days, require_meet
  ) VALUES
    (v_company_id, 'welcome_kit', 'Kit de boas-vindas', 'Welcome kit', 'rh', 10, TRUE, 0, FALSE),
    (v_company_id, 'access_sheet', 'Acessos e ferramentas', 'Access and tools', 'it', 20, TRUE, 0, FALSE),
    (v_company_id, 'rh_onboarding_call', 'Conversa de onboarding RH', 'HR onboarding call', 'rh', 30, TRUE, 0, TRUE),
    (v_company_id, 'manager_onboarding', 'Onboarding com o gestor', 'Manager onboarding', 'manager', 40, TRUE, 0, TRUE)
  ON CONFLICT (company_id, item_key) DO NOTHING;

  FOR v_emp IN
    SELECT id, full_name FROM candidates
     WHERE company_id = v_company_id AND employment_status = 'employee'
     ORDER BY id
  LOOP
    v_i := v_i + 1;

    INSERT INTO candidate_dp_profiles (
      candidate_id, company_id, emergency_name, emergency_phone, emergency_relation,
      address_line, address_city, address_state, address_postal, cpf, updated_by_user_id
    ) VALUES (
      v_emp.id, v_company_id, 'Contato demo', '+55 11 98888-0000', 'cônjuge',
      'Rua Demo 10', 'São Paulo', 'SP', '01310-100',
      lpad(v_i::text, 11, '0'), v_hr_id
    )
    ON CONFLICT (candidate_id) DO NOTHING;

    INSERT INTO employee_leave_balances (candidate_id, company_id, entitlement_days, notes, updated_by_user_id)
    VALUES (v_emp.id, v_company_id, 30, 'Saldo demo.', v_hr_id)
    ON CONFLICT (candidate_id) DO NOTHING;

    INSERT INTO employee_dp_documents (company_id, candidate_id, doc_key, status, notes, updated_by_user_id)
    SELECT v_company_id, v_emp.id, k, 'received', 'Documento demo.', v_hr_id
      FROM (VALUES ('id_document'), ('contract'), ('aso'), ('address_proof'), ('bank_data'), ('dependents')) AS d(k)
     WHERE NOT EXISTS (
       SELECT 1 FROM employee_dp_documents x WHERE x.candidate_id = v_emp.id AND x.doc_key = d.k
     );

    INSERT INTO employee_leave_requests (
      company_id, candidate_id, leave_type, status, starts_on, ends_on, reason, requested_by, created_by_user_id
    )
    SELECT v_company_id, v_emp.id, 'vacation', 'approved',
           CURRENT_DATE - 20, CURRENT_DATE - 16, 'Férias demo.', 'manager', v_hr_id
     WHERE NOT EXISTS (
       SELECT 1 FROM employee_leave_requests r WHERE r.candidate_id = v_emp.id AND r.leave_type = 'vacation'
     );

    INSERT INTO employee_compensation_events (
      company_id, candidate_id, event_type, amount, effective_date, notes, created_by_user_id, approval_status
    )
    SELECT v_company_id, v_emp.id, 'hire', '10000.00', CURRENT_DATE - 180,
           '<p>Contratação demo.</p>', v_hr_id, 'approved'
     WHERE NOT EXISTS (
       SELECT 1 FROM employee_compensation_events e
        WHERE e.candidate_id = v_emp.id AND e.event_type = 'hire'
     );

    INSERT INTO employee_hour_bank_entries (
      company_id, candidate_id, entry_kind, minutes, status, source, work_on, note, created_by_user_id
    )
    SELECT v_company_id, v_emp.id, 'credit', 90, 'approved', 'manual', CURRENT_DATE - 8,
           'Crédito demo.', v_hr_id
     WHERE NOT EXISTS (
       SELECT 1 FROM employee_hour_bank_entries e WHERE e.candidate_id = v_emp.id AND e.source = 'manual'
     );
  END LOOP;

  -- Kudos em anel
  FOR v_emp IN
    SELECT id, lead(id) OVER (ORDER BY id) AS nxt, first_value(id) OVER (ORDER BY id) AS first_id
      FROM candidates
     WHERE company_id = v_company_id AND employment_status = 'employee'
  LOOP
    v_from := v_emp.id;
    v_to := COALESCE(v_emp.nxt, v_emp.first_id);
    IF v_from IS DISTINCT FROM v_to THEN
      INSERT INTO company_kudos (company_id, from_candidate_id, to_candidate_id, message)
      SELECT v_company_id, v_from, v_to, 'Reconhecimento demo: a entrega fez diferença.'
       WHERE NOT EXISTS (
         SELECT 1 FROM company_kudos k
          WHERE k.company_id = v_company_id AND k.from_candidate_id = v_from AND k.to_candidate_id = v_to
            AND k.deleted = FALSE
       );
    END IF;
  END LOOP;

  INSERT INTO company_posts (company_id, title, body_html, created_by_user_id)
  SELECT v_company_id, 'Bem-vindos ao mural da Todos os Dados',
         '<p>Avisos da empresa no mural do colaborador.</p>', v_hr_id
   WHERE NOT EXISTS (
     SELECT 1 FROM company_posts p WHERE p.company_id = v_company_id AND p.title = 'Bem-vindos ao mural da Todos os Dados'
   );

  INSERT INTO whistleblowing_channels (company_id, title, token, due_days, active, created_by_user_id)
  SELECT v_company_id, 'Canal de relatos (demo)', 'w1w1todosdadose5f60718293a4b5c6d7e8f0b', 15, TRUE, v_hr_id
   WHERE NOT EXISTS (
     SELECT 1 FROM whistleblowing_channels ch WHERE ch.company_id = v_company_id AND ch.deleted = FALSE
   )
  RETURNING id INTO v_channel_id;

  IF v_channel_id IS NULL THEN
    SELECT id INTO v_channel_id FROM whistleblowing_channels
     WHERE company_id = v_company_id AND deleted = FALSE ORDER BY id LIMIT 1;
  END IF;

  IF v_channel_id IS NOT NULL THEN
    INSERT INTO whistleblowing_reports (
      company_id, channel_id, category, body, anonymous, status, due_at
    )
    SELECT v_company_id, v_channel_id, 'ethics',
           'Relato demo anônimo: há indícios de conflito de interesse em um processo de compra. Vale triagem.',
           TRUE, 'new', NOW() + INTERVAL '12 days'
     WHERE NOT EXISTS (
       SELECT 1 FROM whistleblowing_reports r WHERE r.company_id = v_company_id
     );
  END IF;

  INSERT INTO okr_cycles (company_id, title, starts_on, ends_on, status, created_by_user_id)
  SELECT v_company_id, 'Ciclo OKR 2026-H1', CURRENT_DATE - 45, CURRENT_DATE + 140, 'active', v_hr_id
   WHERE NOT EXISTS (SELECT 1 FROM okr_cycles c WHERE c.company_id = v_company_id)
  RETURNING id INTO v_cycle_id;

  IF v_cycle_id IS NULL THEN
    SELECT id INTO v_cycle_id FROM okr_cycles WHERE company_id = v_company_id ORDER BY id DESC LIMIT 1;
  END IF;

  IF v_cycle_id IS NOT NULL THEN
    INSERT INTO okr_areas (company_id, cycle_id, title, sort_order)
    SELECT v_company_id, v_cycle_id, 'Plataforma', 0
     WHERE NOT EXISTS (SELECT 1 FROM okr_areas a WHERE a.cycle_id = v_cycle_id)
    RETURNING id INTO v_area_id;
    IF v_area_id IS NULL THEN
      SELECT id INTO v_area_id FROM okr_areas WHERE cycle_id = v_cycle_id ORDER BY id LIMIT 1;
    END IF;
    IF v_area_id IS NOT NULL THEN
      INSERT INTO okr_activities (company_id, area_id, title, progress_pct, deadline, sort_order, weight)
      SELECT v_company_id, v_area_id, 'Cobrir testes DTOV nos módulos novos', 50, CURRENT_DATE + 10, 0, 2
       WHERE NOT EXISTS (SELECT 1 FROM okr_activities x WHERE x.area_id = v_area_id)
      RETURNING id INTO v_act_id;
      IF v_act_id IS NULL THEN
        SELECT id INTO v_act_id FROM okr_activities WHERE area_id = v_area_id ORDER BY id LIMIT 1;
      END IF;
      IF v_act_id IS NOT NULL THEN
        INSERT INTO okr_activity_assignees (company_id, activity_id, candidate_id, assigned_by_user_id)
        SELECT v_company_id, v_act_id, c.id, v_hr_id
          FROM candidates c
         WHERE c.company_id = v_company_id AND c.employment_status = 'employee'
        ON CONFLICT (activity_id, candidate_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  UPDATE company_time_schedules
     SET hour_bank_enabled = TRUE, hour_bank_max_minutes = 2400
   WHERE company_id = v_company_id;

  SELECT id INTO v_course_id FROM lms_courses WHERE company_id = v_company_id ORDER BY id LIMIT 1;
  IF v_course_id IS NOT NULL THEN
    INSERT INTO lms_enrollments (company_id, course_id, candidate_id, enrolled_by_user_id, due_date, mandatory)
    SELECT v_company_id, v_course_id, c.id, v_hr_id, CURRENT_DATE + 21, TRUE
      FROM candidates c
     WHERE c.company_id = v_company_id AND c.employment_status = 'employee'
    ON CONFLICT (course_id, candidate_id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Módulos pós-080 OK para company_id=% (% colaboradores)', v_company_id, v_n;
END $$;

COMMIT;

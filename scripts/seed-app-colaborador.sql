-- =============================================================================
-- Carga do app do colaborador (empresa nova, isolada)
-- =============================================================================
-- Popula a visão do colaborador para testar o app / portal /employee:
-- tarefas, jornada, pesquisas, PDI, OKR, LMS, 1:1, feedback, DP, ponto,
-- banco de horas, remuneração variável, benefícios, mural, kudos, empresa,
-- perfil, sino do app (todos os tipos, com destino ao toque), avaliação formal e Motivadores (se o
-- catálogo slug=motivators já existir).
--
-- Como rodar (migrations até 124 + tabela areas):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/seed-app-colaborador.sql
--
-- Reexecutar substitui SOMENTE o slug app-colaborador-demo.
-- Aborta se essa empresa tiver usuário fora de *@app-colaborador.demo.
--
-- Senha de todos os logins: AppColab!2026
--   Gestão:      hr@app-colaborador.demo          → /login
--                direction@app-colaborador.demo   → /login
--   App (principal): marina.costa@app-colaborador.demo → /employee
--   Também entram no app (mesma senha):
--     elena.ferreira@, diego.martins@, ana.mendes@,
--     bruno.oliveira@, carla.souza@  (domínio app-colaborador.demo)
--
-- Motivadores no app: se ae_definitions slug=motivators não existir,
-- o bloco é pulado. Rode antes: npm run db:seed-motivators
-- =============================================================================

BEGIN;

DO $app$
DECLARE
  v_company_id   BIGINT;
  v_purge_id     BIGINT;
  v_non_demo     INT;
  v_hr_id        BIGINT;
  v_dir_id       BIGINT;
  v_area_id      INT;
  v_def_id       BIGINT;
  v_org_produto  INT;
  v_org_plat     INT;
  v_org_design   INT;
  v_role_prod    BIGINT;
  v_role_gest    BIGINT;
  v_role_eng     BIGINT;
  v_comp_com     BIGINT;
  v_comp_ent     BIGINT;
  v_comp_col     BIGINT;
  v_marina       BIGINT;
  v_elena        BIGINT;
  v_diego        BIGINT;
  v_ana          BIGINT;
  v_bruno        BIGINT;
  v_carla        BIGINT;
  v_cand         BIGINT;
  v_ass          BIGINT;
  v_marina_ass   BIGINT;
  v_elena_ass    BIGINT;
  v_member_ass   BIGINT[] := '{}';
  v_group_id     BIGINT;
  v_plan_id      BIGINT;
  v_item_todo    BIGINT;
  v_item_doing   BIGINT;
  v_res_id       BIGINT;
  v_course_open  BIGINT;
  v_course_done  BIGINT;
  v_lesson_y     BIGINT;
  v_lesson_pdf   BIGINT;
  v_lesson_sec   BIGINT;
  v_cohort_id    BIGINT;
  v_enroll_open  BIGINT;
  v_enroll_done  BIGINT;
  v_quiz_id      BIGINT;
  v_cycle_id     BIGINT;
  v_area_okr     BIGINT;
  v_act_late     BIGINT;
  v_act_ok       BIGINT;
  v_survey_open  BIGINT;
  v_survey_old   BIGINT;
  v_q_likert     BIGINT;
  v_q_text       BIGINT;
  v_q_enps       BIGINT;
  v_q_old        BIGINT;
  v_invite_old   BIGINT;
  v_pulse_id     BIGINT;
  v_pulse_q      BIGINT;
  v_fr_cycle     BIGINT;
  v_fr_review    BIGINT;
  v_fr_item1     BIGINT;
  v_fr_item2     BIGINT;
  v_fr_item3     BIGINT;
  v_fr_mgr       BIGINT;
  v_fr_self      BIGINT;
  v_feedback_id  BIGINT;
  v_leave_id     BIGINT;
  v_kudo_id      BIGINT;
  v_ae_invite_id BIGINT;
  v_cat_food     BIGINT;
  v_cat_health   BIGINT;
  v_ben_meal     BIGINT;
  v_ben_health   BIGINT;
  v_ben_gym      BIGINT;
  v_i            INT;
  v_top          INT;
  v_name         TEXT;
  v_email        TEXT;
  v_city         TEXT;
  v_state        TEXT;
  v_phone        TEXT;
  v_start        DATE;
  v_birth        DATE;
  v_role         BIGINT;
  v_org          INT;
  v_mgr          BIGINT;
  v_marital      TEXT;
  v_format       TEXT;
  v_scores       JSONB;
  v_pwd          TEXT := '$2a$10$MxdFawl.fTW/QMVhvuq4aeGlMvN9OU4Sx19JwnZgQqeiffL0RLaY.';
  v_names  TEXT[] := ARRAY['Marina Costa','Elena Ferreira','Diego Martins','Ana Mendes','Bruno Oliveira','Carla Souza'];
  v_emails TEXT[] := ARRAY[
    'marina.costa@app-colaborador.demo',
    'elena.ferreira@app-colaborador.demo',
    'diego.martins@app-colaborador.demo',
    'ana.mendes@app-colaborador.demo',
    'bruno.oliveira@app-colaborador.demo',
    'carla.souza@app-colaborador.demo'
  ];
  v_cities TEXT[] := ARRAY['São Paulo','São Paulo','Campinas','Curitiba','Belo Horizonte','Recife'];
  v_states TEXT[] := ARRAY['SP','SP','SP','PR','MG','PE'];
  v_tops   INT[]  := ARRAY[5, 8, 3, 2, 6, 1];
BEGIN
  IF EXISTS (
    SELECT 1
      FROM users u
      LEFT JOIN companies c ON c.id = u.company_id
     WHERE LOWER(u.email) IN (
       'hr@app-colaborador.demo',
       'direction@app-colaborador.demo'
     )
       AND COALESCE(LOWER(c.slug), '') <> 'app-colaborador-demo'
  ) THEN
    RAISE EXCEPTION 'ABORTADO: e-mail de gestão da carga já existe fora de app-colaborador-demo.';
  END IF;

  FOR v_purge_id IN
    SELECT id FROM companies WHERE LOWER(slug) = 'app-colaborador-demo' ORDER BY id
  LOOP
    SELECT COUNT(*)::int INTO v_non_demo
      FROM users
     WHERE company_id = v_purge_id
       AND email NOT ILIKE '%@app-colaborador.demo'
       AND deleted = FALSE;
    IF v_non_demo > 0 THEN
      RAISE EXCEPTION 'ABORTADO: company_id=% tem usuário fora de @app-colaborador.demo.', v_purge_id;
    END IF;

    UPDATE candidates
       SET manager_candidate_id = NULL, org_unit_id = NULL
     WHERE company_id = v_purge_id;

    IF to_regclass('public.interview_scorecards') IS NOT NULL THEN
      DELETE FROM interview_scorecards WHERE company_id = v_purge_id;
    END IF;
    IF to_regclass('public.ae_invites') IS NOT NULL THEN
      DELETE FROM ae_invites WHERE company_id = v_purge_id;
    END IF;

    DELETE FROM candidates WHERE company_id = v_purge_id;

    IF to_regclass('public.org_units') IS NOT NULL THEN
      DELETE FROM org_units WHERE company_id = v_purge_id;
    END IF;
    IF to_regclass('public.company_licenses') IS NOT NULL THEN
      DELETE FROM company_licenses WHERE company_id = v_purge_id;
    END IF;
    IF to_regclass('public.user_company_memberships') IS NOT NULL THEN
      DELETE FROM user_company_memberships m
        USING users u
       WHERE m.user_id = u.id AND u.company_id = v_purge_id;
    END IF;
    DELETE FROM user_capability_overrides o
      USING users u
     WHERE o.user_id = u.id AND u.company_id = v_purge_id;
    DELETE FROM users WHERE company_id = v_purge_id;
    DELETE FROM companies WHERE id = v_purge_id;
  END LOOP;

  DELETE FROM users
   WHERE LOWER(email) IN ('hr@app-colaborador.demo', 'direction@app-colaborador.demo');

  SELECT id INTO v_area_id FROM areas ORDER BY id LIMIT 1;
  IF v_area_id IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: tabela areas vazia. Rode o bootstrap/migrations antes.';
  END IF;

  SELECT id INTO v_def_id
    FROM ae_definitions
   WHERE LOWER(slug) = 'motivators' AND active = TRUE
   LIMIT 1;

  INSERT INTO companies (
    name, slug, active, deleted, anniversary_date,
    website, about_html, public_profile_enabled, enabled_modules
  ) VALUES (
    'App Colaborador',
    'app-colaborador-demo',
    TRUE, FALSE,
    (CURRENT_DATE + 12) - INTERVAL '8 years',
    'https://www.appcolaborador.demo',
    $html$
<p><strong>App Colaborador</strong> é a empresa de teste do hub e do aplicativo.</p>
<p>Produto, pessoas e operação no mesmo lugar: jornada, pesquisas, PDI, OKRs, LMS, 1:1, DP, ponto e mural.</p>
$html$,
    TRUE,
    NULL
  )
  RETURNING id INTO v_company_id;

  INSERT INTO users (
    company_id, email, password_hash, role, locale, display_name, active, deleted, signup_source
  ) VALUES (
    v_company_id, 'hr@app-colaborador.demo', v_pwd, 'hr', 'pt-BR', 'RH App Colaborador', TRUE, FALSE, 'admin_invite'
  )
  RETURNING id INTO v_hr_id;

  INSERT INTO users (
    company_id, email, password_hash, role, locale, display_name, active, deleted, signup_source
  ) VALUES (
    v_company_id, 'direction@app-colaborador.demo', v_pwd, 'direction', 'pt-BR', 'Direção App Colaborador', TRUE, FALSE, 'admin_invite'
  )
  RETURNING id INTO v_dir_id;

  INSERT INTO company_licenses (company_id, plan, starts_at, expires_at)
  VALUES (
    v_company_id, 'early_access', NOW(),
    ((NOW() AT TIME ZONE 'UTC') + INTERVAL '1 year') AT TIME ZONE 'UTC'
  )
  ON CONFLICT (company_id) DO NOTHING;

  INSERT INTO org_units (company_id, name, parent_id, active)
  VALUES (v_company_id, 'Produto', NULL, TRUE)
  RETURNING id INTO v_org_produto;

  INSERT INTO org_units (company_id, name, parent_id, active)
  VALUES (v_company_id, 'Plataforma', v_org_produto, TRUE)
  RETURNING id INTO v_org_plat;

  INSERT INTO org_units (company_id, name, parent_id, active)
  VALUES (v_company_id, 'Design', v_org_produto, TRUE)
  RETURNING id INTO v_org_design;

  INSERT INTO job_roles (company_id, name, description, rubric, active)
  VALUES (
    v_company_id, 'Analista de Produto',
    'Descobre problema, prioriza e acompanha entrega com o time.',
    '{"5":3,"1":2,"6":2,"3":1}'::jsonb, TRUE
  ) RETURNING id INTO v_role_prod;

  INSERT INTO job_roles (company_id, name, description, rubric, active)
  VALUES (
    v_company_id, 'Gestora de Pessoas',
    'Conduz 1:1, jornada e desenvolvimento do time.',
    '{"2":3,"8":2,"9":2,"6":1}'::jsonb, TRUE
  ) RETURNING id INTO v_role_gest;

  INSERT INTO job_roles (company_id, name, description, rubric, active)
  VALUES (
    v_company_id, 'Engenheiro de Plataforma',
    'Evolui produto, dados e qualidade de entrega.',
    '{"5":3,"3":2,"1":2,"6":1}'::jsonb, TRUE
  ) RETURNING id INTO v_role_eng;

  INSERT INTO company_competencies (company_id, name, description, active)
  VALUES (v_company_id, 'Comunicação', 'Clareza ao combinar e devolver contexto.', TRUE)
  RETURNING id INTO v_comp_com;
  INSERT INTO company_competencies (company_id, name, description, active)
  VALUES (v_company_id, 'Entrega', 'Cumpre o combinado com qualidade percebida.', TRUE)
  RETURNING id INTO v_comp_ent;
  INSERT INTO company_competencies (company_id, name, description, active)
  VALUES (v_company_id, 'Colaboração', 'Ajuda o time a destravar sem concentrar decisão.', TRUE)
  RETURNING id INTO v_comp_col;

  INSERT INTO job_role_competencies (company_id, job_role_id, competency_id, sort_order)
  VALUES
    (v_company_id, v_role_prod, v_comp_com, 0),
    (v_company_id, v_role_prod, v_comp_ent, 1),
    (v_company_id, v_role_prod, v_comp_col, 2);

  INSERT INTO company_pre_onboarding_templates (
    company_id, item_key, label_pt, label_en, owner_role, sort_order, active, due_offset_days, require_meet
  ) VALUES
    (v_company_id, 'welcome_kit', 'Kit de boas-vindas', 'Welcome kit', 'rh', 10, TRUE, 0, FALSE),
    (v_company_id, 'access_sheet', 'Acessos e ferramentas', 'Access and tools', 'it', 20, TRUE, 0, FALSE),
    (v_company_id, 'rh_onboarding_call', 'Conversa de chegada com RH', 'HR arrival call', 'rh', 30, TRUE, 1, TRUE),
    (v_company_id, 'manager_onboarding', 'Chegada com a gestora', 'Manager arrival', 'manager', 40, TRUE, 1, TRUE);

  FOR v_i IN 1..6 LOOP
    v_name := v_names[v_i];
    v_email := v_emails[v_i];
    v_city := v_cities[v_i];
    v_state := v_states[v_i];
    v_top := v_tops[v_i];
    v_phone := '+55 11 98700-' || lpad((1000 + v_i)::text, 4, '0');
    v_start := CASE v_i
      WHEN 1 THEN CURRENT_DATE - 50
      WHEN 2 THEN CURRENT_DATE - 420
      WHEN 5 THEN CURRENT_DATE - 8
      ELSE CURRENT_DATE - (80 + v_i * 20)
    END;
    v_birth := (DATE '1992-03-15' + (v_i * 37));
    v_role := CASE v_i WHEN 2 THEN v_role_gest WHEN 3 THEN v_role_eng WHEN 5 THEN v_role_eng ELSE v_role_prod END;
    v_org := CASE v_i WHEN 2 THEN v_org_produto WHEN 4 THEN v_org_design ELSE v_org_plat END;
    v_marital := CASE v_i WHEN 1 THEN 'married' WHEN 2 THEN 'stable_union' WHEN 4 THEN 'single' ELSE 'single' END;
    v_format := CASE v_i WHEN 5 THEN 'intern' WHEN 6 THEN 'pj' ELSE 'clt' END;
    v_scores := jsonb_build_object(
      '1', CASE WHEN v_top = 1 THEN 28 ELSE 10 + v_i END,
      '2', CASE WHEN v_top = 2 THEN 27 ELSE 11 + v_i END,
      '3', CASE WHEN v_top = 3 THEN 29 ELSE 9 + v_i END,
      '4', CASE WHEN v_top = 4 THEN 26 ELSE 12 END,
      '5', CASE WHEN v_top = 5 THEN 30 ELSE 13 END,
      '6', CASE WHEN v_top = 6 THEN 28 ELSE 10 END,
      '7', CASE WHEN v_top = 7 THEN 27 ELSE 11 END,
      '8', CASE WHEN v_top = 8 THEN 29 ELSE 12 END,
      '9', CASE WHEN v_top = 9 THEN 26 ELSE 9 END
    );

    INSERT INTO candidates (
      company_id, full_name, email, personal_email, phone, linkedin_url,
      city, state, salary_expectation, availability, source, consent_at,
      employment_status, hired_at, start_date, birth_date,
      marital_status, employee_number, work_format, work_history,
      hr_notes, password_hash, preferred_locale,
      job_role_id, org_unit_id,
      one_on_one_prep_at, one_on_one_prep_note
    ) VALUES (
      v_company_id, v_name, v_email,
      replace(split_part(v_email, '@', 1), '.', '.') || '@pessoal.demo',
      v_phone,
      'https://linkedin.com/in/' || replace(split_part(v_email, '@', 1), '.', '-'),
      v_city, v_state,
      (9000 + v_i * 800)::text || '.00',
      'immediate', 'referral', NOW() - (v_i || ' days')::interval,
      'employee', v_start::timestamptz, v_start, v_birth,
      v_marital, 'AC-' || lpad(v_i::text, 4, '0'), v_format,
      'Histórico interno: atuação em ' || v_city || ' no formato ' || v_format || '.',
      '<p>Colaborador de teste do app. Perfil de trabalho T' || v_top::text || '.</p>',
      v_pwd, 'pt-BR',
      v_role, v_org,
      CASE WHEN v_i = 1 THEN NOW() - INTERVAL '1 day' ELSE NULL END,
      CASE WHEN v_i = 1 THEN 'Quero alinhar a prioridade do trimestre e o item aberto do PDI.' ELSE '' END
    )
    RETURNING id INTO v_cand;

    IF v_i = 1 THEN v_marina := v_cand;
    ELSIF v_i = 2 THEN v_elena := v_cand;
    ELSIF v_i = 3 THEN v_diego := v_cand;
    ELSIF v_i = 4 THEN v_ana := v_cand;
    ELSIF v_i = 5 THEN v_bruno := v_cand;
    ELSE v_carla := v_cand;
    END IF;

    INSERT INTO assessments (
      candidate_id, company_id, area_id, top_type, scores, source, pipeline_stage,
      hired_at, start_date, fill_duration_ms, created_at
    ) VALUES (
      v_cand, v_company_id, v_area_id, v_top, v_scores, 'seed_app_colaborador', 'hired',
      v_start::timestamptz, v_start, 160000 + v_i * 1000, (v_start - 5)::timestamptz
    )
    RETURNING id INTO v_ass;

    v_member_ass := array_append(v_member_ass, v_ass);
    IF v_i = 1 THEN v_marina_ass := v_ass; END IF;
    IF v_i = 2 THEN v_elena_ass := v_ass; END IF;

    IF v_def_id IS NOT NULL THEN
      INSERT INTO ae_attempts (
        definition_id, company_id, candidate_id, area_id, status,
        started_at, completed_at, dimension_scores, ranking, profile_summary, algorithm_version
      ) VALUES (
        v_def_id, v_company_id, v_cand, v_area_id, 'completed',
        NOW() - ((20 + v_i) || ' days')::interval,
        NOW() - ((20 + v_i) || ' days')::interval,
        jsonb_build_object(
          'reconhecimento', 40 + v_i,
          'financeiro', 42 + v_i,
          'crescimento', 55 + v_i,
          'desenvolvimento', 60 + v_i,
          'autonomia', 58 + v_i,
          'flexibilidade', 48 + v_i,
          'proposito', 70,
          'relacionamentos', 52 + v_i,
          'seguranca', 44,
          'lideranca', 36 + v_i,
          'desafio', 57,
          'criatividade', 46 + v_i,
          'equilibrio', 62
        ),
        '["proposito","desenvolvimento","autonomia","equilibrio","desafio","crescimento","relacionamentos","flexibilidade","criatividade","financeiro","seguranca","reconhecimento","lideranca"]'::jsonb,
        'Hipóteses de motivação para conversa de gestão. Não é diagnóstico.',
        'ae-scoring-v2'
      );
    END IF;
  END LOOP;

  UPDATE candidates SET manager_candidate_id = v_elena
   WHERE company_id = v_company_id AND id <> v_elena;

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_invites (
      definition_id, company_id, candidate_id, candidate_name, candidate_email,
      token, status, expires_at, created_by_user_id
    ) VALUES (
      v_def_id, v_company_id, v_marina, 'Marina Costa', 'marina.costa@app-colaborador.demo',
      'appcolabmotivatorsinvite0001', 'sent', NOW() + INTERVAL '30 days', v_hr_id
    );
  ELSE
    RAISE NOTICE 'Motivadores ausente (slug=motivators). Rode npm run db:seed-motivators e execute de novo.';
  END IF;

  -- DP: ficha, documentos, férias, saldo
  INSERT INTO candidate_dp_profiles (
    candidate_id, company_id, emergency_name, emergency_phone, emergency_relation,
    address_line, address_number, address_city, address_state, address_postal,
    cpf, rg, dependents, internal_notes, updated_by_user_id
  ) VALUES (
    v_marina, v_company_id, 'Paulo Costa', '+55 11 98888-1200', 'cônjuge',
    'Rua Augusta', '1200', 'São Paulo', 'SP', '01304-001',
    '39053344705', '123456789',
    '[{"name":"Lucas Costa","cpf":"52998224725","relation":"filho","birthDate":"2018-04-12"}]'::jsonb,
    'Ficha completa para teste do app. Contato de emergência conferido.',
    v_hr_id
  );

  INSERT INTO candidate_dp_profiles (
    candidate_id, company_id, emergency_name, emergency_phone, emergency_relation,
    address_line, address_number, address_city, address_state, address_postal,
    cpf, rg, updated_by_user_id
  )
  SELECT c.id, v_company_id,
         'Contato ' || split_part(c.full_name, ' ', 1),
         '+55 11 97777-1000', 'familiar',
         'Rua da Empresa', '50', c.city, c.state, '01001-000',
         lpad((20000000000 + c.id % 100000)::text, 11, '0'),
         'MG' || lpad((c.id % 100000)::text, 6, '0'),
         v_hr_id
    FROM candidates c
   WHERE c.company_id = v_company_id AND c.id <> v_marina;

  INSERT INTO employee_dp_documents (
    company_id, candidate_id, doc_key, status, notes, file_name,
    signature_status, signature_requested_at, signature_requested_by_user_id,
    signed_at, signer_name, signature_consent_version, updated_by_user_id
  ) VALUES
    (v_company_id, v_marina, 'id_document', 'received', 'RG conferido pelo RH.', 'rg-marina.pdf',
     'signed', NOW() - INTERVAL '20 days', v_hr_id, NOW() - INTERVAL '19 days',
     'Marina Costa', 'dp-ack-v1', v_hr_id),
    (v_company_id, v_marina, 'contract', 'received', 'Contrato aguardando ciência no app.', 'contrato-marina.pdf',
     'requested', NOW() - INTERVAL '1 day', v_hr_id, NULL, '', '', v_hr_id),
    (v_company_id, v_marina, 'aso', 'pending', 'Enviar o ASO de admissão.', '',
     'none', NULL, NULL, NULL, '', '', v_hr_id),
    (v_company_id, v_marina, 'address_proof', 'received', 'Comprovante de Augusta, 1200.', 'comprovante-augusta.pdf',
     'none', NULL, NULL, NULL, '', '', v_hr_id),
    (v_company_id, v_marina, 'bank_data', 'received', 'Conta salário cadastrada.', '',
     'waived', NULL, NULL, NULL, '', '', v_hr_id),
    (v_company_id, v_marina, 'dependents', 'received', 'Um dependente informado na ficha.', '',
     'none', NULL, NULL, NULL, '', '', v_hr_id),
    (v_company_id, v_marina, 'other', 'waived', 'Nada adicional neste ciclo.', '',
     'waived', NULL, NULL, NULL, '', '', v_hr_id);

  INSERT INTO employee_leave_balances (
    candidate_id, company_id, entitlement_days, adjustment_days, notes,
    period_start, period_end, updated_by_user_id
  ) VALUES (
    v_marina, v_company_id, 30, 0,
    'Período aquisitivo corrente. 5 dias já gozados.',
    DATE_TRUNC('year', CURRENT_DATE)::date,
    (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day')::date,
    v_hr_id
  );

  INSERT INTO employee_leave_requests (
    company_id, candidate_id, leave_type, status, starts_on, ends_on,
    reason, manager_notes, requested_by, decided_by_user_id, decided_at, created_by_user_id
  ) VALUES
    (v_company_id, v_marina, 'vacation', 'taken', CURRENT_DATE - 40, CURRENT_DATE - 36,
     'Férias de 5 dias já gozadas.', 'Aprovado e lançado no saldo.', 'employee',
     v_hr_id, NOW() - INTERVAL '45 days', v_hr_id),
    (v_company_id, v_marina, 'medical_appointment', 'requested', CURRENT_DATE + 6, CURRENT_DATE + 6,
     'Consulta no período da tarde. Peço ausência nesse dia.', '', 'employee',
     NULL, NULL, NULL),
    (v_company_id, v_marina, 'sick', 'approved', CURRENT_DATE - 12, CURRENT_DATE - 12,
     'Atestado de um dia.', 'Aprovado pelo RH.', 'employee',
     v_hr_id, NOW() - INTERVAL '12 days', v_hr_id);

  -- Ponto e banco de horas
  INSERT INTO company_time_schedules (
    company_id, workday_start, workday_end, break_minutes, timezone,
    late_grace_minutes, hour_bank_enabled, hour_bank_max_minutes, updated_by_user_id
  ) VALUES (
    v_company_id, '09:00', '18:00', 60, 'America/Sao_Paulo', 10, TRUE, 2400, v_hr_id
  );

  INSERT INTO employee_time_punches (
    company_id, candidate_id, punched_at, punch_kind, source,
    latitude, longitude, notes, flag, review_status
  ) VALUES
    (v_company_id, v_marina,
     ((CURRENT_DATE - 1)::timestamp + TIME '09:12') AT TIME ZONE 'America/Sao_Paulo',
     'in', 'web', -23.561414, -46.655881, 'Entrada de ontem, alguns minutos após o horário.', 'late', 'ok'),
    (v_company_id, v_marina,
     ((CURRENT_DATE - 1)::timestamp + TIME '18:06') AT TIME ZONE 'America/Sao_Paulo',
     'out', 'web', -23.561414, -46.655881, 'Saída de ontem.', NULL, 'ok'),
    (v_company_id, v_marina,
     (CURRENT_DATE::timestamp + TIME '09:01') AT TIME ZONE 'America/Sao_Paulo',
     'in', 'web', -23.561414, -46.655881, 'Entrada de hoje. Saída ainda aberta para testar o ponto.', NULL, 'none');

  INSERT INTO employee_hour_bank_entries (
    company_id, candidate_id, entry_kind, minutes, status, source, work_on, note,
    dedupe_key, created_by_user_id, decided_by_user_id, decided_at
  ) VALUES (
    v_company_id, v_marina, 'credit', 90, 'approved', 'manual', CURRENT_DATE - 8,
    'Crédito aprovado de 1h30 da semana passada.',
    'appcolab-bank-credit-marina', v_hr_id, v_hr_id, NOW() - INTERVAL '7 days'
  );

  INSERT INTO employee_hour_bank_entries (
    company_id, candidate_id, entry_kind, minutes, status, source, work_on, note,
    dedupe_key, created_by_candidate_id
  ) VALUES (
    v_company_id, v_marina, 'debit', 60, 'pending', 'employee', CURRENT_DATE + 3,
    'Pedido de compensação de 1h na sexta.',
    'appcolab-bank-debit-marina', v_marina
  );

  -- Benefícios e remuneração
  INSERT INTO benefit_categories (company_id, name, active, created_by_user_id)
  VALUES (v_company_id, 'Alimentação', TRUE, v_hr_id)
  RETURNING id INTO v_cat_food;
  INSERT INTO benefit_categories (company_id, name, active, created_by_user_id)
  VALUES (v_company_id, 'Saúde', TRUE, v_hr_id)
  RETURNING id INTO v_cat_health;

  INSERT INTO company_benefits (
    company_id, name, description, category, category_id, benefit_type, active, created_by_user_id
  ) VALUES (
    v_company_id, 'VR / VA', '<p>Auxílio alimentação de R$ 35 por dia útil.</p>',
    'Alimentação', v_cat_food, 'meal_voucher', TRUE, v_hr_id
  ) RETURNING id INTO v_ben_meal;
  INSERT INTO company_benefits (
    company_id, name, description, category, category_id, benefit_type, active, created_by_user_id
  ) VALUES (
    v_company_id, 'Plano de saúde', '<p>Enfermaria nacional, com coparticipação.</p>',
    'Saúde', v_cat_health, 'health', TRUE, v_hr_id
  ) RETURNING id INTO v_ben_health;
  INSERT INTO company_benefits (
    company_id, name, description, category, category_id, benefit_type, active, created_by_user_id
  ) VALUES (
    v_company_id, 'Bem-estar', '<p>Rede de academias e estúdios.</p>',
    'Saúde', v_cat_health, 'gym', TRUE, v_hr_id
  ) RETURNING id INTO v_ben_gym;

  INSERT INTO employee_benefit_assignments (
    company_id, candidate_id, benefit_id, value_note, starts_on, active, created_by_user_id
  )
  SELECT v_company_id, c.id, b.id, b.note, c.start_date, TRUE, v_hr_id
    FROM candidates c
    CROSS JOIN (VALUES
      (v_ben_meal, 'R$ 35 por dia útil'),
      (v_ben_health, 'Titular + 1 dependente'),
      (v_ben_gym, 'Plano digital incluso')
    ) AS b(id, note)
   WHERE c.company_id = v_company_id AND c.employment_status = 'employee';

  INSERT INTO employee_compensation_events (
    company_id, candidate_id, event_type, amount, effective_date, notes,
    created_by_user_id, approval_status
  ) VALUES
    (v_company_id, v_marina, 'hire', '12000.00', CURRENT_DATE - 50,
     '<p>Contratação CLT. Salário de entrada.</p>', v_hr_id, 'approved'),
    (v_company_id, v_marina, 'raise', '13200.00', CURRENT_DATE - 10,
     '<p>Ajuste de 10% após o primeiro ciclo.</p>', v_hr_id, 'approved'),
    (v_company_id, v_marina, 'bonus', '2500.00', CURRENT_DATE + 15,
     '<p>Bônus proposto do trimestre. Ainda sem aprovação.</p>', v_hr_id, 'proposed');

  -- Jornada
  INSERT INTO employee_pre_onboarding_items (
    company_id, candidate_id, item_key, due_date, status, notes,
    completed_at, completed_by_user_id, meet_url, employee_ack_at,
    owner_role, label_snapshot, require_meet
  ) VALUES
    (v_company_id, v_marina, 'welcome_kit', CURRENT_DATE - 50, 'done',
     'Notebook e crachá entregues.', (CURRENT_DATE - 49)::timestamptz, v_hr_id,
     NULL, (CURRENT_DATE - 49)::timestamptz, 'rh', 'Kit de boas-vindas', FALSE),
    (v_company_id, v_marina, 'access_sheet', CURRENT_DATE + 2, 'pending',
     'Falta o acesso ao repositório de design.', NULL, NULL,
     NULL, NULL, 'it', 'Acessos e ferramentas', FALSE),
    (v_company_id, v_marina, 'rh_onboarding_call', CURRENT_DATE - 48, 'done',
     'Conversa de benefícios e ponto realizada.', (CURRENT_DATE - 48)::timestamptz, v_hr_id,
     'https://meet.google.com/app-colab-rh', (CURRENT_DATE - 48)::timestamptz,
     'rh', 'Conversa de chegada com RH', TRUE),
    (v_company_id, v_marina, 'manager_onboarding', CURRENT_DATE - 47, 'done',
     'Combinados da primeira semana com Elena.', (CURRENT_DATE - 47)::timestamptz, v_hr_id,
     'https://meet.google.com/app-colab-gestora', (CURRENT_DATE - 47)::timestamptz,
     'manager', 'Chegada com a gestora', TRUE);

  INSERT INTO employee_pre_onboarding_items (
    company_id, candidate_id, item_key, due_date, status, owner_role, label_snapshot, require_meet
  ) VALUES
    (v_company_id, v_bruno, 'welcome_kit', CURRENT_DATE + 1, 'pending', 'rh', 'Kit de boas-vindas', FALSE),
    (v_company_id, v_bruno, 'access_sheet', CURRENT_DATE + 1, 'pending', 'it', 'Acessos e ferramentas', FALSE),
    (v_company_id, v_bruno, 'rh_onboarding_call', CURRENT_DATE + 2, 'pending', 'rh', 'Conversa de chegada com RH', TRUE),
    (v_company_id, v_bruno, 'manager_onboarding', CURRENT_DATE + 3, 'pending', 'manager', 'Chegada com a gestora', TRUE);

  INSERT INTO employee_onboarding_checkins (
    company_id, candidate_id, milestone_days, due_date, status, outcome, notes,
    completed_at, completed_by_user_id, meet_url, employee_ack_at
  ) VALUES
    (v_company_id, v_marina, 30, CURRENT_DATE - 20, 'done', 'pass',
     '<p>D30: prioridades claras e acesso ao time ok.</p>',
     (CURRENT_DATE - 20)::timestamptz, v_hr_id,
     'https://meet.google.com/app-colab-d30', (CURRENT_DATE - 20)::timestamptz),
    (v_company_id, v_marina, 60, CURRENT_DATE + 10, 'pending', '',
     '', NULL, NULL, 'https://meet.google.com/app-colab-d60', NULL),
    (v_company_id, v_marina, 90, CURRENT_DATE + 40, 'pending', '',
     '', NULL, NULL, NULL, NULL),
    (v_company_id, v_bruno, 30, CURRENT_DATE + 22, 'pending', '', '', NULL, NULL, NULL, NULL),
    (v_company_id, v_bruno, 60, CURRENT_DATE + 52, 'pending', '', '', NULL, NULL, NULL, NULL),
    (v_company_id, v_bruno, 90, CURRENT_DATE + 82, 'pending', '', '', NULL, NULL, NULL, NULL);

  -- 1:1
  INSERT INTO one_on_ones (
    company_id, candidate_id, meeting_date, notes, next_steps, created_by_user_id
  ) VALUES
    (v_company_id, v_marina, CURRENT_DATE - 14,
     '<p>1:1 com Elena.</p><ul><li>Entrega do discovery da home</li><li>Acesso pendente de design</li></ul>',
     '<p>Fechar o item de feedback do PDI antes do D60.</p>', v_hr_id),
    (v_company_id, v_marina, CURRENT_DATE - 3,
     '<p>Revisão curta da semana.</p><p>Há indícios de avanço na priorização. Seguir o combinado do PDI.</p>',
     '<p>Trazer uma proposta de escopo do próximo ciclo de OKR.</p>', v_hr_id);

  -- PDI
  INSERT INTO learning_resources (
    company_id, title, description, url, theme, resource_type, duration_hours, active, created_by_user_id
  ) VALUES (
    v_company_id, 'Feedback que gera próximo passo',
    '<p>Como devolver um combinado com exemplo e prazo.</p>',
    'https://example.com/app-colab/feedback',
    'Comunicação', 'article', 1, TRUE, v_hr_id
  ) RETURNING id INTO v_res_id;

  INSERT INTO development_plans (
    company_id, candidate_id, title, objective, status, period_start, period_end, created_by_user_id
  ) VALUES (
    v_company_id, v_marina,
    'PDI: priorização e feedback',
    'Consolidar um ritual semanal de prioridade e um exemplo concreto de feedback ao time.',
    'active', CURRENT_DATE - 30, CURRENT_DATE + 60, v_hr_id
  ) RETURNING id INTO v_plan_id;

  INSERT INTO development_plan_items (
    plan_id, company_id, title, notes, status, source, sort_order, due_date, owner_label
  ) VALUES (
    v_plan_id, v_company_id, 'Registrar um feedback com exemplo',
    'Um caso real da última semana, com próximo passo.',
    'todo', 'one_on_one', 0, CURRENT_DATE + 7, 'Marina Costa'
  ) RETURNING id INTO v_item_todo;

  INSERT INTO development_plan_items (
    plan_id, company_id, title, notes, status, source, sort_order, due_date, owner_label
  ) VALUES (
    v_plan_id, v_company_id, 'Concluir a trilha de cultura',
    'Aula em aberto no LMS, com prazo vencendo.',
    'doing', 'manual', 1, CURRENT_DATE - 1, 'Marina Costa'
  ) RETURNING id INTO v_item_doing;

  INSERT INTO development_plan_items (
    plan_id, company_id, title, notes, status, source, sort_order, due_date, owner_label
  ) VALUES (
    v_plan_id, v_company_id, 'Check-in D30 com a gestora',
    'Conversa realizada.',
    'done', 'onboarding', 2, CURRENT_DATE - 20, 'Elena Ferreira'
  );

  INSERT INTO development_plan_resource_links (plan_item_id, resource_id)
  VALUES (v_item_todo, v_res_id);

  -- LMS: um curso em atraso e um concluído (certificado)
  INSERT INTO lms_courses (company_id, title, description, completion_pct, created_by_user_id)
  VALUES (
    v_company_id, 'Cultura App Colaborador',
    'Como trabalhamos: prioridade, 1:1 e cuidado com o time.',
    100, v_hr_id
  ) RETURNING id INTO v_course_open;

  INSERT INTO lms_lessons (
    company_id, course_id, title, description, content_url, content_kind, sort_order
  ) VALUES (
    v_company_id, v_course_open, 'Como priorizamos a semana',
    'Vídeo curto sobre o ritual de segunda.',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 0
  ) RETURNING id INTO v_lesson_y;

  INSERT INTO lms_lessons (
    company_id, course_id, title, description, content_url, content_kind, sort_order
  ) VALUES (
    v_company_id, v_course_open, 'Guia de 1:1',
    'PDF com o roteiro usado pela gestora.',
    'https://example.com/app-colab/guia-1-1.pdf', 'pdf', 1
  ) RETURNING id INTO v_lesson_pdf;

  INSERT INTO lms_lesson_quiz_questions (
    company_id, lesson_id, prompt, choices, correct_choice_id, sort_order
  ) VALUES (
    v_company_id, v_lesson_y,
    'Qual é o combinado da segunda-feira?',
    '[{"id":"a","text":"Alinhar a prioridade da semana com a gestora"},{"id":"b","text":"Esperar o fim do mês para revisar"}]'::jsonb,
    'a', 0
  ) RETURNING id INTO v_quiz_id;

  INSERT INTO lms_courses (company_id, title, description, completion_pct, created_by_user_id)
  VALUES (
    v_company_id, 'Segurança da informação',
    'Cuidados mínimos com acesso, senha e dados de pessoas.',
    100, v_hr_id
  ) RETURNING id INTO v_course_done;

  INSERT INTO lms_lessons (
    company_id, course_id, title, description, content_url, content_kind, sort_order
  ) VALUES (
    v_company_id, v_course_done, 'Senha e dados de pessoas',
    'Leitura obrigatória da trilha de segurança.',
    'https://example.com/app-colab/seguranca.pdf', 'pdf', 0
  ) RETURNING id INTO v_lesson_sec;

  INSERT INTO lms_lesson_quiz_questions (
    company_id, lesson_id, prompt, choices, correct_choice_id, sort_order
  ) VALUES (
    v_company_id, v_lesson_sec,
    'O que fazer com um dado pessoal de colega fora do sistema?',
    '[{"id":"a","text":"Não copiar para canal pessoal e usar o produto"},{"id":"b","text":"Encaminhar por mensagem para agilizar"}]'::jsonb,
    'a', 0
  );

  INSERT INTO lms_cohorts (company_id, course_id, name, due_date, mandatory, created_by_user_id)
  VALUES (v_company_id, v_course_open, 'Turma chegada', CURRENT_DATE - 1, TRUE, v_hr_id)
  RETURNING id INTO v_cohort_id;

  INSERT INTO lms_job_role_courses (
    company_id, job_role_id, course_id, sort_order, mandatory, due_offset_days
  ) VALUES
    (v_company_id, v_role_prod, v_course_open, 0, TRUE, 14),
    (v_company_id, v_role_prod, v_course_done, 1, TRUE, 21);

  INSERT INTO lms_enrollments (
    company_id, course_id, candidate_id, enrolled_by_user_id, cohort_id, due_date, mandatory
  ) VALUES (
    v_company_id, v_course_open, v_marina, v_hr_id, v_cohort_id, CURRENT_DATE - 1, TRUE
  ) RETURNING id INTO v_enroll_open;

  INSERT INTO lms_enrollments (
    company_id, course_id, candidate_id, enrolled_by_user_id, due_date, mandatory, completed_at
  ) VALUES (
    v_company_id, v_course_done, v_marina, v_hr_id, CURRENT_DATE + 20, TRUE, NOW() - INTERVAL '2 days'
  ) RETURNING id INTO v_enroll_done;

  INSERT INTO lms_lesson_completions (company_id, enrollment_id, lesson_id)
  VALUES
    (v_company_id, v_enroll_open, v_lesson_y),
    (v_company_id, v_enroll_done, v_lesson_sec);

  INSERT INTO lms_lesson_watch_progress (
    company_id, enrollment_id, lesson_id, position_sec, duration_sec
  ) VALUES (v_company_id, v_enroll_open, v_lesson_y, 185, 600);

  INSERT INTO lms_lesson_quiz_attempts (
    company_id, enrollment_id, lesson_id, answers, correct_count, total_count, passed
  ) VALUES
    (v_company_id, v_enroll_open, v_lesson_y, jsonb_build_object(v_quiz_id::text, 'a'), 1, 1, TRUE),
    (v_company_id, v_enroll_done, v_lesson_sec, '{"passed":"a"}'::jsonb, 1, 1, TRUE);

  INSERT INTO development_plan_lms_links (plan_item_id, course_id)
  VALUES (v_item_doing, v_course_open);

  -- OKR
  INSERT INTO okr_cycles (company_id, title, starts_on, ends_on, status, created_by_user_id)
  VALUES (
    v_company_id, 'Ciclo OKR atual', CURRENT_DATE - 20, CURRENT_DATE + 70, 'active', v_hr_id
  ) RETURNING id INTO v_cycle_id;

  INSERT INTO okr_areas (company_id, cycle_id, title, sort_order)
  VALUES (v_company_id, v_cycle_id, 'Experiência do colaborador', 0)
  RETURNING id INTO v_area_okr;

  INSERT INTO okr_activities (
    company_id, area_id, title, progress_pct, deadline, sort_order, weight
  ) VALUES (
    v_company_id, v_area_okr, 'Publicar o roteiro de prioridade semanal',
    40, CURRENT_DATE - 1, 0, 8
  ) RETURNING id INTO v_act_late;

  INSERT INTO okr_activities (
    company_id, area_id, title, progress_pct, deadline, sort_order, weight
  ) VALUES (
    v_company_id, v_area_okr, 'Cobrir as telas do app com dados reais',
    70, CURRENT_DATE + 21, 1, 5
  ) RETURNING id INTO v_act_ok;

  INSERT INTO okr_activity_assignees (company_id, activity_id, candidate_id, assigned_by_user_id)
  VALUES
    (v_company_id, v_act_late, v_marina, v_hr_id),
    (v_company_id, v_act_ok, v_marina, v_hr_id),
    (v_company_id, v_act_ok, v_diego, v_hr_id);

  INSERT INTO okr_activity_checkins (
    company_id, activity_id, progress_pct, note, created_by_candidate_id
  ) VALUES (
    v_company_id, v_act_ok, 70,
    'Home, jornada e LMS já têm massa. Falta revisar o ponto no aparelho.',
    v_marina
  );

  -- Pesquisas
  INSERT INTO team_groups (
    company_id, name, base_assessment_id, member_assessment_ids, created_by_user_id
  ) VALUES (
    v_company_id, 'Núcleo Produto', v_elena_ass, v_member_ass, v_hr_id
  ) RETURNING id INTO v_group_id;

  INSERT INTO climate_surveys (
    company_id, title, description, status, opens_at, closes_at, created_by_user_id
  ) VALUES (
    v_company_id, 'Clima do trimestre',
    'Pesquisa aberta. A resposta entra no agregado anônimo.',
    'open', NOW() - INTERVAL '2 days', NOW() + INTERVAL '20 days', v_hr_id
  ) RETURNING id INTO v_survey_open;

  INSERT INTO climate_survey_questions (survey_id, company_id, prompt, question_kind, sort_order)
  VALUES (v_survey_open, v_company_id, 'Como você avalia o clima do time nesta quinzena?', 'likert', 0)
  RETURNING id INTO v_q_likert;
  INSERT INTO climate_survey_questions (survey_id, company_id, prompt, question_kind, sort_order)
  VALUES (v_survey_open, v_company_id, 'O que mais ajudaria no seu dia a dia?', 'text', 1)
  RETURNING id INTO v_q_text;
  INSERT INTO climate_survey_questions (survey_id, company_id, prompt, question_kind, sort_order)
  VALUES (v_survey_open, v_company_id, 'De 0 a 10, quanto você recomendaria a App Colaborador como lugar para trabalhar?', 'enps', 2)
  RETURNING id INTO v_q_enps;

  INSERT INTO climate_survey_invites (survey_id, company_id, token, expires_at, candidate_id)
  VALUES (v_survey_open, v_company_id, 'appcolabclimateopenmarina0001', NOW() + INTERVAL '20 days', v_marina);

  INSERT INTO climate_surveys (
    company_id, title, description, status, opens_at, closes_at, created_by_user_id
  ) VALUES (
    v_company_id, 'Clima do ciclo anterior',
    'Pesquisa encerrada, com a sua resposta no histórico.',
    'closed', NOW() - INTERVAL '80 days', NOW() - INTERVAL '50 days', v_hr_id
  ) RETURNING id INTO v_survey_old;

  INSERT INTO climate_survey_questions (survey_id, company_id, prompt, question_kind, sort_order)
  VALUES (v_survey_old, v_company_id, 'Como estava sua energia no ciclo anterior?', 'likert', 0)
  RETURNING id INTO v_q_old;

  INSERT INTO climate_survey_invites (survey_id, company_id, token, expires_at, used_at, candidate_id)
  VALUES (
    v_survey_old, v_company_id, 'appcolabclimatehistmarina0001',
    NOW() - INTERVAL '40 days', NOW() - INTERVAL '55 days', v_marina
  ) RETURNING id INTO v_invite_old;

  INSERT INTO climate_survey_responses (survey_id, company_id, invite_id, answers, submitted_at)
  VALUES (
    v_survey_old, v_company_id, v_invite_old,
    jsonb_build_object(v_q_old::text, 4),
    NOW() - INTERVAL '55 days'
  );

  INSERT INTO team_pulses (
    company_id, team_group_id, title, status, opens_at, closes_at, created_by_user_id
  ) VALUES (
    v_company_id, v_group_id, 'Pulso da semana: Núcleo Produto',
    'open', NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 days', v_hr_id
  ) RETURNING id INTO v_pulse_id;

  INSERT INTO team_pulse_questions (pulse_id, company_id, prompt_key, prompt, sort_order)
  VALUES (
    v_pulse_id, v_company_id, 'energy',
    'Como está sua energia no time nesta semana?', 0
  ) RETURNING id INTO v_pulse_q;

  INSERT INTO team_pulse_invites (pulse_id, company_id, token, expires_at, candidate_id)
  VALUES (v_pulse_id, v_company_id, 'appcolabpulseopenmarina000001', NOW() + INTERVAL '6 days', v_marina);

  -- Feedback
  INSERT INTO feedback_requests (
    company_id, subject_candidate_id, from_candidate_id, to_candidate_id,
    prompt, token, status, expires_at
  ) VALUES (
    v_company_id, v_elena, v_diego, v_marina,
    'Como foi trabalhar com a Elena no discovery da home?',
    'appcolabfeedbackpendingmarina01', 'pending', NOW() + INTERVAL '14 days'
  );

  INSERT INTO feedback_requests (
    company_id, subject_candidate_id, from_candidate_id, to_candidate_id,
    prompt, token, status, response_text, answered_at
  ) VALUES (
    v_company_id, v_marina, v_marina, v_diego,
    'O que eu posso ajustar na forma de pedir contexto?',
    'appcolabfeedbackansweredfrom01', 'answered',
    'O pedido chega claro. Um exemplo do resultado esperado ajuda a responder mais rápido.',
    NOW() - INTERVAL '4 days'
  );

  INSERT INTO feedback_requests (
    company_id, subject_candidate_id, from_candidate_id, to_candidate_id,
    prompt, token, status, response_text, answered_at
  ) VALUES (
    v_company_id, v_marina, v_elena, v_ana,
    'Como a Marina contribuiu no último ciclo de entrega?',
    'appcolabfeedbackaboutmarina001', 'answered',
    'Tende a organizar a prioridade cedo. O time recebeu o contexto antes da review.',
    NOW() - INTERVAL '6 days'
  );

  -- Mural e kudos
  INSERT INTO company_posts (company_id, title, body_html, created_by_user_id, created_at)
  VALUES
    (v_company_id, 'Bem-vindos ao mural',
     '<p>Avisos da empresa ficam aqui. O app mostra o mesmo conteúdo do hub.</p>',
     v_hr_id, NOW() - INTERVAL '5 days'),
    (v_company_id, 'Ponto e banco de horas',
     '<p>O expediente de referência é 9h às 18h, com 60 minutos de intervalo. Compensações passam pelo banco de horas.</p>',
     v_hr_id, NOW() - INTERVAL '1 day');

  INSERT INTO company_kudos (company_id, from_candidate_id, to_candidate_id, message, created_at)
  VALUES
    (v_company_id, v_elena, v_marina,
     'O discovery da home chegou com contexto e um próximo passo claro.',
     NOW() - INTERVAL '2 days'),
    (v_company_id, v_marina, v_diego,
     'Valeu por destravar o acesso de homologação ainda de manhã.',
     NOW() - INTERVAL '1 day'),
    (v_company_id, v_ana, v_marina,
     'A revisão do texto do onboarding ficou fácil de usar no app.',
     NOW() - INTERVAL '8 hours');

  -- Avaliação formal enviada
  INSERT INTO formal_review_cycles (
    company_id, title, description, model, include_self, status,
    period_start, period_end, created_by_user_id
  ) VALUES (
    v_company_id, 'Avaliação de competências',
    'Ciclo 180 com autoavaliação. Resultado já enviado para a Marina.',
    '180', TRUE, 'open', CURRENT_DATE - 30, CURRENT_DATE + 15, v_hr_id
  ) RETURNING id INTO v_fr_cycle;

  INSERT INTO formal_reviews (
    cycle_id, company_id, subject_candidate_id, manager_user_id, job_role_id,
    status, finalized_at, sent_at
  ) VALUES (
    v_fr_cycle, v_company_id, v_marina, v_hr_id, v_role_prod,
    'sent', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'
  ) RETURNING id INTO v_fr_review;

  INSERT INTO formal_review_items (review_id, company_id, competency_id, label, sort_order)
  VALUES (v_fr_review, v_company_id, v_comp_com, 'Comunicação', 0)
  RETURNING id INTO v_fr_item1;
  INSERT INTO formal_review_items (review_id, company_id, competency_id, label, sort_order)
  VALUES (v_fr_review, v_company_id, v_comp_ent, 'Entrega', 1)
  RETURNING id INTO v_fr_item2;
  INSERT INTO formal_review_items (review_id, company_id, competency_id, label, sort_order)
  VALUES (v_fr_review, v_company_id, v_comp_col, 'Colaboração', 2)
  RETURNING id INTO v_fr_item3;

  INSERT INTO formal_review_raters (
    review_id, company_id, role, user_id, status, submitted_at, overall_notes
  ) VALUES (
    v_fr_review, v_company_id, 'manager', v_hr_id, 'submitted', NOW() - INTERVAL '3 days',
    'Há indícios de clareza na prioridade. Seguir o exemplo concreto no feedback.'
  ) RETURNING id INTO v_fr_mgr;

  INSERT INTO formal_review_raters (
    review_id, company_id, role, candidate_id, status, submitted_at, overall_notes
  ) VALUES (
    v_fr_review, v_company_id, 'self', v_marina, 'submitted', NOW() - INTERVAL '4 days',
    'Quero ficar mais objetiva ao pedir contexto do time.'
  ) RETURNING id INTO v_fr_self;

  INSERT INTO formal_review_scores (rater_id, item_id, company_id, score, notes) VALUES
    (v_fr_mgr, v_fr_item1, v_company_id, 4, 'Contexto chega cedo para o time.'),
    (v_fr_mgr, v_fr_item2, v_company_id, 4, 'Entregas do discovery no prazo combinado.'),
    (v_fr_mgr, v_fr_item3, v_company_id, 5, 'Destrava pares sem concentrar a decisão.'),
    (v_fr_self, v_fr_item1, v_company_id, 3, 'Ainda enrolo o pedido quando falta exemplo.'),
    (v_fr_self, v_fr_item2, v_company_id, 4, 'Cumpro o que entra no combinado da semana.'),
    (v_fr_self, v_fr_item3, v_company_id, 4, 'Peço ajuda cedo quando travo.');

  -- Inbox do app: um aviso de cada tipo, com id para o toque abrir a tela.
  SELECT id INTO v_feedback_id FROM feedback_requests
   WHERE company_id = v_company_id AND token = 'appcolabfeedbackpendingmarina01';
  SELECT id INTO v_leave_id FROM employee_leave_requests
   WHERE company_id = v_company_id AND candidate_id = v_marina AND leave_type = 'sick'
   ORDER BY id DESC LIMIT 1;
  SELECT id INTO v_kudo_id FROM company_kudos
   WHERE company_id = v_company_id AND to_candidate_id = v_marina AND from_candidate_id = v_elena
   ORDER BY id DESC LIMIT 1;
  IF v_def_id IS NOT NULL THEN
    SELECT id INTO v_ae_invite_id FROM ae_invites
     WHERE company_id = v_company_id AND token = 'appcolabmotivatorsinvite0001';
  END IF;

  INSERT INTO candidate_notifications (
    company_id, recipient_candidate_id, type, payload, entity_type, entity_id, dedupe_key, read_at, created_at
  ) VALUES
    (v_company_id, v_marina, 'access_invited',
     '{}'::jsonb, NULL, NULL, 'appcolab:access', NOW() - INTERVAL '30 days', NOW() - INTERVAL '40 days'),
    (v_company_id, v_marina, 'lms_enrolled',
     jsonb_build_object('courseTitle', 'Segurança da informação', 'courseId', v_course_done),
     'lms_course', v_course_done, 'appcolab:lms-enroll', NULL, NOW() - INTERVAL '6 days'),
    (v_company_id, v_marina, 'lms_overdue',
     jsonb_build_object('courseTitle', 'Cultura App Colaborador', 'courseId', v_course_open, 'dueDate', (CURRENT_DATE - 1)::text),
     'lms_enrollment', v_enroll_open, 'appcolab:lms-overdue', NULL, NOW() - INTERVAL '12 hours'),
    (v_company_id, v_marina, 'pdi_updated',
     jsonb_build_object('planTitle', 'PDI: priorização e feedback', 'itemTitle', 'Registrar um feedback com exemplo', 'planId', v_plan_id),
     'development_plan', v_plan_id, 'appcolab:pdi', NULL, NOW() - INTERVAL '2 days'),
    (v_company_id, v_marina, 'okr_activity_assigned',
     jsonb_build_object('activityTitle', 'Publicar o roteiro de prioridade semanal', 'cycleTitle', 'Ciclo OKR atual', 'deadline', (CURRENT_DATE - 1)::text),
     'okr_activity', v_act_late, 'appcolab:okr', NULL, NOW() - INTERVAL '3 days'),
    (v_company_id, v_marina, 'feedback_requested',
     jsonb_build_object('requestId', v_feedback_id),
     'feedback_request', v_feedback_id, 'appcolab:feedback', NULL, NOW() - INTERVAL '1 day'),
    (v_company_id, v_marina, 'dp_leave_update',
     jsonb_build_object('status', 'approved', 'leaveId', v_leave_id),
     'leave', v_leave_id, 'appcolab:leave', NULL, NOW() - INTERVAL '12 days'),
    (v_company_id, v_marina, 'dp_doc_reminder',
     jsonb_build_object('docKey', 'aso'),
     'dp_document', NULL, 'appcolab:doc', NULL, NOW() - INTERVAL '5 days'),
    (v_company_id, v_marina, 'dp_signature_requested',
     jsonb_build_object('docKey', 'contract'),
     'dp_document', NULL, 'appcolab:sign', NULL, NOW() - INTERVAL '20 hours'),
    (v_company_id, v_marina, 'kudos_received',
     jsonb_build_object('fromName', 'Elena Ferreira', 'message', 'O discovery da home chegou com contexto e um próximo passo claro.'),
     'company_kudo', v_kudo_id, 'appcolab:kudos', NULL, NOW() - INTERVAL '2 days'),
    (v_company_id, v_marina, 'generic',
     jsonb_build_object('message', 'Lembrete: o check-in de 60 dias está na jornada.'),
     NULL, NULL, 'appcolab:generic', NULL, NOW() - INTERVAL '6 hours');

  IF v_ae_invite_id IS NOT NULL THEN
    INSERT INTO candidate_notifications (
      company_id, recipient_candidate_id, type, payload, entity_type, entity_id, dedupe_key, created_at
    ) VALUES (
      v_company_id, v_marina, 'motivators_invite',
      jsonb_build_object(
        'assessmentUrl', '/assessment/motivators/appcolabmotivatorsinvite0001',
        'inviteId', v_ae_invite_id
      ),
      'ae_invite', v_ae_invite_id, 'appcolab:motivators', NOW() - INTERVAL '9 days'
    );
  END IF;

  INSERT INTO candidate_notifications (
    company_id, recipient_candidate_id, type, payload, dedupe_key, created_at
  )
  SELECT v_company_id, c.id, 'generic',
         jsonb_build_object('message', 'Há novidade no mural da App Colaborador.'),
         'appcolab:generic:' || c.id::text,
         NOW() - INTERVAL '3 hours'
    FROM candidates c
   WHERE c.company_id = v_company_id AND c.id <> v_marina;

  RAISE NOTICE 'App Colaborador pronta. company_id=% login=marina.costa@app-colaborador.demo senha=AppColab!2026', v_company_id;
END
$app$;

COMMIT;

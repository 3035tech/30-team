-- =============================================================================
-- DEMO "Todos os Dados" — seed SQL completo para apresentações
-- EN: Full presentation demo seed (tenant slug = todos-os-dados-demo only)
-- =============================================================================
-- Como rodar / How to run:
--   psql "$DATABASE_URL" -f scripts/seed-demo-todos-os-dados.sql
-- Preferência JS (DTOV): CONFIRM_DEMO_PURGE=1 npm run db:seed-demo-todos-os-dados
--
-- Requer / Requires: migrations através de 080 + tabela areas populada.
-- Motivadores opcional: ae_definitions slug=motivators (npm run db:seed-motivators).
--
-- Logins (senha = DemoTodosDados!2026):
--   | Who          | Email                            | Surface              |
--   | HR           | hr@todos-os-dados.demo           | /login → dashboard   |
--   | Direction    | direction@todos-os-dados.demo    | /login               |
--   | Collaborator | colaborador@todos-os-dados.demo  | /employee         |
--
-- Smoke URLs (tokens fixos):
--   /t/d0d0todosdadose5f60718293a4b5c6d7e8f01
--   /v/e1e1todosdadose5f60718293a4b5c6d7e8f02
--   /r/a3a3todosdadose5f60718293a4b5c6d7e8f04a3a3todosdadose5f60718
--   /e/e0e0todosdadose5f60718293a4b5c6d7e8f07
--   /clima/c1c1todosdadose5f60718293a4b5c6d7e8f08
--   /pulso/p1p1todosdadose5f60718293a4b5c6d7e8f09
--   /assessment/motivators/b4b4todosdadose5f60718293a4b5c6d7e8f05
--
-- DESTRUTIVO só para slug=todos-os-dados-demo.
-- v_i_confirm_purge := TRUE (tenant demo isolado).
-- Se "current transaction is aborted" (25P02): rode ROLLBACK; e execute de novo.
-- O ROLLBACK abaixo pode emitir WARNING "no transaction in progress" — ignore.
-- =============================================================================

ROLLBACK;

ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS client_report_show_salary BOOLEAN NOT NULL DEFAULT FALSE;

BEGIN;

DO $tod$
DECLARE
  v_i_confirm_purge BOOLEAN := TRUE;

  v_company_id   BIGINT;
  v_purge_id     BIGINT;
  v_hr_id        BIGINT;
  v_dir_id       BIGINT;
  v_vac_open     BIGINT;
  v_vac_closed   BIGINT;
  v_role_id      BIGINT;
  v_def_id       BIGINT;
  v_cand_id      BIGINT;
  v_ass_id       BIGINT;
  v_vc_id        BIGINT;
  v_attempt_id   BIGINT;
  v_plan_id      BIGINT;
  v_plan_item_id BIGINT;
  v_survey_id    BIGINT;
  v_q_likert     BIGINT;
  v_q_text       BIGINT;
  v_q_enps       BIGINT;
  v_invite_id    BIGINT;
  v_pulse_id     BIGINT;
  v_pulse_q      BIGINT;
  v_group_id     BIGINT;
  v_cycle_id     BIGINT;
  v_goal_id      BIGINT;
  v_crit_id      BIGINT;
  v_res_id       BIGINT;
  v_course_id    BIGINT;
  v_lesson1_id   BIGINT;
  v_lesson2_id   BIGINT;
  v_enroll_id    BIGINT;
  v_cohort_id    BIGINT;
  v_colab_id     BIGINT;
  v_colab_ass    BIGINT;
  v_pedro_id     BIGINT;
  v_marina_id    BIGINT;
  v_lara_id      BIGINT;
  v_non_demo     INT;
  v_i            INT;
  v_top          INT;
  v_scores       JSONB;
  v_name         TEXT;
  v_email        TEXT;
  v_city         TEXT;
  v_state        TEXT;
  v_area         INT;
  v_pipe         TEXT;
  v_start        DATE;
  v_score_n      INT;
  v_tok          TEXT;
  v_area_ids     INT[];
  v_member_ass   BIGINT[] := '{}';
  v_base_ass     BIGINT;
  v_emp_ids      BIGINT[] := '{}';
  v_emp_ass      BIGINT[] := '{}';
  v_cap          TEXT;

  v_company_tok  TEXT := 'd0d0todosdadose5f60718293a4b5c6d7e8f01';
  v_vacancy_tok  TEXT := 'e1e1todosdadose5f60718293a4b5c6d7e8f02';
  v_vac_closed_tok TEXT := 'f2f2todosdadose5f60718293a4b5c6d7e8f03';
  v_report_tok   TEXT := 'a3a3todosdadose5f60718293a4b5c6d7e8f04a3a3todosdadose5f60718';
  v_ae_tok       TEXT := 'b4b4todosdadose5f60718293a4b5c6d7e8f05';
  v_invite_tok   TEXT := 'c5c5todosdadose5f60718293a4b5c6d7e8f06';
  v_portal_tok   TEXT := 'e0e0todosdadose5f60718293a4b5c6d7e8f07';
  v_climate_tok  TEXT := 'c1c1todosdadose5f60718293a4b5c6d7e8f08';
  v_pulse_tok    TEXT := 'p1p1todosdadose5f60718293a4b5c6d7e8f09';
  v_side_tok     TEXT := 's1s1todosdadose5f60718293a4b5c6d7e8f0a';
  -- bcryptjs cost 10 de DemoTodosDados!2026
  v_pwd_hash     TEXT := '$2a$10$aY1laOJtUiXvZDmM7Mwgd.gAhCwWeR90GIfgJmsuhHSsTvANYEU/q';

  v_emp_names TEXT[] := ARRAY[
    'Ana Clara Mendes',
    'Bruno Oliveira',
    'Carla Souza',
    'Diego Martins',
    'Elena Ferreira',
    'Fábio Nunes',
    'Gabriela Rocha',
    'Hugo Almeida',
    'Íris Campos',
    'Lucas Colaborador',
    'Joana Prestes',
    'Marcos Vieira'
  ];
  v_emp_emails TEXT[] := ARRAY[
    'ana@todos-os-dados.demo',
    'bruno@todos-os-dados.demo',
    'carla@todos-os-dados.demo',
    'diego@todos-os-dados.demo',
    'elena@todos-os-dados.demo',
    'fabio@todos-os-dados.demo',
    'gabi@todos-os-dados.demo',
    'hugo@todos-os-dados.demo',
    'iris@todos-os-dados.demo',
    'colaborador@todos-os-dados.demo',
    'joana@todos-os-dados.demo',
    'marcos@todos-os-dados.demo'
  ];
  v_emp_cities TEXT[] := ARRAY[
    'São Paulo','São Paulo','Campinas','Rio de Janeiro','São Paulo','Belo Horizonte',
    'Curitiba','São Paulo','Porto Alegre','São Paulo','Florianópolis','Recife'
  ];
  v_emp_states TEXT[] := ARRAY[
    'SP','SP','SP','RJ','SP','MG','PR','SP','RS','SP','SC','PE'
  ];
  v_pipe_names TEXT[] := ARRAY[
    'Pedro Henrique Santos','Marina Duarte','Gustavo Pires','Lara Mendonça',
    'Otávio Ribeiro','Nina Barbosa','Ricardo Alves'
  ];
  v_pipe_emails TEXT[] := ARRAY[
    'pedro@todos-os-dados.demo','marina@todos-os-dados.demo','gustavo@todos-os-dados.demo',
    'lara@todos-os-dados.demo','otavio@todos-os-dados.demo','nina@todos-os-dados.demo',
    'ricardo@todos-os-dados.demo'
  ];
  v_pipe_stages TEXT[] := ARRAY[
    'screening','interview','rejected','approved','test_completed','new','archived'
  ];
  v_caps TEXT[] := ARRAY[
    'overview.view','team.view','compatibility.view','compare.view','group.view',
    'leadership.view','vacancies.view','motivators.view','climate.view',
    'job_roles.view','performance.view','succession.view','exit_analysis.view',
    'learning.view','benefits.view','help.view'
  ];
BEGIN
  IF NOT v_i_confirm_purge THEN
    RAISE EXCEPTION
      'ABORTADO: defina v_i_confirm_purge := TRUE. Apaga apenas slug=todos-os-dados-demo.';
  END IF;

  -- Inclui company soft-deleted (deleted=TRUE): senão o INSERT de users
  -- colide com idx_users_email_unique (hr@ / direction@ ainda ativos).
  FOR v_purge_id IN
    SELECT id FROM companies WHERE LOWER(slug) = 'todos-os-dados-demo' ORDER BY id
  LOOP
    v_company_id := v_purge_id;

    SELECT COUNT(*)::int INTO v_non_demo
    FROM users
    WHERE company_id = v_company_id
      AND email NOT ILIKE '%.demo'
      AND deleted = FALSE;

    IF v_non_demo > 0 THEN
      RAISE EXCEPTION 'ABORTADO: company_id=% parece tenant real (users fora de *.demo).', v_company_id;
    END IF;

    -- ---- Purge (FK-safe; optional tables via to_regclass) ----
    IF to_regclass('public.development_plan_lms_links') IS NOT NULL THEN
      DELETE FROM development_plan_lms_links l
        USING development_plan_items i
       WHERE l.plan_item_id = i.id AND i.company_id = v_company_id;
    END IF;
    IF to_regclass('public.lms_lesson_completions') IS NOT NULL THEN
      DELETE FROM lms_lesson_completions WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.lms_enrollments') IS NOT NULL THEN
      DELETE FROM lms_enrollments WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.lms_lessons') IS NOT NULL THEN
      DELETE FROM lms_lessons WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.lms_cohorts') IS NOT NULL THEN
      DELETE FROM lms_cohorts WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.lms_courses') IS NOT NULL THEN
      DELETE FROM lms_courses WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.employee_compensation_events') IS NOT NULL THEN
      DELETE FROM employee_compensation_events WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.candidate_notifications') IS NOT NULL THEN
      DELETE FROM candidate_notifications WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.employee_login_tokens') IS NOT NULL THEN
      DELETE FROM employee_login_tokens WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.performance_side_reviews') IS NOT NULL THEN
      DELETE FROM performance_side_reviews WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.interview_slots') IS NOT NULL THEN
      DELETE FROM interview_slots WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.job_funnel_events') IS NOT NULL THEN
      DELETE FROM job_funnel_events WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.referral_codes') IS NOT NULL THEN
      DELETE FROM referral_codes WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.company_analytics_report_prefs') IS NOT NULL THEN
      DELETE FROM company_analytics_report_prefs WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.vacancy_report_shares') IS NOT NULL THEN
      DELETE FROM vacancy_report_shares WHERE company_id = v_company_id;
    END IF;

    DELETE FROM manager_notifications WHERE company_id = v_company_id;
    IF to_regclass('public.hr_scores') IS NOT NULL THEN
      DELETE FROM hr_scores WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.development_plan_resource_links') IS NOT NULL THEN
      DELETE FROM development_plan_resource_links l
        USING development_plan_items i
       WHERE l.plan_item_id = i.id AND i.company_id = v_company_id;
    END IF;
    IF to_regclass('public.development_plan_items') IS NOT NULL THEN
      DELETE FROM development_plan_items WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.development_plans') IS NOT NULL THEN
      DELETE FROM development_plans WHERE company_id = v_company_id;
    END IF;
    DELETE FROM one_on_ones WHERE company_id = v_company_id;
    IF to_regclass('public.retention_followups') IS NOT NULL THEN
      DELETE FROM retention_followups WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.employee_onboarding_checkins') IS NOT NULL THEN
      DELETE FROM employee_onboarding_checkins WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.employee_pre_onboarding_items') IS NOT NULL THEN
      DELETE FROM employee_pre_onboarding_items WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.employee_portal_tokens') IS NOT NULL THEN
      DELETE FROM employee_portal_tokens WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.interview_scorecards') IS NOT NULL THEN
      DELETE FROM interview_scorecards WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.climate_surveys') IS NOT NULL THEN
      DELETE FROM climate_survey_responses r
        USING climate_surveys s WHERE r.survey_id = s.id AND s.company_id = v_company_id;
      DELETE FROM climate_survey_invites i
        USING climate_surveys s WHERE i.survey_id = s.id AND s.company_id = v_company_id;
      DELETE FROM climate_survey_questions q
        USING climate_surveys s WHERE q.survey_id = s.id AND s.company_id = v_company_id;
      DELETE FROM climate_surveys WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.team_pulses') IS NOT NULL THEN
      DELETE FROM team_pulse_responses r
        USING team_pulses p WHERE r.pulse_id = p.id AND p.company_id = v_company_id;
      DELETE FROM team_pulse_invites i
        USING team_pulses p WHERE i.pulse_id = p.id AND p.company_id = v_company_id;
      DELETE FROM team_pulse_questions q
        USING team_pulses p WHERE q.pulse_id = p.id AND p.company_id = v_company_id;
      DELETE FROM team_pulses WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.team_groups') IS NOT NULL THEN
      DELETE FROM team_groups WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.succession_plans') IS NOT NULL THEN
      DELETE FROM succession_plans WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.critical_roles') IS NOT NULL THEN
      DELETE FROM critical_roles WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.performance_cycles') IS NOT NULL THEN
      DELETE FROM performance_reviews r
        USING performance_cycles c WHERE r.cycle_id = c.id AND c.company_id = v_company_id;
      DELETE FROM performance_goals g
        USING performance_cycles c WHERE g.cycle_id = c.id AND c.company_id = v_company_id;
      DELETE FROM performance_cycles WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.exit_records') IS NOT NULL THEN
      DELETE FROM exit_records WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.learning_resources') IS NOT NULL THEN
      DELETE FROM learning_resources WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.company_benefits') IS NOT NULL THEN
      DELETE FROM company_benefits WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.benefit_categories') IS NOT NULL THEN
      DELETE FROM benefit_categories WHERE company_id = v_company_id;
    END IF;
    IF to_regclass('public.job_roles') IS NOT NULL THEN
      DELETE FROM job_roles WHERE company_id = v_company_id;
    END IF;

    DELETE FROM ae_attempts WHERE company_id = v_company_id;
    DELETE FROM ae_invites WHERE company_id = v_company_id;
    DELETE FROM vacancy_candidate_pipeline_history h
      USING vacancy_candidates vc
     WHERE h.vacancy_candidate_id = vc.id AND vc.company_id = v_company_id;
    DELETE FROM vacancy_candidates WHERE company_id = v_company_id;
    DELETE FROM assessment_pipeline_history h
      USING assessments a WHERE h.assessment_id = a.id AND a.company_id = v_company_id;
    DELETE FROM assessments WHERE company_id = v_company_id;
    DELETE FROM vacancy_rubrics r
      USING vacancies v WHERE r.vacancy_id = v.id AND v.company_id = v_company_id;
    DELETE FROM vacancy_links l
      USING vacancies v WHERE l.vacancy_id = v.id AND v.company_id = v_company_id;
    DELETE FROM candidate_invites WHERE company_id = v_company_id;
    DELETE FROM vacancies WHERE company_id = v_company_id;
    DELETE FROM candidates WHERE company_id = v_company_id;
    DELETE FROM company_links WHERE company_id = v_company_id;
    DELETE FROM user_capability_overrides o
      USING users u WHERE o.user_id = u.id AND u.company_id = v_company_id;
    DELETE FROM users WHERE company_id = v_company_id;
    DELETE FROM companies WHERE id = v_company_id;
  END LOOP;

  -- Logins demo órfãos (empresa soft-deleted / slug mudou sem purge)
  DELETE FROM user_capability_overrides o
    USING users u
   WHERE o.user_id = u.id
     AND LOWER(u.email) IN (
       'hr@todos-os-dados.demo',
       'direction@todos-os-dados.demo'
     );
  DELETE FROM users
   WHERE LOWER(email) IN (
     'hr@todos-os-dados.demo',
     'direction@todos-os-dados.demo'
   );

  -- Tokens fixos / batch da demo (órfãos fora do company_id purge)
  DELETE FROM company_links WHERE token LIKE '%todosdados%';
  DELETE FROM vacancy_links WHERE token LIKE '%todosdados%';
  DELETE FROM candidate_invites WHERE token LIKE '%todosdados%';
  DELETE FROM ae_invites WHERE token LIKE '%todosdados%';
  IF to_regclass('public.vacancy_report_shares') IS NOT NULL THEN
    DELETE FROM vacancy_report_shares WHERE token LIKE '%todosdados%';
  END IF;
  IF to_regclass('public.employee_portal_tokens') IS NOT NULL THEN
    DELETE FROM employee_portal_tokens WHERE token LIKE '%todosdados%';
  END IF;
  IF to_regclass('public.climate_survey_invites') IS NOT NULL THEN
    DELETE FROM climate_survey_invites WHERE token LIKE '%todosdados%';
  END IF;
  IF to_regclass('public.team_pulse_invites') IS NOT NULL THEN
    DELETE FROM team_pulse_invites WHERE token LIKE '%todosdados%';
  END IF;
  IF to_regclass('public.performance_side_reviews') IS NOT NULL THEN
    DELETE FROM performance_side_reviews WHERE token LIKE '%todosdados%';
  END IF;

  -- ---- Company + users ----
  INSERT INTO companies (
    name, slug, active, deleted, anniversary_date,
    website, about_html, public_profile_enabled, logo_url
  ) VALUES (
    'Todos os Dados',
    'todos-os-dados-demo',
    TRUE, FALSE,
    (CURRENT_DATE + 5) - INTERVAL '12 years',
    'https://www.todososdados.demo',
    $html$
<p><strong>Todos os Dados</strong> é a empresa demo do 30Team para apresentações.</p>
<p>Recrutamento com perfil de trabalho T1–T9, Motivadores, People (1:1, PDI, clima, pulso) e LMS.</p>
$html$,
    TRUE,
    NULL
  )
  RETURNING id INTO v_company_id;

  INSERT INTO users (company_id, email, password_hash, role, locale, display_name, active, deleted)
  VALUES (v_company_id, 'hr@todos-os-dados.demo', v_pwd_hash, 'hr', 'pt-BR', 'RH Todos os Dados', TRUE, FALSE)
  RETURNING id INTO v_hr_id;

  INSERT INTO users (company_id, email, password_hash, role, locale, display_name, active, deleted)
  VALUES (v_company_id, 'direction@todos-os-dados.demo', v_pwd_hash, 'direction', 'pt-BR', 'Direção Todos os Dados', TRUE, FALSE)
  RETURNING id INTO v_dir_id;

  FOREACH v_cap IN ARRAY v_caps LOOP
    INSERT INTO user_capability_overrides (user_id, capability, granted)
    VALUES (v_hr_id, v_cap, TRUE), (v_dir_id, v_cap, TRUE);
  END LOOP;

  INSERT INTO company_links (company_id, token, active, expires_at, require_candidate_email)
  VALUES (v_company_id, v_company_tok, TRUE, NOW() + INTERVAL '365 days', TRUE);

  SELECT ARRAY_AGG(id ORDER BY id) INTO v_area_ids FROM areas;
  IF v_area_ids IS NULL OR cardinality(v_area_ids) = 0 THEN
      RAISE EXCEPTION 'ABORTADO: tabela areas vazia. Rode migrations/bootstrap antes.';
  END IF;

  SELECT id INTO v_def_id
  FROM ae_definitions
  WHERE LOWER(slug) = 'motivators' AND active = TRUE
  LIMIT 1;
  IF v_def_id IS NULL THEN
    RAISE NOTICE 'Motivadores: skip (ae_definitions slug=motivators ausente). Rode npm run db:seed-motivators.';
  END IF;

  -- Job role + vacancies
  IF to_regclass('public.job_roles') IS NOT NULL THEN
    INSERT INTO job_roles (company_id, name, description, rubric, active)
    VALUES (
      v_company_id,
      'Engenheiro(a) de Plataforma',
      'Cargo demo vinculado à vaga fullstack.',
      '{"5":3,"1":2,"6":2,"3":1}'::jsonb,
      TRUE
    )
    RETURNING id INTO v_role_id;
  END IF;

  INSERT INTO vacancies (
    company_id, title, slug, status, positions_count, target_date, deleted,
    description, salary_min, salary_max, client_report_show_salary,
    employment_type, workplace_modality, workplace_city, workplace_state,
    public_page_enabled, job_role_id
  ) VALUES (
    v_company_id,
    'Engenheiro(a) Fullstack: Plataforma',
    'engenheiro-fullstack-plataforma',
    'open', 2, CURRENT_DATE + 21, FALSE,
    $html$
<p><strong>Missão:</strong> evoluir o produto 30Team (Next.js + Postgres) com qualidade e previsibilidade.</p>
<ul>
<li>React / Node em produto multi-tenant</li>
<li>SQL, índices e performance em listagens</li>
<li>Cultura de entrega com revisão e documentação</li>
</ul>
$html$,
    '14000.00', '22000.00', TRUE,
    'clt', 'hybrid', 'São Paulo', 'SP',
    TRUE, v_role_id
  )
  RETURNING id INTO v_vac_open;

  INSERT INTO vacancy_links (vacancy_id, token, active, expires_at, require_candidate_email)
  VALUES (v_vac_open, v_vacancy_tok, TRUE, NOW() + INTERVAL '180 days', TRUE);

  INSERT INTO vacancy_rubrics (vacancy_id, desired_type_weights, notes)
  VALUES (
    v_vac_open,
    '{"5":3,"1":2,"6":2,"3":1}'::jsonb,
    '<p>Priorizar <strong>T5/T1/T6</strong> (análise + processo). T3 como executor complementar.</p>'
  )
  ON CONFLICT (vacancy_id) DO UPDATE SET
    desired_type_weights = EXCLUDED.desired_type_weights,
    notes = EXCLUDED.notes,
    updated_at = NOW();

  INSERT INTO vacancies (
    company_id, title, slug, status, positions_count, target_date, deleted,
    description, salary_min, salary_max, client_report_show_salary,
    employment_type, workplace_modality, workplace_city, workplace_state,
    public_page_enabled
  ) VALUES (
    v_company_id,
    'Analista de Dados (encerrada)',
    'analista-dados-encerrada',
    'closed', 1, CURRENT_DATE - 3, FALSE,
    '<p>Vaga encerrada (demo apresentação).</p>',
    '8000.00', '12000.00', FALSE,
    'clt', 'remote', NULL, NULL,
    FALSE
  )
  RETURNING id INTO v_vac_closed;

  INSERT INTO vacancy_links (vacancy_id, token, active, expires_at)
  VALUES (v_vac_closed, v_vac_closed_tok, FALSE, NOW() - INTERVAL '1 day');

  -- ---------- 12 colaboradores (T1–T9 + colaborador@ + 2 extras) ----------
  FOR v_i IN 1..12 LOOP
    v_top := CASE WHEN v_i <= 9 THEN v_i WHEN v_i = 10 THEN 5 ELSE ((v_i + 2) % 9) + 1 END;
    v_name := v_emp_names[v_i];
    v_email := v_emp_emails[v_i];
    v_city := v_emp_cities[v_i];
    v_state := v_emp_states[v_i];
    v_area := v_area_ids[1 + ((v_i - 1) % cardinality(v_area_ids))];
    v_start := CURRENT_DATE - (90 + v_i * 11);

    v_scores := jsonb_build_object(
      '1', CASE WHEN v_top = 1 THEN 28 ELSE 10 + ((v_i + 1) % 8) END,
      '2', CASE WHEN v_top = 2 THEN 27 ELSE 9 + ((v_i + 2) % 8) END,
      '3', CASE WHEN v_top = 3 THEN 29 ELSE 11 + ((v_i + 3) % 7) END,
      '4', CASE WHEN v_top = 4 THEN 26 ELSE 10 + ((v_i + 4) % 8) END,
      '5', CASE WHEN v_top = 5 THEN 30 ELSE 12 + ((v_i + 5) % 7) END,
      '6', CASE WHEN v_top = 6 THEN 28 ELSE 11 + ((v_i + 6) % 8) END,
      '7', CASE WHEN v_top = 7 THEN 27 ELSE 9 + ((v_i + 7) % 8) END,
      '8', CASE WHEN v_top = 8 THEN 29 ELSE 10 + ((v_i) % 8) END,
      '9', CASE WHEN v_top = 9 THEN 26 ELSE 11 + ((v_i + 1) % 7) END
    );

    INSERT INTO candidates (
      company_id, full_name, email, phone, linkedin_url, city, state,
      availability, source, consent_at, employment_status, hired_at, start_date,
      birth_date, salary_expectation, hr_notes, password_hash, preferred_locale,
      one_on_one_prep_at, one_on_one_prep_note
    ) VALUES (
      v_company_id, v_name, v_email,
      '+55 11 991' || lpad(v_i::text, 2, '0') || '-' || lpad((1000 + v_i)::text, 4, '0'),
      'https://linkedin.com/in/todosdados-' || split_part(v_email, '@', 1),
      v_city, v_state, 'immediate',
      CASE (v_i % 4) WHEN 0 THEN 'referral' WHEN 1 THEN 'linkedin' WHEN 2 THEN 'agency' ELSE 'job_board' END,
      NOW() - (v_i || ' days')::interval,
      'employee',
      v_start::timestamptz,
      v_start,
      (CURRENT_DATE + ((v_i % 9) + 1)) - INTERVAL '30 years',
      (10 + v_i)::text || '000.00',
      '<p>Colaborador demo T' || v_top::text || ': ' || v_name || '.</p>',
      CASE WHEN v_i = 10 THEN v_pwd_hash ELSE NULL END,
      CASE WHEN v_i = 10 THEN 'pt-BR' ELSE NULL END,
      CASE WHEN v_i = 10 THEN NOW() - INTERVAL '2 days' ELSE NULL END,
      CASE WHEN v_i = 10 THEN 'Prep 1:1: quero alinhar prioridades do trimestre e PDI.' ELSE '' END
    )
    RETURNING id INTO v_cand_id;

    v_emp_ids := array_append(v_emp_ids, v_cand_id);
    IF v_i = 10 THEN
      v_colab_id := v_cand_id;
    END IF;

    INSERT INTO assessments (
      candidate_id, company_id, area_id, top_type, scores, source, pipeline_stage,
      hired_at, start_date, fill_duration_ms, created_at
    ) VALUES (
      v_cand_id, v_company_id, v_area, v_top, v_scores, 'demo_todos_os_dados', 'hired',
      v_start::timestamptz, v_start,
      180000 + v_i * 900,
      (v_start - 8)::timestamptz
    )
    RETURNING id INTO v_ass_id;

    v_emp_ass := array_append(v_emp_ass, v_ass_id);
    IF v_i = 1 THEN v_base_ass := v_ass_id; END IF;
    IF v_i = 10 THEN v_colab_ass := v_ass_id; END IF;
    IF v_i <= 6 THEN
      v_member_ass := array_append(v_member_ass, v_ass_id);
    END IF;

    INSERT INTO assessment_pipeline_history (
      assessment_id, from_stage, to_stage, start_date, changed_by_user_id, changed_at
    ) VALUES (
      v_ass_id, 'approved', 'hired', v_start, v_hr_id, v_start::timestamptz
    );

    IF v_def_id IS NOT NULL THEN
      INSERT INTO ae_attempts (
        definition_id, company_id, candidate_id, area_id, status,
        started_at, completed_at, dimension_scores, ranking, profile_summary, algorithm_version
      ) VALUES (
        v_def_id, v_company_id, v_cand_id, v_area, 'completed',
        NOW() - ((12 + v_i) || ' days')::interval,
        NOW() - ((12 + v_i) || ' days')::interval,
        jsonb_build_object(
          'reconhecimento', 35 + (v_i % 40),
          'financeiro', 40 + ((v_i * 2) % 35),
          'crescimento', 45 + ((v_i * 3) % 40),
          'desenvolvimento', 50 + ((v_i * 5) % 35),
          'autonomia', 55 + ((v_i * 7) % 30),
          'flexibilidade', 42 + ((v_i * 4) % 35),
          'proposito', 60 + ((v_i * 3) % 25),
          'relacionamentos', 48 + ((v_i * 6) % 30),
          'seguranca', 38 + ((v_i * 5) % 40),
          'lideranca', 32 + ((v_i * 8) % 40),
          'desafio', 50 + ((v_i * 2) % 35),
          'criatividade', 40 + ((v_i * 9) % 35),
          'equilibrio', 52 + ((v_i * 4) % 30)
        ),
        '["proposito","desenvolvimento","autonomia","crescimento","equilibrio","desafio","relacionamentos","flexibilidade","seguranca","financeiro","reconhecimento","lideranca","criatividade"]'::jsonb,
        'Demo: hipóteses de motivação (T' || v_top::text || ').',
        'ae-scoring-v2'
      );
    END IF;

    IF v_i <= 8 OR v_i = 10 THEN
      INSERT INTO one_on_ones (
        company_id, candidate_id, meeting_date, notes, next_steps, created_by_user_id
      ) VALUES (
        v_company_id, v_cand_id, CURRENT_DATE - (v_i * 4),
        '<p>1:1 com ' || v_name || ' (T' || v_top::text || ').</p><ul><li>Prioridades</li><li>Colaboração</li></ul>',
        '<p>Revisitar PDI em 2 semanas.</p>',
        v_hr_id
      );
    END IF;

    IF to_regclass('public.hr_scores') IS NOT NULL THEN
      v_score_n := 50 + ((v_i * 7) % 45);
      INSERT INTO hr_scores (company_id, candidate_id, score, signals, turnover_risk, calculated_at)
      VALUES (
        v_company_id, v_cand_id, v_score_n,
        jsonb_build_object(
          'profile', jsonb_build_object('score', 70 + (v_i % 20), 'weight', 0.15),
          'motivators', jsonb_build_object('score', 55 + (v_i % 30), 'weight', 0.20),
          'note', 'demo_todos_os_dados'
        ),
        CASE WHEN v_score_n >= 75 THEN 'low' WHEN v_score_n >= 50 THEN 'medium' ELSE 'high' END,
        NOW() - (v_i || ' hours')::interval
      )
      ON CONFLICT (candidate_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Portal /e for colaborador
  IF to_regclass('public.employee_portal_tokens') IS NOT NULL AND v_colab_id IS NOT NULL THEN
    INSERT INTO employee_portal_tokens (
      company_id, candidate_id, token, expires_at, created_by_user_id,
      prepared_at, note_to_manager, last_seen_at
    ) VALUES (
      v_company_id, v_colab_id, v_portal_tok, NOW() + INTERVAL '180 days', v_hr_id,
      NOW() - INTERVAL '2 days',
      'Prep via portal: prioridades e PDI.',
      NOW() - INTERVAL '6 hours'
    );
  END IF;

  -- ---------- Pipeline candidates (7 stages) ----------
  FOR v_i IN 1..7 LOOP
    v_top := ((v_i + 3) % 9) + 1;
    v_name := v_pipe_names[v_i];
    v_email := v_pipe_emails[v_i];
    v_pipe := v_pipe_stages[v_i];
    v_area := v_area_ids[1 + ((v_i - 1) % cardinality(v_area_ids))];
    v_scores := jsonb_build_object(
      '1', 10 + v_i, '2', 11 + v_i, '3', 12 + v_i, '4', 9 + v_i,
      '5', 13 + v_i, '6', 10 + v_i, '7', 8 + v_i, '8', 11 + v_i, '9', 9 + v_i
    );
    -- Fixed scores for shortlist stars
    IF v_i = 1 THEN
      v_top := 5;
      v_scores := '{"1":15,"2":11,"3":13,"4":12,"5":27,"6":18,"7":10,"8":14,"9":9}'::jsonb;
    ELSIF v_i = 2 THEN
      v_top := 3;
      v_scores := '{"1":12,"2":14,"3":26,"4":11,"5":13,"6":10,"7":16,"8":15,"9":9}'::jsonb;
    ELSIF v_i = 4 THEN
      v_top := 1;
      v_scores := '{"1":28,"2":12,"3":14,"4":11,"5":16,"6":18,"7":9,"8":13,"9":10}'::jsonb;
    ELSE
      v_scores := v_scores || jsonb_build_object(v_top::text, 25 + v_i);
    END IF;

    INSERT INTO candidates (
      company_id, full_name, email, phone, city, state,
      salary_expectation, availability, source, consent_at, employment_status, hr_notes
    ) VALUES (
      v_company_id, v_name, v_email,
      '+55 11 992' || lpad(v_i::text, 2, '0') || '-' || lpad((2000 + v_i)::text, 4, '0'),
      CASE v_i WHEN 2 THEN 'Curitiba' WHEN 4 THEN 'Florianópolis' WHEN 5 THEN 'Recife' WHEN 6 THEN 'Brasília' ELSE 'São Paulo' END,
      CASE v_i WHEN 2 THEN 'PR' WHEN 4 THEN 'SC' WHEN 5 THEN 'PE' WHEN 6 THEN 'DF' ELSE 'SP' END,
      (14 + v_i)::text || '000.00',
      CASE WHEN v_i IN (1,4) THEN '30_days' WHEN v_i = 2 THEN '15_days' WHEN v_i = 5 THEN '60_days' ELSE 'immediate' END,
      CASE WHEN v_i = 2 THEN 'referral' WHEN v_i = 3 THEN 'job_board' WHEN v_i = 4 THEN 'agency' ELSE 'linkedin' END,
      NOW() - (v_i || ' days')::interval,
      'candidate',
      '<p>Candidato funil: estágio ' || v_pipe || '.</p>'
    )
    RETURNING id INTO v_cand_id;

    IF v_i = 1 THEN v_pedro_id := v_cand_id; END IF;
    IF v_i = 2 THEN v_marina_id := v_cand_id; END IF;
    IF v_i = 4 THEN v_lara_id := v_cand_id; END IF;

    INSERT INTO assessments (
      candidate_id, company_id, area_id, vacancy_id, top_type, scores, source,
      pipeline_stage, rejection_reason, fill_duration_ms, created_at
    ) VALUES (
      v_cand_id, v_company_id, v_area, v_vac_open, v_top, v_scores, 'demo_todos_os_dados',
      v_pipe,
      CASE WHEN v_pipe = 'rejected' THEN 'skill_gap' ELSE NULL END,
      150000 + v_i * 800,
      NOW() - (v_i || ' days')::interval
    )
    RETURNING id INTO v_ass_id;

    INSERT INTO vacancy_candidates (
      vacancy_id, candidate_id, company_id, interview_notes, pipeline_stage,
      rejection_reason, created_by_user_id
    ) VALUES (
      v_vac_open, v_cand_id, v_company_id,
      '<p><strong>Nota demo:</strong> ' || v_name || ' em <em>' || v_pipe || '</em>.</p>',
      v_pipe,
      CASE WHEN v_pipe = 'rejected' THEN 'skill_gap' ELSE NULL END,
      v_hr_id
    )
    RETURNING id INTO v_vc_id;

    IF v_def_id IS NOT NULL AND v_i IN (1, 2, 4, 5) THEN
      INSERT INTO ae_attempts (
        definition_id, company_id, candidate_id, area_id, status,
        started_at, completed_at, dimension_scores, ranking, profile_summary, algorithm_version
      ) VALUES (
        v_def_id, v_company_id, v_cand_id, v_area, 'completed',
        NOW() - ((5 + v_i) || ' days')::interval,
        NOW() - ((5 + v_i) || ' days')::interval,
        '{"reconhecimento":50,"financeiro":45,"crescimento":70,"desenvolvimento":75,"autonomia":80,"flexibilidade":55,"proposito":85,"relacionamentos":60,"seguranca":50,"lideranca":40,"desafio":72,"criatividade":48,"equilibrio":65}'::jsonb,
        '["proposito","autonomia","desenvolvimento","desafio","crescimento","equilibrio","relacionamentos","flexibilidade","reconhecimento","seguranca","financeiro","criatividade","lideranca"]'::jsonb,
        'Demo pipeline: ' || v_name,
        'ae-scoring-v2'
      )
      RETURNING id INTO v_attempt_id;
    END IF;
  END LOOP;

  -- Nina invites
  INSERT INTO candidate_invites (
    vacancy_id, company_id, candidate_name, candidate_email, token, status,
    sent_at, candidate_id, created_by_user_id
  ) VALUES (
    v_vac_open, v_company_id, 'Nina Barbosa', 'nina@todos-os-dados.demo',
    v_invite_tok, 'sent', NOW() - INTERVAL '2 days',
    (SELECT id FROM candidates WHERE company_id = v_company_id AND email = 'nina@todos-os-dados.demo'),
    v_hr_id
  );

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_invites (
      definition_id, company_id, candidate_id, candidate_name, candidate_email,
      token, status, expires_at, created_by_user_id
    ) VALUES (
      v_def_id, v_company_id,
      (SELECT id FROM candidates WHERE company_id = v_company_id AND email = 'nina@todos-os-dados.demo'),
      'Nina Barbosa', 'nina@todos-os-dados.demo',
      v_ae_tok, 'sent', NOW() + INTERVAL '30 days', v_hr_id
    );
  END IF;

  -- Report /r shortlist
  INSERT INTO vacancy_report_shares (
    vacancy_id, company_id, token, title, executive_note, snapshot,
    active, expires_at, created_by_user_id
  ) VALUES (
    v_vac_open, v_company_id, v_report_tok,
    'Shortlist: Fullstack Plataforma',
    $html$
<p><strong>Quem avançar:</strong> Pedro Henrique Santos (T5) e Lara Mendonça (T1).</p>
<p><strong>Conversar:</strong> Marina Duarte (T3). Validar ritmo vs processo.</p>
<p><strong>Próximo passo:</strong> entrevistas técnicas com o time do cliente.</p>
$html$,
    jsonb_build_object(
      'generatedAt', NOW(),
      'vacancy', jsonb_build_object(
        'id', v_vac_open,
        'title', 'Engenheiro(a) Fullstack: Plataforma',
        'companyName', 'Todos os Dados',
        'positionsCount', 2,
        'status', 'open',
        'description',
          '<p><strong>Missão:</strong> evoluir o produto 30Team (Next.js + Postgres).</p>'
      ),
      'privacy', jsonb_build_object('showSalaryExpectation', TRUE),
      'rubricSummary', jsonb_build_object(
        'hasRubric', TRUE,
        'weightedTypes', jsonb_build_array(
          jsonb_build_object('type', 5, 'weight', 3),
          jsonb_build_object('type', 1, 'weight', 2),
          jsonb_build_object('type', 6, 'weight', 2),
          jsonb_build_object('type', 3, 'weight', 1)
        ),
        'notes', 'Priorizar T5/T1/T6.'
      ),
      'executiveNote',
        '<p><strong>Quem avançar:</strong> Pedro e Lara. <strong>Conversar:</strong> Marina.</p>',
      'candidates', jsonb_build_array(
        jsonb_build_object(
          'name', 'Pedro Henrique Santos', 'topType', 5,
          'scores', '{"1":15,"2":11,"3":13,"4":12,"5":27,"6":18,"7":10,"8":14,"9":9}'::jsonb,
          'pipelineStage', 'screening', 'recommendation', 'advance',
          'why', 'Forte aderência analítica à rubrica.',
          'watchOut', 'Pode alongar análise.',
          'interviewProbe', 'Como equilibra profundidade com prazo?',
          'city', 'São Paulo', 'state', 'SP',
          'salaryExpectation', '15000.00', 'availability', '30_days',
          'areaLabel', 'Tecnologia', 'vacancyFitScore010', 7.4, 'vacancyFitLabel', 'medium',
          'fitAlignedTypes', jsonb_build_array(5, 1, 6),
          'fitGapTypes', jsonb_build_array(3),
          'motivatorsTop', jsonb_build_array(
            jsonb_build_object('key', 'autonomia', 'label', 'Autonomia', 'score', 90),
            jsonb_build_object('key', 'desafio', 'label', 'Desafio', 'score', 85)
          )
        ),
        jsonb_build_object(
          'name', 'Lara Mendonça', 'topType', 1,
          'scores', '{"1":28,"2":12,"3":14,"4":11,"5":16,"6":18,"7":9,"8":13,"9":10}'::jsonb,
          'pipelineStage', 'approved', 'recommendation', 'advance',
          'why', 'Processo + qualidade.',
          'watchOut', 'Pode travar com times de atalho.',
          'interviewProbe', 'Como documenta decisões técnicas?',
          'city', 'Florianópolis', 'state', 'SC',
          'salaryExpectation', '18000.00', 'availability', '30_days',
          'areaLabel', 'Tecnologia', 'vacancyFitScore010', 6.9, 'vacancyFitLabel', 'medium',
          'fitAlignedTypes', jsonb_build_array(5, 1, 6),
          'fitGapTypes', jsonb_build_array(3),
          'motivatorsTop', jsonb_build_array(
            jsonb_build_object('key', 'proposito', 'label', 'Propósito', 'score', 90)
          )
        ),
        jsonb_build_object(
          'name', 'Marina Duarte', 'topType', 3,
          'scores', '{"1":12,"2":14,"3":26,"4":11,"5":13,"6":10,"7":16,"8":15,"9":9}'::jsonb,
          'pipelineStage', 'interview', 'recommendation', 'discuss',
          'why', 'Execução rápida.',
          'watchOut', 'Velocidade vs processo.',
          'interviewProbe', 'Conte um caso de decisão sob pressão.',
          'city', 'Curitiba', 'state', 'PR',
          'salaryExpectation', '16000.00', 'availability', '15_days',
          'areaLabel', 'Tecnologia', 'vacancyFitScore010', 5.2, 'vacancyFitLabel', 'medium',
          'fitAlignedTypes', jsonb_build_array(3),
          'fitGapTypes', jsonb_build_array(5, 1),
          'motivatorsTop', jsonb_build_array(
            jsonb_build_object('key', 'reconhecimento', 'label', 'Reconhecimento', 'score', 88)
          )
        )
      )
    ),
    TRUE, NOW() + INTERVAL '30 days', v_hr_id
  );

  -- Alumni + exits
  IF to_regclass('public.exit_records') IS NOT NULL THEN
    INSERT INTO candidates (
      company_id, full_name, email, phone, city, state,
      availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
    ) VALUES (
      v_company_id, 'Ex Colaborador Demo', 'alumni01@todos-os-dados.demo',
      '+55 11 90000-0001', 'São Paulo', 'SP', 'immediate', 'referral',
      NOW() - INTERVAL '400 days', 'alumni',
      NOW() - INTERVAL '400 days', CURRENT_DATE - 400,
      '<p>Alumni: saída voluntária.</p>'
    )
    RETURNING id INTO v_cand_id;

    INSERT INTO assessments (
      candidate_id, company_id, area_id, top_type, scores, source, pipeline_stage,
      hired_at, start_date, fill_duration_ms, created_at
    ) VALUES (
      v_cand_id, v_company_id, v_area_ids[1], 6,
      '{"1":12,"2":11,"3":14,"4":10,"5":15,"6":28,"7":9,"8":13,"9":11}'::jsonb,
      'demo_todos_os_dados', 'hired',
      NOW() - INTERVAL '400 days', CURRENT_DATE - 400, 190000, NOW() - INTERVAL '410 days'
    );

    INSERT INTO exit_records (
      candidate_id, company_id, exit_date, exit_type, exit_reason, notes, created_by_user_id
    ) VALUES (
      v_cand_id, v_company_id, CURRENT_DATE - 40, 'voluntary', 'career_growth',
      '<p>Saída <strong>voluntária</strong>: crescimento externo (demo).</p>',
      v_hr_id
    );

    INSERT INTO candidates (
      company_id, full_name, email, phone, city, state,
      availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
    ) VALUES (
      v_company_id, 'Marina Alves Ex', 'alumni02@todos-os-dados.demo',
      '+55 11 90000-0002', 'Curitiba', 'PR', 'immediate', 'linkedin',
      NOW() - INTERVAL '500 days', 'alumni',
      NOW() - INTERVAL '500 days', CURRENT_DATE - 500,
      '<p>Alumni: saída involuntária.</p>'
    )
    RETURNING id INTO v_cand_id;

    INSERT INTO assessments (
      candidate_id, company_id, area_id, top_type, scores, source, pipeline_stage,
      hired_at, start_date, fill_duration_ms, created_at
    ) VALUES (
      v_cand_id, v_company_id, v_area_ids[LEAST(2, cardinality(v_area_ids))], 3,
      '{"1":10,"2":12,"3":27,"4":11,"5":14,"6":13,"7":9,"8":15,"9":10}'::jsonb,
      'demo_todos_os_dados', 'hired',
      NOW() - INTERVAL '500 days', CURRENT_DATE - 500, 175000, NOW() - INTERVAL '510 days'
    );

    INSERT INTO exit_records (
      candidate_id, company_id, exit_date, exit_type, exit_reason, notes, created_by_user_id
    ) VALUES (
      v_cand_id, v_company_id, CURRENT_DATE - 90, 'involuntary', 'performance',
      '<p>Saída <strong>involuntária</strong>: desempenho após PIP (demo).</p>',
      v_hr_id
    );
  END IF;

  -- Benefits + Academy
  IF to_regclass('public.benefit_categories') IS NOT NULL THEN
    INSERT INTO benefit_categories (company_id, name, active, created_by_user_id)
    VALUES
      (v_company_id, 'Alimentação', TRUE, v_hr_id),
      (v_company_id, 'Saúde', TRUE, v_hr_id),
      (v_company_id, 'Qualidade de Vida', TRUE, v_hr_id),
      (v_company_id, 'Financeiro', TRUE, v_hr_id);

    INSERT INTO company_benefits (
      company_id, name, description, category, category_id, benefit_type, active, created_by_user_id
    )
    SELECT v_company_id, v.name, v.description, c.name, c.id, v.benefit_type, TRUE, v_hr_id
    FROM (VALUES
      ('VR / VA', '<p>Auxílio alimentação demo.</p>', 'Alimentação', 'meal_voucher'),
      ('Plano de saúde', '<p>Cobertura médico-hospitalar demo.</p>', 'Saúde', 'health'),
      ('Gympass', '<p>Academias e bem-estar (demo).</p>', 'Qualidade de Vida', 'gym'),
      ('Previdência', '<p>Contribuição parcial (demo).</p>', 'Financeiro', 'retirement')
    ) AS v(name, description, cat_name, benefit_type)
    JOIN benefit_categories c
      ON c.company_id = v_company_id AND LOWER(btrim(c.name)) = LOWER(btrim(v.cat_name));
  END IF;

  IF to_regclass('public.learning_resources') IS NOT NULL THEN
    INSERT INTO learning_resources (
      company_id, title, description, url, theme, resource_type, duration_hours, active, created_by_user_id
    ) VALUES (
      v_company_id,
      'Feedback eficaz',
      '<p>Como dar e receber feedback com clareza.</p>',
      'https://example.com/feedback',
      'Liderança, Comunicação',
      'article', 2, TRUE, v_hr_id
    )
    RETURNING id INTO v_res_id;

    INSERT INTO learning_resources (
      company_id, title, description, url, theme, resource_type, duration_hours, active, created_by_user_id
    ) VALUES
      (v_company_id, 'SQL para gestores', '<p>Consultas básicas de indicadores.</p>',
       'https://example.com/sql', 'Técnico, Dados', 'course', 4, TRUE, v_hr_id),
      (v_company_id, 'Onboarding do time', '<p>Checklist das primeiras semanas.</p>',
       'https://example.com/onboarding', 'Onboarding, Cultura, Liderança', 'workshop', 3, TRUE, v_hr_id);
  END IF;

  -- Performance cycle + critical role
  IF to_regclass('public.performance_cycles') IS NOT NULL THEN
    INSERT INTO performance_cycles (
      company_id, title, description, status, period_start, period_end, created_by_user_id,
      allow_self_review, allow_peer_review
    ) VALUES (
      v_company_id,
      'Ciclo Todos os Dados 2026-H1',
      'Ciclo demo com self/peer review.',
      'active', CURRENT_DATE - 60, CURRENT_DATE + 30, v_hr_id,
      TRUE, TRUE
    )
    RETURNING id INTO v_cycle_id;
  END IF;

  IF to_regclass('public.critical_roles') IS NOT NULL THEN
    INSERT INTO critical_roles (
      company_id, title, description, area_key, impact_level, active, created_by_user_id
    ) VALUES (
      v_company_id, 'Tech Lead Plataforma',
      'Papel crítico demo para sucessão.',
      'engineering', 'critical', TRUE, v_hr_id
    )
    RETURNING id INTO v_crit_id;
  END IF;

  -- People package for first 6 employees + colaborador (index 10)
  FOR v_i IN 1..12 LOOP
    IF v_i > 6 AND v_i <> 10 THEN
      CONTINUE;
    END IF;
    v_cand_id := v_emp_ids[v_i];
    v_name := v_emp_names[v_i];
    v_start := CURRENT_DATE - (90 + v_i * 11);

    IF to_regclass('public.development_plans') IS NOT NULL THEN
      INSERT INTO development_plans (
        company_id, candidate_id, title, objective, status,
        period_start, period_end, created_by_user_id
      ) VALUES (
        v_company_id, v_cand_id,
        'PDI Demo: ' || split_part(v_name, ' ', 1),
        'Plano ativo para apresentação Equipe / portal.',
        'active', CURRENT_DATE - 45, CURRENT_DATE + 90, v_hr_id
      )
      RETURNING id INTO v_plan_id;

      INSERT INTO development_plan_items (
        plan_id, company_id, title, notes, status, source, sort_order, due_date, owner_label
      ) VALUES (
        v_plan_id, v_company_id,
        'Consolidar rituais de feedback',
        'Item demo.',
        CASE WHEN v_i <= 3 THEN 'done' WHEN v_i <= 5 THEN 'doing' ELSE 'todo' END,
        'manual', 0, CURRENT_DATE + 21, 'Gestor direto'
      )
      RETURNING id INTO v_plan_item_id;

      INSERT INTO development_plan_items (
        plan_id, company_id, title, notes, status, source, sort_order, due_date, owner_label
      ) VALUES (
        v_plan_id, v_company_id,
        'Acompanhar milestone de onboarding',
        '', 'doing', 'onboarding', 1, CURRENT_DATE + 14, 'RH'
      );

      IF v_res_id IS NOT NULL AND to_regclass('public.development_plan_resource_links') IS NOT NULL THEN
        INSERT INTO development_plan_resource_links (plan_item_id, resource_id)
        VALUES (v_plan_item_id, v_res_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    IF to_regclass('public.employee_pre_onboarding_items') IS NOT NULL THEN
      INSERT INTO employee_pre_onboarding_items (
        company_id, candidate_id, item_key, due_date, status, completed_at, completed_by_user_id,
        meet_url, employee_ack_at
      ) VALUES
        (v_company_id, v_cand_id, 'welcome_kit', v_start - 3, 'done',
         (v_start - 2)::timestamptz, v_hr_id, NULL, (v_start - 1)::timestamptz),
        (v_company_id, v_cand_id, 'access_sheet', v_start - 2, 'done',
         (v_start - 1)::timestamptz, v_hr_id, NULL, CASE WHEN v_i = 10 THEN NOW() - INTERVAL '1 day' ELSE NULL END),
        (v_company_id, v_cand_id, 'rh_onboarding_call', v_start - 1, 'done',
         (v_start - 1)::timestamptz, v_hr_id,
         'https://meet.google.com/demo-rh-' || v_i::text, (v_start)::timestamptz),
        (v_company_id, v_cand_id, 'manager_onboarding', v_start,
         CASE WHEN v_i <= 5 OR v_i = 10 THEN 'done' ELSE 'pending' END,
         CASE WHEN v_i <= 5 OR v_i = 10 THEN v_start::timestamptz ELSE NULL END,
         CASE WHEN v_i <= 5 OR v_i = 10 THEN v_hr_id ELSE NULL END,
         'https://meet.google.com/demo-mgr-' || v_i::text,
         CASE WHEN v_i = 10 THEN NOW() - INTERVAL '12 hours' ELSE NULL END);
    END IF;

    IF to_regclass('public.employee_onboarding_checkins') IS NOT NULL THEN
      INSERT INTO employee_onboarding_checkins (
        company_id, candidate_id, milestone_days, due_date, status, outcome, notes,
        completed_at, completed_by_user_id, meet_url, employee_ack_at
      ) VALUES
        (v_company_id, v_cand_id, 30, v_start + 30, 'done', 'pass',
         '<p>Check-in D30 ok (demo).</p>', (v_start + 30)::timestamptz, v_hr_id,
         'https://meet.google.com/demo-d30-' || v_i::text, (v_start + 30)::timestamptz),
        (v_company_id, v_cand_id, 60, v_start + 60,
         CASE WHEN (v_start + 60) <= CURRENT_DATE THEN 'done' ELSE 'pending' END,
         CASE WHEN (v_start + 60) <= CURRENT_DATE THEN 'extend' ELSE '' END,
         CASE WHEN (v_start + 60) <= CURRENT_DATE THEN '<p>D60: reforçar autonomia.</p>' ELSE '' END,
         CASE WHEN (v_start + 60) <= CURRENT_DATE THEN (v_start + 60)::timestamptz ELSE NULL END,
         CASE WHEN (v_start + 60) <= CURRENT_DATE THEN v_hr_id ELSE NULL END,
         NULL, NULL),
        (v_company_id, v_cand_id, 90, v_start + 90,
         CASE WHEN (v_start + 90) <= CURRENT_DATE THEN 'done' ELSE 'pending' END,
         CASE WHEN (v_start + 90) <= CURRENT_DATE THEN 'continue' ELSE '' END,
         '',
         CASE WHEN (v_start + 90) <= CURRENT_DATE THEN (v_start + 90)::timestamptz ELSE NULL END,
         CASE WHEN (v_start + 90) <= CURRENT_DATE THEN v_hr_id ELSE NULL END,
         NULL, NULL);
    END IF;

    IF to_regclass('public.retention_followups') IS NOT NULL AND v_i IN (2, 5, 10) AND v_plan_id IS NOT NULL THEN
      INSERT INTO retention_followups (
        company_id, candidate_id, plan_id, signal_keys, explanation,
        suggested_question, review_due, created_by_user_id
      ) VALUES (
        v_company_id, v_cand_id, v_plan_id,
        ARRAY['climate_low', 'pdi_delayed'],
        'Sinais leves de retenção (demo). Hipóteses para conversa, não diagnóstico.',
        'O que mais ajudaria você neste trimestre?',
        CURRENT_DATE + 10, v_hr_id
      );
    END IF;

    IF v_cycle_id IS NOT NULL AND to_regclass('public.performance_goals') IS NOT NULL THEN
      INSERT INTO performance_goals (
        cycle_id, company_id, candidate_id, title, description, weight, sort_order
      ) VALUES (
        v_cycle_id, v_company_id, v_cand_id,
        'Entregar iniciativas do trimestre',
        'Meta leve demo.',
        100, 0
      )
      RETURNING id INTO v_goal_id;

      INSERT INTO performance_reviews (
        cycle_id, company_id, candidate_id, reviewer_user_id, outcomes,
        overall_notes, status, submitted_at
      ) VALUES (
        v_cycle_id, v_company_id, v_cand_id, v_hr_id,
        jsonb_build_object(
          v_goal_id::text,
          jsonb_build_object(
            'outcome', CASE WHEN v_i <= 3 THEN 'exceeded' WHEN v_i <= 5 THEN 'met' ELSE 'develop' END,
            'notes', 'Review demo.'
          )
        ),
        '<p>Review demo: há indícios de progresso consistente.</p>',
        'submitted', NOW() - (v_i || ' days')::interval
      );
    END IF;

    IF v_crit_id IS NOT NULL AND v_i <= 3 AND to_regclass('public.succession_plans') IS NOT NULL THEN
      INSERT INTO succession_plans (
        critical_role_id, company_id, successor_candidate_id, readiness,
        notes, target_date, created_by_user_id
      ) VALUES (
        v_crit_id, v_company_id, v_cand_id,
        (ARRAY['developing', 'ready', 'now'])[v_i],
        'Sucessor demo: tende a precisar de mentoria em liderança técnica.',
        CURRENT_DATE + (90 * v_i), v_hr_id
      );
    END IF;
  END LOOP;

  -- Side reviews (self submitted + peer pending) for colaborador
  IF v_cycle_id IS NOT NULL AND v_colab_id IS NOT NULL
     AND to_regclass('public.performance_side_reviews') IS NOT NULL THEN
    INSERT INTO performance_side_reviews (
      cycle_id, company_id, candidate_id, role, reviewer_label, token,
      outcomes, overall_notes, status, submitted_at, expires_at
    ) VALUES (
      v_cycle_id, v_company_id, v_colab_id, 'self', 'Autoavaliação',
      'selftodosdadose5f60718293a4b5c6d7e8f0b',
      '{"overall":"met"}'::jsonb,
      '<p>Self-review demo: sinto progresso no trimestre.</p>',
      'submitted', NOW() - INTERVAL '3 days', NOW() + INTERVAL '30 days'
    );
    INSERT INTO performance_side_reviews (
      cycle_id, company_id, candidate_id, role, reviewer_label, token,
      outcomes, overall_notes, status, submitted_at, expires_at
    ) VALUES (
      v_cycle_id, v_company_id, v_colab_id, 'peer', 'Elena Ferreira',
      v_side_tok,
      '{}'::jsonb, '',
      'pending', NULL, NOW() + INTERVAL '30 days'
    );
  END IF;

  -- Climate survey + eNPS
  IF to_regclass('public.climate_surveys') IS NOT NULL THEN
    INSERT INTO climate_surveys (
      company_id, title, description, status, opens_at, closes_at, created_by_user_id
    ) VALUES (
      v_company_id,
      'Clima Todos os Dados 2026',
      'Pesquisa aberta (demo apresentação).',
      'open', NOW() - INTERVAL '7 days', NOW() + INTERVAL '30 days', v_hr_id
    )
    RETURNING id INTO v_survey_id;

    INSERT INTO climate_survey_questions (survey_id, company_id, prompt, question_kind, sort_order)
    VALUES (v_survey_id, v_company_id, 'Como você avalia o clima da equipe?', 'likert', 0)
    RETURNING id INTO v_q_likert;

    INSERT INTO climate_survey_questions (survey_id, company_id, prompt, question_kind, sort_order)
    VALUES (v_survey_id, v_company_id, 'O que mais ajudaria no dia a dia?', 'text', 1)
    RETURNING id INTO v_q_text;

    INSERT INTO climate_survey_questions (survey_id, company_id, prompt, question_kind, sort_order)
    VALUES (v_survey_id, v_company_id, 'Em uma escala de 0 a 10, quanto você recomendaria a Todos os Dados como lugar para trabalhar?', 'enps', 2)
    RETURNING id INTO v_q_enps;

    -- Personal invite for colaborador (fixed token)
    INSERT INTO climate_survey_invites (survey_id, company_id, token, expires_at, used_at, candidate_id)
    VALUES (
      v_survey_id, v_company_id, v_climate_tok, NOW() + INTERVAL '60 days', NULL, v_colab_id
    );

    FOR v_i IN 1..6 LOOP
      v_tok := 'clim' || lpad(v_i::text, 2, '0') || 'todosdadose5f60718293a4b5c6';
      INSERT INTO climate_survey_invites (survey_id, company_id, token, expires_at, used_at)
      VALUES (
        v_survey_id, v_company_id, v_tok, NOW() + INTERVAL '60 days',
        CASE WHEN v_i <= 4 THEN NOW() - (v_i || ' days')::interval ELSE NULL END
      )
      RETURNING id INTO v_invite_id;

      IF v_i <= 4 THEN
        INSERT INTO climate_survey_responses (survey_id, company_id, invite_id, answers, submitted_at)
        VALUES (
          v_survey_id, v_company_id, v_invite_id,
          jsonb_build_object(
            v_q_likert::text, 2 + (v_i % 4),
            v_q_text::text, 'Resposta anônima demo #' || v_i::text,
            v_q_enps::text, 6 + (v_i % 5)
          ),
          NOW() - (v_i || ' days')::interval
        );
      END IF;
    END LOOP;
  END IF;

  -- Team group + pulse
  IF to_regclass('public.team_groups') IS NOT NULL AND cardinality(v_emp_ass) >= 4 THEN
    INSERT INTO team_groups (
      company_id, name, base_assessment_id, member_assessment_ids, created_by_user_id
    ) VALUES (
      v_company_id,
      'Núcleo Plataforma',
      v_base_ass,
      v_emp_ass[2:6],
      v_hr_id
    )
    RETURNING id INTO v_group_id;

    IF to_regclass('public.team_pulses') IS NOT NULL THEN
      INSERT INTO team_pulses (
        company_id, team_group_id, title, status, opens_at, closes_at, created_by_user_id
      ) VALUES (
        v_company_id, v_group_id,
        'Pulso: Núcleo Plataforma',
        'open', NOW() - INTERVAL '3 days', NOW() + INTERVAL '14 days', v_hr_id
      )
      RETURNING id INTO v_pulse_id;

      INSERT INTO team_pulse_questions (
        pulse_id, company_id, prompt_key, prompt, sort_order
      ) VALUES (
        v_pulse_id, v_company_id, 'energy',
        'Como está sua energia no time nesta semana?', 0
      )
      RETURNING id INTO v_pulse_q;

      INSERT INTO team_pulse_invites (pulse_id, company_id, token, expires_at, used_at, candidate_id)
      VALUES (
        v_pulse_id, v_company_id, v_pulse_tok, NOW() + INTERVAL '30 days', NULL, v_colab_id
      );

      FOR v_i IN 1..5 LOOP
        v_tok := 'puls' || lpad(v_i::text, 2, '0') || 'todosdadose5f60718293a4b5c6d';
        INSERT INTO team_pulse_invites (pulse_id, company_id, token, expires_at, used_at)
        VALUES (
          v_pulse_id, v_company_id, v_tok, NOW() + INTERVAL '30 days',
          CASE WHEN v_i <= 3 THEN NOW() - (v_i || ' hours')::interval ELSE NULL END
        )
        RETURNING id INTO v_invite_id;

        IF v_i <= 3 THEN
          INSERT INTO team_pulse_responses (pulse_id, company_id, invite_id, answers, submitted_at)
          VALUES (
            v_pulse_id, v_company_id, v_invite_id,
            jsonb_build_object(v_pulse_q::text, 2 + (v_i % 4)),
            NOW() - (v_i || ' hours')::interval
          );
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- LMS
  IF to_regclass('public.lms_courses') IS NOT NULL THEN
    INSERT INTO lms_courses (company_id, title, description, completion_pct, created_by_user_id)
    VALUES (
      v_company_id,
      'Onboarding cultural (demo)',
      'Curso LMS demo: aulas por link YouTube/PDF.',
      100, v_hr_id
    )
    RETURNING id INTO v_course_id;

    INSERT INTO lms_lessons (company_id, course_id, title, content_url, content_kind, sort_order)
    VALUES
      (v_company_id, v_course_id, 'Bem-vindo à empresa',
       'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 0)
    RETURNING id INTO v_lesson1_id;

    INSERT INTO lms_lessons (company_id, course_id, title, content_url, content_kind, sort_order)
    VALUES
      (v_company_id, v_course_id, 'Como usamos o 30Team',
       '/demo/lms-guide.pdf', 'pdf', 1)
    RETURNING id INTO v_lesson2_id;

    IF to_regclass('public.lms_cohorts') IS NOT NULL THEN
      INSERT INTO lms_cohorts (company_id, course_id, name, due_date, mandatory, created_by_user_id)
      VALUES (v_company_id, v_course_id, 'Turma Onboarding Ago/2026', CURRENT_DATE + 21, TRUE, v_hr_id)
      RETURNING id INTO v_cohort_id;
    END IF;

    -- Enroll colaborador + Ana + Elena
    FOREACH v_i IN ARRAY ARRAY[1, 5, 10]::INT[] LOOP
      v_enroll_id := NULL;
      INSERT INTO lms_enrollments (
        company_id, course_id, candidate_id, enrolled_by_user_id, cohort_id, due_date, mandatory
      ) VALUES (
        v_company_id, v_course_id, v_emp_ids[v_i], v_hr_id, v_cohort_id, CURRENT_DATE + 21, TRUE
      )
      ON CONFLICT (course_id, candidate_id) DO NOTHING
      RETURNING id INTO v_enroll_id;

      IF v_enroll_id IS NOT NULL AND v_i = 10 AND to_regclass('public.lms_lesson_completions') IS NOT NULL THEN
        INSERT INTO lms_lesson_completions (company_id, enrollment_id, lesson_id)
        VALUES (v_company_id, v_enroll_id, v_lesson1_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;

    IF v_plan_item_id IS NOT NULL AND to_regclass('public.development_plan_lms_links') IS NOT NULL THEN
      INSERT INTO development_plan_lms_links (plan_item_id, course_id)
      VALUES (v_plan_item_id, v_course_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Compensation
  IF to_regclass('public.employee_compensation_events') IS NOT NULL THEN
    INSERT INTO employee_compensation_events (
      company_id, candidate_id, event_type, amount, effective_date, notes, created_by_user_id
    ) VALUES
      (v_company_id, v_colab_id, 'hire', '12000.00', CURRENT_DATE - 200,
       '<p>Contratação CLT (demo).</p>', v_hr_id),
      (v_company_id, v_colab_id, 'raise', '13200.00', CURRENT_DATE - 40,
       '<p>Ajuste meritocrático 10%.</p>', v_hr_id),
      (v_company_id, v_emp_ids[1], 'hire', '14000.00', CURRENT_DATE - 300,
       '<p>Contratação Ana.</p>', v_hr_id),
      (v_company_id, v_emp_ids[5], 'bonus', '3000.00', CURRENT_DATE - 20,
       '<p>Bônus projeto Q2.</p>', v_hr_id);
  END IF;

  -- Interview scorecards + slots
  IF to_regclass('public.interview_scorecards') IS NOT NULL AND v_pedro_id IS NOT NULL THEN
    INSERT INTO interview_scorecards (
      company_id, vacancy_id, candidate_id, items, created_by_user_id
    ) VALUES (
      v_company_id, v_vac_open, v_pedro_id,
      '[{"prompt":"Profundidade técnica","score":4},{"prompt":"Comunicação","score":5}]'::jsonb,
      v_hr_id
    )
    ON CONFLICT (vacancy_id, candidate_id) DO NOTHING;
  END IF;
  IF to_regclass('public.interview_scorecards') IS NOT NULL AND v_marina_id IS NOT NULL THEN
    INSERT INTO interview_scorecards (
      company_id, vacancy_id, candidate_id, items, created_by_user_id
    ) VALUES (
      v_company_id, v_vac_open, v_marina_id,
      '[{"prompt":"Profundidade técnica","score":3},{"prompt":"Comunicação","score":4}]'::jsonb,
      v_hr_id
    )
    ON CONFLICT (vacancy_id, candidate_id) DO NOTHING;
  END IF;

  IF to_regclass('public.interview_slots') IS NOT NULL THEN
    IF v_pedro_id IS NOT NULL THEN
      INSERT INTO interview_slots (
        company_id, vacancy_id, candidate_id, starts_at, ends_at, meet_url, status, notes, created_by_user_id
      ) VALUES (
        v_company_id, v_vac_open, v_pedro_id,
        NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 1 hour',
        'https://meet.google.com/demo-pedro', 'scheduled',
        'Entrevista técnica com cliente.', v_hr_id
      );
    END IF;
    IF v_marina_id IS NOT NULL THEN
      INSERT INTO interview_slots (
        company_id, vacancy_id, candidate_id, starts_at, ends_at, meet_url, status, notes, created_by_user_id
      ) VALUES (
        v_company_id, v_vac_open, v_marina_id,
        NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days 45 minutes',
        'https://meet.google.com/demo-marina', 'scheduled',
        'Segunda passagem.', v_hr_id
      );
    END IF;
  END IF;

  -- Candidate notifications: one of each EMPLOYEE_NOTIF type (inbox /employee)
  IF to_regclass('public.candidate_notifications') IS NOT NULL AND v_colab_id IS NOT NULL THEN
    INSERT INTO candidate_notifications (
      company_id, recipient_candidate_id, type, payload, entity_type, entity_id, dedupe_key, created_at
    ) VALUES
      (v_company_id, v_colab_id, 'access_invited',
       '{}'::jsonb, NULL, NULL, 'access_invited:demo', NOW() - INTERVAL '5 days'),
      (v_company_id, v_colab_id, 'lms_enrolled',
       jsonb_build_object('courseTitle', 'Onboarding cultural (demo)', 'courseId', v_course_id),
       'lms_course', v_course_id, 'lms_enroll:' || COALESCE(v_course_id::text, '0'),
       NOW() - INTERVAL '2 days'),
      (v_company_id, v_colab_id, 'lms_overdue',
       jsonb_build_object(
         'courseTitle', 'Onboarding cultural (demo)', 'courseId', v_course_id,
         'dueDate', (CURRENT_DATE - 3)::text
       ),
       'lms_course', v_course_id, 'lms_overdue:' || COALESCE(v_course_id::text, '0'),
       NOW() - INTERVAL '1 day'),
      (v_company_id, v_colab_id, 'motivators_invite',
       jsonb_build_object(
         'assessmentUrl', '/assessment/motivators/' || v_ae_tok
       ),
       'ae_invite', NULL, 'motivators_invite:demo', NOW() - INTERVAL '18 hours'),
      (v_company_id, v_colab_id, 'pdi_updated',
       jsonb_build_object('planTitle', 'PDI Demo: Lucas', 'itemTitle', 'Sessão 1:1 com gestor'),
       'development_plan', v_plan_id, 'pdi_upd:' || COALESCE(v_plan_id::text, '0'),
       NOW() - INTERVAL '12 hours'),
      (v_company_id, v_colab_id, 'generic',
       jsonb_build_object('message', 'Lembrete demo: revise Minha chegada e confirme o kit D1.'),
       NULL, NULL, 'generic:demo-arrival', NOW() - INTERVAL '6 hours'),
      (v_company_id, v_colab_id, 'pdi_updated',
       jsonb_build_object('planTitle', 'PDI Demo: Lucas', 'itemTitle', 'Prática: feedback no 1:1'),
       'development_plan', v_plan_id, 'pdi_upd2:' || COALESCE(v_plan_id::text, '0'),
       NOW() - INTERVAL '4 hours'),
      (v_company_id, v_colab_id, 'generic',
       jsonb_build_object('message', 'Há um novo documento no Espaço do colaborador. Confira quando puder.'),
       NULL, NULL, 'generic:demo-doc', NOW() - INTERVAL '2 hours'),
      (v_company_id, v_colab_id, 'lms_enrolled',
       jsonb_build_object('courseTitle', 'Segurança da informação (demo)', 'courseId', v_course_id),
       'lms_course', v_course_id, 'lms_enroll2:' || COALESCE(v_course_id::text, '0'),
       NOW() - INTERVAL '1 hour'),
      (v_company_id, v_colab_id, 'motivators_invite',
       jsonb_build_object('assessmentUrl', '/assessment/motivators/' || v_ae_tok),
       'ae_invite', NULL, 'motivators_invite:demo:remind', NOW() - INTERVAL '30 minutes');
  END IF;

  -- Referral + funnel
  IF to_regclass('public.referral_codes') IS NOT NULL THEN
    INSERT INTO referral_codes (company_id, vacancy_id, code, owner_user_id, active, label)
    VALUES
      (v_company_id, v_vac_open, 'TOD-FS-2026', v_hr_id, TRUE, 'Indicação fullstack'),
      (v_company_id, NULL, 'TOD-EMPRESA', v_hr_id, TRUE, 'Empresa geral');
  END IF;

  IF to_regclass('public.job_funnel_events') IS NOT NULL THEN
    INSERT INTO job_funnel_events (
      company_id, vacancy_id, candidate_id, event_type, session_id, source, medium, campaign, referral_code
    ) VALUES
      (v_company_id, v_vac_open, NULL, 'job_view', 'sess-demo-1', 'linkedin', 'social', 'fullstack-q3', NULL),
      (v_company_id, v_vac_open, NULL, 'apply_start', 'sess-demo-1', 'linkedin', 'social', 'fullstack-q3', NULL),
      (v_company_id, v_vac_open, v_pedro_id, 'apply_complete', 'sess-demo-1', 'linkedin', 'social', 'fullstack-q3', 'TOD-FS-2026'),
      (v_company_id, v_vac_open, v_pedro_id, 'screening', 'sess-demo-1', 'linkedin', 'social', 'fullstack-q3', 'TOD-FS-2026');
  END IF;

  IF to_regclass('public.company_analytics_report_prefs') IS NOT NULL THEN
    INSERT INTO company_analytics_report_prefs (company_id, frequency, recipient_user_ids, attach_pdf, updated_by)
    VALUES (v_company_id, 'weekly', ARRAY[v_hr_id, v_dir_id], FALSE, v_hr_id)
    ON CONFLICT (company_id) DO UPDATE SET
      frequency = EXCLUDED.frequency,
      recipient_user_ids = EXCLUDED.recipient_user_ids,
      updated_at = NOW();
  END IF;

  -- Manager notifications: one of each NOTIF type (inbox painel) for HR; sample for Direction
  INSERT INTO manager_notifications (
    company_id, recipient_user_id, type, payload, entity_type, entity_id, dedupe_key, created_at
  ) VALUES
    (v_company_id, v_hr_id, 'enneagram_completed',
     jsonb_build_object(
       'candidateId', v_pedro_id, 'candidateName', 'Pedro Henrique Santos',
       'topType', 5, 'vacancyId', v_vac_open
     ),
     'candidate', v_pedro_id, 'enneagram:' || COALESCE(v_pedro_id::text, '0'), NOW() - INTERVAL '48 hours'),
    (v_company_id, v_hr_id, 'motivators_completed',
     jsonb_build_object(
       'candidateId', v_pedro_id, 'candidateName', 'Pedro Henrique Santos'
     ),
     'candidate', v_pedro_id, 'motivators:' || COALESCE(v_pedro_id::text, '0'), NOW() - INTERVAL '40 hours'),
    (v_company_id, v_hr_id, 'retention_watch',
     jsonb_build_object(
       'candidateId', v_emp_ids[2], 'candidateName', 'Bruno Oliveira',
       'signalLabels', 'clima · 1:1 atrasado', 'dims', 'clima · 1:1 atrasado'
     ),
     'candidate', v_emp_ids[2], 'retention:' || COALESCE(v_emp_ids[2]::text, '0'), NOW() - INTERVAL '36 hours'),
    (v_company_id, v_hr_id, 'turnover_risk_change',
     jsonb_build_object(
       'candidateId', v_emp_ids[5], 'candidateName', 'Elena Ferreira',
       'from', 'low', 'to', 'medium'
     ),
     'candidate', v_emp_ids[5], 'turnover:' || COALESCE(v_emp_ids[5]::text, '0'), NOW() - INTERVAL '30 hours'),
    (v_company_id, v_hr_id, 'hire_onboarding_kit',
     jsonb_build_object(
       'candidateId', v_colab_id, 'candidateName', 'Lucas Colaborador',
       'vacancyTitle', 'Engenheiro(a) Fullstack: Plataforma',
       'benefitsSnippet', 'VR · plano de saúde · home office 2x'
     ),
     'candidate', v_colab_id, 'hire_kit:' || COALESCE(v_colab_id::text, '0'), NOW() - INTERVAL '24 hours'),
    (v_company_id, v_hr_id, 'manager_weekly_digest',
     jsonb_build_object(
       'attentionTotal', 3,
       'attentionSummary', '2 retenção · 1 1:1 atrasado',
       'retentionCount', 2,
       'staleCount', 1,
       'retentionNames', 'Bruno Oliveira · Elena Ferreira',
       'staleNames', 'Íris Campos'
     ),
     NULL, NULL, 'weekly_digest:demo', NOW() - INTERVAL '20 hours'),
    (v_company_id, v_hr_id, 'vacancy_deadline_approaching',
     jsonb_build_object(
       'vacancyId', v_vac_open, 'vacancyTitle', 'Engenheiro(a) Fullstack: Plataforma',
       'targetDate', (CURRENT_DATE + 21)::text
     ),
     'vacancy', v_vac_open, 'vacancy_deadline:' || v_vac_open || ':open', NOW() - INTERVAL '16 hours'),
    (v_company_id, v_hr_id, 'vacancy_closed',
     jsonb_build_object(
       'vacancyId', v_vac_closed, 'vacancyTitle', 'Analista de Dados (encerrada)'
     ),
     'vacancy', v_vac_closed, 'vacancy_closed:' || v_vac_closed, NOW() - INTERVAL '12 hours'),
    (v_company_id, v_hr_id, 'lms_enrolled',
     jsonb_build_object(
       'courseId', v_course_id, 'courseTitle', 'Onboarding cultural (demo)', 'enrolled', 8
     ),
     'lms_course', v_course_id, 'lms_enroll_mgr:' || COALESCE(v_course_id::text, '0'), NOW() - INTERVAL '10 hours'),
    (v_company_id, v_hr_id, 'lms_overdue',
     jsonb_build_object(
       'candidateId', v_colab_id, 'candidateName', 'Lucas Colaborador',
       'courseId', v_course_id, 'courseTitle', 'Onboarding cultural (demo)',
       'dueDate', (CURRENT_DATE - 3)::text
     ),
     'lms_course', v_course_id, 'lms_overdue_mgr:' || COALESCE(v_colab_id::text, '0'), NOW() - INTERVAL '8 hours'),
    (v_company_id, v_hr_id, 'lms_completed',
     jsonb_build_object(
       'candidateId', v_emp_ids[1], 'candidateName', 'Ana Clara Mendes',
       'courseId', v_course_id, 'courseTitle', 'Onboarding cultural (demo)'
     ),
     'lms_course', v_course_id, 'lms_done_mgr:' || COALESCE(v_emp_ids[1]::text, '0'), NOW() - INTERVAL '6 hours'),
    (v_company_id, v_hr_id, 'interview_scheduled',
     jsonb_build_object(
       'candidateId', v_pedro_id, 'candidateName', 'Pedro Henrique Santos',
       'vacancyId', v_vac_open, 'vacancyTitle', 'Engenheiro(a) Fullstack: Plataforma',
       'startsAt', (NOW() + INTERVAL '3 days')::text, 'targetDate', (CURRENT_DATE + 3)::text
     ),
     'vacancy', v_vac_open, 'interview:' || COALESCE(v_pedro_id::text, '0'), NOW() - INTERVAL '4 hours'),
    (v_company_id, v_dir_id, 'vacancy_deadline_approaching',
     jsonb_build_object(
       'vacancyId', v_vac_open, 'vacancyTitle', 'Engenheiro(a) Fullstack: Plataforma',
       'targetDate', (CURRENT_DATE + 21)::text
     ),
     'vacancy', v_vac_open, 'vacancy_deadline:' || v_vac_open || ':open', NOW() - INTERVAL '50 minutes'),
    (v_company_id, v_dir_id, 'manager_weekly_digest',
     jsonb_build_object(
       'attentionTotal', 3,
       'attentionSummary', '2 retenção · 1 1:1 atrasado',
       'retentionCount', 2,
       'staleCount', 1,
       'retentionNames', 'Bruno Oliveira · Elena Ferreira',
       'staleNames', 'Íris Campos'
     ),
     NULL, NULL, 'weekly_digest:demo:dir', NOW() - INTERVAL '45 minutes');

  BEGIN
    INSERT INTO audit_log (actor_user_id, action, target_type, target_id, metadata)
    VALUES (
      v_hr_id, 'demo_seed_todos_os_dados', 'company', v_company_id::text,
      jsonb_build_object('slug', 'todos-os-dados-demo', 'employees', 12, 'pipeline', 7)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RAISE NOTICE 'OK Todos os Dados id=% (migrations ≤080 presentation seed)', v_company_id;
  RAISE NOTICE 'HR: hr@todos-os-dados.demo / DemoTodosDados!2026';
  RAISE NOTICE 'Direction: direction@todos-os-dados.demo / DemoTodosDados!2026';
  RAISE NOTICE 'Colaborador: colaborador@todos-os-dados.demo / DemoTodosDados!2026 → /employee';
  RAISE NOTICE '/t/%  /v/%  /r/%', v_company_tok, v_vacancy_tok, v_report_tok;
  RAISE NOTICE '/e/%  /clima/%  /pulso/%', v_portal_tok, v_climate_tok, v_pulse_tok;
  IF v_def_id IS NOT NULL THEN
    RAISE NOTICE 'Motivadores: /assessment/motivators/%', v_ae_tok;
  END IF;
END;
$tod$;

COMMIT;

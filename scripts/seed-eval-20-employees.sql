-- =============================================================================
-- EVAL 20 — massa SQL para avaliar funcionalidades do 30Team
-- =============================================================================
-- Tenant isolado (slug = eval-20-demo). Não toca outras empresas.
--
-- Login:   admin@eval-20.demo
-- Senha:   EvalDemo!2026
-- Role:    admin (abas B-1000 + gestão da empresa do seed)
--
-- Conteúdo:
--   • 20 colaboradores (emp##@) com T1–T9 + scores (massa Equipe/compat)
--   • 10 time interno (int##@) com pacote completo People:
--       assessment hired, Motivadores, 1:1, PDI+itens+link recurso,
--       pre-onboarding, check-ins 30/60/90, portal /e, retention, hr_scores,
--       metas + review de performance, sucessão (subset)
--   • Clima aberto (perguntas + convites anônimos + respostas)
--   • Grupo salvo + pulso aberto (convites + respostas)
--   • 1 vaga + 5 candidatos no funil; 2 alumni + exit_records (tipos/motivos)
--   • job_role
--   • Benefícios: benefit_categories + company_benefits.category_id + descrição HTML
--   • Academy: learning_resources com temas multi-tag ("A, B") + descrição HTML
--   • notificação in-app
--
-- Requer migrations até 063 (benefit_categories + theme tags len).
--
-- Como rodar (migrations aplicadas + areas seedadas):
--   psql "$DATABASE_URL" -f scripts/seed-eval-20-employees.sql
--
-- DESTRUTIVO só para slug=eval-20-demo.
-- Se a sessão do pgAdmin estiver abortada: rode ROLLBACK; e execute de novo.
-- =============================================================================

ROLLBACK;

BEGIN;

DO $eval$
DECLARE
  v_i_confirm_purge BOOLEAN := TRUE;

  v_company_id   BIGINT;
  v_user_id      BIGINT;
  v_vac_id       BIGINT;
  v_role_id      BIGINT;
  v_def_id       BIGINT;
  v_area_ids     INT[];
  v_cand_id      BIGINT;
  v_ass_id       BIGINT;
  v_plan_id      BIGINT;
  v_plan_item_id BIGINT;
  v_survey_id    BIGINT;
  v_q_likert     BIGINT;
  v_q_text       BIGINT;
  v_invite_id    BIGINT;
  v_pulse_id     BIGINT;
  v_pulse_q      BIGINT;
  v_group_id     BIGINT;
  v_cycle_id     BIGINT;
  v_goal_id      BIGINT;
  v_crit_id      BIGINT;
  v_res_id       BIGINT;
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
  v_pad          TEXT;
  v_score_n      INT;
  v_tok          TEXT;
  v_member_ass   BIGINT[] := '{}';
  v_base_ass     BIGINT;
  v_int_ass      BIGINT[] := '{}';
  v_int_base     BIGINT;
  v_start        DATE;

  v_int_names TEXT[] := ARRAY[
    'Amanda Ribeiro Torres',
    'Carlos Eduardo Pinto',
    'Daniela Souza Machado',
    'Eduardo Lima Barbosa',
    'Fernanda Castro Nunes',
    'Gustavo Almeida Reis',
    'Helena Figueiredo Luz',
    'Igor Monteiro Campos',
    'Juliana Pires Andrade',
    'Kevin Rocha Silveira'
  ];

  -- bcryptjs cost 10 de EvalDemo!2026
  v_pwd_hash TEXT := '$2a$10$Y7AtrGAjcwzlhusPOfqdu.TDwe3jx8qm7lu7A89/WkmgQQswqE6xS';

  v_company_tok TEXT := 'e020eval20demo5f60718293a4b5c6d7e8f01';
  v_vacancy_tok TEXT := 'e021eval20demo5f60718293a4b5c6d7e8f02';

  v_names TEXT[] := ARRAY[
    'Ana Beatriz Nogueira',
    'Bruno Carvalho Lima',
    'Camila Duarte Souza',
    'Diego Fernandes Rocha',
    'Elena Martins Pinto',
    'Fábio Henrique Alves',
    'Gabriela Lopes Reis',
    'Henrique Barbosa Dias',
    'Isabela Freitas Melo',
    'João Pedro Azevedo',
    'Karina Oliveira Campos',
    'Lucas Mendes Teixeira',
    'Marina Costa Ribeiro',
    'Nicolas Prado Vieira',
    'Olivia Santos Araújo',
    'Paulo Ricardo Moura',
    'Quezia Nascimento Brito',
    'Rafael Souza Guimarães',
    'Sofia Almeida Castro',
    'Thiago Pereira Ramos'
  ];
  v_cities TEXT[] := ARRAY[
    'São Paulo','Rio de Janeiro','Belo Horizonte','Curitiba','Porto Alegre',
    'Florianópolis','Brasília','Recife','Salvador','Campinas',
    'São Paulo','Curitiba','Belo Horizonte','Rio de Janeiro','Porto Alegre',
    'São Paulo','Recife','Florianópolis','Campinas','Brasília'
  ];
  v_states TEXT[] := ARRAY[
    'SP','RJ','MG','PR','RS','SC','DF','PE','BA','SP',
    'SP','PR','MG','RJ','RS','SP','PE','SC','SP','DF'
  ];
BEGIN
  IF NOT v_i_confirm_purge THEN
    RAISE EXCEPTION
      'ABORTADO: defina v_i_confirm_purge := TRUE. Apaga apenas slug=eval-20-demo.';
  END IF;

  SELECT id INTO v_company_id
  FROM companies
  WHERE LOWER(slug) = 'eval-20-demo' AND deleted = FALSE
  LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    SELECT COUNT(*)::int INTO v_non_demo
    FROM users
    WHERE company_id = v_company_id
      AND email NOT ILIKE '%@eval-20.demo'
      AND deleted = FALSE;

    IF v_non_demo > 0 THEN
      RAISE EXCEPTION
        'ABORTADO: company_id=% parece tenant real (users fora de @eval-20.demo).',
        v_company_id;
    END IF;

    DELETE FROM manager_notifications WHERE company_id = v_company_id;
    DELETE FROM hr_scores WHERE company_id = v_company_id;
    DELETE FROM development_plan_resource_links l
      USING development_plan_items i
     WHERE l.plan_item_id = i.id AND i.company_id = v_company_id;
    DELETE FROM development_plan_items WHERE company_id = v_company_id;
    DELETE FROM development_plans WHERE company_id = v_company_id;
    DELETE FROM one_on_ones WHERE company_id = v_company_id;
    DELETE FROM retention_followups WHERE company_id = v_company_id;
    DELETE FROM employee_onboarding_checkins WHERE company_id = v_company_id;
    DELETE FROM employee_pre_onboarding_items WHERE company_id = v_company_id;
    DELETE FROM employee_portal_tokens WHERE company_id = v_company_id;
    DELETE FROM interview_scorecards WHERE company_id = v_company_id;
    DELETE FROM climate_survey_responses r
      USING climate_surveys s WHERE r.survey_id = s.id AND s.company_id = v_company_id;
    DELETE FROM climate_survey_invites i
      USING climate_surveys s WHERE i.survey_id = s.id AND s.company_id = v_company_id;
    DELETE FROM climate_survey_questions q
      USING climate_surveys s WHERE q.survey_id = s.id AND s.company_id = v_company_id;
    DELETE FROM climate_surveys WHERE company_id = v_company_id;
    DELETE FROM team_pulse_responses r
      USING team_pulses p WHERE r.pulse_id = p.id AND p.company_id = v_company_id;
    DELETE FROM team_pulse_invites i
      USING team_pulses p WHERE i.pulse_id = p.id AND p.company_id = v_company_id;
    DELETE FROM team_pulse_questions q
      USING team_pulses p WHERE q.pulse_id = p.id AND p.company_id = v_company_id;
    DELETE FROM team_pulses WHERE company_id = v_company_id;
    DELETE FROM team_groups WHERE company_id = v_company_id;
    DELETE FROM succession_plans WHERE company_id = v_company_id;
    DELETE FROM critical_roles WHERE company_id = v_company_id;
    DELETE FROM performance_reviews r
      USING performance_cycles c WHERE r.cycle_id = c.id AND c.company_id = v_company_id;
    DELETE FROM performance_goals g
      USING performance_cycles c WHERE g.cycle_id = c.id AND c.company_id = v_company_id;
    DELETE FROM performance_cycles WHERE company_id = v_company_id;
    DELETE FROM exit_records WHERE company_id = v_company_id;
    DELETE FROM learning_resources WHERE company_id = v_company_id;
    DELETE FROM company_benefits WHERE company_id = v_company_id;
    DELETE FROM benefit_categories WHERE company_id = v_company_id;
    DELETE FROM job_roles WHERE company_id = v_company_id;
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
  END IF;

  INSERT INTO companies (name, slug, active, deleted)
  VALUES ('Eval 20 Funcionários', 'eval-20-demo', TRUE, FALSE)
  RETURNING id INTO v_company_id;

  INSERT INTO users (
    company_id, email, password_hash, role, locale, display_name, active, deleted
  ) VALUES (
    v_company_id,
    'admin@eval-20.demo',
    v_pwd_hash,
    'admin',
    'pt-BR',
    'Admin Eval 20',
    TRUE,
    FALSE
  ) RETURNING id INTO v_user_id;

  INSERT INTO company_links (company_id, token, active, expires_at, require_candidate_email)
  VALUES (v_company_id, v_company_tok, TRUE, NOW() + INTERVAL '365 days', TRUE);

  SELECT ARRAY_AGG(id ORDER BY id) INTO v_area_ids FROM areas;
  IF v_area_ids IS NULL OR cardinality(v_area_ids) = 0 THEN
    RAISE EXCEPTION 'ABORTADO: tabela areas vazia — rode migrations/bootstrap antes.';
  END IF;

  SELECT id INTO v_def_id
  FROM ae_definitions
  WHERE LOWER(slug) = 'motivators' AND active = TRUE
  LIMIT 1;

  INSERT INTO job_roles (company_id, name, description, rubric, active)
  VALUES (
    v_company_id,
    'Analista de Produto',
    'Cargo demo para rubrica em vagas.',
    '{"1":2,"3":2,"5":3,"6":1}'::jsonb,
    TRUE
  )
  RETURNING id INTO v_role_id;

  INSERT INTO vacancies (
    company_id, title, slug, status, positions_count, target_date, deleted,
    description, salary_min, salary_max, client_report_show_salary, job_role_id
  ) VALUES (
    v_company_id,
    'Pessoa Engenheira de Software — Eval',
    'pessoa-engenheira-software-eval',
    'open', 3, CURRENT_DATE + 30, FALSE,
    '<p><strong>Missão:</strong> massa de avaliação do funil 30Team.</p><ul><li>Next.js</li><li>Postgres</li><li>Multi-tenant</li></ul>',
    '12000.00', '20000.00', TRUE, v_role_id
  )
  RETURNING id INTO v_vac_id;

  INSERT INTO vacancy_links (vacancy_id, token, active, expires_at, require_candidate_email)
  VALUES (v_vac_id, v_vacancy_tok, TRUE, NOW() + INTERVAL '180 days', TRUE);

  INSERT INTO vacancy_rubrics (vacancy_id, desired_type_weights, notes)
  VALUES (
    v_vac_id,
    '{"5":3,"1":2,"6":2,"3":1}'::jsonb,
    '<p>Rubrica demo Eval 20 — priorizar T5/T1/T6.</p>'
  )
  ON CONFLICT (vacancy_id) DO UPDATE SET
    desired_type_weights = EXCLUDED.desired_type_weights,
    notes = EXCLUDED.notes,
    updated_at = NOW();

  -- ---------- 20 colaboradores (T1–T9 ciclando) ----------
  FOR v_i IN 1..20 LOOP
    v_top := ((v_i - 1) % 9) + 1;
    v_pad := lpad(v_i::text, 2, '0');
    v_name := v_names[v_i];
    v_email := 'emp' || v_pad || '@eval-20.demo';
    v_city := v_cities[v_i];
    v_state := v_states[v_i];
    v_area := v_area_ids[1 + ((v_i - 1) % cardinality(v_area_ids))];

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
      salary_expectation, hr_notes
    ) VALUES (
      v_company_id,
      v_name,
      v_email,
      '+55 11 99' || lpad(v_i::text, 3, '0') || '-' || lpad((1000 + v_i)::text, 4, '0'),
      'https://linkedin.com/in/eval20-emp' || v_pad,
      v_city,
      v_state,
      'immediate',
      CASE (v_i % 4)
        WHEN 0 THEN 'referral'
        WHEN 1 THEN 'linkedin'
        WHEN 2 THEN 'agency'
        ELSE 'job_board'
      END,
      NOW() - (v_i || ' days')::interval,
      'employee',
      NOW() - ((60 + v_i) || ' days')::interval,
      (CURRENT_DATE - (50 + v_i)),
      (8 + (v_i % 8))::text || '000.00',
      '<p>Colaborador eval T' || v_top::text || ' — ' || v_name || '.</p>'
    )
    RETURNING id INTO v_cand_id;

    INSERT INTO assessments (
      candidate_id, company_id, area_id, top_type, scores, source, pipeline_stage,
      hired_at, start_date, fill_duration_ms, created_at
    ) VALUES (
      v_cand_id, v_company_id, v_area, v_top, v_scores, 'seed_eval_20', 'hired',
      NOW() - ((60 + v_i) || ' days')::interval,
      (CURRENT_DATE - (50 + v_i)),
      180000 + (v_i * 1000),
      NOW() - ((70 + v_i) || ' days')::interval
    )
    RETURNING id INTO v_ass_id;

    IF v_i = 1 THEN
      v_base_ass := v_ass_id;
    END IF;
    IF v_i <= 6 THEN
      v_member_ass := array_append(v_member_ass, v_ass_id);
    END IF;

    INSERT INTO assessment_pipeline_history (
      assessment_id, from_stage, to_stage, start_date, changed_by_user_id, changed_at
    ) VALUES (
      v_ass_id, 'approved', 'hired',
      (CURRENT_DATE - (50 + v_i)),
      v_user_id,
      NOW() - ((60 + v_i) || ' days')::interval
    );

    IF v_def_id IS NOT NULL THEN
      INSERT INTO ae_attempts (
        definition_id, company_id, candidate_id, area_id, status,
        started_at, completed_at, dimension_scores, ranking, profile_summary, algorithm_version
      ) VALUES (
        v_def_id, v_company_id, v_cand_id, v_area, 'completed',
        NOW() - ((20 + v_i) || ' days')::interval,
        NOW() - ((20 + v_i) || ' days')::interval,
        jsonb_build_object(
          'reconhecimento', 30 + (v_i % 40),
          'financeiro', 35 + ((v_i * 2) % 40),
          'crescimento', 40 + ((v_i * 3) % 40),
          'desenvolvimento', 45 + ((v_i * 5) % 40),
          'autonomia', 50 + ((v_i * 7) % 35),
          'flexibilidade', 40 + ((v_i * 11) % 40),
          'proposito', 55 + ((v_i * 13) % 35),
          'relacionamentos', 40 + ((v_i * 17) % 40),
          'seguranca', 35 + ((v_i * 19) % 45),
          'lideranca', 30 + ((v_i * 23) % 50),
          'desafio', 40 + ((v_i * 29) % 40),
          'criatividade', 35 + ((v_i * 31) % 45),
          'equilibrio', 45 + ((v_i * 37) % 35)
        ),
        '["proposito","desenvolvimento","autonomia","crescimento","equilibrio","desafio","relacionamentos","flexibilidade","seguranca","financeiro","reconhecimento","lideranca","criatividade"]'::jsonb,
        'Eval: perfil T' || v_top::text || ' — hipóteses de motivação variadas.',
        'ae-scoring-v2'
      );
    END IF;

    IF v_i <= 12 THEN
      INSERT INTO one_on_ones (
        company_id, candidate_id, meeting_date, notes, next_steps, created_by_user_id
      ) VALUES (
        v_company_id, v_cand_id, CURRENT_DATE - (v_i * 3),
        '<p>1:1 com ' || v_name || ' — acompanhamento eval.</p>',
        '<p>Revisitar PDI na próxima quinzena.</p>',
        v_user_id
      );
    END IF;

    IF v_i <= 8 THEN
      INSERT INTO development_plans (
        company_id, candidate_id, title, objective, status,
        period_start, period_end, created_by_user_id
      ) VALUES (
        v_company_id, v_cand_id,
        'PDI Eval — ' || split_part(v_name, ' ', 1),
        'Plano leve gerado pelo seed eval-20.',
        CASE WHEN v_i <= 5 THEN 'active' ELSE 'draft' END,
        CURRENT_DATE - 30, CURRENT_DATE + 60, v_user_id
      )
      RETURNING id INTO v_plan_id;

      INSERT INTO development_plan_items (
        plan_id, company_id, title, notes, status, source, sort_order, due_date
      ) VALUES
        (v_plan_id, v_company_id, 'Alinhar expectativas com gestor', '', 'todo', 'manual', 0, CURRENT_DATE + 14),
        (
          v_plan_id, v_company_id, 'Praticar feedback estruturado', '',
          CASE WHEN v_i <= 3 THEN 'done' ELSE 'doing' END,
          'manual', 1, CURRENT_DATE + 28
        );
    END IF;

    v_score_n := 45 + ((v_i * 7) % 50);
    INSERT INTO hr_scores (
      company_id, candidate_id, score, signals, turnover_risk, calculated_at
    ) VALUES (
      v_company_id, v_cand_id, v_score_n,
      jsonb_build_object(
        'profile', jsonb_build_object('score', 70 + (v_i % 20), 'weight', 0.15),
        'motivators', jsonb_build_object('score', 50 + (v_i % 40), 'weight', 0.20),
        'note', 'seed_eval_20'
      ),
      CASE
        WHEN v_score_n >= 75 THEN 'low'
        WHEN v_score_n >= 50 THEN 'medium'
        ELSE 'high'
      END,
      NOW() - (v_i || ' hours')::interval
    )
    ON CONFLICT (candidate_id) DO NOTHING;
  END LOOP;

  -- ---------- 5 candidatos no funil da vaga ----------
  FOR v_i IN 1..5 LOOP
    v_top := ((v_i + 2) % 9) + 1;
    v_pad := lpad(v_i::text, 2, '0');
    v_name := 'Candidato Funil ' || v_i::text || ' Eval';
    v_email := 'cand' || v_pad || '@eval-20.demo';
    v_area := v_area_ids[1 + ((v_i - 1) % cardinality(v_area_ids))];
    v_pipe := (ARRAY['interview', 'test_completed', 'screening', 'approved', 'new'])[v_i];

    v_scores := jsonb_build_object(
      '1', 10 + v_i, '2', 11 + v_i, '3', 12 + v_i, '4', 9 + v_i,
      '5', 13 + v_i, '6', 10 + v_i, '7', 8 + v_i, '8', 11 + v_i, '9', 9 + v_i
    );
    v_scores := v_scores || jsonb_build_object(v_top::text, 25 + v_i);

    INSERT INTO candidates (
      company_id, full_name, email, phone, city, state,
      availability, source, consent_at, employment_status, salary_expectation
    ) VALUES (
      v_company_id, v_name, v_email,
      '+55 21 98' || lpad(v_i::text, 3, '0') || '-' || lpad((2000 + v_i)::text, 4, '0'),
      'São Paulo', 'SP', '15_days', 'linkedin', NOW() - (v_i || ' days')::interval,
      'candidate', (10 + v_i)::text || '500.00'
    )
    RETURNING id INTO v_cand_id;

    INSERT INTO assessments (
      candidate_id, company_id, area_id, vacancy_id, top_type, scores, source,
      pipeline_stage, fill_duration_ms, created_at
    ) VALUES (
      v_cand_id, v_company_id, v_area, v_vac_id, v_top, v_scores, 'seed_eval_20',
      v_pipe, 150000 + v_i * 500, NOW() - (v_i || ' days')::interval
    )
    RETURNING id INTO v_ass_id;

    INSERT INTO vacancy_candidates (
      vacancy_id, candidate_id, company_id, pipeline_stage, interview_notes, created_by_user_id
    ) VALUES (
      v_vac_id, v_cand_id, v_company_id, v_pipe,
      '<p>Nota de entrevista demo — estágio ' || v_pipe || '.</p>',
      v_user_id
    );
  END LOOP;

  -- ---------- Catálogos B-1000 (categorias → benefícios; Academy com tags) ----------
  -- Categorias de benefício (cadastro vinculado via category_id)
  INSERT INTO benefit_categories (company_id, name, active, created_by_user_id)
  VALUES
    (v_company_id, 'Alimentação', TRUE, v_user_id),
    (v_company_id, 'Saúde', TRUE, v_user_id),
    (v_company_id, 'Qualidade de Vida', TRUE, v_user_id),
    (v_company_id, 'Financeiro', TRUE, v_user_id);

  INSERT INTO company_benefits (
    company_id, name, description, category, category_id, benefit_type, active, created_by_user_id
  )
  SELECT
    v_company_id,
    v.name,
    v.description,
    c.name,
    c.id,
    v.benefit_type,
    TRUE,
    v_user_id
  FROM (VALUES
    (
      'VR / VA',
      '<p>Auxílio alimentação demo — uso em restaurantes e mercados parceiros.</p><ul><li>Recarga mensal</li><li>App do fornecedor</li></ul>',
      'Alimentação',
      'meal_voucher'
    ),
    (
      'Plano de saúde',
      '<p>Cobertura médico-hospitalar demo para colaborador e dependentes elegíveis.</p>',
      'Saúde',
      'health'
    ),
    (
      'Plano odontológico',
      '<p>Rede credenciada demo — consultas e procedimentos básicos.</p>',
      'Saúde',
      'dental'
    ),
    (
      'Gympass / academia',
      '<p>Acesso a academias e apps de bem-estar (pacote demo).</p>',
      'Qualidade de Vida',
      'gym'
    ),
    (
      'Previdência privada',
      '<p>Contribuição parcial da empresa (percentual ilustrativo no seed).</p>',
      'Financeiro',
      'retirement'
    )
  ) AS v(name, description, cat_name, benefit_type)
  JOIN benefit_categories c
    ON c.company_id = v_company_id AND LOWER(btrim(c.name)) = LOWER(btrim(v.cat_name));

  -- Academy: temas multi-tag (vírgula) + descrição HTML; 1º recurso linkado no PDI
  INSERT INTO learning_resources (
    company_id, title, description, url, theme, resource_type, duration_hours, active, created_by_user_id
  ) VALUES
    (
      v_company_id,
      'Feedback eficaz',
      '<p>Como dar e receber feedback com clareza — trilha leve para gestores.</p><ul><li>Situação / comportamento / impacto</li><li>Follow-up em 1:1</li></ul>',
      'https://example.com/feedback',
      'Liderança, Comunicação',
      'article',
      2,
      TRUE,
      v_user_id
    )
  RETURNING id INTO v_res_id;

  INSERT INTO learning_resources (
    company_id, title, description, url, theme, resource_type, duration_hours, active, created_by_user_id
  ) VALUES
    (
      v_company_id,
      'SQL para gestores',
      '<p>Consultas básicas para leitura de indicadores (sem virar DBA).</p>',
      'https://example.com/sql',
      'Técnico, Dados',
      'course',
      4,
      TRUE,
      v_user_id
    ),
    (
      v_company_id,
      'Onboarding do time',
      '<p>Checklist e rituais das primeiras semanas — alinhado ao portal /e.</p>',
      'https://example.com/onboarding',
      'Onboarding, Cultura, Liderança',
      'workshop',
      3,
      TRUE,
      v_user_id
    );

  -- ---------- Ciclo de performance (company) ----------
  INSERT INTO performance_cycles (
    company_id, title, description, status, period_start, period_end, created_by_user_id
  ) VALUES (
    v_company_id,
    'Ciclo Eval 2026-H1',
    'Ciclo leve para o time interno do seed.',
    'active',
    CURRENT_DATE - 60,
    CURRENT_DATE + 30,
    v_user_id
  )
  RETURNING id INTO v_cycle_id;

  INSERT INTO critical_roles (
    company_id, title, description, area_key, impact_level, active, created_by_user_id
  ) VALUES (
    v_company_id,
    'Tech Lead Plataforma',
    'Papel crítico demo para sucessão.',
    'engineering',
    'critical',
    TRUE,
    v_user_id
  )
  RETURNING id INTO v_crit_id;

  -- ---------- 10 time interno (pacote People completo) ----------
  FOR v_i IN 1..10 LOOP
    v_top := ((v_i + 3) % 9) + 1;
    v_pad := lpad(v_i::text, 2, '0');
    v_name := v_int_names[v_i];
    v_email := 'int' || v_pad || '@eval-20.demo';
    v_area := v_area_ids[1 + ((v_i - 1) % cardinality(v_area_ids))];
    v_start := CURRENT_DATE - (120 + v_i * 7);

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
      salary_expectation, hr_notes
    ) VALUES (
      v_company_id,
      v_name,
      v_email,
      '+55 31 97' || lpad(v_i::text, 3, '0') || '-' || lpad((3000 + v_i)::text, 4, '0'),
      'https://linkedin.com/in/eval20-int' || v_pad,
      'São Paulo',
      'SP',
      'immediate',
      'referral',
      NOW() - ((90 + v_i) || ' days')::interval,
      'employee',
      v_start::timestamptz,
      v_start,
      (12 + v_i)::text || '000.00',
      '<p>Time interno eval — T' || v_top::text || ' — pacote People completo.</p>'
    )
    RETURNING id INTO v_cand_id;

    INSERT INTO assessments (
      candidate_id, company_id, area_id, top_type, scores, source, pipeline_stage,
      hired_at, start_date, fill_duration_ms, created_at
    ) VALUES (
      v_cand_id, v_company_id, v_area, v_top, v_scores, 'seed_eval_20_internal', 'hired',
      v_start::timestamptz,
      v_start,
      200000 + v_i * 800,
      (v_start - 10)::timestamptz
    )
    RETURNING id INTO v_ass_id;

    IF v_i = 1 THEN
      v_int_base := v_ass_id;
    END IF;
    v_int_ass := array_append(v_int_ass, v_ass_id);

    INSERT INTO assessment_pipeline_history (
      assessment_id, from_stage, to_stage, start_date, changed_by_user_id, changed_at
    ) VALUES (
      v_ass_id, 'approved', 'hired', v_start, v_user_id, v_start::timestamptz
    );

    IF v_def_id IS NOT NULL THEN
      INSERT INTO ae_attempts (
        definition_id, company_id, candidate_id, area_id, status,
        started_at, completed_at, dimension_scores, ranking, profile_summary, algorithm_version
      ) VALUES (
        v_def_id, v_company_id, v_cand_id, v_area, 'completed',
        NOW() - ((10 + v_i) || ' days')::interval,
        NOW() - ((10 + v_i) || ' days')::interval,
        jsonb_build_object(
          'reconhecimento', 40 + (v_i % 30),
          'financeiro', 35 + ((v_i * 3) % 40),
          'crescimento', 55 + ((v_i * 2) % 30),
          'desenvolvimento', 60 + ((v_i * 5) % 25),
          'autonomia', 50 + ((v_i * 7) % 35),
          'flexibilidade', 45 + ((v_i * 4) % 30),
          'proposito', 70 + ((v_i * 3) % 20),
          'relacionamentos', 50 + ((v_i * 6) % 30),
          'seguranca', 40 + ((v_i * 5) % 35),
          'lideranca', 35 + ((v_i * 8) % 40),
          'desafio', 55 + ((v_i * 2) % 30),
          'criatividade', 40 + ((v_i * 9) % 35),
          'equilibrio', 50 + ((v_i * 4) % 30)
        ),
        '["proposito","desenvolvimento","crescimento","desafio","autonomia","equilibrio","relacionamentos","flexibilidade","seguranca","financeiro","reconhecimento","lideranca","criatividade"]'::jsonb,
        'Time interno: hipóteses de motivação (eval).',
        'ae-scoring-v2'
      );
    END IF;

    INSERT INTO one_on_ones (
      company_id, candidate_id, meeting_date, notes, next_steps, created_by_user_id
    ) VALUES (
      v_company_id, v_cand_id, CURRENT_DATE - (v_i * 5),
      '<p>1:1 time interno — ' || v_name || '.</p><p>Foco: entrega, clima e PDI.</p>',
      '<p>Próximo passo: revisar itens do PDI e check-in de onboarding.</p>',
      v_user_id
    );

    INSERT INTO development_plans (
      company_id, candidate_id, title, objective, status,
      period_start, period_end, created_by_user_id
    ) VALUES (
      v_company_id, v_cand_id,
      'PDI Time Interno — ' || split_part(v_name, ' ', 1),
      'Plano ativo do seed para avaliar Equipe / PDI / portal.',
      'active',
      CURRENT_DATE - 45, CURRENT_DATE + 90, v_user_id
    )
    RETURNING id INTO v_plan_id;

    INSERT INTO development_plan_items (
      plan_id, company_id, title, notes, status, source, sort_order, due_date, owner_label
    ) VALUES (
      v_plan_id, v_company_id,
      'Consolidar rituais de feedback',
      'Item gerado pelo seed eval.',
      CASE WHEN v_i <= 4 THEN 'done' WHEN v_i <= 7 THEN 'doing' ELSE 'todo' END,
      'manual', 0, CURRENT_DATE + 21, 'Gestor direto'
    )
    RETURNING id INTO v_plan_item_id;

    INSERT INTO development_plan_items (
      plan_id, company_id, title, notes, status, source, sort_order, due_date, owner_label
    ) VALUES (
      v_plan_id, v_company_id,
      'Acompanhar milestone de onboarding',
      '',
      'doing',
      'onboarding', 1, CURRENT_DATE + 14, 'RH'
    );

    INSERT INTO development_plan_resource_links (plan_item_id, resource_id)
    VALUES (v_plan_item_id, v_res_id)
    ON CONFLICT DO NOTHING;

    -- Pre-onboarding (3 chaves)
    INSERT INTO employee_pre_onboarding_items (
      company_id, candidate_id, item_key, due_date, status, completed_at, completed_by_user_id
    ) VALUES
      (
        v_company_id, v_cand_id, 'welcome_kit', v_start - 3,
        'done', (v_start - 2)::timestamptz, v_user_id
      ),
      (
        v_company_id, v_cand_id, 'rh_onboarding_call', v_start - 1,
        'done', (v_start - 1)::timestamptz, v_user_id
      ),
      (
        v_company_id, v_cand_id, 'manager_onboarding', v_start,
        CASE WHEN v_i <= 7 THEN 'done' ELSE 'pending' END,
        CASE WHEN v_i <= 7 THEN v_start::timestamptz ELSE NULL END,
        CASE WHEN v_i <= 7 THEN v_user_id ELSE NULL END
      );

    -- Check-ins 30/60/90
    INSERT INTO employee_onboarding_checkins (
      company_id, candidate_id, milestone_days, due_date, status, outcome, notes,
      completed_at, completed_by_user_id
    ) VALUES
      (
        v_company_id, v_cand_id, 30, v_start + 30,
        'done', 'continue', '<p>Check-in D30 ok (seed).</p>',
        (v_start + 30)::timestamptz, v_user_id
      ),
      (
        v_company_id, v_cand_id, 60, v_start + 60,
        CASE WHEN (v_start + 60) <= CURRENT_DATE THEN 'done' ELSE 'pending' END,
        CASE WHEN (v_start + 60) <= CURRENT_DATE THEN 'develop' ELSE '' END,
        CASE WHEN (v_start + 60) <= CURRENT_DATE THEN '<p>D60: reforçar autonomia.</p>' ELSE '' END,
        CASE WHEN (v_start + 60) <= CURRENT_DATE THEN (v_start + 60)::timestamptz ELSE NULL END,
        CASE WHEN (v_start + 60) <= CURRENT_DATE THEN v_user_id ELSE NULL END
      ),
      (
        v_company_id, v_cand_id, 90, v_start + 90,
        CASE WHEN (v_start + 90) <= CURRENT_DATE THEN 'done' ELSE 'pending' END,
        CASE WHEN (v_start + 90) <= CURRENT_DATE THEN 'continue' ELSE '' END,
        '',
        CASE WHEN (v_start + 90) <= CURRENT_DATE THEN (v_start + 90)::timestamptz ELSE NULL END,
        CASE WHEN (v_start + 90) <= CURRENT_DATE THEN v_user_id ELSE NULL END
      );

    -- Portal /e/{token}
    v_tok := 'eint' || v_pad || 'eval20portal5f60718293a4b5c6d7';
    INSERT INTO employee_portal_tokens (
      company_id, candidate_id, token, expires_at, created_by_user_id,
      prepared_at, note_to_manager, last_seen_at
    ) VALUES (
      v_company_id, v_cand_id, v_tok, NOW() + INTERVAL '180 days', v_user_id,
      CASE WHEN v_i <= 5 THEN NOW() - (v_i || ' days')::interval ELSE NULL END,
      CASE WHEN v_i <= 5 THEN 'Prep 1:1 feita via portal (seed).' ELSE '' END,
      CASE WHEN v_i <= 6 THEN NOW() - ((v_i * 2) || ' hours')::interval ELSE NULL END
    );

    -- Retention follow-up (subset com risco)
    IF v_i IN (2, 5, 8) THEN
      INSERT INTO retention_followups (
        company_id, candidate_id, plan_id, signal_keys, explanation,
        suggested_question, review_due, created_by_user_id
      ) VALUES (
        v_company_id, v_cand_id, v_plan_id,
        ARRAY['climate_low', 'pdi_delayed'],
        'Sinais leves de retenção no seed — hipóteses para conversa, não diagnóstico.',
        'O que mais ajudaria você a se sentir apoiado neste trimestre?',
        CURRENT_DATE + 10,
        v_user_id
      );
    END IF;

    v_score_n := 55 + ((v_i * 11) % 40);
    INSERT INTO hr_scores (
      company_id, candidate_id, score, signals, turnover_risk, calculated_at
    ) VALUES (
      v_company_id, v_cand_id, v_score_n,
      jsonb_build_object(
        'profile', jsonb_build_object('score', 85, 'weight', 0.15),
        'motivators', jsonb_build_object('score', 60 + v_i, 'weight', 0.20),
        'pdi', jsonb_build_object('score', 50 + v_i * 3, 'weight', 0.20),
        'checkins', jsonb_build_object('score', 70, 'weight', 0.15),
        'note', 'seed_eval_20_internal'
      ),
      CASE
        WHEN v_i IN (2, 5, 8) THEN 'medium'
        WHEN v_score_n >= 80 THEN 'low'
        ELSE 'low'
      END,
      NOW() - (v_i || ' hours')::interval
    )
    ON CONFLICT (candidate_id) DO NOTHING;

    -- Performance goal + review
    INSERT INTO performance_goals (
      cycle_id, company_id, candidate_id, title, description, weight, sort_order
    ) VALUES (
      v_cycle_id, v_company_id, v_cand_id,
      'Entregar iniciativas do trimestre',
      'Meta leve do seed para o time interno.',
      100, 0
    )
    RETURNING id INTO v_goal_id;

    INSERT INTO performance_reviews (
      cycle_id, company_id, candidate_id, reviewer_user_id, outcomes,
      overall_notes, status, submitted_at
    ) VALUES (
      v_cycle_id, v_company_id, v_cand_id, v_user_id,
      jsonb_build_object(
        v_goal_id::text,
        jsonb_build_object(
          'outcome', CASE WHEN v_i <= 3 THEN 'exceeded' WHEN v_i <= 7 THEN 'met' ELSE 'develop' END,
          'notes', 'Review seed time interno.'
        )
      ),
      '<p>Review seed — hedging: há indícios de progresso consistente.</p>',
      CASE WHEN v_i <= 8 THEN 'submitted' ELSE 'draft' END,
      CASE WHEN v_i <= 8 THEN NOW() - (v_i || ' days')::interval ELSE NULL END
    );

    IF v_i >= 8 THEN
      INSERT INTO development_plan_items (
        plan_id, company_id, title, notes, status, source, sort_order,
        due_date, owner_label, performance_goal_id
      ) VALUES (
        v_plan_id, v_company_id,
        'Desenvolver gap da meta do ciclo',
        'Item auto-ligado a performance_review (seed).',
        'todo', 'performance_review', 2, CURRENT_DATE + 40, 'Gestor', v_goal_id
      );
    END IF;

    -- Sucessão (primeiros 3)
    IF v_i <= 3 THEN
      INSERT INTO succession_plans (
        critical_role_id, company_id, successor_candidate_id, readiness,
        notes, target_date, created_by_user_id
      ) VALUES (
        v_crit_id, v_company_id, v_cand_id,
        (ARRAY['developing', 'ready', 'now'])[v_i],
        'Sucessor demo — tende a precisar de mentoria em liderança técnica.',
        CURRENT_DATE + (90 * v_i),
        v_user_id
      );
    END IF;
  END LOOP;

  -- ---------- Alumni + exit_records (busca por nome na UI; tipos/motivos fixos; notas HTML) ----------
  INSERT INTO candidates (
    company_id, full_name, email, phone, city, state,
    availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
  ) VALUES (
    v_company_id, 'Ex Colaborador Eval', 'alumni01@eval-20.demo',
    '+55 11 90000-0001', 'São Paulo', 'SP', 'immediate', 'referral',
    NOW() - INTERVAL '400 days', 'alumni',
    NOW() - INTERVAL '400 days', CURRENT_DATE - 400,
    '<p>Alumni seed para exit analysis (voluntária).</p>'
  )
  RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, pipeline_stage,
    hired_at, start_date, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_ids[1], 6,
    '{"1":12,"2":11,"3":14,"4":10,"5":15,"6":28,"7":9,"8":13,"9":11}'::jsonb,
    'seed_eval_20_alumni', 'hired',
    NOW() - INTERVAL '400 days', CURRENT_DATE - 400, 190000, NOW() - INTERVAL '410 days'
  );

  INSERT INTO exit_records (
    candidate_id, company_id, exit_date, exit_type, exit_reason, notes, created_by_user_id
  ) VALUES (
    v_cand_id, v_company_id, CURRENT_DATE - 40, 'voluntary', 'career_growth',
    '<p>Saída <strong>voluntária</strong> — hipótese de crescimento externo (seed).</p><ul><li>Buscou desafio técnico maior</li><li>Retenção: revisar plano de carreira</li></ul>',
    v_user_id
  );

  INSERT INTO candidates (
    company_id, full_name, email, phone, city, state,
    availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
  ) VALUES (
    v_company_id, 'Marina Alves Ex', 'alumni02@eval-20.demo',
    '+55 11 90000-0002', 'Curitiba', 'PR', 'immediate', 'linkedin',
    NOW() - INTERVAL '500 days', 'alumni',
    NOW() - INTERVAL '500 days', CURRENT_DATE - 500,
    '<p>Alumni seed — saída involuntária (performance).</p>'
  )
  RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, pipeline_stage,
    hired_at, start_date, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_ids[2], 3,
    '{"1":10,"2":12,"3":27,"4":11,"5":14,"6":13,"7":9,"8":15,"9":10}'::jsonb,
    'seed_eval_20_alumni', 'hired',
    NOW() - INTERVAL '500 days', CURRENT_DATE - 500, 175000, NOW() - INTERVAL '510 days'
  );

  INSERT INTO exit_records (
    candidate_id, company_id, exit_date, exit_type, exit_reason, notes, created_by_user_id
  ) VALUES (
    v_cand_id, v_company_id, CURRENT_DATE - 90, 'involuntary', 'performance',
    '<p>Saída <strong>involuntária</strong> — desempenho abaixo do esperado após PIP (seed).</p><p>Insight M1: revisar aderência na triagem.</p>',
    v_user_id
  );

  -- ---------- Clima aberto + respostas anônimas ----------
  INSERT INTO climate_surveys (
    company_id, title, description, status, opens_at, closes_at, created_by_user_id
  ) VALUES (
    v_company_id,
    'Clima Eval 20 — Time Interno',
    'Pesquisa aberta do seed (respostas anônimas).',
    'open',
    NOW() - INTERVAL '7 days',
    NOW() + INTERVAL '30 days',
    v_user_id
  )
  RETURNING id INTO v_survey_id;

  INSERT INTO climate_survey_questions (
    survey_id, company_id, prompt, question_kind, sort_order
  ) VALUES
    (v_survey_id, v_company_id, 'Como você avalia o clima da equipe?', 'likert', 0)
  RETURNING id INTO v_q_likert;

  INSERT INTO climate_survey_questions (
    survey_id, company_id, prompt, question_kind, sort_order
  ) VALUES
    (v_survey_id, v_company_id, 'O que mais ajudaria no dia a dia?', 'text', 1)
  RETURNING id INTO v_q_text;

  FOR v_i IN 1..8 LOOP
    v_tok := 'clim' || lpad(v_i::text, 2, '0') || 'eval20climate5f60718293a4b5c';
    INSERT INTO climate_survey_invites (survey_id, company_id, token, expires_at, used_at)
    VALUES (
      v_survey_id, v_company_id, v_tok, NOW() + INTERVAL '60 days',
      CASE WHEN v_i <= 6 THEN NOW() - (v_i || ' days')::interval ELSE NULL END
    )
    RETURNING id INTO v_invite_id;

    IF v_i <= 6 THEN
      INSERT INTO climate_survey_responses (survey_id, company_id, invite_id, answers, submitted_at)
      VALUES (
        v_survey_id, v_company_id, v_invite_id,
        jsonb_build_object(
          v_q_likert::text, 2 + (v_i % 4),
          v_q_text::text, 'Resposta anônima seed #' || v_i::text
        ),
        NOW() - (v_i || ' days')::interval
      );
    END IF;
  END LOOP;

  -- ---------- Grupo + pulso do time interno ----------
  INSERT INTO team_groups (
    company_id, name, base_assessment_id, member_assessment_ids, created_by_user_id
  ) VALUES (
    v_company_id,
    'Time Interno Eval (10)',
    v_int_base,
    v_int_ass[2:cardinality(v_int_ass)],
    v_user_id
  )
  RETURNING id INTO v_group_id;

  -- Grupo legado (6 dos emp##) se ainda existir
  IF v_base_ass IS NOT NULL AND cardinality(v_member_ass) >= 2 THEN
    INSERT INTO team_groups (
      company_id, name, base_assessment_id, member_assessment_ids, created_by_user_id
    ) VALUES (
      v_company_id,
      'Núcleo Eval (6 pessoas)',
      v_base_ass,
      v_member_ass[2:cardinality(v_member_ass)],
      v_user_id
    );
  END IF;

  INSERT INTO team_pulses (
    company_id, team_group_id, title, status, opens_at, closes_at, created_by_user_id
  ) VALUES (
    v_company_id, v_group_id,
    'Pulso Eval — Time Interno',
    'open',
    NOW() - INTERVAL '3 days',
    NOW() + INTERVAL '14 days',
    v_user_id
  )
  RETURNING id INTO v_pulse_id;

  INSERT INTO team_pulse_questions (
    pulse_id, company_id, prompt_key, prompt, sort_order
  ) VALUES (
    v_pulse_id, v_company_id, 'energy',
    'Como está sua energia no time nesta semana?', 0
  )
  RETURNING id INTO v_pulse_q;

  FOR v_i IN 1..6 LOOP
    v_tok := 'puls' || lpad(v_i::text, 2, '0') || 'eval20pulse5f60718293a4b5c6';
    INSERT INTO team_pulse_invites (pulse_id, company_id, token, expires_at, used_at)
    VALUES (
      v_pulse_id, v_company_id, v_tok, NOW() + INTERVAL '30 days',
      CASE WHEN v_i <= 4 THEN NOW() - (v_i || ' hours')::interval ELSE NULL END
    )
    RETURNING id INTO v_invite_id;

    IF v_i <= 4 THEN
      INSERT INTO team_pulse_responses (pulse_id, company_id, invite_id, answers, submitted_at)
      VALUES (
        v_pulse_id, v_company_id, v_invite_id,
        jsonb_build_object(v_pulse_q::text, 2 + (v_i % 4)),
        NOW() - (v_i || ' hours')::interval
      );
    END IF;
  END LOOP;

  INSERT INTO manager_notifications (
    company_id, recipient_user_id, type, entity_type, entity_id, dedupe_key, payload, created_at
  ) VALUES (
    v_company_id, v_user_id, 'enneagram_completed', 'company', v_company_id,
    'eval20:welcome:' || v_company_id::text,
    jsonb_build_object(
      'message', 'Seed Eval 20 + time interno pronto — Equipe, Clima, PDI, Pulso, Performance.',
      'candidateName', 'Eval 20'
    ),
    NOW()
  );

  RAISE NOTICE 'Eval 20 OK — company_id=% user=admin@eval-20.demo senha=EvalDemo!2026', v_company_id;
  RAISE NOTICE 'Link empresa /t/%', v_company_tok;
  RAISE NOTICE 'Link vaga /v/%', v_vacancy_tok;
  RAISE NOTICE 'Time interno: int01@…int10@eval-20.demo (portal /e/eint##eval20portal…)';
  RAISE NOTICE 'Clima: /clima/clim01eval20climate…  Pulso: /pulso/puls01eval20pulse…';
  RAISE NOTICE 'Catálogos: benefit_categories + benefits (category_id); Academy themes multi-tag; 2 exit_records';
END;
$eval$;

COMMIT;

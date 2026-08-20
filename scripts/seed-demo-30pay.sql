-- =============================================================================
-- DEMO 30pay — seed SQL isolado (só este tenant)
-- =============================================================================
-- Login:  hr@30pay.demo
-- Senha:  Demo30pay!2026
--
-- Pré-requisitos: migrations aplicadas; tabela areas populada.
-- Motivadores: se existir ae_definitions.slug = motivators, preenche ae_attempts.
--
-- Idempotente: remove empresa slug=30pay (e dependências) e recria.
-- Rodar no pgAdmin / psql em uma única execução (BEGIN…COMMIT).
-- =============================================================================

BEGIN;

DO $demo$
DECLARE
  v_company_id   BIGINT;
  v_user_id      BIGINT;
  v_vacancy_id   BIGINT;
  v_def_id       BIGINT;
  v_cand_id      BIGINT;
  v_ass_id       BIGINT;
  v_vc_id        BIGINT;
  v_area_id      INT;
  v_company_tok  TEXT := 'a1b2c3d4e5f60718293a4b5c6d7e8f9011';
  v_vacancy_tok  TEXT := 'b2c3d4e5f60718293a4b5c6d7e8f901122';
  v_report_tok   TEXT := 'c3d4e5f60718293a4b5c6d7e8f90112233';
  v_pwd_hash     TEXT := '$2a$10$3CzxuPoTExWX4rxbO9vfxOWc/1Y2GSEJwznek27JCZ3Tc5.nQ61p2';
BEGIN
  -- ---------- purge tenant 30pay ----------
  SELECT id INTO v_company_id
  FROM companies
  WHERE LOWER(slug) = '30pay' AND deleted = FALSE
  LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    DELETE FROM vacancy_report_shares WHERE company_id = v_company_id;
    DELETE FROM one_on_ones WHERE company_id = v_company_id;
    DELETE FROM ae_attempts WHERE company_id = v_company_id;
    DELETE FROM ae_invites WHERE company_id = v_company_id;

    DELETE FROM vacancy_candidate_pipeline_history h
    USING vacancy_candidates vc
    WHERE h.vacancy_candidate_id = vc.id AND vc.company_id = v_company_id;

    DELETE FROM vacancy_candidates WHERE company_id = v_company_id;

    DELETE FROM assessment_pipeline_history h
    USING assessments a
    WHERE h.assessment_id = a.id AND a.company_id = v_company_id;

    DELETE FROM assessments WHERE company_id = v_company_id;

    DELETE FROM vacancy_rubrics r
    USING vacancies v
    WHERE r.vacancy_id = v.id AND v.company_id = v_company_id;

    DELETE FROM vacancy_links l
    USING vacancies v
    WHERE l.vacancy_id = v.id AND v.company_id = v_company_id;

    DELETE FROM candidate_invites WHERE company_id = v_company_id;
    DELETE FROM vacancies WHERE company_id = v_company_id;
    DELETE FROM candidates WHERE company_id = v_company_id;
    DELETE FROM company_links WHERE company_id = v_company_id;
    DELETE FROM users WHERE company_id = v_company_id;
    DELETE FROM companies WHERE id = v_company_id;
  END IF;

  -- ---------- company + HR user + links ----------
  INSERT INTO companies (name, slug, active, deleted)
  VALUES ('30pay', '30pay', TRUE, FALSE)
  RETURNING id INTO v_company_id;

  INSERT INTO users (company_id, email, password_hash, role, locale, active, deleted)
  VALUES (v_company_id, 'hr@30pay.demo', v_pwd_hash, 'hr', 'pt-BR', TRUE, FALSE)
  RETURNING id INTO v_user_id;

  INSERT INTO company_links (company_id, token, active, expires_at, require_candidate_email)
  VALUES (v_company_id, v_company_tok, TRUE, NOW() + INTERVAL '365 days', TRUE);

  INSERT INTO vacancies (
    company_id, title, slug, status, positions_count, deleted,
    description, salary_min, salary_max
  ) VALUES (
    v_company_id,
    'Engenheiro(a) de Pagamentos',
    'engenheiro-pagamentos',
    'open',
    2,
    FALSE,
    '<p><strong>Missão:</strong> evoluir liquidação PIX/TED e conciliação.</p><ul><li>Node.js / Postgres</li><li>Filas e idempotência</li></ul>',
    '16000',
    '22000'
  )
  RETURNING id INTO v_vacancy_id;

  INSERT INTO vacancy_links (vacancy_id, token, active, expires_at)
  VALUES (v_vacancy_id, v_vacancy_tok, TRUE, NOW() + INTERVAL '180 days');

  INSERT INTO vacancy_rubrics (vacancy_id, desired_type_weights, notes)
  VALUES (
    v_vacancy_id,
    '{"5":3,"1":2,"6":2,"3":1}'::jsonb,
    '<p>Preferência por <strong>T5/T1/T6</strong> (análise + processo).</p>'
  )
  ON CONFLICT (vacancy_id) DO UPDATE SET
    desired_type_weights = EXCLUDED.desired_type_weights,
    notes = EXCLUDED.notes,
    updated_at = NOW();

  SELECT id INTO v_def_id FROM ae_definitions WHERE LOWER(slug) = 'motivators' AND active = TRUE LIMIT 1;

  -- 1) Camila Ribeiro — T1
  SELECT id INTO v_area_id FROM areas WHERE key = 'juridico' LIMIT 1;
  IF v_area_id IS NULL THEN SELECT id INTO v_area_id FROM areas ORDER BY id LIMIT 1; END IF;

  INSERT INTO candidates (
    company_id, full_name, email, phone, linkedin_url, city, state,
    availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
  ) VALUES (
    v_company_id, 'Camila Ribeiro', 'camila.ribeiro@30pay.demo', '+55 11 98001-1001',
    'https://linkedin.com/in/camila-ribeiro-30pay', 'São Paulo', 'SP',
    'immediate', 'referral', NOW() - INTERVAL '40 days', 'employee',
    NOW() - INTERVAL '90 days', '2026-01-15',
    '<p><strong>Compliance / PLD.</strong> Perfil metódico; tende a priorizar processo.</p><ul><li>Auditoria PIX</li><li>Tensão natural com lideranças atalho (André T8)</li></ul>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, hired_at, start_date, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 1,
    '{"1":28,"2":12,"3":14,"4":11,"5":16,"6":18,"7":9,"8":13,"9":10}'::jsonb,
    'demo_30pay', NULL, 'hired', NOW() - INTERVAL '90 days', '2026-01-15', 210000,
    NOW() - INTERVAL '100 days'
  ) RETURNING id INTO v_ass_id;

  INSERT INTO assessment_pipeline_history (assessment_id, from_stage, to_stage, changed_at) VALUES
    (v_ass_id, 'new', 'interview', NOW() - INTERVAL '100 days'),
    (v_ass_id, 'interview', 'test_completed', NOW() - INTERVAL '95 days'),
    (v_ass_id, 'test_completed', 'screening', NOW() - INTERVAL '92 days'),
    (v_ass_id, 'screening', 'approved', NOW() - INTERVAL '91 days'),
    (v_ass_id, 'approved', 'hired', NOW() - INTERVAL '90 days');

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days',
      '{"reconhecimento":40,"financeiro":45,"crescimento":55,"desenvolvimento":78,"autonomia":50,"flexibilidade":48,"proposito":82,"relacionamentos":52,"seguranca":90,"lideranca":35,"desafio":44,"criatividade":30,"equilibrio":60}'::jsonb,
      '["seguranca","proposito","desenvolvimento","crescimento","equilibrio","relacionamentos","autonomia","flexibilidade","financeiro","desafio","reconhecimento","lideranca","criatividade"]'::jsonb,
      'Demo: tende a buscar segurança e propósito no dia a dia.',
      'demo-seed'
    );
  END IF;

  INSERT INTO one_on_ones (company_id, candidate_id, meeting_date, notes, next_steps, created_by_user_id)
  VALUES (
    v_company_id, v_cand_id, CURRENT_DATE - 7,
    '<p>1:1 — prioridades de compliance e colaboração com Operations.</p>',
    '<p>Revisitar atrito de ritmo com André em 2 semanas.</p>',
    v_user_id
  );

  -- 2) Beatriz Nogueira — T2
  SELECT id INTO v_area_id FROM areas WHERE key = 'rh' LIMIT 1;
  IF v_area_id IS NULL THEN SELECT id INTO v_area_id FROM areas ORDER BY id LIMIT 1; END IF;

  INSERT INTO candidates (
    company_id, full_name, email, phone, linkedin_url, city, state,
    availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
  ) VALUES (
    v_company_id, 'Beatriz Nogueira', 'beatriz.nogueira@30pay.demo', '+55 11 98001-1002',
    'https://linkedin.com/in/beatriz-nogueira-rh', 'São Paulo', 'SP',
    'immediate', 'referral', NOW() - INTERVAL '40 days', 'employee',
    NOW() - INTERVAL '90 days', '2026-01-15',
    '<p><strong>People Partner.</strong> Facilita 1:1 e onboarding.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, hired_at, start_date, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 2,
    '{"1":14,"2":27,"3":15,"4":16,"5":11,"6":18,"7":12,"8":10,"9":17}'::jsonb,
    'demo_30pay', NULL, 'hired', NOW() - INTERVAL '90 days', '2026-01-15', 195000,
    NOW() - INTERVAL '98 days'
  ) RETURNING id INTO v_ass_id;

  INSERT INTO assessment_pipeline_history (assessment_id, from_stage, to_stage, changed_at) VALUES
    (v_ass_id, 'new', 'interview', NOW() - INTERVAL '99 days'),
    (v_ass_id, 'interview', 'test_completed', NOW() - INTERVAL '96 days'),
    (v_ass_id, 'test_completed', 'screening', NOW() - INTERVAL '93 days'),
    (v_ass_id, 'screening', 'approved', NOW() - INTERVAL '92 days'),
    (v_ass_id, 'approved', 'hired', NOW() - INTERVAL '90 days');

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days',
      '{"reconhecimento":48,"financeiro":35,"crescimento":50,"desenvolvimento":55,"autonomia":42,"flexibilidade":60,"proposito":80,"relacionamentos":92,"seguranca":58,"lideranca":40,"desafio":38,"criatividade":45,"equilibrio":85}'::jsonb,
      '["relacionamentos","equilibrio","proposito","flexibilidade","seguranca","desenvolvimento","crescimento","reconhecimento","criatividade","autonomia","lideranca","desafio","financeiro"]'::jsonb,
      'Demo: tende a buscar relacionamentos e equilíbrio.',
      'demo-seed'
    );
  END IF;

  INSERT INTO one_on_ones (company_id, candidate_id, meeting_date, notes, next_steps, created_by_user_id)
  VALUES (
    v_company_id, v_cand_id, CURRENT_DATE - 5,
    '<p>1:1 People — clima entre Growth e Risk.</p>',
    '<p>Mapear pares de tensão na aba Comparar para workshop.</p>',
    v_user_id
  );

  -- 3) Rafael Mendes — T3
  SELECT id INTO v_area_id FROM areas WHERE key = 'comercial' LIMIT 1;
  IF v_area_id IS NULL THEN SELECT id INTO v_area_id FROM areas ORDER BY id LIMIT 1; END IF;

  INSERT INTO candidates (
    company_id, full_name, email, phone, linkedin_url, city, state,
    availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
  ) VALUES (
    v_company_id, 'Rafael Mendes', 'rafael.mendes@30pay.demo', '+55 11 98001-1003',
    'https://linkedin.com/in/rafael-mendes-growth', 'Campinas', 'SP',
    'immediate', 'referral', NOW() - INTERVAL '40 days', 'employee',
    NOW() - INTERVAL '90 days', '2026-01-15',
    '<p><strong>Head of Growth.</strong> Orientado a meta. Tensão com T9; sinergia com T7.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, hired_at, start_date, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 3,
    '{"1":12,"2":14,"3":29,"4":13,"5":11,"6":10,"7":18,"8":16,"9":9}'::jsonb,
    'demo_30pay', NULL, 'hired', NOW() - INTERVAL '90 days', '2026-01-15', 188000,
    NOW() - INTERVAL '97 days'
  ) RETURNING id INTO v_ass_id;

  INSERT INTO assessment_pipeline_history (assessment_id, from_stage, to_stage, changed_at) VALUES
    (v_ass_id, 'new', 'interview', NOW() - INTERVAL '98 days'),
    (v_ass_id, 'interview', 'test_completed', NOW() - INTERVAL '95 days'),
    (v_ass_id, 'test_completed', 'screening', NOW() - INTERVAL '93 days'),
    (v_ass_id, 'screening', 'approved', NOW() - INTERVAL '91 days'),
    (v_ass_id, 'approved', 'hired', NOW() - INTERVAL '90 days');

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days',
      '{"reconhecimento":90,"financeiro":82,"crescimento":70,"desenvolvimento":48,"autonomia":55,"flexibilidade":50,"proposito":40,"relacionamentos":45,"seguranca":35,"lideranca":68,"desafio":88,"criatividade":42,"equilibrio":30}'::jsonb,
      '["reconhecimento","desafio","financeiro","lideranca","crescimento","autonomia","flexibilidade","desenvolvimento","relacionamentos","criatividade","proposito","seguranca","equilibrio"]'::jsonb,
      'Demo: tende a buscar reconhecimento e desafio.',
      'demo-seed'
    );
  END IF;

  INSERT INTO one_on_ones (company_id, candidate_id, meeting_date, notes, next_steps, created_by_user_id)
  VALUES (
    v_company_id, v_cand_id, CURRENT_DATE - 3,
    '<p>1:1 Growth — pipeline de merchants e metas do trimestre.</p>',
    '<p>Alinhar com CS (Fernanda) sem pressão excessiva.</p>',
    v_user_id
  );

  -- 4) Sofia Almeida — T4
  SELECT id INTO v_area_id FROM areas WHERE key = 'produto' LIMIT 1;
  IF v_area_id IS NULL THEN SELECT id INTO v_area_id FROM areas ORDER BY id LIMIT 1; END IF;

  INSERT INTO candidates (
    company_id, full_name, email, phone, linkedin_url, city, state,
    availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
  ) VALUES (
    v_company_id, 'Sofia Almeida', 'sofia.almeida@30pay.demo', '+55 21 98001-1004',
    'https://linkedin.com/in/sofia-almeida-produto', 'Rio de Janeiro', 'RJ',
    'immediate', 'referral', NOW() - INTERVAL '40 days', 'employee',
    NOW() - INTERVAL '90 days', '2026-01-15',
    '<p>Product Design — checkout e chargeback.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, hired_at, start_date, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 4,
    '{"1":11,"2":15,"3":13,"4":28,"5":17,"6":12,"7":14,"8":10,"9":16}'::jsonb,
    'demo_30pay', NULL, 'hired', NOW() - INTERVAL '90 days', '2026-01-15', 205000,
    NOW() - INTERVAL '96 days'
  );

  -- 5) Lucas Ferreira — T5
  SELECT id INTO v_area_id FROM areas WHERE key = 'tecnologia' LIMIT 1;
  IF v_area_id IS NULL THEN SELECT id INTO v_area_id FROM areas ORDER BY id LIMIT 1; END IF;

  INSERT INTO candidates (
    company_id, full_name, email, phone, linkedin_url, city, state,
    availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
  ) VALUES (
    v_company_id, 'Lucas Ferreira', 'lucas.ferreira@30pay.demo', '+55 11 98001-1005',
    'https://linkedin.com/in/lucas-ferreira-risk', 'São Paulo', 'SP',
    'immediate', 'referral', NOW() - INTERVAL '40 days', 'employee',
    NOW() - INTERVAL '90 days', '2026-01-15',
    '<p><strong>Staff Risk Eng.</strong> Sinergia com Camila (T1). Tensão com Thiago (T7).</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, hired_at, start_date, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 5,
    '{"1":17,"2":10,"3":12,"4":14,"5":29,"6":19,"7":9,"8":13,"9":11}'::jsonb,
    'demo_30pay', NULL, 'hired', NOW() - INTERVAL '90 days', '2026-01-15', 220000,
    NOW() - INTERVAL '95 days'
  ) RETURNING id INTO v_ass_id;

  INSERT INTO assessment_pipeline_history (assessment_id, from_stage, to_stage, changed_at) VALUES
    (v_ass_id, 'new', 'interview', NOW() - INTERVAL '97 days'),
    (v_ass_id, 'interview', 'test_completed', NOW() - INTERVAL '94 days'),
    (v_ass_id, 'test_completed', 'screening', NOW() - INTERVAL '92 days'),
    (v_ass_id, 'screening', 'approved', NOW() - INTERVAL '91 days'),
    (v_ass_id, 'approved', 'hired', NOW() - INTERVAL '90 days');

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days',
      '{"reconhecimento":35,"financeiro":40,"crescimento":80,"desenvolvimento":70,"autonomia":92,"flexibilidade":55,"proposito":48,"relacionamentos":38,"seguranca":60,"lideranca":42,"desafio":85,"criatividade":50,"equilibrio":45}'::jsonb,
      '["autonomia","desafio","crescimento","desenvolvimento","seguranca","flexibilidade","criatividade","proposito","equilibrio","lideranca","financeiro","relacionamentos","reconhecimento"]'::jsonb,
      'Demo: tende a buscar autonomia e desafio.',
      'demo-seed'
    );
  END IF;

  INSERT INTO one_on_ones (company_id, candidate_id, meeting_date, notes, next_steps, created_by_user_id)
  VALUES (
    v_company_id, v_cand_id, CURRENT_DATE - 4,
    '<p>1:1 técnico — dívida de conciliação e parceria com Growth.</p>',
    '<p>Combinar cadência com Thiago sem perder qualidade.</p>',
    v_user_id
  );

  -- 6) Juliana Martins — T6
  SELECT id INTO v_area_id FROM areas WHERE key = 'operacoes' LIMIT 1;
  IF v_area_id IS NULL THEN SELECT id INTO v_area_id FROM areas ORDER BY id LIMIT 1; END IF;

  INSERT INTO candidates (
    company_id, full_name, email, phone, linkedin_url, city, state,
    availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
  ) VALUES (
    v_company_id, 'Juliana Martins', 'juliana.martins@30pay.demo', '+55 11 98001-1006',
    'https://linkedin.com/in/juliana-martins-ops', 'São Paulo', 'SP',
    'immediate', 'referral', NOW() - INTERVAL '40 days', 'employee',
    NOW() - INTERVAL '90 days', '2026-01-15',
    '<p>Risk Ops — conciliação e disputas. Valoriza previsibilidade.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, hired_at, start_date, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 6,
    '{"1":16,"2":15,"3":11,"4":12,"5":18,"6":28,"7":10,"8":14,"9":13}'::jsonb,
    'demo_30pay', NULL, 'hired', NOW() - INTERVAL '90 days', '2026-01-15', 200000,
    NOW() - INTERVAL '94 days'
  );

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days',
      '{"reconhecimento":40,"financeiro":42,"crescimento":50,"desenvolvimento":55,"autonomia":48,"flexibilidade":52,"proposito":58,"relacionamentos":80,"seguranca":90,"lideranca":35,"desafio":45,"criatividade":32,"equilibrio":85}'::jsonb,
      '["seguranca","equilibrio","relacionamentos","proposito","desenvolvimento","flexibilidade","crescimento","autonomia","desafio","financeiro","reconhecimento","lideranca","criatividade"]'::jsonb,
      'Demo: tende a buscar segurança e equilíbrio.',
      'demo-seed'
    );
  END IF;

  -- 7) Thiago Barbosa — T7
  SELECT id INTO v_area_id FROM areas WHERE key = 'marketing' LIMIT 1;
  IF v_area_id IS NULL THEN SELECT id INTO v_area_id FROM areas ORDER BY id LIMIT 1; END IF;

  INSERT INTO candidates (
    company_id, full_name, email, phone, linkedin_url, city, state,
    availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
  ) VALUES (
    v_company_id, 'Thiago Barbosa', 'thiago.barbosa@30pay.demo', '+55 11 98001-1007',
    'https://linkedin.com/in/thiago-barbosa-pm', 'São Paulo', 'SP',
    'immediate', 'referral', NOW() - INTERVAL '40 days', 'employee',
    NOW() - INTERVAL '90 days', '2026-01-15',
    '<p>Growth PM — experimentos rápidos. Comparar com Lucas (T5) = tensão de ritmo.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, hired_at, start_date, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 7,
    '{"1":10,"2":13,"3":18,"4":14,"5":9,"6":11,"7":29,"8":15,"9":12}'::jsonb,
    'demo_30pay', NULL, 'hired', NOW() - INTERVAL '90 days', '2026-01-15', 175000,
    NOW() - INTERVAL '93 days'
  );

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days',
      '{"reconhecimento":55,"financeiro":50,"crescimento":90,"desenvolvimento":60,"autonomia":70,"flexibilidade":88,"proposito":45,"relacionamentos":52,"seguranca":30,"lideranca":48,"desafio":85,"criatividade":65,"equilibrio":40}'::jsonb,
      '["crescimento","flexibilidade","desafio","autonomia","criatividade","desenvolvimento","reconhecimento","relacionamentos","financeiro","lideranca","proposito","equilibrio","seguranca"]'::jsonb,
      'Demo: tende a buscar crescimento e flexibilidade.',
      'demo-seed'
    );
  END IF;

  -- 8) André Cavalcanti — T8
  SELECT id INTO v_area_id FROM areas WHERE key = 'operacoes' LIMIT 1;
  IF v_area_id IS NULL THEN SELECT id INTO v_area_id FROM areas ORDER BY id LIMIT 1; END IF;

  INSERT INTO candidates (
    company_id, full_name, email, phone, linkedin_url, city, state,
    availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
  ) VALUES (
    v_company_id, 'André Cavalcanti', 'andre.cavalcanti@30pay.demo', '+55 11 98001-1008',
    'https://linkedin.com/in/andre-cavalcanti', 'São Paulo', 'SP',
    'immediate', 'referral', NOW() - INTERVAL '40 days', 'employee',
    NOW() - INTERVAL '90 days', '2026-01-15',
    '<p><strong>VP Operations.</strong> Decisão rápida. Compat: tensão com Camila (T1).</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, hired_at, start_date, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 8,
    '{"1":12,"2":11,"3":16,"4":10,"5":13,"6":14,"7":15,"8":29,"9":9}'::jsonb,
    'demo_30pay', NULL, 'hired', NOW() - INTERVAL '90 days', '2026-01-15', 190000,
    NOW() - INTERVAL '92 days'
  ) RETURNING id INTO v_ass_id;

  INSERT INTO assessment_pipeline_history (assessment_id, from_stage, to_stage, changed_at) VALUES
    (v_ass_id, 'new', 'interview', NOW() - INTERVAL '96 days'),
    (v_ass_id, 'interview', 'test_completed', NOW() - INTERVAL '94 days'),
    (v_ass_id, 'test_completed', 'screening', NOW() - INTERVAL '92 days'),
    (v_ass_id, 'screening', 'approved', NOW() - INTERVAL '91 days'),
    (v_ass_id, 'approved', 'hired', NOW() - INTERVAL '90 days');

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days',
      '{"reconhecimento":60,"financeiro":85,"crescimento":70,"desenvolvimento":45,"autonomia":75,"flexibilidade":40,"proposito":38,"relacionamentos":42,"seguranca":50,"lideranca":95,"desafio":88,"criatividade":35,"equilibrio":28}'::jsonb,
      '["lideranca","desafio","financeiro","autonomia","crescimento","reconhecimento","seguranca","desenvolvimento","relacionamentos","flexibilidade","proposito","criatividade","equilibrio"]'::jsonb,
      'Demo: tende a buscar liderança e desafio.',
      'demo-seed'
    );
  END IF;

  INSERT INTO one_on_ones (company_id, candidate_id, meeting_date, notes, next_steps, created_by_user_id)
  VALUES (
    v_company_id, v_cand_id, CURRENT_DATE - 2,
    '<p>1:1 VP — capacidade operacional e decisões de risco.</p>',
    '<p>Workshop de compatibilidade com Compliance.</p>',
    v_user_id
  );

  -- 9) Fernanda Lopes — T9
  SELECT id INTO v_area_id FROM areas WHERE key = 'cs' LIMIT 1;
  IF v_area_id IS NULL THEN SELECT id INTO v_area_id FROM areas ORDER BY id LIMIT 1; END IF;

  INSERT INTO candidates (
    company_id, full_name, email, phone, linkedin_url, city, state,
    availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
  ) VALUES (
    v_company_id, 'Fernanda Lopes', 'fernanda.lopes@30pay.demo', '+55 11 98001-1009',
    'https://linkedin.com/in/fernanda-lopes-cs', 'Belo Horizonte', 'MG',
    'immediate', 'referral', NOW() - INTERVAL '40 days', 'employee',
    NOW() - INTERVAL '90 days', '2026-01-15',
    '<p>CS Lead — retenção merchants. Tensão com Rafael (T3).</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, hired_at, start_date, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 9,
    '{"1":13,"2":17,"3":10,"4":14,"5":12,"6":15,"7":16,"8":11,"9":28}'::jsonb,
    'demo_30pay', NULL, 'hired', NOW() - INTERVAL '90 days', '2026-01-15', 198000,
    NOW() - INTERVAL '91 days'
  );

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days',
      '{"reconhecimento":42,"financeiro":38,"crescimento":50,"desenvolvimento":55,"autonomia":48,"flexibilidade":60,"proposito":80,"relacionamentos":90,"seguranca":58,"lideranca":30,"desafio":35,"criatividade":45,"equilibrio":88}'::jsonb,
      '["relacionamentos","equilibrio","proposito","flexibilidade","seguranca","desenvolvimento","crescimento","criatividade","autonomia","reconhecimento","financeiro","desafio","lideranca"]'::jsonb,
      'Demo: tende a buscar relacionamentos e equilíbrio.',
      'demo-seed'
    );
  END IF;

  -- 10) Pedro Henrique — candidato screening
  SELECT id INTO v_area_id FROM areas WHERE key = 'tecnologia' LIMIT 1;
  IF v_area_id IS NULL THEN SELECT id INTO v_area_id FROM areas ORDER BY id LIMIT 1; END IF;

  INSERT INTO candidates (
    company_id, full_name, email, phone, linkedin_url, city, state,
    salary_expectation, availability, source, consent_at, employment_status, hr_notes
  ) VALUES (
    v_company_id, 'Pedro Henrique Santos', 'pedro.santos.candidato@30pay.demo', '+55 11 98001-1010',
    'https://linkedin.com/in/pedro-henrique-backend', 'São Paulo', 'SP',
    '20000', '30_days', 'linkedin', NOW() - INTERVAL '10 days', 'candidate',
    '<p><strong>Candidato — Eng. Pagamentos.</strong> Em triagem técnica.</p><ul><li>Disponibilidade: 30 dias</li><li>Expectativa: R$ 18–22k</li></ul>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 5,
    '{"1":15,"2":11,"3":13,"4":12,"5":27,"6":18,"7":10,"8":14,"9":9}'::jsonb,
    'demo_30pay', v_vacancy_id, 'screening', 205000, NOW() - INTERVAL '8 days'
  );

  INSERT INTO vacancy_candidates (
    vacancy_id, candidate_id, company_id, interview_notes, pipeline_stage, created_by_user_id
  ) VALUES (
    v_vacancy_id, v_cand_id, v_company_id,
    '<p>Entrevista ok; teste T5. Em triagem.</p>',
    'screening', v_user_id
  ) RETURNING id INTO v_vc_id;

  INSERT INTO vacancy_candidate_pipeline_history (vacancy_candidate_id, from_stage, to_stage, changed_at) VALUES
    (v_vc_id, 'new', 'interview', NOW() - INTERVAL '10 days'),
    (v_vc_id, 'interview', 'test_completed', NOW() - INTERVAL '6 days'),
    (v_vc_id, 'test_completed', 'screening', NOW() - INTERVAL '2 days');

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days',
      '{"reconhecimento":40,"financeiro":55,"crescimento":82,"desenvolvimento":68,"autonomia":90,"flexibilidade":60,"proposito":45,"relacionamentos":40,"seguranca":50,"lideranca":38,"desafio":85,"criatividade":48,"equilibrio":42}'::jsonb,
      '["autonomia","desafio","crescimento","desenvolvimento","flexibilidade","financeiro","seguranca","criatividade","proposito","equilibrio","reconhecimento","relacionamentos","lideranca"]'::jsonb,
      'Demo: candidato — autonomia e desafio.',
      'demo-seed'
    );
  END IF;

  -- 11) Marina Duarte — entrevista
  INSERT INTO candidates (
    company_id, full_name, email, phone, city, state,
    availability, source, consent_at, employment_status, hr_notes
  ) VALUES (
    v_company_id, 'Marina Duarte', 'marina.duarte.candidato@30pay.demo', '+55 11 98001-1011',
    'Curitiba', 'PR', '15_days', 'referral', NOW() - INTERVAL '6 days', 'candidate',
    '<p>Candidata — entrevista agendada. Perfil mais executor (T3).</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 3,
    '{"1":12,"2":14,"3":26,"4":11,"5":13,"6":10,"7":16,"8":15,"9":9}'::jsonb,
    'demo_30pay', v_vacancy_id, 'interview', 160000, NOW() - INTERVAL '5 days'
  );

  INSERT INTO vacancy_candidates (
    vacancy_id, candidate_id, company_id, interview_notes, pipeline_stage, created_by_user_id
  ) VALUES (
    v_vacancy_id, v_cand_id, v_company_id, '<p>Entrevista agendada.</p>', 'interview', v_user_id
  );

  -- 12) Gustavo Pires — rejeitado
  INSERT INTO candidates (
    company_id, full_name, email, phone, city, state,
    availability, source, consent_at, employment_status, hr_notes
  ) VALUES (
    v_company_id, 'Gustavo Pires', 'gustavo.pires.candidato@30pay.demo', '+55 11 98001-1012',
    'São Paulo', 'SP', 'immediate', 'job_board', NOW() - INTERVAL '15 days', 'candidate',
    '<p>Reprovado em fit técnico (gap em settlement). Mostra etapa Reprovado na timeline.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, rejection_reason, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 6,
    '{"1":14,"2":12,"3":11,"4":10,"5":15,"6":25,"7":9,"8":13,"9":12}'::jsonb,
    'demo_30pay', v_vacancy_id, 'rejected', 'skill_gap', 170000, NOW() - INTERVAL '12 days'
  );

  INSERT INTO vacancy_candidates (
    vacancy_id, candidate_id, company_id, interview_notes, pipeline_stage,
    rejection_reason, created_by_user_id
  ) VALUES (
    v_vacancy_id, v_cand_id, v_company_id,
    '<p>Gap em settlement.</p>', 'rejected', 'skill_gap', v_user_id
  ) RETURNING id INTO v_vc_id;

  INSERT INTO vacancy_candidate_pipeline_history (
    vacancy_candidate_id, from_stage, to_stage, reason, changed_at
  ) VALUES
    (v_vc_id, 'new', 'interview', NULL, NOW() - INTERVAL '12 days'),
    (v_vc_id, 'interview', 'test_completed', NULL, NOW() - INTERVAL '8 days'),
    (v_vc_id, 'test_completed', 'rejected', 'skill_gap', NOW() - INTERVAL '3 days');

  -- Relatório cliente /r
  INSERT INTO vacancy_report_shares (
    vacancy_id, company_id, token, title, executive_note, snapshot,
    active, expires_at, created_by_user_id
  ) VALUES (
    v_vacancy_id,
    v_company_id,
    v_report_tok,
    'Shortlist — Eng. Pagamentos (demo)',
    '<p><strong>Shortlist demo 30pay.</strong> Perfis técnicos com aderência a Risk/Pagamentos.</p>',
    jsonb_build_object(
      'generatedAt', NOW(),
      'vacancy', jsonb_build_object(
        'id', v_vacancy_id,
        'title', 'Engenheiro(a) de Pagamentos',
        'companyName', '30pay',
        'positionsCount', 2,
        'status', 'open'
      ),
      'executiveNote', '<p><strong>Shortlist demo 30pay.</strong> Perfis técnicos com aderência a Risk/Pagamentos.</p>',
      'candidates', jsonb_build_array(
        jsonb_build_object(
          'name', 'Pedro Henrique Santos',
          'topType', 5,
          'scores', '{"1":15,"2":11,"3":13,"4":12,"5":27,"6":18,"7":10,"8":14,"9":9}'::jsonb,
          'pipelineStage', 'screening',
          'areaLabel', 'Tecnologia',
          'vacancyFitScore010', 8.4,
          'vacancyFitLabel', 'Alta aderência'
        ),
        jsonb_build_object(
          'name', 'Marina Duarte',
          'topType', 3,
          'scores', '{"1":12,"2":14,"3":26,"4":11,"5":13,"6":10,"7":16,"8":15,"9":9}'::jsonb,
          'pipelineStage', 'interview',
          'areaLabel', 'Tecnologia',
          'vacancyFitScore010', 6.2,
          'vacancyFitLabel', 'Aderência moderada'
        )
      )
    ),
    TRUE,
    NOW() + INTERVAL '30 days',
    v_user_id
  );

  RAISE NOTICE 'DEMO 30pay OK — company_id=% | login hr@30pay.demo / Demo30pay!2026', v_company_id;
  RAISE NOTICE 'Tokens: /t/%  /v/%  /r/%', v_company_tok, v_vacancy_tok, v_report_tok;
  IF v_def_id IS NULL THEN
    RAISE NOTICE 'Motivadores NÃO seedados (rode seed de ae_definitions/questions se quiser hipóteses).';
  END IF;
END
$demo$;

COMMIT;

-- Conferência:
-- SELECT id, name, slug FROM companies WHERE slug = '30pay';
-- SELECT email, role FROM users WHERE email = 'hr@30pay.demo';
-- SELECT full_name, employment_status FROM candidates c
--   JOIN companies co ON co.id = c.company_id WHERE co.slug = '30pay';

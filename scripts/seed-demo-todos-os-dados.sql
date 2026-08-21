-- =============================================================================
-- DEMO "Todos os Dados" — seed SQL isolado (slug = todos-os-dados-demo)
-- =============================================================================
-- Login HR:         hr@todos-os-dados.demo
-- Login Direction:  direction@todos-os-dados.demo
-- Senha (ambos):    DemoTodosDados!2026
--
-- Preferência: CONFIRM_DEMO_PURGE=1 npm run db:seed-demo-todos-os-dados
--   (JS: T1–T9 colaboradores + 7 candidatos + /r completo via buildReportSnapshot)
--
-- Este SQL (pgAdmin): mesmos logins/tokens + pipeline completo na vaga aberta
--   (Pedro, Marina, Gustavo, Lara, Otávio, Nina, Ricardo) + relatório /r
--   com shortlist Pedro/Lara/Marina, motivadores, notas de entrevista e pretensão.
--
-- Smoke gestor (após seed):
--   /r/a3a3todosdadose5f60718293a4b5c6d7e8f04a3a3todosdadose5f60718
--   Login: hr@todos-os-dados.demo / DemoTodosDados!2026
--
-- Pré-requisitos: migrations aplicadas; areas; ae_definitions motivators (opcional).
-- DESTRUTIVO só para slug=todos-os-dados-demo.
-- v_i_confirm_purge já está TRUE neste arquivo (tenant demo isolado).
--
-- Se aparecer "current transaction is aborted" (25P02): rode só
--   ROLLBACK;
-- e execute este arquivo de novo (sessão do pgAdmin ficou suja da tentativa anterior).
-- =============================================================================

ROLLBACK;

-- Garante coluna da migration 028 (idempotente se já existir)
ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS client_report_show_salary BOOLEAN NOT NULL DEFAULT FALSE;

BEGIN;

DO $tod$
DECLARE
  -- TRUE = apaga/recria só o tenant todos-os-dados-demo (seguro: não toca outras empresas)
  v_i_confirm_purge BOOLEAN := TRUE;

  v_company_id   BIGINT;
  v_hr_id        BIGINT;
  v_dir_id       BIGINT;
  v_vac_open     BIGINT;
  v_vac_closed   BIGINT;
  v_def_id       BIGINT;
  v_cand_id      BIGINT;
  v_ass_id       BIGINT;
  v_vc_id        BIGINT;
  v_attempt_id   BIGINT;
  v_area_id      INT;
  v_non_demo     INT;

  v_company_tok  TEXT := 'd0d0todosdadose5f60718293a4b5c6d7e8f01';
  v_vacancy_tok  TEXT := 'e1e1todosdadose5f60718293a4b5c6d7e8f02';
  v_report_tok   TEXT := 'a3a3todosdadose5f60718293a4b5c6d7e8f04a3a3todosdadose5f60718';
  v_ae_tok       TEXT := 'b4b4todosdadose5f60718293a4b5c6d7e8f05';
  v_invite_tok   TEXT := 'c5c5todosdadose5f60718293a4b5c6d7e8f06';
  -- bcryptjs cost 10 de DemoTodosDados!2026
  v_pwd_hash     TEXT := '$2a$10$aY1laOJtUiXvZDmM7Mwgd.gAhCwWeR90GIfgJmsuhHSsTvANYEU/q';
BEGIN
  IF NOT v_i_confirm_purge THEN
    RAISE EXCEPTION
      'ABORTADO: defina v_i_confirm_purge := TRUE. Apaga apenas slug=todos-os-dados-demo.';
  END IF;

  SELECT id INTO v_company_id
  FROM companies
  WHERE LOWER(slug) = 'todos-os-dados-demo' AND deleted = FALSE
  LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    SELECT COUNT(*)::int INTO v_non_demo
    FROM users
    WHERE company_id = v_company_id
      AND email NOT ILIKE '%.demo'
      AND deleted = FALSE;

    IF v_non_demo > 0 THEN
      RAISE EXCEPTION 'ABORTADO: company_id=% parece tenant real.', v_company_id;
    END IF;

    DELETE FROM manager_notifications WHERE company_id = v_company_id;
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
  VALUES ('Todos os Dados', 'todos-os-dados-demo', TRUE, FALSE)
  RETURNING id INTO v_company_id;

  INSERT INTO users (company_id, email, password_hash, role, locale, display_name, active, deleted)
  VALUES (v_company_id, 'hr@todos-os-dados.demo', v_pwd_hash, 'hr', 'pt-BR', 'RH Todos os Dados', TRUE, FALSE)
  RETURNING id INTO v_hr_id;

  INSERT INTO users (company_id, email, password_hash, role, locale, display_name, active, deleted)
  VALUES (v_company_id, 'direction@todos-os-dados.demo', v_pwd_hash, 'direction', 'pt-BR', 'Direção Todos os Dados', TRUE, FALSE)
  RETURNING id INTO v_dir_id;

  INSERT INTO user_capability_overrides (user_id, capability, granted) VALUES
    (v_dir_id, 'overview.view', TRUE),
    (v_dir_id, 'team.view', TRUE),
    (v_dir_id, 'compatibility.view', TRUE),
    (v_dir_id, 'compare.view', TRUE),
    (v_dir_id, 'vacancies.view', TRUE),
    (v_dir_id, 'motivators.view', TRUE),
    (v_dir_id, 'help.view', TRUE);

  INSERT INTO company_links (company_id, token, active, expires_at, require_candidate_email)
  VALUES (v_company_id, v_company_tok, TRUE, NOW() + INTERVAL '365 days', TRUE);

  INSERT INTO vacancies (
    company_id, title, slug, status, positions_count, target_date, deleted,
    description, salary_min, salary_max, client_report_show_salary
  ) VALUES (
    v_company_id,
    'Engenheiro(a) Fullstack — Plataforma',
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
    '14000.00', '22000.00', TRUE
  ) RETURNING id INTO v_vac_open;

  INSERT INTO vacancy_links (vacancy_id, token, active, expires_at, require_candidate_email)
  VALUES (v_vac_open, v_vacancy_tok, TRUE, NOW() + INTERVAL '180 days', TRUE);

  INSERT INTO vacancy_rubrics (vacancy_id, desired_type_weights, notes)
  VALUES (
    v_vac_open,
    '{"5":3,"1":2,"6":2,"3":1}'::jsonb,
    '<p>Priorizar <strong>T5/T1/T6</strong> (análise + processo). T3 como executor complementar.</p>'
  );

  INSERT INTO vacancies (
    company_id, title, slug, status, positions_count, target_date, deleted,
    description, salary_min, salary_max, client_report_show_salary
  ) VALUES (
    v_company_id,
    'Analista de Dados (encerrada)',
    'analista-dados-encerrada',
    'closed', 1, CURRENT_DATE - 3, FALSE,
    '<p>Vaga encerrada (demo).</p>',
    '8000.00', '12000.00', FALSE
  ) RETURNING id INTO v_vac_closed;

  SELECT id INTO v_def_id FROM ae_definitions WHERE LOWER(slug) = 'motivators' AND active = TRUE LIMIT 1;
  SELECT id INTO v_area_id FROM areas WHERE key = 'tecnologia' LIMIT 1;
  IF v_area_id IS NULL THEN SELECT id INTO v_area_id FROM areas ORDER BY id LIMIT 1; END IF;

  -- ---- Colaboradores T1–T3 (SQL enxuto; JS cria T1–T9) ----
  -- T1 Ana
  INSERT INTO candidates (
    company_id, full_name, email, phone, linkedin_url, city, state,
    availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
  ) VALUES (
    v_company_id, 'Ana Clara Mendes', 'ana@todos-os-dados.demo', '+55 11 99100-1001',
    'https://linkedin.com/in/ana-todosdados', 'São Paulo', 'SP',
    'immediate', 'referral', NOW() - INTERVAL '40 days', 'employee',
    NOW() - INTERVAL '100 days', '2026-02-01',
    '<p>Colaboradora T1 — compliance.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, pipeline_stage,
    hired_at, start_date, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 1,
    '{"1":28,"2":12,"3":14,"4":11,"5":16,"6":18,"7":9,"8":13,"9":10}'::jsonb,
    'demo_todos_os_dados', 'hired',
    NOW() - INTERVAL '100 days', '2026-02-01', 210000, NOW() - INTERVAL '110 days'
  ) RETURNING id INTO v_ass_id;

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days',
      '{"reconhecimento":40,"financeiro":45,"crescimento":55,"desenvolvimento":78,"autonomia":50,"flexibilidade":48,"proposito":82,"relacionamentos":52,"seguranca":90,"lideranca":35,"desafio":44,"criatividade":30,"equilibrio":60}'::jsonb,
      '["seguranca","proposito","desenvolvimento","crescimento","equilibrio","relacionamentos","autonomia","flexibilidade","financeiro","desafio","reconhecimento","lideranca","criatividade"]'::jsonb,
      'Demo: segurança e propósito.',
      'ae-scoring-v2'
    ) RETURNING id INTO v_attempt_id;
  END IF;

  INSERT INTO one_on_ones (company_id, candidate_id, meeting_date, notes, next_steps, created_by_user_id)
  VALUES (
    v_company_id, v_cand_id, CURRENT_DATE - 5,
    '<p>1:1 Ana — prioridades do trimestre.</p>',
    '<p>Revisitar em 2 semanas.</p>',
    v_hr_id
  );

  -- T5 Elena (Equipe + notificação)
  INSERT INTO candidates (
    company_id, full_name, email, phone, city, state,
    availability, source, consent_at, employment_status, hired_at, start_date, hr_notes
  ) VALUES (
    v_company_id, 'Elena Ferreira', 'elena@todos-os-dados.demo', '+55 11 99100-1005',
    'São Paulo', 'SP', 'immediate', 'referral', NOW() - INTERVAL '40 days', 'employee',
    NOW() - INTERVAL '100 days', '2026-02-01',
    '<p>Staff eng — T5.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, pipeline_stage,
    hired_at, start_date, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 5,
    '{"1":17,"2":10,"3":12,"4":14,"5":29,"6":19,"7":9,"8":13,"9":11}'::jsonb,
    'demo_todos_os_dados', 'hired',
    NOW() - INTERVAL '100 days', '2026-02-01', 220000, NOW() - INTERVAL '108 days'
  ) RETURNING id INTO v_ass_id;

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days',
      '{"reconhecimento":35,"financeiro":40,"crescimento":80,"desenvolvimento":70,"autonomia":92,"flexibilidade":55,"proposito":48,"relacionamentos":38,"seguranca":60,"lideranca":42,"desafio":85,"criatividade":50,"equilibrio":45}'::jsonb,
      '["autonomia","desafio","crescimento","desenvolvimento","seguranca","flexibilidade","criatividade","proposito","equilibrio","lideranca","financeiro","relacionamentos","reconhecimento"]'::jsonb,
      'Demo: autonomia e desafio.',
      'ae-scoring-v2'
    );
  END IF;

  -- Candidato Pedro (screening + shortlist /r)
  INSERT INTO candidates (
    company_id, full_name, email, phone, linkedin_url, city, state,
    salary_expectation, availability, source, consent_at, employment_status, hr_notes
  ) VALUES (
    v_company_id, 'Pedro Henrique Santos', 'pedro@todos-os-dados.demo', '+55 11 99200-2001',
    'https://linkedin.com/in/pedro-todosdados', 'São Paulo', 'SP',
    '18500.00', '30_days', 'linkedin', NOW() - INTERVAL '10 days', 'candidate',
    '<p>Candidato screening — shortlist.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 5,
    '{"1":15,"2":11,"3":13,"4":12,"5":27,"6":18,"7":10,"8":14,"9":9}'::jsonb,
    'demo_todos_os_dados', v_vac_open, 'screening', 205000, NOW() - INTERVAL '8 days'
  ) RETURNING id INTO v_ass_id;

  INSERT INTO vacancy_candidates (
    vacancy_id, candidate_id, company_id, interview_notes, pipeline_stage, created_by_user_id
  ) VALUES (
    v_vac_open, v_cand_id, v_company_id,
    $html$
<p><strong>Entrevista 1 (screening) — 13/08.</strong></p>
<ul>
<li>Stack: Node, React, Postgres; falou com clareza de índices e N+1.</li>
<li>Case: migração de conciliação com idempotência; perguntou trade-offs.</li>
<li>Fit cultural: perfil analítico (T5); gosta de aprofundar antes de commit.</li>
</ul>
<p><strong>Pontos positivos:</strong> raciocínio estruturado, curiosidade técnica, pretensão alinhada (R$ 18,5k).</p>
<p><strong>Atenção:</strong> pode alongar análise — explorar ritmo de sprint com o time do cliente.</p>
<p><strong>Próximo passo:</strong> avançar para entrevista técnica com o cliente.</p>
$html$,
    'screening', v_hr_id
  ) RETURNING id INTO v_vc_id;

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days',
      '{"reconhecimento":40,"financeiro":55,"crescimento":82,"desenvolvimento":68,"autonomia":90,"flexibilidade":60,"proposito":45,"relacionamentos":40,"seguranca":50,"lideranca":38,"desafio":85,"criatividade":48,"equilibrio":42}'::jsonb,
      '["autonomia","desafio","crescimento","desenvolvimento","flexibilidade","financeiro","seguranca","criatividade","proposito","equilibrio","reconhecimento","relacionamentos","lideranca"]'::jsonb,
      'Demo candidato: autonomia e desafio.',
      'ae-scoring-v2'
    ) RETURNING id INTO v_attempt_id;
  END IF;

  -- Marina interview + motivadores (shortlist /r “discuss”)
  INSERT INTO candidates (
    company_id, full_name, email, phone, city, state,
    salary_expectation, availability, source, consent_at, employment_status, hr_notes
  ) VALUES (
    v_company_id, 'Marina Duarte', 'marina@todos-os-dados.demo', '+55 41 99200-2002',
    'Curitiba', 'PR', '17000.00', '15_days', 'referral', NOW() - INTERVAL '6 days', 'candidate',
    '<p>Entrevista em andamento — shortlist “conversar”.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 3,
    '{"1":12,"2":14,"3":26,"4":11,"5":13,"6":10,"7":16,"8":15,"9":9}'::jsonb,
    'demo_todos_os_dados', v_vac_open, 'interview', 160000, NOW() - INTERVAL '5 days'
  );

  INSERT INTO vacancy_candidates (
    vacancy_id, candidate_id, company_id, interview_notes, pipeline_stage, created_by_user_id
  ) VALUES (
    v_vac_open, v_cand_id, v_company_id,
    $html$
<p><strong>Entrevista 1 — 15/08 (agendada / em andamento).</strong></p>
<ul>
<li>Indicação interna; disponibilidade em até 15 dias.</li>
<li>Perfil executor (T3): foco em entrega e meta.</li>
<li>Experiência em produto digital; menos profundidade em SQL avançado.</li>
</ul>
<p><strong>Pontos positivos:</strong> comunicação objetiva, energia de entrega, pretensão R$ 17k ok.</p>
<p><strong>Atenção:</strong> validar se prioriza velocidade sobre processo/documentação.</p>
<p><strong>Próximo passo:</strong> concluir entrevista e decidir se entra na shortlist “conversar”.</p>
$html$,
    'interview', v_hr_id
  );

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days',
      '{"reconhecimento":88,"financeiro":52,"crescimento":82,"desenvolvimento":60,"autonomia":48,"flexibilidade":55,"proposito":42,"relacionamentos":50,"seguranca":40,"lideranca":58,"desafio":76,"criatividade":45,"equilibrio":38}'::jsonb,
      '["reconhecimento","crescimento","desafio","lideranca","desenvolvimento","flexibilidade","financeiro","relacionamentos","autonomia","criatividade","proposito","seguranca","equilibrio"]'::jsonb,
      'Demo Marina: reconhecimento, crescimento e desafio.',
      'ae-scoring-v2'
    );
  END IF;

  -- Gustavo rejected
  INSERT INTO candidates (
    company_id, full_name, email, phone, city, state,
    availability, source, consent_at, employment_status, hr_notes
  ) VALUES (
    v_company_id, 'Gustavo Pires', 'gustavo@todos-os-dados.demo', '+55 11 99200-2003',
    'São Paulo', 'SP', 'immediate', 'job_board', NOW() - INTERVAL '15 days', 'candidate',
    '<p>Reprovado — skill_gap.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, rejection_reason, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 6,
    '{"1":14,"2":12,"3":11,"4":10,"5":15,"6":25,"7":9,"8":13,"9":12}'::jsonb,
    'demo_todos_os_dados', v_vac_open, 'rejected', 'skill_gap', 170000, NOW() - INTERVAL '12 days'
  );

  INSERT INTO vacancy_candidates (
    vacancy_id, candidate_id, company_id, interview_notes, pipeline_stage,
    rejection_reason, created_by_user_id
  ) VALUES (
    v_vac_open, v_cand_id, v_company_id,
    $html$
<p><strong>Entrevista 1 — 08/08.</strong></p>
<ul>
<li>Portal de vagas; disponibilidade imediata.</li>
<li>Perfil T6 — cauteloso; boa postura, porém gaps em settlement e filas.</li>
<li>Exercício técnico: dificuldade em modelar idempotência e retry.</li>
</ul>
<p><strong>Decisão:</strong> reprovado por <em>skill_gap</em> (fit técnico insuficiente para a vaga).</p>
<p><strong>Feedback interno:</strong> candidato educado; possível banco para vagas mais operacionais no futuro.</p>
$html$,
    'rejected', 'skill_gap', v_hr_id
  );

  -- Nina — convites abertos
  INSERT INTO candidates (
    company_id, full_name, email, phone, city, state,
    availability, source, consent_at, employment_status, hr_notes
  ) VALUES (
    v_company_id, 'Nina Barbosa', 'nina@todos-os-dados.demo', '+55 61 99200-2006',
    'Brasília', 'DF', 'immediate', 'other', NOW() - INTERVAL '2 days', 'candidate',
    '<p>Aguardando eneagrama + motivadores.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 2,
    '{"1":14,"2":26,"3":15,"4":12,"5":11,"6":16,"7":13,"8":10,"9":17}'::jsonb,
    'demo_todos_os_dados', v_vac_open, 'new', 140000, NOW() - INTERVAL '2 days'
  );

  INSERT INTO vacancy_candidates (
    vacancy_id, candidate_id, company_id, interview_notes, pipeline_stage, created_by_user_id
  ) VALUES (
    v_vac_open, v_cand_id, v_company_id,
    $html$
<p><strong>Pré-cadastro / screening inicial — 19/08.</strong></p>
<ul>
<li>Contato frio (fonte: outro); disponibilidade imediata.</li>
<li>Perfil T2 — colaborativo; ainda sem Motivadores respondidos.</li>
<li>Convite de Eneagrama: <strong>enviado</strong>; aguardando abertura do link.</li>
</ul>
<p><strong>Notas da call rápida (15 min):</strong> interesse genuíno na vaga; experiência mid em front; backend mais raso.</p>
<p><strong>Próximo passo:</strong> aguardar conclusão do teste + enviar Motivadores; só então marcar entrevista estruturada.</p>
$html$,
    'new', v_hr_id
  );

  INSERT INTO candidate_invites (
    vacancy_id, company_id, candidate_name, candidate_email, token, status,
    sent_at, candidate_id, created_by_user_id
  ) VALUES (
    v_vac_open, v_company_id, 'Nina Barbosa', 'nina@todos-os-dados.demo',
    v_invite_tok, 'sent', NOW() - INTERVAL '2 days', v_cand_id, v_hr_id
  );

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_invites (
      definition_id, company_id, candidate_id, candidate_name, candidate_email,
      token, status, expires_at, created_by_user_id
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, 'Nina Barbosa', 'nina@todos-os-dados.demo',
      v_ae_tok, 'sent', NOW() + INTERVAL '30 days', v_hr_id
    );
  END IF;

  -- Lara (approved) — shortlist /r “advance”
  INSERT INTO candidates (
    company_id, full_name, email, phone, city, state,
    salary_expectation, availability, source, consent_at, employment_status, hr_notes
  ) VALUES (
    v_company_id, 'Lara Mendonça', 'lara@todos-os-dados.demo', '+55 48 99200-2004',
    'Florianópolis', 'SC', '19000.00', '30_days', 'agency', NOW() - INTERVAL '18 days', 'candidate',
    '<p>Aprovada internamente — shortlist “avançar”.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 1,
    '{"1":28,"2":12,"3":14,"4":11,"5":16,"6":18,"7":9,"8":13,"9":10}'::jsonb,
    'demo_todos_os_dados', v_vac_open, 'approved', 195000, NOW() - INTERVAL '14 days'
  );

  INSERT INTO vacancy_candidates (
    vacancy_id, candidate_id, company_id, interview_notes, pipeline_stage, created_by_user_id
  ) VALUES (
    v_vac_open, v_cand_id, v_company_id,
    $html$
<p><strong>Entrevista 1 + 2 — triagem e aprovação interna.</strong></p>
<ul>
<li>Agência; pretensão R$ 19k; disponibilidade 30 dias.</li>
<li>Perfil T1 — qualidade e processo; excelente para compliance de plataforma.</li>
<li>Case: revisão de PR e checklist de release; documentação clara.</li>
</ul>
<p><strong>Pontos positivos:</strong> disciplina, alinhamento à rubrica (T1), maturidade de entrega.</p>
<p><strong>Atenção:</strong> pode travar com times muito “atalho” — explorar no cliente.</p>
<p><strong>Status:</strong> aprovada internamente; pronta para shortlist do relatório ao cliente.</p>
$html$,
    'approved', v_hr_id
  );

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days',
      '{"reconhecimento":42,"financeiro":48,"crescimento":62,"desenvolvimento":86,"autonomia":55,"flexibilidade":50,"proposito":90,"relacionamentos":58,"seguranca":84,"lideranca":40,"desafio":52,"criatividade":36,"equilibrio":70}'::jsonb,
      '["proposito","desenvolvimento","seguranca","equilibrio","crescimento","relacionamentos","autonomia","desafio","flexibilidade","financeiro","reconhecimento","lideranca","criatividade"]'::jsonb,
      'Demo Lara: propósito, desenvolvimento e segurança.',
      'ae-scoring-v2'
    );
  END IF;

  -- Otávio (test_completed) — banco interno (fora do /r)
  INSERT INTO candidates (
    company_id, full_name, email, phone, city, state,
    salary_expectation, availability, source, consent_at, employment_status, hr_notes
  ) VALUES (
    v_company_id, 'Otávio Ribeiro', 'otavio@todos-os-dados.demo', '+55 81 99200-2005',
    'Recife', 'PE', '15500.00', '60_days', 'linkedin', NOW() - INTERVAL '9 days', 'candidate',
    '<p>Teste ok — banco por timing/aderência.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 7,
    '{"1":11,"2":13,"3":15,"4":12,"5":14,"6":10,"7":27,"8":16,"9":9}'::jsonb,
    'demo_todos_os_dados', v_vac_open, 'test_completed', 175000, NOW() - INTERVAL '7 days'
  );

  INSERT INTO vacancy_candidates (
    vacancy_id, candidate_id, company_id, interview_notes, pipeline_stage, created_by_user_id
  ) VALUES (
    v_vac_open, v_cand_id, v_company_id,
    $html$
<p><strong>Pós-teste (test_completed) — 16/08.</strong></p>
<ul>
<li>LinkedIn; Recife; disponibilidade 60 dias (mais longo).</li>
<li>Perfil T7 — exploração e ritmo; teste ok, entrevista ainda não marcada.</li>
<li>Motivadores: flexibilidade / criatividade / crescimento.</li>
</ul>
<p><strong>Leitura:</strong> banco por ora — timing de disponibilidade e menor aderência à rubrica (T5/T1/T6).</p>
<p><strong>Próximo passo:</strong> manter em banco; reavaliar se a shortlist principal não fechar.</p>
$html$,
    'test_completed', v_hr_id
  );

  IF v_def_id IS NOT NULL THEN
    INSERT INTO ae_attempts (
      definition_id, company_id, candidate_id, area_id, status, started_at, completed_at,
      dimension_scores, ranking, profile_summary, algorithm_version
    ) VALUES (
      v_def_id, v_company_id, v_cand_id, v_area_id, 'completed',
      NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days',
      '{"reconhecimento":50,"financeiro":45,"crescimento":80,"desenvolvimento":55,"autonomia":62,"flexibilidade":90,"proposito":48,"relacionamentos":52,"seguranca":40,"lideranca":44,"desafio":70,"criatividade":85,"equilibrio":58}'::jsonb,
      '["flexibilidade","criatividade","crescimento","desafio","autonomia","equilibrio","desenvolvimento","relacionamentos","reconhecimento","proposito","financeiro","lideranca","seguranca"]'::jsonb,
      'Demo Otávio: flexibilidade e criatividade.',
      'ae-scoring-v2'
    );
  END IF;

  -- Ricardo (archived)
  INSERT INTO candidates (
    company_id, full_name, email, phone, city, state,
    salary_expectation, availability, source, consent_at, employment_status, hr_notes
  ) VALUES (
    v_company_id, 'Ricardo Alves', 'ricardo@todos-os-dados.demo', '+55 11 99200-2007',
    'São Paulo', 'SP', '21000.00', 'other', 'referral', NOW() - INTERVAL '25 days', 'candidate',
    '<p>Arquivado — senioridade/salário fora do escopo.</p>'
  ) RETURNING id INTO v_cand_id;

  INSERT INTO assessments (
    candidate_id, company_id, area_id, top_type, scores, source, vacancy_id,
    pipeline_stage, fill_duration_ms, created_at
  ) VALUES (
    v_cand_id, v_company_id, v_area_id, 8,
    '{"1":13,"2":10,"3":14,"4":11,"5":15,"6":12,"7":16,"8":28,"9":9}'::jsonb,
    'demo_todos_os_dados', v_vac_open, 'archived', 180000, NOW() - INTERVAL '22 days'
  );

  INSERT INTO vacancy_candidates (
    vacancy_id, candidate_id, company_id, interview_notes, pipeline_stage, created_by_user_id
  ) VALUES (
    v_vac_open, v_cand_id, v_company_id,
    $html$
<p><strong>Processo encerrado (arquivado) — 01/08.</strong></p>
<ul>
<li>Indicação; pretensão acima do teto da vaga (R$ 21k).</li>
<li>Perfil T8 — liderança forte; excesso de seniority para a abertura atual.</li>
</ul>
<p><strong>Motivo do arquivo:</strong> desalinhamento de escopo/senioridade e expectativa salarial.</p>
<p><strong>Nota:</strong> não reabrir nesta vaga; eventual fit em papel de tech lead futuro.</p>
$html$,
    'archived', v_hr_id
  );

  -- Relatório /r completo (shortlist: Pedro + Lara advance, Marina discuss)
  INSERT INTO vacancy_report_shares (
    vacancy_id, company_id, token, title, executive_note, snapshot,
    active, expires_at, created_by_user_id
  ) VALUES (
    v_vac_open, v_company_id, v_report_tok,
    'Shortlist — Fullstack Plataforma',
    $html$
<p><strong>Quem avançar:</strong> Pedro Henrique Santos (T5, fit ~7,4) e Lara Mendonça (T1, fit ~6,9) — aderência à rubrica (análise + processo) e maturidade de entrega.</p>
<p><strong>Por quê (fit / contexto da vaga):</strong> A vaga Engenheiro(a) Fullstack — Plataforma prioriza T5/T1/T6. Pedro lidera em perfil investigativo; Lara complementa com disciplina de qualidade. Marina Duarte (T3, fit ~5,2) fica em conversar: boa execução, validar ritmo vs processo.</p>
<p><strong>Alertas / pontos a explorar na entrevista:</strong> Pedro — profundidade sem travar o sprint. Lara — colaboração com times mais “atalho”. Marina — decisão sob pressão e documentação.</p>
<p><strong>Próximo passo sugerido:</strong> Agendar entrevistas técnicas com o time do cliente para Pedro e Lara; segunda passagem com Marina se houver capacidade. Gustavo permanece fora (gap técnico); Otávio em banco interno.</p>
$html$,
    jsonb_build_object(
      'generatedAt', NOW(),
      'vacancy', jsonb_build_object(
        'id', v_vac_open,
        'title', 'Engenheiro(a) Fullstack — Plataforma',
        'companyName', 'Todos os Dados',
        'positionsCount', 2,
        'status', 'open',
        'description',
          '<p><strong>Missão:</strong> evoluir o produto 30Team (Next.js + Postgres) com qualidade e previsibilidade.</p><ul><li>React / Node em produto multi-tenant</li><li>SQL, índices e performance em listagens</li><li>Cultura de entrega com revisão e documentação</li></ul>'
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
        'notes', 'Priorizar T5/T1/T6 (análise + processo). T3 como executor complementar.'
      ),
      'executiveNote',
        '<p><strong>Quem avançar:</strong> Pedro Henrique Santos (T5, fit ~7,4) e Lara Mendonça (T1, fit ~6,9) — aderência à rubrica (análise + processo) e maturidade de entrega.</p><p><strong>Por quê (fit / contexto da vaga):</strong> A vaga Engenheiro(a) Fullstack — Plataforma prioriza T5/T1/T6. Pedro lidera em perfil investigativo; Lara complementa com disciplina de qualidade. Marina Duarte (T3, fit ~5,2) fica em conversar: boa execução, validar ritmo vs processo.</p><p><strong>Alertas / pontos a explorar na entrevista:</strong> Pedro — profundidade sem travar o sprint. Lara — colaboração com times mais “atalho”. Marina — decisão sob pressão e documentação.</p><p><strong>Próximo passo sugerido:</strong> Agendar entrevistas técnicas com o time do cliente para Pedro e Lara; segunda passagem com Marina se houver capacidade. Gustavo permanece fora (gap técnico); Otávio em banco interno.</p>',
      'candidates', jsonb_build_array(
        jsonb_build_object(
          'name', 'Pedro Henrique Santos',
          'topType', 5,
          'scores', '{"1":15,"2":11,"3":13,"4":12,"5":27,"6":18,"7":10,"8":14,"9":9}'::jsonb,
          'pipelineStage', 'screening',
          'recommendation', 'advance',
          'why', 'Forte aderência analítica à rubrica da vaga; stack e cases alinhados à plataforma.',
          'watchOut', 'Pode demorar demais em análise antes de entregar.',
          'interviewProbe', 'Como equilibra profundidade técnica com prazo de sprint?',
          'consultantNote', NULL,
          'city', 'São Paulo',
          'state', 'SP',
          'salaryExpectation', '18500.00',
          'availability', '30_days',
          'areaLabel', 'Tecnologia',
          'vacancyFitScore010', 7.4,
          'vacancyFitLabel', 'medium',
          'fitAlignedTypes', jsonb_build_array(5, 1, 6),
          'fitGapTypes', jsonb_build_array(3),
          'motivatorsTop', jsonb_build_array(
            jsonb_build_object('key', 'autonomia', 'label', 'Autonomia', 'score', 90),
            jsonb_build_object('key', 'desafio', 'label', 'Desafio', 'score', 85),
            jsonb_build_object('key', 'crescimento', 'label', 'Crescimento', 'score', 82)
          )
        ),
        jsonb_build_object(
          'name', 'Lara Mendonça',
          'topType', 1,
          'scores', '{"1":28,"2":12,"3":14,"4":11,"5":16,"6":18,"7":9,"8":13,"9":10}'::jsonb,
          'pipelineStage', 'approved',
          'recommendation', 'advance',
          'why', 'Processo + qualidade; boa para compliance e previsibilidade da plataforma.',
          'watchOut', 'Pode travar se o time for muito “atalho”.',
          'interviewProbe', 'Como documenta decisões técnicas?',
          'consultantNote', NULL,
          'city', 'Florianópolis',
          'state', 'SC',
          'salaryExpectation', '19000.00',
          'availability', '30_days',
          'areaLabel', 'Tecnologia',
          'vacancyFitScore010', 6.9,
          'vacancyFitLabel', 'medium',
          'fitAlignedTypes', jsonb_build_array(5, 1, 6),
          'fitGapTypes', jsonb_build_array(3),
          'motivatorsTop', jsonb_build_array(
            jsonb_build_object('key', 'proposito', 'label', 'Propósito', 'score', 90),
            jsonb_build_object('key', 'desenvolvimento', 'label', 'Desenvolvimento', 'score', 86),
            jsonb_build_object('key', 'seguranca', 'label', 'Segurança', 'score', 84)
          )
        ),
        jsonb_build_object(
          'name', 'Marina Duarte',
          'topType', 3,
          'scores', '{"1":12,"2":14,"3":26,"4":11,"5":13,"6":10,"7":16,"8":15,"9":9}'::jsonb,
          'pipelineStage', 'interview',
          'recommendation', 'discuss',
          'why', 'Execução rápida; bom para ritmo de entrega — validar processo.',
          'watchOut', 'Pode priorizar velocidade sobre processo.',
          'interviewProbe', 'Conte um caso em que revisou uma decisão sob pressão.',
          'consultantNote', NULL,
          'city', 'Curitiba',
          'state', 'PR',
          'salaryExpectation', '17000.00',
          'availability', '15_days',
          'areaLabel', 'Tecnologia',
          'vacancyFitScore010', 5.2,
          'vacancyFitLabel', 'medium',
          'fitAlignedTypes', jsonb_build_array(3),
          'fitGapTypes', jsonb_build_array(5, 1),
          'motivatorsTop', jsonb_build_array(
            jsonb_build_object('key', 'reconhecimento', 'label', 'Reconhecimento', 'score', 88),
            jsonb_build_object('key', 'crescimento', 'label', 'Crescimento', 'score', 82),
            jsonb_build_object('key', 'desafio', 'label', 'Desafio', 'score', 76)
          )
        )
      )
    ),
    TRUE, NOW() + INTERVAL '30 days', v_hr_id
  );

  -- Notificações
  INSERT INTO manager_notifications (
    company_id, recipient_user_id, type, payload, entity_type, entity_id, created_at
  ) VALUES (
    v_company_id, v_hr_id, 'enneagram_completed',
    jsonb_build_object(
      'candidateId', (SELECT id FROM candidates WHERE email = 'pedro@todos-os-dados.demo'),
      'candidateName', 'Pedro Henrique Santos',
      'topType', 5,
      'vacancyId', v_vac_open
    ),
    'candidate',
    (SELECT id FROM candidates WHERE email = 'pedro@todos-os-dados.demo'),
    NOW() - INTERVAL '3 hours'
  );

  IF v_attempt_id IS NOT NULL THEN
    INSERT INTO manager_notifications (
      company_id, recipient_user_id, type, payload, entity_type, entity_id, created_at
    ) VALUES (
      v_company_id, v_hr_id, 'motivators_completed',
      jsonb_build_object(
        'candidateId', (SELECT id FROM candidates WHERE email = 'pedro@todos-os-dados.demo'),
        'attemptId', v_attempt_id,
        'candidateName', 'Pedro Henrique Santos'
      ),
      'candidate',
      (SELECT id FROM candidates WHERE email = 'pedro@todos-os-dados.demo'),
      NOW() - INTERVAL '2 hours'
    );
  END IF;

  INSERT INTO manager_notifications (
    company_id, recipient_user_id, type, payload, entity_type, entity_id, dedupe_key, created_at
  ) VALUES
    (
      v_company_id, v_hr_id, 'vacancy_deadline_approaching',
      jsonb_build_object(
        'vacancyId', v_vac_open,
        'vacancyTitle', 'Engenheiro(a) Fullstack — Plataforma',
        'targetDate', (CURRENT_DATE + 21)::text
      ),
      'vacancy', v_vac_open, 'vacancy_deadline:' || v_vac_open || ':open',
      NOW() - INTERVAL '1 hour'
    ),
    (
      v_company_id, v_hr_id, 'vacancy_closed',
      jsonb_build_object(
        'vacancyId', v_vac_closed,
        'vacancyTitle', 'Analista de Dados (encerrada)'
      ),
      'vacancy', v_vac_closed, 'vacancy_closed:' || v_vac_closed,
      NOW() - INTERVAL '30 minutes'
    ),
    (
      v_company_id, v_dir_id, 'vacancy_deadline_approaching',
      jsonb_build_object(
        'vacancyId', v_vac_open,
        'vacancyTitle', 'Engenheiro(a) Fullstack — Plataforma',
        'targetDate', (CURRENT_DATE + 21)::text
      ),
      'vacancy', v_vac_open, 'vacancy_deadline:' || v_vac_open || ':open',
      NOW() - INTERVAL '50 minutes'
    );

  RAISE NOTICE 'OK Todos os Dados id=% hr=% direction=%', v_company_id, v_hr_id, v_dir_id;
  RAISE NOTICE 'Login: hr@todos-os-dados.demo / DemoTodosDados!2026';
  RAISE NOTICE 'Links: /t/%  /v/%  /r/%', v_company_tok, v_vacancy_tok, v_report_tok;
END;
$tod$;

COMMIT;

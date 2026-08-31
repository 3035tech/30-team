/**
 * Demo "Todos os Dados" — módulos pós-080 para todos os colaboradores.
 * Chamado pelo seed principal (JS). Também pode rodar sozinho se o tenant já existir.
 *
 * Cobre: DP leve, mural/kudos, ouvidoria, feedback contínuo, OKR ciclos,
 * banco de horas, LMS quiz/watch/trilha, prep de entrevista, organograma,
 * convites pessoais de clima/pulso, notificações novas.
 */

import crypto from 'node:crypto';
import { EMPLOYMENT_STATUS } from '../lib/domain-status.js';
import { DEFAULT_PRE_ONBOARDING_TEMPLATE } from '../lib/people/pre-onboarding-constants.js';

export const MODULE_TOK = Object.freeze({
  whistle: 'w1w1todosdadose5f60718293a4b5c6d7e8f0b',
  prepPedro: 'pr01todosdadose5f60718293a4b5c6d7e8f0c',
  prepMarina: 'pr02todosdadose5f60718293a4b5c6d7e8f0d',
  feedbackPend: 'fb01todosdadose5f60718293a4b5c6d7e8f0e',
  feedbackDone: 'fb02todosdadose5f60718293a4b5c6d7e8f0f',
});

const LEAVE_TYPES = [
  'vacation',
  'sick',
  'parental',
  'bereavement',
  'marriage',
  'medical_appointment',
  'compensatory',
  'unpaid',
  'other',
];
const LEAVE_STATUSES = ['taken', 'approved', 'requested', 'approved', 'taken'];

async function q(client, sql, params = []) {
  try {
    return await client.query(sql, params);
  } catch (err) {
    if (err && (err.code === '42P01' || err.code === '42703')) {
      return { rows: [], rowCount: 0, skipped: true };
    }
    throw err;
  }
}

function demoCpf(i) {
  return `39012345${String(i + 1).padStart(3, '0')}`.slice(0, 11);
}

function tokenHex(n = 24) {
  return crypto.randomBytes(n).toString('hex');
}

/**
 * @param {import('pg').Client} client
 * @param {{ companyId: number, hrUserId: number, dirUserId?: number }} ctx
 */
export async function seedTodosOsDadosModules(client, ctx) {
  const companyId = Number(ctx.companyId);
  const hrUserId = Number(ctx.hrUserId);
  const dirUserId = Number(ctx.dirUserId) || hrUserId;
  if (!Number.isFinite(companyId) || !Number.isFinite(hrUserId)) return { ok: false };

  const empR = await q(
    client,
    `SELECT id, full_name AS "fullName", email, start_date AS "startDate"
       FROM candidates
      WHERE company_id = $1 AND employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
      ORDER BY id ASC`,
    [companyId]
  );
  const employees = empR.rows || [];
  if (!employees.length) return { ok: false, reason: 'no-employees' };

  const colaborador =
    employees.find((e) => String(e.email || '').toLowerCase().startsWith('colaborador@')) ||
    employees[0];

  const byName = (part) =>
    employees.find((e) => String(e.fullName || '').toLowerCase().includes(part));

  const hugo = byName('hugo') || employees[employees.length - 1];
  const ana = byName('ana clara') || employees[0];
  const elena = byName('elena') || employees[1];
  const bruno = byName('bruno') || employees[2];
  const joana = byName('joana') || employees[3];
  const fabio = byName('fábio') || byName('fabio') || employees[4];
  const diego = byName('diego') || employees[5];

  const jobRole = await q(
    client,
    `SELECT id FROM job_roles WHERE company_id = $1 AND active = TRUE ORDER BY id LIMIT 1`,
    [companyId]
  );
  const jobRoleId = jobRole.rows[0]?.id || null;

  const courseR = await q(
    client,
    `SELECT id FROM lms_courses WHERE company_id = $1 ORDER BY id LIMIT 1`,
    [companyId]
  );
  const courseId = courseR.rows[0]?.id || null;
  const lessonR = courseId
    ? await q(
        client,
        `SELECT id, content_kind AS "contentKind"
           FROM lms_lessons WHERE company_id = $1 AND course_id = $2
           ORDER BY sort_order ASC, id ASC`,
        [companyId, courseId]
      )
    : { rows: [] };
  const lessons = lessonR.rows || [];
  const ytLesson = lessons.find((l) => l.contentKind === 'youtube') || lessons[0];
  const pdfLesson = lessons.find((l) => l.contentKind === 'pdf') || lessons[1] || lessons[0];

  const vacR = await q(
    client,
    `SELECT id FROM vacancies
      WHERE company_id = $1 AND deleted = FALSE AND status = 'open'
      ORDER BY id LIMIT 1`,
    [companyId]
  );
  const vacancyOpenId = vacR.rows[0]?.id || null;

  const groupR = await q(
    client,
    `SELECT id FROM team_groups WHERE company_id = $1 ORDER BY id LIMIT 1`,
    [companyId]
  );
  const teamGroupId = groupR.rows[0]?.id || null;

  const surveyR = await q(
    client,
    `SELECT id FROM climate_surveys WHERE company_id = $1 ORDER BY id DESC LIMIT 1`,
    [companyId]
  );
  const surveyId = surveyR.rows[0]?.id || null;
  const qClimate = surveyId
    ? await q(
        client,
        `SELECT id, question_kind AS kind FROM climate_survey_questions
          WHERE survey_id = $1 ORDER BY sort_order ASC, id ASC`,
        [surveyId]
      )
    : { rows: [] };

  const pulseR = await q(
    client,
    `SELECT id FROM team_pulses WHERE company_id = $1 ORDER BY id DESC LIMIT 1`,
    [companyId]
  );
  const pulseId = pulseR.rows[0]?.id || null;
  const qPulse = pulseId
    ? await q(
        client,
        `SELECT id FROM team_pulse_questions WHERE pulse_id = $1 ORDER BY sort_order ASC LIMIT 1`,
        [pulseId]
      )
    : { rows: [] };

  const cycleR = await q(
    client,
    `SELECT id FROM performance_cycles WHERE company_id = $1 ORDER BY id DESC LIMIT 1`,
    [companyId]
  );
  const cycleId = cycleR.rows[0]?.id || null;

  // ── Organograma + cargo + prep 1:1 ──────────────────────────────────────
  if (jobRoleId) {
    await q(
      client,
      `UPDATE candidates SET job_role_id = $1
        WHERE company_id = $2 AND employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
          AND job_role_id IS NULL`,
      [jobRoleId, companyId]
    );
  }

  const managerPairs = [
    [elena?.id, colaborador?.id],
    [elena?.id, diego?.id],
    [ana?.id, bruno?.id],
    [ana?.id, joana?.id],
    [hugo?.id, fabio?.id],
  ];
  for (const [mgr, report] of managerPairs) {
    if (!mgr || !report || mgr === report) continue;
    await q(
      client,
      `UPDATE candidates SET manager_candidate_id = $1
        WHERE id = $2 AND company_id = $3 AND id <> $1`,
      [mgr, report, companyId]
    );
  }

  for (let i = 0; i < employees.length; i += 1) {
    const emp = employees[i];
    await q(
      client,
      `UPDATE candidates
          SET one_on_one_prep_at = NOW() - ($1 || ' days')::interval,
              one_on_one_prep_note = $2
        WHERE id = $3 AND company_id = $4
          AND (one_on_one_prep_note IS NULL OR one_on_one_prep_note = '')`,
      [
        String(1 + (i % 5)),
        `Prep 1:1 demo: ${emp.fullName.split(' ')[0]} quer alinhar prioridades e PDI.`,
        emp.id,
        companyId,
      ]
    );
  }

  // ── Template D1 da empresa ──────────────────────────────────────────────
  for (const row of DEFAULT_PRE_ONBOARDING_TEMPLATE) {
    await q(
      client,
      `INSERT INTO company_pre_onboarding_templates (
         company_id, item_key, label_pt, label_en, owner_role,
         sort_order, active, due_offset_days, require_meet
       ) VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,$8)
       ON CONFLICT (company_id, item_key) DO UPDATE SET
         label_pt = EXCLUDED.label_pt,
         label_en = EXCLUDED.label_en,
         owner_role = EXCLUDED.owner_role,
         sort_order = EXCLUDED.sort_order,
         require_meet = EXCLUDED.require_meet,
         updated_at = NOW()`,
      [
        companyId,
        row.itemKey,
        row.labelPt,
        row.labelEn,
        row.ownerRole,
        row.sortOrder,
        row.dueOffsetDays,
        row.requireMeet,
      ]
    );
  }

  await q(
    client,
    `UPDATE employee_pre_onboarding_items i
        SET owner_role = COALESCE(NULLIF(i.owner_role, ''), t.owner_role, 'rh'),
            label_snapshot = CASE
              WHEN i.label_snapshot = '' THEN COALESCE(t.label_pt, i.item_key)
              ELSE i.label_snapshot
            END,
            require_meet = COALESCE(t.require_meet, FALSE)
       FROM company_pre_onboarding_templates t
      WHERE i.company_id = $1 AND t.company_id = $1 AND t.item_key = i.item_key`,
    [companyId]
  );

  // ── DP leve (ficha, docs, férias, saldo) para TODOS ─────────────────────
  const dpDocs = ['id_document', 'contract', 'aso', 'address_proof', 'bank_data', 'dependents'];
  for (let i = 0; i < employees.length; i += 1) {
    const emp = employees[i];
    const first = emp.fullName.split(' ')[0];
    await q(
      client,
      `INSERT INTO candidate_dp_profiles (
         candidate_id, company_id, emergency_name, emergency_phone, emergency_relation,
         address_line, address_city, address_state, address_postal, cpf,
         internal_notes, updated_by_user_id
       ) VALUES ($1,$2,$3,$4,'cônjuge',$5,$6,$7,'01310-100',$8,$9,$10)
       ON CONFLICT (candidate_id) DO UPDATE SET
         emergency_name = EXCLUDED.emergency_name,
         cpf = EXCLUDED.cpf,
         updated_at = NOW()`,
      [
        emp.id,
        companyId,
        `Contato ${first}`,
        `+55 11 98888-${String(1000 + i).slice(-4)}`,
        `Rua Demo ${i + 10}, ${100 + i}`,
        emp.fullName.includes('Rio') ? 'Rio de Janeiro' : 'São Paulo',
        emp.fullName.includes('Rio') ? 'RJ' : 'SP',
        demoCpf(i),
        `Ficha DP demo de ${emp.fullName}.`,
        hrUserId,
      ]
    );

    await q(
      client,
      `INSERT INTO employee_leave_balances (
         candidate_id, company_id, entitlement_days, adjustment_days, notes, updated_by_user_id
       ) VALUES ($1,$2,30,$3,$4,$5)
       ON CONFLICT (candidate_id) DO UPDATE SET
         entitlement_days = EXCLUDED.entitlement_days,
         updated_at = NOW()`,
      [
        emp.id,
        companyId,
        i % 4 === 0 ? 2 : 0,
        'Saldo demo (30 dias BR).',
        hrUserId,
      ]
    );

    const leaveType = LEAVE_TYPES[i % LEAVE_TYPES.length];
    const leaveStatus = LEAVE_STATUSES[i % LEAVE_STATUSES.length];
    const startOff = 10 + (i % 20);
    const days = leaveType === 'vacation' ? 5 : leaveType === 'medical_appointment' ? 0 : 2;
    await q(
      client,
      `INSERT INTO employee_leave_requests (
         company_id, candidate_id, leave_type, status, starts_on, ends_on,
         reason, manager_notes, requested_by, decided_by_user_id, decided_at, created_by_user_id
       )
       SELECT $1,$2,$3,$4, CURRENT_DATE - $5::int, CURRENT_DATE - $5::int + $6::int,
              $7,$8,$9,$10,
              CASE WHEN $4 IN ('approved','taken','rejected') THEN NOW() - INTERVAL '2 days' ELSE NULL END,
              $11
        WHERE NOT EXISTS (
          SELECT 1 FROM employee_leave_requests
           WHERE candidate_id = $2 AND leave_type = $3 AND starts_on = CURRENT_DATE - $5::int
        )`,
      [
        companyId,
        emp.id,
        leaveType,
        leaveStatus,
        String(startOff),
        String(days),
        `Pedido demo (${leaveType}) de ${first}.`,
        leaveStatus === 'requested' ? '' : 'Ok para apresentação.',
        i % 2 === 0 ? 'employee' : 'manager',
        leaveStatus === 'requested' ? null : hrUserId,
        hrUserId,
      ]
    );

    for (let d = 0; d < dpDocs.length; d += 1) {
      const key = dpDocs[d];
      let status = 'received';
      let sig = 'none';
      let signedAt = null;
      let signerName = '';
      if (key === 'dependents' && i % 3 === 0) status = 'waived';
      if (key === 'aso' && i % 4 === 1) status = 'pending';
      if (key === 'contract') {
        if (emp.id === colaborador.id) {
          status = 'received';
          sig = 'signed';
          signedAt = new Date().toISOString();
          signerName = emp.fullName;
        } else if (i % 5 === 0) {
          sig = 'requested';
        }
      }
      await q(
        client,
        `INSERT INTO employee_dp_documents (
           company_id, candidate_id, doc_key, status, notes, file_name,
           signature_status, signed_at, signer_name, signature_consent_version,
           updated_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (candidate_id, doc_key) DO UPDATE SET
           status = EXCLUDED.status,
           signature_status = EXCLUDED.signature_status,
           updated_at = NOW()`,
        [
          companyId,
          emp.id,
          key,
          status,
          status === 'pending' ? 'Aguardando envio (demo).' : 'Documento demo.',
          status === 'pending' ? '' : `${key}-${emp.id}.pdf`,
          sig,
          signedAt,
          signerName,
          sig === 'signed' ? 'v1' : '',
          hrUserId,
        ]
      );
    }
  }

  // ── Mural + kudos ───────────────────────────────────────────────────────
  await q(
    client,
    `INSERT INTO company_posts (company_id, title, body_html, created_by_user_id)
     SELECT $1,$2,$3,$4
      WHERE NOT EXISTS (
        SELECT 1 FROM company_posts WHERE company_id = $1 AND title = $2 AND deleted = FALSE
      )`,
    [
      companyId,
      'Bem-vindos ao mural da Todos os Dados',
      '<p>Avisos da empresa e reconhecimentos entre colegas ficam neste mural.</p><p>Publique novidades curtas; o time vê no hub do colaborador.</p>',
      hrUserId,
    ]
  );
  await q(
    client,
    `INSERT INTO company_posts (company_id, title, body_html, created_by_user_id)
     SELECT $1,$2,$3,$4
      WHERE NOT EXISTS (
        SELECT 1 FROM company_posts WHERE company_id = $1 AND title = $2 AND deleted = FALSE
      )`,
    [
      companyId,
      'Ciclo de performance 2026-H1 está aberto',
      '<p>Metas e reviews do ciclo estão no painel. Qualquer dúvida, fale com o RH.</p>',
      hrUserId,
    ]
  );

  for (let i = 0; i < employees.length; i += 1) {
    const from = employees[i];
    const to = employees[(i + 1) % employees.length];
    if (from.id === to.id) continue;
    await q(
      client,
      `INSERT INTO company_kudos (company_id, from_candidate_id, to_candidate_id, message)
       SELECT $1,$2,$3,$4
        WHERE NOT EXISTS (
          SELECT 1 FROM company_kudos
           WHERE company_id = $1 AND from_candidate_id = $2 AND to_candidate_id = $3
             AND deleted = FALSE AND message = $4
        )`,
      [
        companyId,
        from.id,
        to.id,
        `Valeu, ${to.fullName.split(' ')[0]}: a entrega da sprint fez diferença no time.`,
      ]
    );
  }

  // ── Ouvidoria ───────────────────────────────────────────────────────────
  const ch = await q(
    client,
    `INSERT INTO whistleblowing_channels (
       company_id, title, token, due_days, active, created_by_user_id
     )
     SELECT $1,$2,$3,15,TRUE,$4
      WHERE NOT EXISTS (
        SELECT 1 FROM whistleblowing_channels WHERE company_id = $1 AND deleted = FALSE
      )
     RETURNING id`,
    [companyId, 'Canal de relatos (demo)', MODULE_TOK.whistle, hrUserId]
  );
  let channelId = ch.rows[0]?.id;
  if (!channelId) {
    const existing = await q(
      client,
      `SELECT id FROM whistleblowing_channels WHERE company_id = $1 AND deleted = FALSE ORDER BY id LIMIT 1`,
      [companyId]
    );
    channelId = existing.rows[0]?.id;
  }
  if (channelId) {
    const reports = [
      {
        category: 'ethics',
        status: 'new',
        body: 'Relato demo anônimo: há indícios de conflito de interesse em um processo de compra. Vale triagem do RH.',
        anonymous: true,
        reporter: null,
      },
      {
        category: 'safety',
        status: 'triaging',
        body: 'Relato demo: iluminação fraca no estacionamento no turno da noite. Pedido de avaliação de segurança.',
        anonymous: true,
        reporter: null,
      },
      {
        category: 'other',
        status: 'responded',
        body: 'Colaborador identificou ruído excessivo na sala de reunião. Já encaminhado para facilities (demo).',
        anonymous: false,
        reporter: colaborador.id,
      },
    ];
    for (const r of reports) {
      await q(
        client,
        `INSERT INTO whistleblowing_reports (
           company_id, channel_id, category, body, anonymous, reporter_candidate_id,
           status, due_at, triage_notes, response_notes, responded_at, responded_by_user_id
         )
         SELECT $1,$2,$3,$4,$5,$6::bigint,$7, NOW() + INTERVAL '12 days', $8, $9,
                CASE WHEN $7 IN ('responded','closed') THEN NOW() - INTERVAL '1 day' ELSE NULL END,
                CASE WHEN $7 IN ('responded','closed') THEN $10::bigint ELSE NULL END
          WHERE NOT EXISTS (
            SELECT 1 FROM whistleblowing_reports WHERE company_id = $1 AND body = $4
          )`,
        [
          companyId,
          channelId,
          r.category,
          r.body,
          r.anonymous,
          r.reporter,
          r.status,
          r.status === 'new' ? '' : 'Em triagem demo.',
          r.status === 'responded' ? 'Facilities avisada. Acompanhamento na próxima semana.' : '',
          hrUserId,
        ]
      );
    }
  }

  // ── Feedback contínuo ───────────────────────────────────────────────────
  if (elena && colaborador && elena.id !== colaborador.id) {
    await q(
      client,
      `INSERT INTO feedback_requests (
         company_id, subject_candidate_id, from_candidate_id, to_candidate_id,
         prompt, token, status, response_text, answered_at, expires_at
       )
       SELECT $1,$2,$3,$4,$5,$6,'answered',$7, NOW() - INTERVAL '2 days', NOW() + INTERVAL '20 days'
        WHERE NOT EXISTS (SELECT 1 FROM feedback_requests WHERE token = $6)`,
      [
        companyId,
        colaborador.id,
        elena.id,
        colaborador.id,
        'Como foi colaborar na última entrega da plataforma?',
        MODULE_TOK.feedbackDone,
        'Houve clareza no que precisava sair. Vale repetir o ritual de alinhamento semanal.',
      ]
    );
  }
  if (bruno && ana && bruno.id !== ana.id) {
    await q(
      client,
      `INSERT INTO feedback_requests (
         company_id, subject_candidate_id, from_candidate_id, to_candidate_id,
         prompt, token, status, expires_at
       )
       SELECT $1,$2,$3,$4,$5,$6,'pending', NOW() + INTERVAL '14 days'
        WHERE NOT EXISTS (SELECT 1 FROM feedback_requests WHERE token = $6)`,
      [
        companyId,
        ana.id,
        bruno.id,
        ana.id,
        'Pode comentar como foi o suporte na última semana?',
        MODULE_TOK.feedbackPend,
      ]
    );
  }
  for (let i = 0; i < employees.length; i += 1) {
    const from = employees[i];
    const to = employees[(i + 2) % employees.length];
    const subject = employees[(i + 1) % employees.length];
    if (from.id === to.id) continue;
    await q(
      client,
      `INSERT INTO feedback_requests (
         company_id, subject_candidate_id, from_candidate_id, to_candidate_id,
         prompt, token, status, expires_at
       )
       SELECT $1,$2,$3,$4,$5,$6,'pending', NOW() + INTERVAL '21 days'
        WHERE NOT EXISTS (
          SELECT 1 FROM feedback_requests
           WHERE company_id = $1 AND from_candidate_id = $3 AND to_candidate_id = $4
             AND subject_candidate_id = $2
        )`,
      [
        companyId,
        subject.id,
        from.id,
        to.id,
        `Ponto de vista sobre o trabalho com ${subject.fullName.split(' ')[0]} neste ciclo.`,
        tokenHex(16),
      ]
    );
  }

  // ── OKR ciclos (modelo operacional) ─────────────────────────────────────
  const okrCyc = await q(
    client,
    `INSERT INTO okr_cycles (
       company_id, title, starts_on, ends_on, status, created_by_user_id
     ) VALUES ($1,'Ciclo OKR 2026-H1', CURRENT_DATE - 45, CURRENT_DATE + 140, 'active', $2)
     RETURNING id`,
    [companyId, hrUserId]
  );
  const okrCycleId = okrCyc.rows[0]?.id;
  if (okrCycleId) {
    const areaPlat = await q(
      client,
      `INSERT INTO okr_areas (company_id, cycle_id, title, sort_order, team_group_id)
       VALUES ($1,$2,'Plataforma',0,$3) RETURNING id`,
      [companyId, okrCycleId, teamGroupId]
    );
    const areaGente = await q(
      client,
      `INSERT INTO okr_areas (company_id, cycle_id, title, sort_order)
       VALUES ($1,$2,'Gente e cultura',1) RETURNING id`,
      [companyId, okrCycleId]
    );
    const platId = areaPlat.rows[0]?.id;
    const genteId = areaGente.rows[0]?.id;
    const acts = [];
    if (platId) {
      const a1 = await q(
        client,
        `INSERT INTO okr_activities (
           company_id, area_id, title, progress_pct, deadline, sort_order, weight
         ) VALUES
           ($1,$2,'Reduzir tempo de build da pipeline',40, CURRENT_DATE + 20,0,3),
           ($1,$2,'Cobrir testes DTOV nos módulos novos',65, CURRENT_DATE + 10,1,2)
         RETURNING id, title`,
        [companyId, platId]
      );
      acts.push(...(a1.rows || []).map((r) => ({ ...r, area: 'plat' })));
    }
    if (genteId) {
      const a2 = await q(
        client,
        `INSERT INTO okr_activities (
           company_id, area_id, title, progress_pct, deadline, sort_order, weight
         ) VALUES
           ($1,$2,'Completar PDI ativo de todo o time',30, CURRENT_DATE + 35,0,2),
           ($1,$2,'Rodar pulso mensal com 80% de resposta',55, CURRENT_DATE + 15,1,1)
         RETURNING id, title`,
        [companyId, genteId]
      );
      acts.push(...(a2.rows || []).map((r) => ({ ...r, area: 'gente' })));
    }
    for (let i = 0; i < employees.length; i += 1) {
      const act = acts[i % Math.max(acts.length, 1)];
      if (!act?.id) continue;
      await q(
        client,
        `INSERT INTO okr_activity_assignees (
           company_id, activity_id, candidate_id, assigned_by_user_id
         ) VALUES ($1,$2,$3,$4)
         ON CONFLICT (activity_id, candidate_id) DO NOTHING`,
        [companyId, act.id, employees[i].id, hrUserId]
      );
    }
    for (let i = 0; i < acts.length; i += 1) {
      const act = acts[i];
      const assignee = employees[i % employees.length];
      await q(
        client,
        `INSERT INTO okr_activity_checkins (
           company_id, activity_id, progress_pct, note,
           created_by_user_id, created_by_candidate_id
         ) VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          companyId,
          act.id,
          20 + i * 15,
          `Check-in demo: ${act.title.slice(0, 80)}.`,
          i % 2 === 0 ? hrUserId : null,
          i % 2 === 0 ? null : assignee.id,
        ]
      );
    }
  }

  // ── Banco de horas + ponto para quem faltava ────────────────────────────
  await q(
    client,
    `UPDATE company_time_schedules
        SET hour_bank_enabled = TRUE, hour_bank_max_minutes = 2400, updated_at = NOW()
      WHERE company_id = $1`,
    [companyId]
  );
  for (let i = 0; i < employees.length; i += 1) {
    const emp = employees[i];
    const hasPunch = await q(
      client,
      `SELECT 1 FROM employee_time_punches WHERE company_id = $1 AND candidate_id = $2 LIMIT 1`,
      [companyId, emp.id]
    );
    if (!hasPunch.rowCount) {
      const late = i % 3 === 0;
      await q(
        client,
        `INSERT INTO employee_time_punches (
           company_id, candidate_id, punched_at, punch_kind, source, flag, review_status, notes
         ) VALUES
           ($1,$2, (CURRENT_DATE + TIME '${late ? '09:18' : '09:02'}') AT TIME ZONE 'America/Sao_Paulo',
            'in','web',$3,'none','Demo entrada'),
           ($1,$2, (CURRENT_DATE + TIME '12:02') AT TIME ZONE 'America/Sao_Paulo',
            'out','web',NULL,'ok','Almoço'),
           ($1,$2, (CURRENT_DATE + TIME '13:02') AT TIME ZONE 'America/Sao_Paulo',
            'in','web',NULL,'none',''),
           ($1,$2, (CURRENT_DATE + TIME '18:05') AT TIME ZONE 'America/Sao_Paulo',
            'out','web',NULL,'none','')`,
        [companyId, emp.id, late ? 'late' : null]
      );
    }
    await q(
      client,
      `INSERT INTO employee_hour_bank_entries (
         company_id, candidate_id, entry_kind, minutes, status, source, work_on,
         note, created_by_user_id
       )
       SELECT $1,$2,'credit',90,'approved','manual', CURRENT_DATE - 8,
              'Crédito demo (hora extra aprovada).', $3
        WHERE NOT EXISTS (
          SELECT 1 FROM employee_hour_bank_entries
           WHERE company_id = $1 AND candidate_id = $2 AND source = 'manual' AND entry_kind = 'credit'
        )`,
      [companyId, emp.id, hrUserId]
    );
    if (i % 3 === 0) {
      await q(
        client,
        `INSERT INTO employee_hour_bank_entries (
           company_id, candidate_id, entry_kind, minutes, status, source, work_on,
           note, created_by_candidate_id
         )
         SELECT $1,$2,'debit',60,'pending','employee', CURRENT_DATE + 2,
                'Compensar banco (pedido demo).', $2
          WHERE NOT EXISTS (
            SELECT 1 FROM employee_hour_bank_entries
             WHERE company_id = $1 AND candidate_id = $2 AND source = 'employee'
          )`,
        [companyId, emp.id]
      );
    }
  }

  // ── Compensação para quem faltava ───────────────────────────────────────
  for (let i = 0; i < employees.length; i += 1) {
    const emp = employees[i];
    const hasHire = await q(
      client,
      `SELECT 1 FROM employee_compensation_events
        WHERE company_id = $1 AND candidate_id = $2 AND event_type = 'hire' LIMIT 1`,
      [companyId, emp.id]
    );
    if (!hasHire.rowCount) {
      const base = 9000 + (i % 8) * 500;
      await q(
        client,
        `INSERT INTO employee_compensation_events (
           company_id, candidate_id, event_type, amount, effective_date, notes,
           created_by_user_id, approval_status
         ) VALUES ($1,$2,'hire',$3, CURRENT_DATE - 180, $4, $5, 'approved')`,
        [
          companyId,
          emp.id,
          `${base}.00`,
          `<p>Contratação CLT demo de ${emp.fullName}.</p>`,
          hrUserId,
        ]
      );
    }
  }

  // ── LMS: matrícula, quiz, watch, trilha do cargo ────────────────────────
  if (courseId && jobRoleId) {
    await q(
      client,
      `INSERT INTO lms_job_role_courses (
         company_id, job_role_id, course_id, sort_order, mandatory, due_offset_days
       ) VALUES ($1,$2,$3,0,TRUE,21)
       ON CONFLICT (job_role_id, course_id) DO NOTHING`,
      [companyId, jobRoleId, courseId]
    );
  }

  let quizQid = null;
  if (ytLesson?.id) {
    const qq = await q(
      client,
      `INSERT INTO lms_lesson_quiz_questions (
         company_id, lesson_id, prompt, choices, correct_choice_id, sort_order
       )
       SELECT $1,$2,$3,$4::jsonb,'a',0
        WHERE NOT EXISTS (
          SELECT 1 FROM lms_lesson_quiz_questions WHERE lesson_id = $2
        )
       RETURNING id`,
      [
        companyId,
        ytLesson.id,
        'Qual é o objetivo deste curso de onboarding?',
        JSON.stringify([
          { id: 'a', text: 'Alinhar cultura e uso do 30Team no dia a dia.' },
          { id: 'b', text: 'Substituir a entrevista técnica.' },
          { id: 'c', text: 'Fechar folha de pagamento.' },
        ]),
      ]
    );
    quizQid = qq.rows[0]?.id || null;
    if (!quizQid) {
      const existingQ = await q(
        client,
        `SELECT id FROM lms_lesson_quiz_questions WHERE lesson_id = $1 ORDER BY id LIMIT 1`,
        [ytLesson.id]
      );
      quizQid = existingQ.rows[0]?.id || null;
    }
  }

  if (courseId) {
    const cohortR = await q(
      client,
      `SELECT id FROM lms_cohorts WHERE company_id = $1 AND course_id = $2 ORDER BY id LIMIT 1`,
      [companyId, courseId]
    );
    const cohortId = cohortR.rows[0]?.id || null;
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const enr = await q(
        client,
        `INSERT INTO lms_enrollments (
           company_id, course_id, candidate_id, enrolled_by_user_id, cohort_id, due_date, mandatory
         ) VALUES ($1,$2,$3,$4,$5, CURRENT_DATE + 21, TRUE)
         ON CONFLICT (course_id, candidate_id) DO UPDATE SET due_date = EXCLUDED.due_date
         RETURNING id`,
        [companyId, courseId, emp.id, hrUserId, cohortId]
      );
      const enrollmentId = enr.rows[0]?.id;
      if (!enrollmentId) continue;
      if (ytLesson?.id) {
        await q(
          client,
          `INSERT INTO lms_lesson_watch_progress (
             company_id, enrollment_id, lesson_id, position_sec, duration_sec
           ) VALUES ($1,$2,$3,$4,212)
           ON CONFLICT (enrollment_id, lesson_id) DO UPDATE SET
             position_sec = EXCLUDED.position_sec, updated_at = NOW()`,
          [companyId, enrollmentId, ytLesson.id, 40 + (i % 5) * 20]
        );
      }
      if (quizQid && ytLesson?.id) {
        const passed = i % 2 === 0;
        await q(
          client,
          `INSERT INTO lms_lesson_quiz_attempts (
             company_id, enrollment_id, lesson_id, answers, correct_count, total_count, passed
           )
           SELECT $1,$2,$3,$4::jsonb,$5,1,$6
            WHERE NOT EXISTS (
              SELECT 1 FROM lms_lesson_quiz_attempts
               WHERE enrollment_id = $2 AND lesson_id = $3 AND passed = TRUE
            )`,
          [
            companyId,
            enrollmentId,
            ytLesson.id,
            JSON.stringify({ [quizQid]: passed ? 'a' : 'b' }),
            passed ? 1 : 0,
            passed,
          ]
        );
        if (passed && pdfLesson?.id) {
          await q(
            client,
            `INSERT INTO lms_lesson_completions (company_id, enrollment_id, lesson_id)
             VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [companyId, enrollmentId, ytLesson.id]
          );
        }
      }
    }
  }

  // ── Clima / pulso: convite pessoal para cada colaborador ────────────────
  if (surveyId) {
    const likert = qClimate.rows.find((x) => x.kind === 'likert');
    const textQ = qClimate.rows.find((x) => x.kind === 'text');
    const enps = qClimate.rows.find((x) => x.kind === 'enps');
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      if (emp.id === colaborador.id) continue;
      const used = i % 2 === 0;
      const inv = await q(
        client,
        `INSERT INTO climate_survey_invites (
           survey_id, company_id, token, expires_at, candidate_id, used_at
         )
         SELECT $1,$2,$3, NOW() + INTERVAL '60 days', $4,
                CASE WHEN $5 THEN NOW() - ($6 || ' days')::interval ELSE NULL END
          WHERE NOT EXISTS (
            SELECT 1 FROM climate_survey_invites WHERE survey_id = $1 AND candidate_id = $4
          )
         RETURNING id`,
        [surveyId, companyId, `climemp${String(emp.id).padStart(6, '0')}todosdados`, emp.id, used, String(1 + (i % 6))]
      );
      if (used && inv.rows[0]?.id) {
        const answers = {};
        if (likert) answers[likert.id] = 2 + (i % 4);
        if (textQ) answers[textQ.id] = `Resposta pessoal demo de ${emp.fullName.split(' ')[0]}.`;
        if (enps) answers[enps.id] = 6 + (i % 5);
        await q(
          client,
          `INSERT INTO climate_survey_responses (survey_id, company_id, invite_id, answers, submitted_at)
           VALUES ($1,$2,$3,$4::jsonb, NOW() - INTERVAL '1 day')`,
          [surveyId, companyId, inv.rows[0].id, JSON.stringify(answers)]
        );
      }
    }
  }
  if (pulseId && qPulse.rows[0]?.id) {
    const pqId = qPulse.rows[0].id;
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      if (emp.id === colaborador.id) continue;
      const used = i % 3 !== 0;
      const inv = await q(
        client,
        `INSERT INTO team_pulse_invites (
           pulse_id, company_id, token, expires_at, candidate_id, used_at
         )
         SELECT $1,$2,$3, NOW() + INTERVAL '30 days', $4,
                CASE WHEN $5 THEN NOW() - ($6 || ' hours')::interval ELSE NULL END
          WHERE NOT EXISTS (
            SELECT 1 FROM team_pulse_invites WHERE pulse_id = $1 AND candidate_id = $4
          )
         RETURNING id`,
        [pulseId, companyId, `pulsemp${String(emp.id).padStart(6, '0')}todosdadosxx`, emp.id, used, String(2 + i)]
      );
      if (used && inv.rows[0]?.id) {
        await q(
          client,
          `INSERT INTO team_pulse_responses (pulse_id, company_id, invite_id, answers, submitted_at)
           VALUES ($1,$2,$3,$4::jsonb, NOW() - INTERVAL '3 hours')`,
          [pulseId, companyId, inv.rows[0].id, JSON.stringify({ [pqId]: 2 + (i % 4) })]
        );
      }
    }
  }

  // ── Performance side reviews para mais gente ────────────────────────────
  if (cycleId) {
    for (let i = 0; i < employees.length; i += 1) {
      const emp = employees[i];
      const peer = employees[(i + 1) % employees.length];
      await q(
        client,
        `INSERT INTO performance_side_reviews (
           cycle_id, company_id, candidate_id, role, reviewer_label, token,
           outcomes, overall_notes, status, submitted_at, expires_at
         )
         SELECT $1,$2,$3,'self','Autoavaliação',$4,
                '{"overall":"met"}'::jsonb, '<p>Self-review demo.</p>', 'submitted',
                NOW() - INTERVAL '2 days', NOW() + INTERVAL '30 days'
          WHERE NOT EXISTS (
            SELECT 1 FROM performance_side_reviews
             WHERE cycle_id = $1 AND candidate_id = $3 AND role = 'self'
          )`,
        [cycleId, companyId, emp.id, `self${String(emp.id).padStart(8, '0')}todosdadosrev`]
      );
      if (peer && peer.id !== emp.id) {
        await q(
          client,
          `INSERT INTO performance_side_reviews (
             cycle_id, company_id, candidate_id, role, reviewer_label, token,
             outcomes, overall_notes, status, expires_at
           )
           SELECT $1,$2,$3,'peer',$4,$5,
                  '{}'::jsonb, '', 'pending', NOW() + INTERVAL '30 days'
            WHERE NOT EXISTS (
              SELECT 1 FROM performance_side_reviews
               WHERE cycle_id = $1 AND candidate_id = $3 AND role = 'peer'
                 AND reviewer_label = $4
            )`,
          [
            cycleId,
            companyId,
            emp.id,
            peer.fullName,
            `peer${String(emp.id).padStart(8, '0')}todosdadosrev`,
          ]
        );
      }
    }
  }

  // ── Prep de entrevista (candidatos da vaga) ─────────────────────────────
  if (vacancyOpenId) {
    const cands = await q(
      client,
      `SELECT c.id, c.full_name AS "fullName"
         FROM vacancy_candidates vc
         JOIN candidates c ON c.id = vc.candidate_id
        WHERE vc.vacancy_id = $1 AND vc.company_id = $2
        ORDER BY vc.id ASC
        LIMIT 8`,
      [vacancyOpenId, companyId]
    );
    for (let i = 0; i < (cands.rows || []).length; i += 1) {
      const c = cands.rows[i];
      const prepared = i === 0;
      const tok =
        i === 0 ? MODULE_TOK.prepPedro : i === 1 ? MODULE_TOK.prepMarina : `prep${String(c.id).padStart(8, '0')}todosdados`;
      await q(
        client,
        `INSERT INTO interview_prep_links (
           company_id, vacancy_id, candidate_id, token, prepared_at, created_by_user_id, expires_at
         ) VALUES ($1,$2,$3,$4,$5,$6, NOW() + INTERVAL '30 days')
         ON CONFLICT (vacancy_id, candidate_id) DO NOTHING`,
        [
          companyId,
          vacancyOpenId,
          c.id,
          tok,
          prepared ? new Date().toISOString() : null,
          hrUserId,
        ]
      );
    }
    await q(
      client,
      `UPDATE vacancy_candidates vc
          SET offer_status = 'proposed',
              offer_salary = '19000.00',
              offer_start_date = CURRENT_DATE + 30,
              offer_notes = 'Proposta demo para candidata aprovada.'
         FROM candidates c
        WHERE vc.candidate_id = c.id AND vc.vacancy_id = $1 AND vc.company_id = $2
          AND vc.pipeline_stage = 'approved'`,
      [vacancyOpenId, companyId]
    );
  }

  // ── Sugestões de produto (inbox admin) ──────────────────────────────────
  await q(
    client,
    `INSERT INTO product_feedback (
       company_id, user_id, kind, status, message, active_tab, contact_ok
     )
     SELECT $1,$2,'idea','new',$3,'overview',TRUE
      WHERE NOT EXISTS (
        SELECT 1 FROM product_feedback WHERE company_id = $1 AND message = $3
      )`,
    [
      companyId,
      hrUserId,
      'Demo: incluir filtro de área na Overview de retenção. Ajuda no ritual semanal do RH.',
    ]
  );
  await q(
    client,
    `INSERT INTO product_feedback (
       company_id, user_id, kind, status, message, active_tab, contact_ok, admin_notes
     )
     SELECT $1,$2,'ux','reviewing',$3,'dp',$4,'Em análise (demo).'
      WHERE NOT EXISTS (
        SELECT 1 FROM product_feedback WHERE company_id = $1 AND message = $3
      )`,
    [
      companyId,
      dirUserId,
      'Demo: o checklist DP no mobile corta o botão de anexar. Vale revisar o alvo de toque.',
      true,
    ]
  );

  // ── Notificações colaborador (tipos novos) ──────────────────────────────
  const extraNotifs = [
    {
      type: 'kudos_received',
      payload: { fromName: elena?.fullName || 'Elena Ferreira', message: 'Ótima entrega na sprint.' },
      entityType: 'company_kudo',
      dedupe: 'kudos:demo:colab',
      hoursAgo: 5,
    },
    {
      type: 'feedback_requested',
      payload: {},
      entityType: 'feedback_request',
      dedupe: 'feedback:demo:colab',
      hoursAgo: 9,
    },
    {
      type: 'okr_activity_assigned',
      payload: {
        activityTitle: 'Cobrir testes DTOV nos módulos novos',
        cycleTitle: 'Ciclo OKR 2026-H1',
        deadline: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      },
      entityType: 'okr_activity',
      dedupe: 'okr:demo:colab',
      hoursAgo: 7,
    },
    {
      type: 'dp_leave_update',
      payload: { status: 'approved' },
      entityType: 'leave_request',
      dedupe: 'dpleave:demo:colab',
      hoursAgo: 14,
    },
    {
      type: 'dp_doc_reminder',
      payload: {},
      entityType: 'dp_document',
      dedupe: 'dpdoc:demo:colab',
      hoursAgo: 11,
    },
  ];
  for (const n of extraNotifs) {
    await q(
      client,
      `INSERT INTO candidate_notifications (
         company_id, recipient_candidate_id, type, payload,
         entity_type, entity_id, dedupe_key, created_at
       )
       SELECT $1,$2,$3,$4::jsonb,$5,NULL,$6, NOW() - ($7 || ' hours')::interval
        WHERE NOT EXISTS (
          SELECT 1 FROM candidate_notifications
           WHERE company_id = $1 AND recipient_candidate_id = $2 AND dedupe_key = $6
        )`,
      [
        companyId,
        colaborador.id,
        n.type,
        JSON.stringify(n.payload),
        n.entityType,
        n.dedupe,
        String(n.hoursAgo),
      ]
    );
  }

  return {
    ok: true,
    employees: employees.length,
    whistleToken: MODULE_TOK.whistle,
    prepToken: MODULE_TOK.prepPedro,
  };
}

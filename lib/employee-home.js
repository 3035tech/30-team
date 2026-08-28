/**
 * Collaborator home — tasks + PDI + LMS + 1:1 + company snapshot.
 */

import { asDb } from './ae/as-db.js';
import { query } from './db.js';
import { ERR } from './api-error-codes.js';
import {
  EMPLOYMENT_STATUS,
  DEVELOPMENT_PLAN_STATUS,
  DEVELOPMENT_PLAN_ITEM_STATUS,
} from './domain-status.js';
import { listCandidateLmsCourses } from './lms.js';
import { listDevelopmentPlans, getDevelopmentPlan } from './people/development-plans.js';
import { listOneOnOnes } from './people/one-on-ones.js';
import { buildManagementHypotheses } from './people/management-hypotheses.js';
import { listCompanyBenefits } from './company-benefits.js';
import {
  getEmployeeOnboardingJourney,
  buildOnboardingTasksFromJourney,
} from './people/employee-onboarding-journey.js';

function appBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

function dateOrNull(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * @returns {Promise<{ ok: true, person, tasks, courses, plans, recentAgreements, oneOnOnePrompts, company } | { ok: false, errorCode }>}
 */
export async function getEmployeeHome(dbOrQuery, { companyId, candidateId, locale = 'pt-BR' }) {
  const db = asDb(dbOrQuery || query);
  const cid = Number(companyId);
  const cand = Number(candidateId);
  if (!Number.isFinite(cid) || !Number.isFinite(cand)) {
    return { ok: false, errorCode: ERR.UNAUTHORIZED };
  }

  const personR = await db.query(
    `SELECT c.id, c.full_name AS "fullName", c.email,
            c.employment_status AS "employmentStatus",
            co.name AS "companyName",
            co.about_html AS "companyAboutHtml",
            co.website AS "companyWebsite"
     FROM candidates c
     JOIN companies co ON co.id = c.company_id AND co.deleted = FALSE
     WHERE c.id = $1 AND c.company_id = $2
       AND c.employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'
     LIMIT 1`,
    [cand, cid]
  );
  if (personR.rowCount === 0) return { ok: false, errorCode: ERR.UNAUTHORIZED };
  const person = personR.rows[0];
  const base = appBaseUrl();

  const tasks = [];

  // Open Motivators invites
  try {
    const inv = await db.query(
      `SELECT i.id, i.token, i.status, i.created_at AS "createdAt", i.expires_at AS "expiresAt"
       FROM ae_invites i
       WHERE i.company_id = $1
         AND i.candidate_id = $2
         AND i.status IN ('sent', 'opened')
         AND (i.expires_at IS NULL OR i.expires_at > NOW())
       ORDER BY i.created_at DESC
       LIMIT 10`,
      [cid, cand]
    );
    for (const row of inv.rows || []) {
      tasks.push({
        id: `motivators-${row.id}`,
        kind: 'motivators_invite',
        titleKey: 'employeeHome.taskMotivators',
        href: base ? `${base}/assessment/motivators/${row.token}` : `/assessment/motivators/${row.token}`,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
      });
    }
  } catch (err) {
    if (err?.code !== '42P01' && err?.code !== '42703') throw err;
  }

  // LMS + PDI details
  let courses = [];
  let planDetails = [];
  try {
    courses = await listCandidateLmsCourses(db, { companyId: cid, candidateId: cand });
    for (const course of courses) {
      if (course.isComplete) continue;
      if (course.overdue) {
        tasks.push({
          id: `lms-overdue-${course.enrollmentId}`,
          kind: 'lms_overdue',
          titleKey: 'employeeHome.taskLmsOverdue',
          titleValues: { title: course.title },
          href: '#lms',
          dueDate: course.dueDate,
          mandatory: course.mandatory,
        });
      } else {
        tasks.push({
          id: `lms-progress-${course.enrollmentId}`,
          kind: 'lms_progress',
          titleKey: 'employeeHome.taskLmsProgress',
          titleValues: { title: course.title, pct: course.progressPct },
          href: '#lms',
          dueDate: course.dueDate,
          mandatory: course.mandatory,
        });
      }
    }
  } catch (err) {
    if (err?.code !== '42P01' && err?.code !== '42703') throw err;
    courses = [];
  }

  try {
    const plans = await listDevelopmentPlans(db, {
      companyId: cid,
      candidateId: cand,
      limit: 4,
    });
    const active = (plans || [])
      .filter((p) => p.status === DEVELOPMENT_PLAN_STATUS.ACTIVE)
      .slice(0, 2);
    for (const p of active) {
      const detail = await getDevelopmentPlan(db, {
        companyId: cid,
        planId: p.id,
        candidateId: cand,
      });
      if (!detail) continue;
      planDetails.push({
        id: detail.id,
        title: detail.title,
        objective: detail.objective,
        periodStart: detail.periodStart ? dateOrNull(detail.periodStart) : null,
        periodEnd: detail.periodEnd ? dateOrNull(detail.periodEnd) : null,
        items: (detail.items || []).map((it) => ({
          id: it.id,
          title: it.title,
          status: it.status,
          dueDate: it.dueDate ? dateOrNull(it.dueDate) : null,
          ownerLabel: it.ownerLabel || '',
        })),
      });
      const openItems = (detail.items || [])
        .filter((it) => it.status !== DEVELOPMENT_PLAN_ITEM_STATUS.DONE)
        .slice(0, 5);
      for (const it of openItems) {
        tasks.push({
          id: `pdi-${it.id}`,
          kind: 'pdi_item',
          titleKey: 'employeeHome.taskPdiItem',
          titleValues: { title: it.title },
          href: '#pdi',
          dueDate: it.dueDate ? dateOrNull(it.dueDate) : null,
        });
      }
    }
  } catch (err) {
    if (err?.code !== '42P01' && err?.code !== '42703') throw err;
  }

  let recentAgreements = [];
  try {
    const oos = await listOneOnOnes(db, { companyId: cid, candidateId: cand });
    recentAgreements = (oos || [])
      .filter((o) => o.nextSteps)
      .slice(0, 3)
      .map((o) => ({
        id: o.id,
        meetingDate: o.meetingDate ? dateOrNull(o.meetingDate) : null,
        nextSteps: o.nextSteps,
      }));
  } catch (err) {
    if (err?.code !== '42P01' && err?.code !== '42703') throw err;
  }

  let oneOnOnePrompts = [];
  try {
    const mot = await db.query(
      `SELECT a.dimension_scores AS "dimensionScores", a.ranking
       FROM ae_attempts a
       WHERE a.candidate_id = $1 AND a.company_id = $2 AND a.status = 'completed'
       ORDER BY a.completed_at DESC NULLS LAST, a.id DESC
       LIMIT 1`,
      [cand, cid]
    );
    const enn = await db.query(
      `SELECT a.top_type AS "topType", a.scores
       FROM assessments a
       JOIN candidates c ON c.id = a.candidate_id
       WHERE a.candidate_id = $1 AND c.company_id = $2
       ORDER BY a.created_at DESC NULLS LAST, a.id DESC
       LIMIT 1`,
      [cand, cid]
    );
    const hyp = buildManagementHypotheses({
      locale,
      scores: enn.rows[0]?.scores || null,
      topType: enn.rows[0]?.topType ?? null,
      motivators: mot.rows[0]
        ? {
            dimensionScores: mot.rows[0].dimensionScores,
            ranking: mot.rows[0].ranking,
          }
        : null,
    });
    oneOnOnePrompts = (hyp.oneOnOnePrompts || []).slice(0, 5);
  } catch {
    oneOnOnePrompts = [];
  }

  let benefits = [];
  try {
    const rows = await listCompanyBenefits(db, {
      companyId: cid,
      includeInactive: false,
      limit: 20,
    });
    benefits = (rows || []).map((b) => ({
      id: b.id,
      name: b.name,
      categoryName: b.category || null,
      summary: b.description ? String(b.description).slice(0, 280) : null,
    }));
  } catch (err) {
    if (err?.code !== '42P01' && err?.code !== '42703') throw err;
  }

  const about = String(person.companyAboutHtml || '').trim();
  const company = {
    name: person.companyName,
    website: person.companyWebsite || null,
    aboutHtml: about ? about.slice(0, 4000) : null,
    benefits,
  };

  let journey = null;
  try {
    const j = await getEmployeeOnboardingJourney(db, { companyId: cid, candidateId: cand });
    if (j.ok && j.hasJourney) {
      journey = {
        startDate: j.startDate,
        preItems: j.preItems,
        checkins: j.checkins,
      };
      const onboardingTasks = buildOnboardingTasksFromJourney(j);
      tasks.unshift(...onboardingTasks);
    }
  } catch (err) {
    if (err?.code !== '42P01' && err?.code !== '42703') throw err;
  }

  return {
    ok: true,
    locale,
    person: {
      candidateId: person.id,
      fullName: person.fullName,
      email: person.email,
      companyName: person.companyName,
    },
    tasks,
    journey,
    courses,
    plans: planDetails,
    recentAgreements,
    oneOnOnePrompts,
    company,
  };
}

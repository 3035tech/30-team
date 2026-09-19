import { NextResponse } from 'next/server';
import { apiError, apiErrorFromResult, ERR } from '../../../../../../lib/api-error.js';
import { completeLmsLesson, listCandidateLmsCourses, uncompleteLmsLesson } from '../../../../../../lib/lms.js';
import { getLessonQuiz, submitLessonQuiz } from '../../../../../../lib/lms-quiz.js';
import { authenticateMobileEmployee, mobileEmployeeBearerToken } from '../../../../../../lib/mobile-employee-session.js';
import { checkRateLimit, clientIpFromRequest } from '../../../../../../lib/rate-limit.js';

export const dynamic = 'force-dynamic';
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store, private' });
const LMS_ACTION = Object.freeze({ COMPLETE: 'completeLesson', GET_QUIZ: 'getQuiz', SUBMIT_QUIZ: 'submitQuiz', UNCOMPLETE: 'uncompleteLesson' });
async function auth(request) { return authenticateMobileEmployee(mobileEmployeeBearerToken(request)); }
async function load(session) { return { courses: await listCandidateLmsCourses(null, { companyId: session.companyId, candidateId: session.candidateId }) }; }

export async function GET(request) {
  try {
    const session = await auth(request);
    if (!session) return apiError(request, ERR.UNAUTHORIZED, 401);
    return NextResponse.json(await load(session), { headers: NO_STORE });
  } catch (error) {
    console.error('GET mobile employee lms', error);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

export async function POST(request) {
  try {
    const session = await auth(request);
    if (!session) return apiError(request, ERR.UNAUTHORIZED, 401);
    const limit = await checkRateLimit(`mobile-employee-lms:${session.candidateId}:${clientIpFromRequest(request)}`, 60, 60 * 1000);
    if (!limit.ok) return apiError(request, ERR.RATE_LIMIT, 429);
    const body = await request.json().catch(() => ({}));
    const lessonId = Number(body.lessonId);
    if (!Number.isInteger(lessonId) || lessonId < 1) return apiError(request, ERR.INVALID_DATA, 400);
    const current = await load(session);
    const lesson = current.courses.flatMap((course) => course.lessons || []).find((item) => Number(item.id) === lessonId);
    if (!lesson) return apiError(request, ERR.NOT_FOUND, 404);
    if (body.action === LMS_ACTION.GET_QUIZ) {
      const quiz = await getLessonQuiz(null, { companyId: session.companyId, lessonId, includeAnswer: false });
      if (!quiz.ok) return apiErrorFromResult(request, quiz, { fallbackCode: ERR.NOT_FOUND });
      return NextResponse.json({ lessonId, questions: quiz.questions }, { headers: NO_STORE });
    }
    if (body.action === LMS_ACTION.SUBMIT_QUIZ) {
      const result = await submitLessonQuiz(null, { companyId: session.companyId, candidateId: session.candidateId, lessonId, answers: body.answers || {} });
      return NextResponse.json({ passed: Boolean(result.ok && result.passed), correctCount: Number(result.correctCount) || 0, totalCount: Number(result.totalCount) || 0 }, { headers: NO_STORE });
    }
    const fn = body.action === LMS_ACTION.COMPLETE ? completeLmsLesson : body.action === LMS_ACTION.UNCOMPLETE ? uncompleteLmsLesson : null;
    if (!fn) return apiError(request, ERR.INVALID_DATA, 400);
    const result = await fn(null, { companyId: session.companyId, candidateId: session.candidateId, lessonId });
    if (!result.ok) return apiErrorFromResult(request, result, { fallbackCode: ERR.INVALID_DATA });
    return NextResponse.json(await load(session), { headers: NO_STORE });
  } catch (error) {
    console.error('POST mobile employee lms', error);
    return apiError(request, ERR.INTERNAL, 500);
  }
}

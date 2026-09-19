import { NextResponse } from 'next/server';
import { apiError, HTTP_STATUS, ERR } from '../../../../../../lib/api-error.js';
import { getEmployeeHome } from '../../../../../../lib/employee-home.js';
import { t } from '../../../../../../lib/i18n.js';
import { authenticateMobileEmployee, mobileEmployeeBearerToken } from '../../../../../../lib/mobile-employee-session.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await authenticateMobileEmployee(mobileEmployeeBearerToken(request));
    if (!session) return apiError(request, ERR.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    const home = await getEmployeeHome(null, { companyId: session.companyId, candidateId: session.candidateId, locale: 'pt-BR' });
    if (!home.ok) return apiError(request, home.errorCode || ERR.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    const pdiItems = home.plans.reduce((total, plan) => total + plan.items.filter((item) => item.status !== 'done').length, 0);
    const onboardingPending = home.journey
      ? [...(home.journey.preItems || []), ...(home.journey.checkins || [])].filter((item) => !item.completedAt && item.status !== 'done').length
      : 0;
    return NextResponse.json({
      person: { fullName: home.person.fullName },
      company: { name: home.company.name, aboutHtml: home.company.aboutHtml, website: home.company.website },
      tasks: home.tasks.slice(0, 20).map((task) => ({
        id: String(task.id),
        kind: String(task.kind),
        title: t(home.locale, task.titleKey, task.titleValues || {}),
        dueDate: task.dueDate || task.expiresAt || null,
      })),
      summary: { courses: home.courses.filter((course) => !course.isComplete).length, onboardingPending, okrs: home.okrActivities.length, pdiItems },
    });
  } catch (error) {
    console.error('GET mobile employee home', error);
    return apiError(request, ERR.INTERNAL, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

import { NextResponse } from 'next/server';
import { resolveVacancyLinkByToken } from '../../../../lib/public-vacancy-link';
import { apiError, localeFromRequest } from '../../../../lib/api-error';
import { t } from '../../../../lib/i18n';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = String(searchParams.get('token') || '').trim();
  const email = searchParams.get('email');
  const result = await resolveVacancyLinkByToken(token, { email });

  if (!result.ok) {
    if (result.errorCode === 'DUPLICATE_VACANCY_SUBMISSION') {
      const locale = localeFromRequest(request);
      return NextResponse.json(
        {
          errorCode: 'DUPLICATE_VACANCY_SUBMISSION',
          error: t(locale, 'errors.DUPLICATE_VACANCY_SUBMISSION'),
          alreadySubmitted: true,
        },
        { status: 409 }
      );
    }
    const status = result.errorCode === 'INVALID_TOKEN' ? 400 : 404;
    return apiError(request, result.errorCode, status);
  }

  return NextResponse.json(result.vacancy);
}

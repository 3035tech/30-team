import { NextResponse } from 'next/server';
import { resolveCompanyLinkByToken } from '../../../../lib/public-company-link';
import { apiError } from '../../../../lib/api-error';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = String(searchParams.get('token') || '').trim();
  const result = await resolveCompanyLinkByToken(token);
  if (!result.ok) {
    const status = result.errorCode === 'INVALID_TOKEN' ? 400 : 404;
    return apiError(request, result.errorCode, status);
  }
  return NextResponse.json(result.company);
}

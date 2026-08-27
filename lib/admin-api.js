/**
 * Thin admin API wrapper — session + CAP + tenant company + optional Zod.
 * Prefer this in new/edited `app/api/admin/**` routes so agents do not re-copy
 * cookie/CAP/company boilerplate.
 *
 * @example
 * export const GET = withAdminApi(
 *   { anyCap: [CAP.VACANCIES_MANAGE, CAP.USERS_MANAGE], query: listQuerySchema },
 *   async ({ request, companyId, query }) => NextResponse.json({ ... })
 * );
 */

import { apiError, ERR } from './api-error.js';
import {
  getSessionPayload,
  getManagerScope,
  resolveScopedCompanyId,
  requireCapability,
  requireAnyCapability,
} from './ae/require-admin.js';
import { parseJsonBody, parseSearchParams } from './validate.js';

/**
 * @typedef {object} AdminApiContext
 * @property {Request} request
 * @property {object} payload
 * @property {{ isAdmin: boolean, companyId: number|null, authorized: boolean }} scope
 * @property {number|null} companyId
 * @property {any} [body]
 * @property {any} [query]
 * @property {Record<string, string>|undefined} params
 */

/**
 * @param {{
 *   cap?: string,
 *   anyCap?: string[],
 *   body?: import('zod').ZodTypeAny,
 *   query?: import('zod').ZodTypeAny,
 *   requireCompany?: boolean,
 *   companyFrom?: 'auto' | 'query' | 'body' | 'none',
 *   logLabel?: string,
 * }} opts
 * @param {(ctx: AdminApiContext) => Promise<Response>|Response} handler
 */
export function withAdminApi(opts, handler) {
  const {
    cap,
    anyCap,
    body: bodySchema,
    query: querySchema,
    requireCompany = true,
    companyFrom = 'auto',
    logLabel = 'admin-api',
  } = opts || {};

  return async function adminApiHandler(request, routeContext) {
    try {
      const payload = await getSessionPayload();
      if (anyCap?.length) {
        if (!requireAnyCapability(payload, anyCap)) {
          return apiError(request, ERR.UNAUTHORIZED, 401);
        }
      } else if (cap) {
        if (!requireCapability(payload, cap)) {
          return apiError(request, ERR.UNAUTHORIZED, 401);
        }
      } else {
        return apiError(request, ERR.UNAUTHORIZED, 401);
      }

      const scope = getManagerScope(payload);
      if (!scope.authorized) {
        return apiError(request, ERR.UNAUTHORIZED, 401);
      }

      let query;
      if (querySchema) {
        const q = parseSearchParams(request, querySchema);
        if (!q.ok) return q.response;
        query = q.data;
      } else {
        query = Object.fromEntries(new URL(request.url).searchParams.entries());
      }

      let body;
      if (bodySchema) {
        const b = await parseJsonBody(request, bodySchema);
        if (!b.ok) return b.response;
        body = b.data;
      }

      let companyId = null;
      if (requireCompany && companyFrom !== 'none') {
        let rawCompanyId;
        if (companyFrom === 'query') rawCompanyId = query?.companyId;
        else if (companyFrom === 'body') rawCompanyId = body?.companyId;
        else rawCompanyId = body?.companyId ?? query?.companyId;
        companyId = resolveScopedCompanyId(scope, rawCompanyId);
        if (!companyId) {
          return apiError(request, ERR.COMPANY_REQUIRED, 400);
        }
      }

      const params = routeContext?.params;
      return await handler({
        request,
        payload,
        scope,
        companyId,
        body,
        query,
        params,
      });
    } catch (err) {
      console.error(`[${logLabel}]`, err);
      return apiError(request, ERR.INTERNAL, 500);
    }
  };
}

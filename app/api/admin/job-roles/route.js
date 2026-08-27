import { withAdminApi } from '../../../../lib/admin-api.js';
import { CAP } from '../../../../lib/ae/require-admin.js';
import { z, zPositiveInt, zQueryBool } from '../../../../lib/validate.js';
import { listCompanyJobRoles, createJobRole } from '../../../../lib/job-roles.js';

const listQuerySchema = z.object({
  companyId: zPositiveInt.optional(),
  includeInactive: zQueryBool,
});

const createBodySchema = z.object({
  companyId: zPositiveInt.optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  rubric: z.record(z.coerce.number()).optional().default({}),
});

/**
 * GET /api/admin/job-roles?companyId=X&includeInactive=false
 * Lista cargos — vacancies.manage (seleção em vagas) ou users.manage (aba admin).
 */
export const GET = withAdminApi(
  {
    anyCap: [CAP.VACANCIES_MANAGE, CAP.USERS_MANAGE],
    query: listQuerySchema,
    companyFrom: 'query',
    logLabel: 'job-roles GET',
  },
  async ({ companyId, query }) => {
    const roles = await listCompanyJobRoles(companyId, {
      includeInactive: query.includeInactive,
    });
    return Response.json({
      companyId,
      total: roles.length,
      roles,
    });
  }
);

/**
 * POST /api/admin/job-roles — cria cargo (users.manage)
 */
export const POST = withAdminApi(
  {
    cap: CAP.USERS_MANAGE,
    body: createBodySchema,
    companyFrom: 'body',
    logLabel: 'job-roles POST',
  },
  async ({ companyId, body }) => {
    const newRole = await createJobRole({
      companyId,
      name: body.name,
      description: body.description || null,
      rubric: body.rubric || {},
    });
    return Response.json(newRole, { status: 201 });
  }
);

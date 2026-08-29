/**
 * Job Roles — Engenharia de Cargos Leve (B-1003)
 * 
 * Cargos/papéis da empresa com competências T1–T9 (rubrica).
 * Vagas podem herdar cargo para simplificar cadastro.
 * 
 * Fora do escopo: job architecture enterprise, salary bands, career paths.
 */

import { query, queryRead } from './db.js';
import { asDb } from './ae/as-db.js';

/**
 * Valida rubrica (pesos T1–T9)
 * @returns {boolean}
 */
export function isValidRubric(rubric) {
  if (!rubric || typeof rubric !== 'object') return false;
  
  const validKeys = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'];
  const keys = Object.keys(rubric);
  
  // Permitir rubrica vazia ou parcial
  if (keys.length === 0) return true;
  
  // Todos os keys devem ser T1–T9
  if (!keys.every(k => validKeys.includes(k))) return false;
  
  // Valores devem ser numéricos >= 0
  return keys.every(k => {
    const val = rubric[k];
    return typeof val === 'number' && val >= 0 && val <= 100;
  });
}

/**
 * Normaliza rubrica (converte strings para numbers, remove inválidos)
 */
export function normalizeRubric(rubric) {
  if (!rubric || typeof rubric !== 'object') return {};
  
  const validKeys = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'];
  const normalized = {};
  
  for (const key of validKeys) {
    if (key in rubric) {
      const val = parseFloat(rubric[key]);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        normalized[key] = Math.round(val);
      }
    }
  }
  
  return normalized;
}

/**
 * Lista cargos da empresa (ativos por padrão). Cap para selects/listagens quentes.
 */
export const JOB_ROLES_LIST_CAP = 500;

export async function listCompanyJobRoles(companyId, { includeInactive = false, limit = JOB_ROLES_LIST_CAP } = {}) {
  const db = asDb(queryRead);
  const cap = Math.min(Math.max(1, Number(limit) || JOB_ROLES_LIST_CAP), JOB_ROLES_LIST_CAP);

  const whereClause = includeInactive
    ? 'company_id = $1'
    : 'company_id = $1 AND active = TRUE';

  const res = await db.query(
    `SELECT 
       id,
       name,
       description,
       rubric,
       active,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM job_roles
     WHERE ${whereClause}
     ORDER BY name ASC
     LIMIT $2`,
    [companyId, cap]
  );

  return {
    roles: res.rows,
    truncated: res.rowCount >= cap,
    scanCap: cap,
  };
}

/**
 * Busca cargo por ID
 */
export async function getJobRole(id) {
  const db = asDb(queryRead);
  
  const res = await db.query(
    `SELECT 
       id,
       company_id AS "companyId",
       name,
       description,
       rubric,
       active,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM job_roles
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  
  if (res.rowCount === 0) return null;
  return res.rows[0];
}

/**
 * Cria novo cargo
 */
export async function createJobRole({ companyId, name, description = null, rubric = {} }) {
  if (!companyId || !name) {
    throw new Error('COMPANY_ID_AND_NAME_REQUIRED');
  }
  
  const normalizedRubric = normalizeRubric(rubric);
  if (!isValidRubric(normalizedRubric)) {
    throw new Error('INVALID_RUBRIC');
  }
  
  const res = await query(
    `INSERT INTO job_roles (company_id, name, description, rubric, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING 
       id,
       company_id AS "companyId",
       name,
       description,
       rubric,
       active,
       created_at AS "createdAt"`,
    [companyId, name.trim(), description?.trim() || null, JSON.stringify(normalizedRubric)]
  );
  
  return res.rows[0];
}

/**
 * Atualiza cargo existente
 */
export async function updateJobRole(id, { name, description, rubric, active }) {
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name.trim());
  }
  
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description?.trim() || null);
  }
  
  if (rubric !== undefined) {
    const normalizedRubric = normalizeRubric(rubric);
    if (!isValidRubric(normalizedRubric)) {
      throw new Error('INVALID_RUBRIC');
    }
    updates.push(`rubric = $${paramIndex++}`);
    values.push(JSON.stringify(normalizedRubric));
  }
  
  if (active !== undefined) {
    updates.push(`active = $${paramIndex++}`);
    values.push(Boolean(active));
  }
  
  if (updates.length === 0) {
    throw new Error('NO_UPDATES_PROVIDED');
  }
  
  updates.push(`updated_at = NOW()`);
  values.push(id);
  
  const res = await query(
    `UPDATE job_roles
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING 
       id,
       company_id AS "companyId",
       name,
       description,
       rubric,
       active,
       updated_at AS "updatedAt"`,
    values
  );
  
  if (res.rowCount === 0) {
    throw new Error('JOB_ROLE_NOT_FOUND');
  }
  
  return res.rows[0];
}

/**
 * Desativa cargo (soft delete)
 */
export async function deactivateJobRole(id) {
  return updateJobRole(id, { active: false });
}

/**
 * Resolve rubrica final de uma vaga (herdada do cargo ou específica)
 */
export async function getRubricForVacancy(vacancy) {
  // Se a vaga tem rubrica própria, usa ela
  if (vacancy.rubric && Object.keys(vacancy.rubric).length > 0) {
    return vacancy.rubric;
  }
  
  // Se tem job_role_id, busca rubrica do cargo
  if (vacancy.jobRoleId || vacancy.job_role_id) {
    const jobRoleId = vacancy.jobRoleId || vacancy.job_role_id;
    const jobRole = await getJobRole(jobRoleId);
    
    if (jobRole && jobRole.rubric) {
      return jobRole.rubric;
    }
  }
  
  // Fallback: rubrica vazia
  return {};
}

/**
 * Conta quantas vagas usam este cargo
 */
export async function countVacanciesUsingJobRole(jobRoleId) {
  const db = asDb(queryRead);
  
  const res = await db.query(
    `SELECT COUNT(*) as count
     FROM vacancies
     WHERE job_role_id = $1
       AND deleted = FALSE`,
    [jobRoleId]
  );
  
  return parseInt(res.rows[0].count) || 0;
}

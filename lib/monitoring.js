/**
 * Performance — Monitoring estruturado
 * 
 * Sistema leve de logging e métricas para produção.
 * Integra com stdout (Docker logs) e permite export para observability externa.
 */

/**
 * Níveis de log
 */
export const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const CURRENT_LEVEL = process.env.LOG_LEVEL 
  ? parseInt(process.env.LOG_LEVEL, 10) 
  : LOG_LEVEL.INFO;

/**
 * Log estruturado com contexto
 * @param {string} level - 'debug' | 'info' | 'warn' | 'error'
 * @param {string} message
 * @param {object} context - Contexto adicional (companyId, userId, etc.)
 */
function log(level, message, context = {}) {
  const levelValue = LOG_LEVEL[level.toUpperCase()];
  if (levelValue < CURRENT_LEVEL) {
    return; // Skip se abaixo do threshold
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...context,
  };

  // Output para stdout (Docker logs)
  const output = level === 'error' || level === 'warn' ? console.error : console.log;
  output(JSON.stringify(entry));
}

export const logger = {
  debug: (message, context) => log('debug', message, context),
  info: (message, context) => log('info', message, context),
  warn: (message, context) => log('warn', message, context),
  error: (message, context) => log('error', message, context),
};

/**
 * Métricas em memória (agregadas por período)
 */
const metrics = {
  apiCalls: {},
  dbQueries: {},
  cacheHits: 0,
  cacheMisses: 0,
  errors: {},
};

/**
 * Incrementa contador de métrica
 * @param {string} category - 'apiCalls' | 'dbQueries' | 'errors'
 * @param {string} key - Identificador (ex: 'GET /api/admin/analytics/metrics')
 */
export function incrementMetric(category, key) {
  if (!metrics[category]) {
    metrics[category] = {};
  }
  if (!metrics[category][key]) {
    metrics[category][key] = 0;
  }
  metrics[category][key]++;
}

/**
 * Registra duração de operação
 * @param {string} operation - Nome da operação
 * @param {number} durationMs - Duração em ms
 */
export function recordDuration(operation, durationMs) {
  if (durationMs > 1000) {
    logger.warn('Slow operation detected', { operation, durationMs });
  }
}

/**
 * Helper: measure execution time
 * @param {string} operation
 * @param {Function} fn - Async function
 * @returns {Promise<any>}
 */
export async function measureAsync(operation, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    recordDuration(operation, duration);
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    logger.error(`Operation failed: ${operation}`, { operation, duration, error: err.message });
    incrementMetric('errors', operation);
    throw err;
  }
}

/**
 * Retorna snapshot das métricas atuais
 * @returns {object}
 */
export function getMetricsSnapshot() {
  return {
    timestamp: new Date().toISOString(),
    ...metrics,
  };
}

/**
 * Reseta métricas (útil para testes ou agregação periódica)
 */
export function resetMetrics() {
  metrics.apiCalls = {};
  metrics.dbQueries = {};
  metrics.cacheHits = 0;
  metrics.cacheMisses = 0;
  metrics.errors = {};
}

/**
 * Middleware para logging de requisições API
 * @param {Request} request
 * @param {Function} handler
 * @returns {Promise<Response>}
 */
export async function withApiLogging(request, handler) {
  const start = Date.now();
  const { pathname } = new URL(request.url);
  const method = request.method;
  const routeKey = `${method} ${pathname}`;

  try {
    const response = await handler();
    const duration = Date.now() - start;

    incrementMetric('apiCalls', routeKey);
    recordDuration(routeKey, duration);

    logger.info('API request', {
      method,
      pathname,
      status: response.status,
      duration,
    });

    return response;
  } catch (err) {
    const duration = Date.now() - start;
    incrementMetric('errors', routeKey);

    logger.error('API error', {
      method,
      pathname,
      duration,
      error: err.message,
      stack: err.stack,
    });

    throw err;
  }
}

/**
 * Health check agregado
 * @returns {object} - { status, uptime, metrics }
 */
export function getHealthStatus() {
  return {
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics: getMetricsSnapshot(),
  };
}

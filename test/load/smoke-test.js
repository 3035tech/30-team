/**
 * k6 Smoke Test — 30Team
 * 
 * Teste básico de sanidade: 1 VU por 30s.
 * Valida que endpoints críticos respondem sem erro.
 * 
 * Execução:
 *   k6 run test/load/smoke-test.js
 *   BASE_URL=http://localhost:3000 k6 run test/load/smoke-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'], // <1% error
  },
};

export default function () {
  // 1. Landing page
  let res = http.get(`${BASE_URL}/`);
  check(res, {
    'landing page status 200': (r) => r.status === 200,
    'landing page has title': (r) => r.body.includes('30Team'),
  });

  sleep(1);

  // 2. Login page
  res = http.get(`${BASE_URL}/login`);
  check(res, {
    'login page status 200': (r) => r.status === 200,
  });

  sleep(1);

  // 3. Health check (se disponível)
  res = http.get(`${BASE_URL}/api/health/status`);
  check(res, {
    'health check responsive': (r) => r.status === 200 || r.status === 401,
  });

  sleep(2);
}

/**
 * k6 Load Test — 30Team
 * 
 * Carga média: 10 VUs por 5 minutos.
 * Simula uso diário com múltiplos gestores navegando simultaneamente.
 * 
 * Execução:
 *   k6 run test/load/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp-up
    { duration: '3m', target: 10 },  // Plateau
    { duration: '1m', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.05'], // <5% error
  },
};

export default function () {
  // Simula navegação de gestor

  // 1. Landing
  http.get(`${BASE_URL}/`);
  sleep(2);

  // 2. Login page
  http.get(`${BASE_URL}/login`);
  sleep(1);

  // 3. Public assessment (candidato)
  // Nota: requer token válido; aqui só valida que rota existe
  const res = http.get(`${BASE_URL}/t/example-token-placeholder`, {
    tags: { name: 'PublicAssessment' },
  });
  check(res, {
    'public routes respond': (r) => r.status < 500,
  });

  sleep(3);

  // 4. Health endpoint
  http.get(`${BASE_URL}/api/health/status`);

  sleep(5);
}

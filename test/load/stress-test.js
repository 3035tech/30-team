/**
 * k6 Stress Test — 30Team
 * 
 * Ramp-up até 50 VUs para identificar breaking point.
 * 
 * Execução:
 *   k6 run test/load/stress-test.js
 * 
 * ATENÇÃO: Não executar contra produção sem coordenação.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '2m', target: 20 },  // Warm-up
    { duration: '3m', target: 50 },  // Ramp to peak
    { duration: '5m', target: 50 },  // Hold peak
    { duration: '2m', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.1'], // <10% error
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/`);
  check(res, {
    'status not 5xx': (r) => r.status < 500,
  });

  sleep(1);

  http.get(`${BASE_URL}/login`);
  
  sleep(2);

  http.get(`${BASE_URL}/api/health/status`);

  sleep(3);
}

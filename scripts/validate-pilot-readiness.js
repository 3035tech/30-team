#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const includeIntegrations = process.argv.includes('--integrations');
const fullJourney = process.argv.includes('--full');
const gates = [
  ['schema contract', 'npm', ['run', 'db:validate-schema:static']],
  [
    fullJourney ? 'full DTOV journey and tenant matrix' : 'offline regression',
    'npm',
    ['run', fullJourney ? 'dtov:full-app' : 'test:full:offline'],
  ],
  ['tenant and product unit gates', 'node', ['--test', 'test/unit/module-hardening.unit.test.js']],
  ['public content and crawler contract', 'node', ['test/unit/product-landing-seo.unit.test.js']],
];

if (includeIntegrations) {
  gates.push(['S3 and SMTP configuration', 'npm', ['run', 'ops:pilot-preflight']]);
}

let failed = false;
for (const [label, command, args] of gates) {
  process.stdout.write(`\n== ${label} ==\n`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(`FAIL ${label}\n`);
    break;
  }
  process.stdout.write(`PASS ${label}\n`);
}

if (!includeIntegrations) {
  process.stdout.write(
    '\nSKIP external integrations: run `npm run release:pilot-check -- --integrations` in homologation.\n'
  );
}
if (!fullJourney) {
  process.stdout.write(
    'SKIP full browser/tenant journey: run `npm run release:pilot-check -- --full` before go-live.\n'
  );
}

process.exitCode = failed ? 1 : 0;

/**
 * Baseline DTOV: reusa seeds oficiais do repo (áreas → motivadores → demo Todos os Dados).
 * Roda como subprocess com env DTOV (nunca o .env de prod sem override).
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..', '..');

function runNode(scriptRel, env, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(ROOT, scriptRel)], {
      cwd: ROOT,
      env: { ...env, ...extraEnv },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptRel} exited ${code}`));
    });
  });
}

/**
 * @param {import('pg').Client} _client
 * @param {{ env: NodeJS.ProcessEnv }} ctx
 */
export async function seed(_client, ctx) {
  const env = ctx.env;
  // areas + sample noise (idempotent enough on empty DB)
  await runNode('scripts/seed-data.js', env);
  await runNode('scripts/seed-motivators-questions.js', env);
  await runNode('scripts/seed-motivators-templates.js', env);
  await runNode('scripts/seed-demo-todos-os-dados.js', env, {
    CONFIRM_DEMO_PURGE: '1',
  });
  process.stdout.write('[dtov:baseline] demo tenant loaded\n');
}

import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

function getClient() {
  return new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'enneagram',
    user: process.env.POSTGRES_USER || 'enneagram_user',
    password: process.env.POSTGRES_PASSWORD,
  });
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function makeScoresBiased(topType) {
  // Generate plausible scores for types 1..9 with bias to topType.
  const scores = {};
  let max = 0;
  for (let t = 1; t <= 9; t++) {
    const base = randInt(8, 18);
    const boost = t === topType ? randInt(6, 12) : randInt(-2, 4);
    const v = clamp(base + boost, 1, 30);
    scores[t] = v;
    if (v > max) max = v;
  }
  // Ensure topType is actually the max (or tied max)
  scores[topType] = Math.max(scores[topType], max);
  return scores;
}

async function ensureAreas() {
  const client = getClient();
  await client.connect();
  const r = await client.query(`SELECT id, key, label FROM areas ORDER BY id ASC`);
  await client.end();
  if (r.rowCount === 0) throw new Error('No areas found. Run migrations first.');
  return r.rows;
}

async function main() {
  const n = parseInt(process.env.SEED_COUNT || '60', 10);
  const perCandidateAssessments = parseInt(process.env.SEED_ASSESSMENTS_PER_CANDIDATE || '1', 10);
  const domain = (process.env.SEED_EMAIL_DOMAIN || 'example.com').trim();

  const areas = await ensureAreas();
  const client = getClient();
  await client.connect();

  const firstNames = [
    'Ana','Bruno','Carla','Diego','Eduarda','Felipe','Gabriela','Henrique','Isabela','João',
    'Karen','Lucas','Mariana','Nicolas','Olivia','Paulo','Quezia','Rafael','Sofia','Tiago',
    'Valentina','William','Yasmin',
  ];
  const lastNames = [
    'Silva','Souza','Oliveira','Santos','Pereira','Lima','Ferreira','Costa','Rodrigues','Almeida',
    'Gomes','Ribeiro','Carvalho','Barbosa','Araújo','Martins',
  ];

  let createdCandidates = 0;
  let createdAssessments = 0;

  for (let i = 0; i < n; i++) {
    const fullName = `${pick(firstNames)} ${pick(lastNames)} ${pick(lastNames)}`;
    const email = `cand${Date.now()}_${i}@${domain}`.toLowerCase();
    const area = pick(areas);

    const c = await client.query(
      `INSERT INTO candidates (full_name, email, consent_at)
       VALUES ($1, $2, NOW())
       RETURNING id`,
      [fullName, email]
    );
    const candidateId = c.rows[0].id;
    createdCandidates += 1;

    for (let j = 0; j < perCandidateAssessments; j++) {
      const topType = randInt(1, 9);
      const scores = makeScoresBiased(topType);
      await client.query(
        `INSERT INTO assessments (candidate_id, area_id, top_type, scores, source)
         VALUES ($1, $2, $3, $4, 'seed')`,
        [candidateId, area.id, topType, JSON.stringify(scores)]
      );
      createdAssessments += 1;
    }

    // Keep legacy table minimally populated for backward compatibility screens/queries
    const topTypeLegacy = randInt(1, 9);
    const scoresLegacy = makeScoresBiased(topTypeLegacy);
    await client.query(
      `INSERT INTO results (name, top_type, scores)
       VALUES ($1, $2, $3)
       ON CONFLICT (LOWER(name))
       DO UPDATE SET top_type = $2, scores = $3, created_at = NOW()`,
      [fullName, topTypeLegacy, JSON.stringify(scoresLegacy)]
    );
  }

  await client.end();
  process.stdout.write(`Seed complete. candidates=${createdCandidates} assessments=${createdAssessments}\n`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exitCode = 1;
  });


#!/usr/bin/env node
/**
 * Regenera lib/data/br-cities.js (municípios IBGE agrupados por UF).
 * Uso: node scripts/sync-br-cities.mjs
 * O runtime lê só o arquivo estático; rodar quando o IBGE publicar mudanças.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_ALL = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome';
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'data', 'br-cities.js');

const res = await fetch(URL_ALL, { headers: { Accept: 'application/json' } });
if (!res.ok) {
  console.error(`IBGE respondeu ${res.status}`);
  process.exit(1);
}
const rows = await res.json();
const byUf = {};
for (const m of rows) {
  const uf = m?.microrregiao?.mesorregiao?.UF?.sigla || m?.['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla;
  const name = String(m?.nome || '').trim();
  if (!uf || !name) continue;
  (byUf[uf] ||= []).push(name);
}
const sorted = Object.fromEntries(
  Object.keys(byUf)
    .sort()
    .map((uf) => [uf, [...new Set(byUf[uf])].sort((a, b) => a.localeCompare(b, 'pt-BR'))])
);
const total = Object.values(sorted).reduce((n, l) => n + l.length, 0);
if (Object.keys(sorted).length !== 27 || total < 5000) {
  console.error(`Resposta inesperada: ${Object.keys(sorted).length} UFs, ${total} municípios`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(
  out,
  `/* Gerado por scripts/sync-br-cities.mjs (IBGE). Não editar à mão. */\nexport const BR_CITIES_BY_UF = Object.freeze(${JSON.stringify(sorted)});\n`
);
console.log(`ok: ${total} municípios em 27 UFs → ${path.relative(process.cwd(), out)}`);

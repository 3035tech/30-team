#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { relative } from 'node:path';

const root = new URL('../app/api/admin/', import.meta.url);
const directGuard = /require(?:Any)?Capability\(|verifySessionWithCapabilities\(/;
const wrapper = /withAdminApi\(/;

async function walk(url) {
  const entries = await readdir(url, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), url);
    if (entry.isDirectory()) files.push(...await walk(child));
    else if (entry.name === 'route.js') files.push(child);
  }
  return files;
}

const findings = [];
for (const file of await walk(root)) {
  const text = await readFile(file, 'utf8');
  if (directGuard.test(text) && !wrapper.test(text)) {
    findings.push(relative(process.cwd(), file.pathname));
  }
}

console.log(`legacy admin auth routes: ${findings.length}`);
for (const file of findings.sort()) console.log(`- ${file}`);
if (process.argv.includes('--strict') && findings.length) process.exitCode = 1;

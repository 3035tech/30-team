/**
 * Gera slug URL-safe a partir de string.
 * Reutilizado de company slugs e vacancy slugs.
 */

import { query } from './db.js';

/**
 * @param {string} text
 * @param {{ maxLength?: number }} [opts]
 * @returns {string}
 */
export function slugify(text, opts = {}) {
  let out = String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const max = Number(opts?.maxLength);
  if (Number.isFinite(max) && max > 0 && out.length > max) {
    out = out.slice(0, max).replace(/-+$/g, '');
  }
  return out;
}

/**
 * Gera slug único para company. Se houver conflito, adiciona sufixo numérico.
 * @param {string} name
 * @returns {Promise<string>}
 */
export async function generateUniqueCompanySlug(name) {
  const base = slugify(name);
  if (!base) return `company-${Date.now()}`;

  let slug = base;
  let attempt = 0;

  while (attempt < 100) {
    const existing = await query(
      `SELECT id FROM companies WHERE LOWER(slug) = $1 LIMIT 1`,
      [slug.toLowerCase()]
    );
    if (existing.rowCount === 0) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }

  return `${base}-${Date.now()}`;
}

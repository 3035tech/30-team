import { query as defaultQuery } from '../db.js';

/** Aceita pool/client `{ query }`, a função `query` de lib/db, ou null/undefined (usa query padrão). */
export function asDb(dbOrQuery) {
  if (dbOrQuery == null) return { query: defaultQuery };
  if (typeof dbOrQuery === 'function') return { query: dbOrQuery };
  return dbOrQuery;
}

/** Aceita pool/client `{ query }` ou a função `query` exportada de lib/db. */
export function asDb(dbOrQuery) {
  if (typeof dbOrQuery === 'function') return { query: dbOrQuery };
  return dbOrQuery;
}

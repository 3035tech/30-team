/** Private downloads never redirect to storage or reuse public cache headers. */
export function privateAttachmentResponse({ body, contentType, fileName }) {
  const name = String(fileName || 'attachment').replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 200);
  const fallback = name.replace(/[^a-zA-Z0-9._ -]/g, '_');
  const encoded = encodeURIComponent(name.toWellFormed()).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return new Response(body, {
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

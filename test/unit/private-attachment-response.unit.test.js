import test from 'node:test';
import assert from 'node:assert/strict';
import { privateAttachmentResponse } from '../../lib/private-attachment-response.js';

test('private response delivers bytes without storage location or caching', async () => {
  const response = privateAttachmentResponse({ body: Buffer.from('%PDF-test'), contentType: 'application/pdf', fileName: 'Comprovante de endereço.pdf' });
  assert.equal(await response.text(), '%PDF-test');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('location'), null);
  assert.match(response.headers.get('content-disposition'), /attachment;.*filename\*=UTF-8''Comprovante%20de%20endere%C3%A7o.pdf/);
});
test('file names cannot inject headers, quotes or path separators', () => {
  const response = privateAttachmentResponse({ body: Buffer.from('test'), fileName: '../test"\r\nX-Injected: yes\\.pdf' });
  assert.equal(response.headers.get('x-injected'), null);
  const header = response.headers.get('content-disposition');
  assert.ok(!header.includes('\r') && !header.includes('\n') && !header.includes('../'));
  assert.equal(response.headers.get('content-type'), 'application/octet-stream');
});

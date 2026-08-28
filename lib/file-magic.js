/**
 * Magic-byte sniffing for uploads — não confiar só em Content-Type do cliente.
 */

/** @returns {'image/png'|'image/jpeg'|'image/webp'|null} */
export function detectImageMimeFromBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 3) return null;

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

/** @param {Buffer} buffer */
export function isPdfBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5) return false;
  return buffer.toString('ascii', 0, 5) === '%PDF-';
}

/**
 * @param {Buffer} buffer
 * @param {string} declaredMime — MIME já normalizado (sem charset)
 * @returns {boolean}
 */
export function bufferMatchesImageMime(buffer, declaredMime) {
  const detected = detectImageMimeFromBuffer(buffer);
  if (!detected) return false;
  return detected === String(declaredMime || '').trim().toLowerCase();
}

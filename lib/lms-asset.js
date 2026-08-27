/**
 * LMS lesson PDF upload to S3 (basic — reuse object storage like company logo).
 */

import crypto from 'node:crypto';
import {
  isObjectStorageConfigured,
  putObject,
  withObjectKeyPrefix,
} from './s3-object-storage.js';

export const LMS_PDF_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const LMS_PDF_MIME = 'application/pdf';

export function isLmsStorageConfigured() {
  return isObjectStorageConfigured();
}

export function assertValidLmsPdfFile(file = {}) {
  const mimeType = String(file.mimeType || '')
    .trim()
    .toLowerCase()
    .split(';')[0]
    .trim();
  if (mimeType !== LMS_PDF_MIME) {
    const err = new Error('INVALID_LMS_FILE_TYPE');
    err.code = 'INVALID_LMS_FILE_TYPE';
    throw err;
  }
  const size = Number(file.size);
  const bufLen = Buffer.isBuffer(file.buffer) ? file.buffer.length : size;
  if (!Number.isFinite(bufLen) || bufLen <= 0 || bufLen > LMS_PDF_MAX_BYTES) {
    const err = new Error('INVALID_LMS_FILE_SIZE');
    err.code = 'INVALID_LMS_FILE_SIZE';
    throw err;
  }
  return { mimeType };
}

export async function uploadLmsLessonPdf(companyId, courseId, file) {
  if (!isLmsStorageConfigured()) {
    const err = new Error('STORAGE_NOT_CONFIGURED');
    err.code = 'STORAGE_NOT_CONFIGURED';
    throw err;
  }
  assertValidLmsPdfFile(file);
  const cid = Number(companyId);
  const course = Number(courseId);
  if (!Number.isFinite(cid) || cid <= 0 || !Number.isFinite(course) || course <= 0) {
    const err = new Error('INVALID_DATA');
    err.code = 'INVALID_DATA';
    throw err;
  }
  const key = withObjectKeyPrefix(
    `lms/${cid}/courses/${course}/${crypto.randomUUID()}.pdf`
  );
  const { url } = await putObject({
    key,
    body: file.buffer,
    contentType: LMS_PDF_MIME,
  });
  return { contentUrl: url, contentKey: key, contentKind: 'pdf' };
}

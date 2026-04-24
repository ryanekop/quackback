/**
 * Shared storage configuration constants.
 * Client-safe subset of lib/server/storage/s3 — no AWS SDK or node:crypto deps.
 */

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
])

/** Validate that a file is an allowed image type. */
export function isAllowedImageType(contentType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(contentType)
}

/** Maximum allowed image upload size in bytes (2MB). */
export const MAX_FILE_SIZE = 2 * 1024 * 1024

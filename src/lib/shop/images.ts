/**
 * Shop image storage — thin abstraction over the filesystem.
 *
 * Phase 5 ships with local /public/uploads/shop/ storage. The blueprint §18
 * recommends migrating to object storage (Cloudflare R2 / S3) before public
 * launch; this module is the only file that needs to change for that swap.
 *
 * What this module does NOT do yet (deliberate v1 simplification):
 *   - EXIF stripping (privacy — strip GPS/device). Add `sharp` to enable.
 *   - Server-side resize / thumbnail generation. Add `sharp` to enable.
 *   - NSFW scanning. Add cloud scanner to enable.
 *
 * The route handler enforces MIME + size validation; this module owns
 * persistence + URL generation.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'shop');
const PUBLIC_PREFIX = '/uploads/shop';

export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

export const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB
export const MIN_DIMENSIONS = { width: 100, height: 100 };
export const MAX_DIMENSIONS = { width: 4000, height: 4000 };

/** Ensure the upload directory exists (idempotent). */
export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
}

/** Verify the buffer starts with the magic bytes for one of the allowed MIME types. */
export function matchesMime(
  buffer: Buffer,
  declaredMime: string,
): buffer is Buffer & { __brand: 'ValidatedImage' } {
  if (!ALLOWED_MIME.includes(declaredMime as AllowedMime)) return false;
  // JPEG: FF D8 FF
  if (
    declaredMime === 'image/jpeg' &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return true;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    declaredMime === 'image/png' &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true;
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    declaredMime === 'image/webp' &&
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return true;
  }
  return false;
}

function extensionFor(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

/**
 * Persist an image buffer to disk. Returns the public URL path.
 * Filename is `<random>.<ext>` — never trusts the user-provided filename.
 */
export async function storeImage(
  buffer: Buffer,
  mime: string,
): Promise<{ url: string; filename: string }> {
  await ensureUploadDir();
  const id = crypto.randomBytes(16).toString('hex');
  const ext = extensionFor(mime);
  const filename = `${id}.${ext}`;
  const fullPath = path.join(UPLOAD_ROOT, filename);
  await fs.writeFile(fullPath, buffer);
  return { url: `${PUBLIC_PREFIX}/${filename}`, filename };
}

/** Remove an image by filename (best-effort, no throw). */
export async function deleteImage(filename: string): Promise<void> {
  try {
    // Reject any path traversal attempts — only allow bare filenames.
    if (!/^[a-z0-9]+\.(jpg|png|webp)$/i.test(filename)) return;
    await fs.unlink(path.join(UPLOAD_ROOT, filename));
  } catch {
    /* ignore — file may already be gone */
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import {
  MAX_FILE_BYTES,
  matchesMime,
  storeImage,
} from '@/lib/shop/images';

/**
 * POST /api/shop/images
 *
 * Accepts a single file under the `file` field (multipart/form-data) and
 * stores it under /public/uploads/shop/. Returns { url, filename }.
 *
 * Auth: any signed-in non-admin member with emailVerified.
 * Rate-limited per user (30 / hour) to deter abuse.
 *
 * Phase 9 will add NSFW scanning; Phase 10 may add object-storage swap.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Admins cannot upload shop images.' },
        { status: 403 },
      );
    }

    const rl = rateLimit(`shop-image:${userId}`, 30, 3600_000);
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: 'Too many uploads. Please slow down and try again later.',
          retryAt: rl.resetAt,
        },
        { status: 429 },
      );
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        {
          error: `File too large. Max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.`,
        },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesMime(buffer, file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, and WebP images are allowed.' },
        { status: 415 },
      );
    }

    const stored = await storeImage(buffer, file.type);
    return NextResponse.json(stored, { status: 201 });
  } catch (err) {
    console.error('Shop image upload failed:', err);
    return NextResponse.json(
      { error: 'Image upload failed.' },
      { status: 500 },
    );
  }
}

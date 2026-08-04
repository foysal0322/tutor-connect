import { NextResponse } from 'next/server';
import { getPlatformSettings } from '@/lib/cache';

/**
 * Public fee-config endpoint. Returns the platform fee settings so
 * client components (PaymentForm etc.) can display accurate breakdowns
 * without prop-threading through every parent. Values are non-sensitive
 * percentages and meant to be public.
 *
 * Response cached at the CDN/Next layer for 60s via the underlying
 * unstable_cache tag.
 */
export async function GET() {
  const settings = await getPlatformSettings();
  return NextResponse.json(settings);
}

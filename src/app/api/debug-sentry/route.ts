// TEMPORARY — delete after Sentry verification.
import { NextResponse } from 'next/server';

export async function GET() {
  throw new Error('Sentry verification test — tutor-connect dev throw');
}

export async function POST() {
  return GET();
}

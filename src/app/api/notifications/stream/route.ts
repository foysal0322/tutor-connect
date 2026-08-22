import { NextRequest } from 'next/server';

// GET /api/notifications/stream — DISABLED (2026-08-22)
//
// This endpoint used to serve a Server-Sent-Events stream per browser tab,
// with setInterval polling Postgres twice every 10s inside each connection.
// On serverless hosting that design is ruinous:
//
//   - Vercel Fluid compute bills provisioned memory per wall-clock time, and
//     each open tab held a function instance alive indefinitely → the
//     816.5/360 GB-Hrs and 7h19m/4h CPU overage.
//   - A query every 10s permanently reset Neon's 5-minute idle suspension,
//     so the database ran 24/7 → "Limit reached" on the Free plan.
//
// See PRODUCTION_HEALTH_AND_USAGE_AUDIT.md for the full analysis. Clients
// already fall back to Web Push + the 30s /unread-count poll implemented in
// NotificationBell — no notification is lost, only badge freshness drops
// from ~10s to ~30s.
//
// The previous SSE implementation is preserved in git history; restore it
// only after redesigning around a transport that doesn't hold a serverless
// function per client (e.g. Web Push as primary, or a dedicated realtime
// service).
export async function GET(_req: NextRequest) {
  return new Response('SSE stream disabled', { status: 503 });
}

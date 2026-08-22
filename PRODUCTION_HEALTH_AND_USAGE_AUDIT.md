# Production Health & Usage Audit

> Audit date: 2026-08-22 · Project: tutor-connect (Next.js 16.2.9, App Router, NextAuth v4 JWT, Prisma 5.22, PostgreSQL on Neon, deployed on Vercel `sin1`)
> Scope: full code-level audit. **Vercel/Neon dashboards were NOT directly accessible** — only the numbers you pasted were used.

---

## Executive Summary

**Your Vercel and Neon exhaustion are the same bug.** It is not bots, not your schema, not your auth, and not normal user traffic.

The notification system's Server-Sent-Events endpoint — `GET /api/notifications/stream` (`src/app/api/notifications/stream/route.ts`) — opens **one long-lived serverless function per open browser tab**, and inside each one runs `setInterval` polling PostgreSQL **twice every 10 seconds, forever**:

1. On **Vercel**: each open tab keeps a function instance provisioned continuously (memory is billed as GB-Hours whether or not CPU is busy). A handful of tabs left open adds up to hundreds of GB-Hrs/month → your **816.5 / 360 GB-Hrs** overage. The 10s poll + 25s heartbeat timers ticking all month are a direct driver of **7h 19m Active CPU / 4h**.
2. On **Neon**: Neon suspends compute after ~5 minutes of idleness. A query every 10 seconds means the database **never sleeps**, so a single permanently-open tab (e.g., your own browser sitting on the dashboard) forces the compute to run 24/7 → ~744 compute-hours/month needed vs the Free plan's ~191.9 → **"Limit reached"** partway through the month.

Secondary contributor: `POST /api/track-visitor` performs an **unauthenticated, unfiltered, rate-limit-free database write on every page view** (including bots), and the `VisitorLog` table is unbounded and queried without pagination on the admin side.

Everything else audited — auth (JWT, no DB hit per request), Prisma singleton + Neon **pooled** connection string (verified: `DATABASE_URL` contains the pooler host), schema indexes, proxy matcher, static-data caching, shop pagination — is in good shape.

**No data loss, no corruption, and nothing permanently broken.** When Neon's allowance ran out, Neon suspended your compute — users would see slow/failed requests until the monthly reset, but the database itself is safe.

---

## Current Situation

### Vercel (from your dashboard paste)

| Metric | Used | Included | Status |
|---|---|---|---|
| Fluid Provisioned Memory | 816.5 GB-Hrs | 360 GB-Hrs | **~2.3× over** |
| Fluid Active CPU | 7h 19m | 4h | **~1.8× over** |
| Function Invocations | 100K | 1M | OK (10%) |
| Edge Requests | 98K | 1M | OK (10%) |

Key observation: invocation and edge counts are **well within limits**. If ordinary request volume were the problem, invocations would be near the ceiling too. They aren't — which rules out "too many users/bots hitting pages" as the primary cause and points at **long-running/overlapping executions** instead. Memory GB-Hrs and CPU-hours measure *duration × provisioned size*, not request count.

### Neon (from your paste)

> "Limit reached — You've used all of your monthly compute allowance for this project."

Neon Free includes ~191.9 compute-hours/month (assumption: default 0.25 CU autoscaling endpoint; verify in your Neon console). Neon compute hours are **wall-clock hours the compute endpoint is active**, not CPU time. Compute auto-suspends after ~5 min of no connections/activity. Your app defeated suspension (see root cause), so ~1 active stream 24/7 ≈ 744 hrs > 191.9 hrs.

---

## Root Cause Summary

```text
Authenticated user opens any page
 ↓
Topbar / NavbarClient renders <NotificationBell/>   (src/components/NotificationBell.tsx:142)
 ↓
useNotificationStream() opens EventSource           (src/hooks/useNotificationStream.ts:76)
 ↓
GET /api/notifications/stream                       (src/app/api/notifications/stream/route.ts)
 ↓
Vercel function stays alive for the life of the tab (Fluid = billed per ms of provisioned memory)
 ├─ setInterval(poll, 10s):  prisma.findMany() + prisma.count()   ← 2 queries / 10s / tab
 ├─ setInterval(heartbeat, 25s)
 └─ getServerSession on every (re)connect
 ↓
Neon compute sees queries every 10s → never idle ≥ 5 min → never suspends
 ↓
1 tab ≈ 744 Neon compute-hrs/mo  (Free: ~191.9)
N tabs ≈ N × (GB-Hrs on Vercel) + (constant 24/7 Neon compute)
```

Severity ranking:

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | SSE route holds a function per tab + polls DB every 10s indefinitely | **CRITICAL** | CONFIRMED (code) |
| 2 | Neon compute never suspends because of the 10s polling → allowance exhausted | **CRITICAL** | CONFIRMED (mechanism) / LIKELY (exact split vs. other traffic) |
| 3 | `track-visitor`: unauth DB write per pageview, no bot filter, no rate limit | HIGH | CONFIRMED (code) |
| 4 | SSE reconnect churn: Vercel Hobby caps function duration; EventSource auto-reconnect + your 5s retry → repeated invocations, each re-running `getServerSession` + baseline queries | MEDIUM | LIKELY |
| 5 | `VisitorLog` unbounded; `/admin/visitors` + `/api/admin/visitors/raw` load 60 days with no pagination | MEDIUM | CONFIRMED (code) |
| 6 | Admin layout runs 8 count queries on every `/admin/*` render | LOW | CONFIRMED (code) |
| 7 | Bots/crawlers inflating edge requests & visitor-log writes | LOW | POSSIBLE |

---

## Confirmed Issues

### C1. `/api/notifications/stream` is incompatible with serverless billing (CRITICAL)

Evidence: `src/app/api/notifications/stream/route.ts:53-171`
- Returns an infinite `ReadableStream`; cleanup only on client abort.
- `pollTimer = setInterval(... , 10_000)` — 2 Prisma queries (`findMany` take 50, `count`) every 10s per connected tab (`route.ts:92-155`).
- `heartbeatTimer` every 25s (`route.ts:162-169`).
- Client: `src/hooks/useNotificationStream.ts:76` opens one EventSource per tab; reconnect on error after 5s (`:118-121`) and on visibility change (`:128-139`).
- Bell mounts it with `enabled: true` unconditionally (`src/components/NotificationBell.tsx:142-143`), and the Bell itself is mounted in `Topbar.tsx:324` (all authenticated pages) and `NavbarClient.tsx:141,159` (marketing pages).

Impact numbers:
- **Vercel memory**: 816.5 GB-Hrs ÷ ~744 hrs/month ≈ **1.1 GB provisioned 24/7** — exactly the shape of a Node function held open by one stream, or a few streams open for parts of each day (e.g., ~5 tabs × ~10 h/day × 30 d × ~1.6 GB ≈ 800 GB-Hrs).
- **Vercel CPU**: 2 queries + JSON serialize + enqueue + heartbeat, every 10/25s, all month, per tab — a steady drip that alone can account for multiple CPU-hours.
- **Neon**: 6 queries/minute/tab keeps the compute's 5-minute idle timer permanently reset. **A single always-open tab exhausts the entire Free compute allowance by itself.** Your own dev/browser tab left open on the dashboard overnight is a realistic explanation for hitting the limit.

### C2. `POST /api/track-visitor` — unauthenticated, unbounded DB write per pageview (HIGH)

Evidence: `src/app/api/track-visitor/route.ts:4-30`
- No auth, no rate limit, no bot/user-agent filtering, no cap on rows.
- Caller: `src/components/VisitorTracker.tsx:59-65`, mounted in the root layout (`src/app/layout.tsx:66`). Deduped per-pathname per *sessionStorage* session, so a crawler with fresh sessions writes a row per page.
- Consequences: (a) constant write traffic keeps Neon compute awake, (b) `VisitorLog` grows unbounded, (c) the write happens before any response work, adding latency.

### C3. VisitorLog read path has no pagination (MEDIUM)

Evidence: `/admin/visitors/page.tsx:27` and `/api/admin/visitors/raw/route.ts:16` — `findMany` over 60 days of logs, all rows, processed client-side. With bot traffic this becomes both a heavy query and a huge payload.

### C4. Admin layout: 8 count queries on every admin page render (LOW)

Confirmed by inspection of the admin layout (counts for requests, withdrawals, users, support, departments, courses, expertises, consultancy). Cheap individually, but multiplied by every navigation and every admin. Cacheable (these badge counts don't need per-second freshness).

---

## Likely Issues

### L1. SSE reconnect churn amplifies everything (MEDIUM)

Vercel Hobby caps function duration (60s default range; streaming responses get cut when the cap hits). Every cut triggers EventSource auto-reconnect + your explicit 5s retry → a new invocation, `getServerSession`, baseline `count`, and a fresh Prisma connection. With even 5 concurrent tabs this is a perpetual invocation/teardown cycle. (Exact max-duration behavior on your current deploy could not be verified without dashboard access — check Functions logs.)

### L2. Neon exhaustion degraded everything else (MEDIUM)

Once Neon hit the allowance, the compute was suspended until the cycle resets. Every request touching the DB then fails or hangs until timeout. Effects users may have seen: 500s, slow pages, empty notification bells, login failures (authorize() hits the DB), SSE `poll_failed` errors. This also *lengthens* Vercel function execution (waiting on dead connections), inflating Fluid memory/CPU further — a feedback loop between the two platforms.

---

## Possible Issues

- **Bots/crawlers** (RULED OUT by live data): only 4 of 218 visitor-log entries in the last 7 days match bot user-agents, and total traffic is ~20 pageviews/day. Bots are not a meaningful factor. (Edge-request counts include static assets, which inflates the 98K figure.)
- **Uptime monitors / external cron** on `/api/shop/sweep/auto-finalize` (POSSIBLE, LOW): the endpoint is bearer-token protected and batch-capped, so it's safe unless the scheduler fires very frequently. Verify your external scheduler's interval.
- **Region mismatch Neon↔Vercel** (UNKNOWN): Vercel is `sin1` (vercel.json). If your Neon project is not in AWS Singapore (`apore`), every query pays cross-region RTT (50–300ms), inflating function duration on *every* DB-touching request. Verify in the Neon console.

---

## Vercel Analysis

- `vercel.json`: only `{"regions":["sin1"]}` — no crons, no function overrides, fine.
- `next.config.ts`: sane (compress, security headers, image config, `optimizePackageImports`). Sentry tunnel at `/monitoring` adds a route but is cheap.
- **Why memory is 816.5 GB-Hrs:** Fluid compute bills provisioned memory × wall-clock time. Normal request/response functions live for ~100ms–2s. The SSE function lives for minutes-to-hours per connection. That difference (4 orders of magnitude in duration) is the whole story. 100K normal invocations would contribute only a small fraction of 360 GB-Hrs; the SSE streams contribute the rest.
- **Why CPU is 7h19m:** (a) SSE timers + DB polling + heartbeats, (b) Neon-timeout stalls after the allowance ran out (functions waiting on dead DB connections burn wall-clock and some CPU), (c) ordinary SSR.
- **Is a specific function responsible?** Yes — `api/notifications/stream`. Confirm in Vercel → Usage → filter by function; also check average duration per invocation there.
- **Is SSR responsible?** No — your page-render costs are normal (see Next.js Analysis).

## Neon Analysis

I could not access Neon usage data (no `NEON_API_KEY` in the environment). Code-level findings:

- **Connection string**: `DATABASE_URL` in `.env` contains the **pooler host** — you are correctly using Neon's pooled endpoint (PgBouncer). Direct connections from Vercel would have caused `too many connections` errors; that is not happening.
- **Prisma client**: standard dev singleton (`src/lib/prisma.ts`). On Vercel each function instance reuses its own client — with Fluid + long-lived SSE instances, each stream holds a pool connection open indefinitely, which is another reason compute never idles.
- **Why "Limit reached":** compute never suspends (C1) + constant pageview writes (C2). Compute-hours ≈ active wall-clock hours, and 24/7 activity = ~744 hrs vs ~191.9 included.
- **Autoscaling:** Free tier autoscales 0.25 CU; size is irrelevant here — the problem is *duration*, not size.

## Database Query Analysis

Most expensive/suspicious operations found:

| Site | Query | Assessment |
|---|---|---|
| `notifications/stream/route.ts:95-147` | `findMany`(50) + `count` **every 10s per tab** | The killer — frequency, not per-query cost |
| `admin/visitors/page.tsx:27`, `api/admin/visitors/raw/route.ts:16` | 60-day `VisitorLog` `findMany`, no pagination | Heaviest on-demand query; grows with bot traffic |
| `(member)/wallet/page.tsx:32-50` | 4 sequential `findMany` | Could be `Promise.all`; medium traffic page |
| `lib/shop/queries.ts:141`, `lib/shop/orders-queries.ts:53,76-81` | multiple `findMany` + `groupBy` | Properly `take`-limited — acceptable |
| `api/notifications/preferences` PUT | sequential upserts (≤12 rows) | Fine at this scale |
| `api/shop/sweep/auto-finalize` | per-order transactions in a loop | Batch-capped at 50, token-gated — fine |
| Admin layout | 8 `count()` per render | Cacheable badge counts |

No N+1 disasters, no `SELECT *`, no unbounded `findMany` on user-facing hot paths besides the visitor log.

## Database Schema & Index Analysis

Overall: **well-designed**. Every FK is indexed; notification queries are covered by composite indexes:

- `Notification @@index([userId, isRead, createdAt(DESC)])` and `@@index([userId, archived, createdAt(DESC)])` — both SSE queries and the unread-count query are index-covered. ✅
- `VisitorLog @@index([createdAt])` — covers the 60-day window query. The problem is lack of pagination, not lack of an index. No index will fix an unbounded fetch.
- Missing index candidates:

```text
Table:            VisitorLog
Column(s):        (path)
Query affected:   admin visitor breakdowns/groupBy by path
Why it helps:     avoids sequential scan when aggregating per-page views
Expected impact:  Low today, grows with table size
Risk:             Negligible (more indexes = slight write slowdown; this table is over-written already)
```

```text
Table:            Notification
Column(s):        (userId, isRead)  — without createdAt
Query affected:   `count({ userId, isRead: false, archived: false })` (stream + unread-count endpoint)
Why it helps:     the existing composite starts with userId,isRead,createdAt and is likely adequate;
                  only add if EXPLAIN shows a filter on archived after index scan
Expected impact:  Minimal
Risk:             Negligible
```

- High-write tables: `VisitorLog` (every pageview, incl. bots — unbounded), `Notification` (individual creates per event, incl. per-admin fanout via `notifyAdmins()` — fine at current scale).
- No EXPLAIN was run (no DB access from this machine; and Neon compute is suspended anyway).

## Next.js Analysis

- `proxy.ts` (Next 16's middleware rename): matcher is `['/', '/admin/:path*']` — minimal, excludes `_next/static`, images, API. It only does JWT decode (`getToken`), no DB. **Not a contributor.** ✅
- Dynamic rendering (`force-dynamic` / `revalidate = 0`): confined to pages that genuinely need it (shop, disputes, notifications, wallet, admin, visitors). For an authenticated dashboard app this is normal — user-specific pages can't be shared-cacheable anyway.
- Static data is properly cached via `unstable_cache`: fees 60s, departments/courses 24h, homepage stats 5min. ✅
- Marketing pages are static. ✅
- Verdict: rendering strategy is **not** the problem. One caveat: per-user dynamic rendering means every page view is a function invocation + DB queries, so at 10K users your *invocation* count (currently only 10% of quota) is the metric to watch, plus the layout query counts.

## API Analysis

| Endpoint | Method | Auth | DB | Frequency driver | Risk |
|---|---|---|---|---|---|
| `/api/notifications/stream` | GET | session | **2 queries / 10s / tab, forever** | every authenticated tab | **CRITICAL** |
| `/api/notifications/unread-count` | GET | session | 1 count | 30s poll fallback (only when SSE down); `Cache-Control: private, max-age=5` | MEDIUM |
| `/api/notifications` (+ `[id]`, `read-all`, `bulk`, `preferences`, `subscribe`) | * | session | 1–3 each | user actions | LOW |
| `/api/track-visitor` | POST | **none** | 1 write | every pageview incl. bots | HIGH |
| `/api/auth/[...nextauth]` | * | public | 1–2 (login only; JWT sessions thereafter) | logins | LOW |
| `/api/payment-info` | GET/POST | none | findMany / create | admin tool | LOW-MED |
| `/api/settings/fees` | GET | none | cached 60s | low | LOW |
| `/api/shop/images` | POST | session + rate limit | none | uploads | LOW |
| `/api/shop/sweep/auto-finalize` | POST | bearer secret | tx-heavy, capped 50 | external scheduler | LOW |
| `/api/admin/visitors/raw` | GET | admin | 60-day dump | admin only | MEDIUM |
| `/api/debug-sentry` | * | none | none | testing | LOW |

## Middleware Analysis

`src/proxy.ts` runs only on `/` and `/admin/:path*`; does one JWT verification (HMAC, no network/DB). Impact on Vercel CPU: negligible. ✅

## Authentication Analysis

- NextAuth v4, **JWT session strategy** (`src/lib/auth.ts:10`) — `getServerSession()` does **not** hit the DB on regular requests. ✅
- Login does 1–3 queries + bcrypt — normal. Login rate-limited by identifier (`auth.ts:72`). ✅
- The only auth-related waste: every SSE (re)connection calls `getServerSession` — irrelevant once C1 is fixed.

## Client Request Analysis

- No React Query/SWR. All effects checked — **no infinite request loops found**; deps are correct; badge fetches are single-flight with a 5s cache (`src/hooks/badgeCache.ts`).
- The 30s `unread-count` polling only runs when SSE is disconnected AND web-push isn't subscribed (`NotificationBell.tsx:163`) — reasonable as a *fallback*; the problem is it exists to back up a transport (SSE) that shouldn't be on Vercel at all.
- Service worker (`public/sw.js`): push handler + app-shell caching only, no background polling. ✅
- `VisitorTracker`: one POST per pathname per session (deduped), but no bot filter server-side.

## Bot / Crawler Analysis

- 98K edge requests/month includes all static assets; a public site being crawled easily generates this. **Bots are not your main resource problem** (invocations are only at 10% of quota), but they do inflate `VisitorLog` writes via C2.
- Units, for clarity:

```text
10,000 registered users  ≠  10,000 concurrent users
1 page view              ≈  1 HTML invocation + N static edge requests (no function cost)
1 authenticated page view ≈  several DB queries (layout + page)
1 open tab (today)       =  1 never-ending function + 12 DB queries/minute + 24/7 Neon compute  ← the actual unit that broke you
```

## Vercel + Neon Relationship

```text
User → Vercel (sin1) → Next.js function → Neon (pooled) → query → response
```

- **Vercel → Neon**: DB latency (especially if regions mismatch) extends function duration → more GB-Hrs/CPU. Normal requests add ~1 query; the SSE route adds 12 queries/minute/tab.
- **Neon → Vercel**: when Neon's allowance was exhausted, compute suspended → functions stalled on connection timeouts → longer wall-clock → more Fluid usage. A feedback loop, but the *initiator* was the SSE polling.

## 10,000 User Capacity Analysis

Assume ~3–6 page views/session, ~2–5 DB queries/page, sessions mostly Bangladesh daytime.

| Scale | Estimate (monthly) | Bottleneck first |
|---|---|---|
| 100 users | ~15–30K invocations, trivial DB | Nothing — **after fixing C1/C2 you fit easily in Free tiers** |
| 1,000 users | ~150–300K invocations (15–30% of quota), DB still small | Neon compute hours if pages/session are heavy; watch usage tab |
| 5,000 users | ~0.7–1.5M invocations — **at or near the 1M Hobby cap** | Vercel invocations; Neon Free storage (512MB) if visitor log uncleaned |
| 10,000 users | ~1.5–3M invocations — **exceeds Hobby**; DB 1–5GB — **exceeds Free storage** | Both plans |
| 50,000 users | Well past both | Requires Pro + possibly read replicas / dedicated compute |

Scenarios:
- **A — 10K registered, 100 concurrent**: fine on Hobby for a while, fine on Neon Free *after* the SSE fix (concurrent browsing ≈ moderate query rate; Neon suspends at night).
- **B — 10K users, normal daily traffic (~1–2K DAU)**: invocations exceed Hobby within the month → Vercel Pro (~$20/mo) is the reasonable point. Neon Launch plan (~$19/mo) covers compute+storage comfortably.
- **C — sudden spike (viral/launch day)**: the danger is DB connection concurrency; the Neon pooler handles this, but Fluid CPU per-minute caps could throttle. Not catastrophic; monitor and pre-scale.
- **D — 10K concurrent**: not this architecture's job (SSE per tab would be lethal; even fixed, you'd want a queue/realtime layer). Realistically unreachable for a campus tutor platform. **Dangerous scenario is D; you will never see it. B is the real planning target.**

## Danger / Risk Assessment

- **Is the Vercel overage dangerous?** On Hobby, overage results in throttling/blocked functions late in the cycle — degraded availability, not corruption. Fixing C1 brings you back far under the limits.
- **Is Neon "Limit reached" dangerous?** It means the compute is suspended until the next cycle: **users get errors/timeouts on any DB-dependent action (login, dashboard, notifications) until then.** This is a RESOURCE LIMIT. 
- **Can data be lost / DB corrupted?** **No.** Neon suspension does not delete or corrupt anything. Your data is safe. The only growth risk is `VisitorLog` bloat (storage), which is reclaimable.
- **Current user-visible symptoms while suspended:** slow pages, failed logins, 500s from DB timeouts, empty/failed notification loads. **After the fix + cycle reset: all clear.**

## Immediate Actions

### P0 — Do immediately (stop the bleeding, this week)

1. **Disable or gut the SSE endpoint.** Options (pick one):
   - Fastest: in `NotificationBell.tsx:142`, set `enabled: false` for `useNotificationStream` — every connected client immediately falls back to the existing 30s `unread-count` polling + web push. Zero new architecture needed.
   - Better: add `export const dynamic = 'force-dynamic'` guard and return 503/404 from `stream/route.ts`, or delete the route.
   - Expected benefit: Neon compute starts suspending again (allowance stops burning within minutes of the last stream closing); Vercel GB-Hrs stop accumulating from held-open functions. This alone likely brings both meters back under 100% of Free.
   - Risk: badge updates take up to 30s (already the designed fallback). Difficulty: trivial.
2. **Tame `track-visitor`**: skip known bot user-agents (`/bot|crawler|spider|preview|lighthouse|headless/i`), rate-limit by IP (you already have `src/lib/rateLimit.ts`), and consider sampling (log 1 in N pageviews). Risk: lower-fidelity analytics. Difficulty: easy.

### P1 — Fix soon

3. **Replace SSE properly.** You already have Web Push (`web-push` + `PushSubscription` + `sw.js`). Make push the primary channel and keep a 60s (not 30s) `unread-count` poll as fallback. If you truly need sub-second in-app updates later, that's a Qstash/Ably/Pusher/`Postgres LISTEN-NOTIFY + tiny always-on worker` conversation — not a per-tab serverless stream.
4. **Paginate the visitor log**: `take/skip` + date filter on `admin/visitors` and `/api/admin/visitors/raw`; add a retention job (e.g., delete rows older than 30–60 days) or move aggregation to a daily rollup table.
5. ~~Verify Neon region~~ **Resolved**: live check confirms the endpoint is `ap-southeast-1` (Singapore) — same region as Vercel `sin1`. The unknown tables (`Student`, `BatchStudent`, `Session`, `AttendanceLog`, `FeeAssignment`) are confirmed **dormant leftovers** (write counts = row counts, no ongoing activity) — no action needed beyond remembering never to run `prisma migrate reset` on this database.

### P2 — Optimization (before ~1K users)

6. Cache the admin layout's 8 badge counts (`unstable_cache` 30–60s or a single grouped query).
7. `wallet/page.tsx`: parallelize the 4 `findMany`s with `Promise.all`.
8. Add `robots.txt` rules (you have `robots.ts` — verify it disallows `/api/`) and return early for bots in `VisitorTracker`/`track-visitor`.
9. Add Vercel Analytics or check logs for bot share of the 98K edge requests; consider blocking obvious crawlers at the edge.

### P3 — Long-term (before ~10K users)

10. Vercel Pro + Neon Launch when monthly invocations approach ~1M or DB approaches ~400MB — driven by real traffic, not bugs.
11. Consider ISR/cache headers for semi-static pages and a CDN cache for the marketing site.
12. Notification fanout (`notifyAdmins`) → `createMany` when admin count grows.

## Recommended Architecture

```text
Now (fixed):   Page render (JWT, no auth DB hit) → few indexed queries → pooled Neon (sleeps at night)
Realtime:      Web Push (primary) + 60s polling fallback (no long-lived functions)
Visitor stats: bot-filtered, rate-limited, sampled writes → nightly rollup → paginated admin view
Later (10K):   Same shape; Pro tiers; maybe read replica for admin analytics
```

## Cost Considerations

- **Do not upgrade either plan yet.** Both overages are caused by C1/C2, not real load. After the P0 fixes you should sit at roughly: Vercel memory ≪ 360 GB-Hrs, CPU ≪ 4h, invocations ~10%; Neon compute well under 191.9h (compute will suspend when idle).
- Upgrade triggers (assumptions: ~2–5 pages/session, 2–5 queries/page): Vercel Pro when monthly invocations trend toward ~1M (≈ 5–10K active users); Neon Launch when storage nears ~400MB or compute hours regularly exceed ~150 with genuine traffic.
- No cost numbers quoted beyond plan tiers — prices change; check current Vercel/Neon pricing pages at upgrade time.

## Monitoring Recommendations

1. Vercel → Usage tab weekly: watch **Fluid memory GB-Hrs** (your canary — if it climbs while traffic is flat, something is holding functions open again).
2. Vercel → Functions logs: average duration per route; alert if `p95 duration` on any route exceeds ~5s.
3. Neon console → project usage: active compute hours/day (should show gaps overnight after the fix).
4. Sentry (already installed): alert on DB timeout/connection errors.
5. Simple uptime check on `/` and `/api/settings/fees` (cached, cheap) every 5 min.
6. Before 10K users: row-count alerts on `VisitorLog` and `Notification`.

## Before Production Checklist

- [ ] SSE disabled/replaced (P0.1)
- [ ] `track-visitor` bot filter + rate limit (P0.2)
- [ ] Neon region confirmed `apore` (P1.5)
- [ ] Visitor log pagination + retention (P1.4)
- [ ] Both usage meters verified back under limits for one full cycle
- [ ] Uptime + usage monitoring in place
- [ ] Load test: 50 concurrent users browsing (k6 or similar) — verify no function exceeds duration/CPU expectations

## Live Database Evidence (2026-08-22, read-only connection)

Run via a temporary read-only script (deleted after use) against the pooled endpoint. Findings:

| Check | Result | Interpretation |
|---|---|---|
| DB size | **19 MB** | Tiny — nowhere near any storage limit |
| `User` table | **14 rows** | The app is pre-launch with ~14 real users |
| `VisitorLog` | 1,770 rows since 2026-07-12; **20 in last 24h**; 0 in last hour | Real traffic is a trickle — **confirms the overages are NOT traffic-driven** |
| Bot share (7 days) | 4 of 218 requests | **Bots ruled out as a meaningful factor** |
| `Notification` | 146 rows (49 unread) | Trivial volume |
| Active connections | 2 | Healthy |
| `pg_stat_statements` | not installed | No query-level stats available (optional: enable for future monitoring) |
| Neon region (from host) | `ap-southeast-1` (Singapore) | ✅ Matches Vercel `sin1` — region concern from P1.5 is resolved, no migration needed |

**⚠️ NEW FINDING — this Neon database hosts tables that do not exist in this project's Prisma schema:** `BatchStudent` (~5,004 rows), `Student` (~5,004 rows), `Session`, `AttendanceLog`, `FeeAssignment`. These belong to a *different* application that was pointed at the same Neon project at some point. **Follow-up live check confirmed the other app is DORMANT**: cumulative write counters equal the current row counts (e.g., `Student` = 5,004 inserts / 5,004 rows; `Session` = 62 inserts ever), i.e., a one-time bulk import plus brief usage, with no ongoing activity. It is therefore **not** consuming Neon compute. Residual risk is operational only: (a) never run `prisma migrate reset` against this database — it would drop these tables too; (b) ~4 MB of dead data (harmless). (Severity: INFO.)

**Revised conclusions from live data:** with only 14 users, ~20 pageviews/day, and 146 notifications, there is no possible way organic traffic caused 816 GB-Hrs or exhausted Neon. The Vercel overage is essentially all long-lived function time (SSE streams — even one or two developer tabs open routinely). The Neon exhaustion is likewise the SSE polling (plus ordinary pageview writes). Also note the connection succeeded — compute was able to start at audit time, so the suspension either lifted (new cycle) or the limit applies going forward; verify remaining allowance in the Neon console.

## Evidence / Investigation Notes

- `src/app/api/notifications/stream/route.ts:92-169` — setInterval poll (10s, 2 Prisma queries) + heartbeat (25s) inside an infinite stream.
- `src/hooks/useNotificationStream.ts:76,118-139` — per-tab EventSource, 5s reconnect, visibility reconnect.
- `src/components/NotificationBell.tsx:142-143,163` — `enabled: true`; 30s poll fallback only when SSE is down.
- `src/components/Topbar.tsx:324`, `src/components/NavbarClient.tsx:141,159` — Bell mounted on all app pages.
- `src/app/api/track-visitor/route.ts:4-30` — unauth, unfiltered write per call; `src/app/layout.tsx:66` mounts tracker.
- `src/lib/auth.ts:10` — JWT strategy (no per-request DB).
- `.env` — `DATABASE_URL` uses the Neon **pooler** host (value not printed).
- `src/proxy.ts:90-94` — matcher `['/', '/admin/:path*']` only.
- `prisma/schema.prisma:341-344` — Notification composite indexes cover the hot queries.
- Not accessed: Vercel dashboard/API, Neon dashboard/API (no credentials in this environment).

## Final Conclusion

One architectural decision — polling-inside-SSE on serverless — coupled with an unthrottled analytics write explains both the Vercel Fluid overage and the Neon compute exhaustion. Your codebase is otherwise unusually well-built for this scale: JWT sessions, pooled connections, indexed schema, cached static data, minimal middleware, no client-side request loops. Fix P0.1 and P0.2 this week, confirm both meters fall back under their limits within one billing cycle, and this platform will comfortably serve hundreds of users on free tiers and thousands on the entry paid tiers.

---

# Explicit Answers

1. **Why 816.5 GB-Hrs?** SSE streams hold function instances (and their provisioned memory) open for the life of each browser tab; ~1.1 GB provisioned 24/7 for a month (or a few tabs × fewer hours) = 816 GB-Hrs. Duration, not request count.
2. **Why 7h19m CPU?** The 10s poll timers + 25s heartbeats running all month per tab, plus functions stalling on the suspended Neon database.
3. **Why Neon "Limit reached"?** A query every 10s permanently resets Neon's 5-minute idle suspension, so compute runs 24/7 (~744 hrs/mo) against a ~191.9hr allowance — a single always-open tab can do this alone; pageview tracking writes add to it.
4. **Are Vercel and Neon problems related?** Yes — same root cause (the SSE route), plus a feedback loop (Neon suspension → function stalls → more Vercel wall-clock).
5. **Bug or normal usage?** Bug/architecture mismatch, not user load. Invocations are only at 10% of quota.
6. **Something running repeatedly?** Yes: `setInterval` in `api/notifications/stream/route.ts` (2 queries/10s/tab, indefinitely).
7. **Connections handled correctly?** Yes — Neon pooled endpoint + Prisma singleton. The issue is connection *duration* (SSE holds them), not churn.
8. **Queries efficient?** Yes — indexed, limited, cached where appropriate. The visitor-log admin dump is the one heavy read; visitor writes are the one wasteful write.
9. **Bots?** Minor contributor via `track-visitor` writes and edge requests; not the cause of the overages.
10. **Is the app safe?** Yes — resource limits only. No data loss or corruption.
11. **Can users see errors?** Yes, while Neon is suspended: failed logins, 500s, timeouts, empty data. Resolves after the fix + cycle reset.
12. **Data loss/corruption?** No. Neon suspension preserves everything. `VisitorLog` bloat is reclaimable.
13. **1,000 users?** Fine on free tiers after fixes (~15–30% of invocation quota).
14. **10,000 users?** Exceeds Vercel Hobby invocations and Neon Free storage — time for Vercel Pro (~$20) + Neon Launch (~$19) when traffic actually arrives.
15. **10,000 concurrent?** Not realistic for this app; would require a different realtime architecture anyway. Plan for Scenario B, not D.
16. **Fix first?** Disable the SSE stream (one line in `NotificationBell.tsx`), then bot-filter `track-visitor`.
17. **Need to upgrade Vercel?** No.
18. **Need to upgrade Neon?** No.
19. **Reduce usage without upgrading?** Yes — P0 fixes alone should bring both meters under their free limits.
20. **Monitoring before 10K users?** Fluid memory GB-Hrs weekly, function p95 duration, Neon active hours/day, Sentry DB-error alerts, uptime checks, table-size alerts (items 1–6 in Monitoring section).

---

# TL;DR — What I Should Do Now

1. **Today:** In `src/components/NotificationBell.tsx:142`, change `enabled: true` → `enabled: false` (or return 503 from `src/app/api/notifications/stream/route.ts`). Deploy. Clients fall back to the existing 30s polling + Web Push automatically.
2. **Today:** Add a bot user-agent filter + IP rate limit to `src/app/api/track-visitor/route.ts`.
3. **This week:** Watch both dashboards for 24–48h — Neon active compute hours should show idle gaps; Vercel GB-Hrs should nearly stop growing.
4. **This week:** Verify the Neon project region is Singapore (`apore`) to match Vercel `sin1`; migrate if not.
5. **Next:** Paginate `/admin/visitors` + `/api/admin/visitors/raw`; add a 30–60 day retention job for `VisitorLog`.
6. **Next:** Decide the long-term realtime transport: keep Web Push + slower polling (fine for this product); only reach for a realtime service if a feature truly demands sub-second updates.
7. **Then:** Cache the admin layout badge counts; parallelize the wallet page queries.
8. **Ongoing:** Weekly check of Vercel Fluid memory GB-Hrs + Neon compute hours — your two canary metrics.
9. **Only when real traffic approaches ~1M invocations/month or ~400MB DB:** upgrade to Vercel Pro and Neon Launch. Not before.
10. **Before any big launch:** run a 50-concurrent-user load test and re-read the checklist above.

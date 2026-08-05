# Notification System Architecture Blueprint

**Project:** tutor-connect / nsuOne (Next.js 16 + React 19 + Prisma)
**Status:** Implementation-ready architecture document
**Date:** 2026-08-05
**Branch context:** `admin-redesign` (Admin Dashboard overhaul shipped; Student/Teacher dashboard redesign planned)

> **Single source of truth for the project's notification system.**
> This document is a blueprint, not an implementation. No code in this document should be read as a directive to modify existing files. Every phase in Part IV is scoped to preserve all existing business logic, APIs, authentication, authorization, payments, bookings, and course workflows.

---

## Table of Contents

1. [Project Analysis](#i-project-analysis)
2. [Notification System Audit](#ii-notification-system-audit)
3. [Architecture Analysis](#iii-architecture-analysis)
4. [Notification Lifecycle](#iv-notification-lifecycle)
5. [Role Analysis](#v-role-analysis)
6. [User Journey & Event Matrix](#vi-user-journey--event-matrix)
7. [Notification Categories & Types](#vii-notification-categories--types)
8. [Delivery Channels](#viii-delivery-channels)
9. [Database Review](#ix-database-review)
10. [API Review](#x-api-review)
11. [Frontend UX Review](#xi-frontend-ux-review)
12. [Realtime Architecture Review](#xii-realtime-architecture-review)
13. [Best Practices Review](#xiii-best-practices-review)
14. [Gap Analysis](#xiv-gap-analysis)
15. [Phase-by-Phase Implementation Roadmap](#xv-phase-by-phase-implementation-roadmap)
16. [Regression Protection](#xvi-regression-protection)

---

## I. Project Analysis

### 1.1 Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Auth | NextAuth v4 (JWT strategy) |
| ORM | Prisma |
| Database | PostgreSQL (via Prisma) |
| Email | Resend (`src/lib/mail.ts`) |
| Web Push | `web-push` npm + VAPID (`src/lib/notification.ts`, `public/sw.js`) |
| Observability | Sentry (`instrumentation.ts`) |
| Background jobs | **None** |
| Realtime infra | **None** beyond Web Push (no WebSocket / SSE / socket.io) |

### 1.2 Top-Level Structure

```
src/
  app/
    (marketing)/         public routes — auth, contact, policies
    (member)/            authed routes — dashboard, wallet, student, tutor, consultancy
    admin/               admin-only routes — dashboard, users, requests, wallets, withdrawals…
    api/                 REST endpoints (auth, notifications, settings, visitors)
    actions/             server actions shared across admin/member
  components/            React components (NotificationBell, Topbar, layout, payments…)
  hooks/                 usePushNotifications, useFocusTrap, …
  lib/                   auth, prisma, mail, notification, discord, rateLimit
  types/                 TypeScript declarations
public/
  sw.js                  service worker for push delivery
prisma/
  schema.prisma          canonical data model
  seed.js
```

### 1.3 Role System

Three-tier role model on `User.role`:

- **STUDENT** — requests tutors, submits payments, opens refund/withdrawal requests, books consultancy.
- **TUTOR** — manages `TutorExpertise`, receives allocations, submits withdrawal requests, earns.
- **ADMIN** — operates every `/admin/*` workflow: user management, tutor allocation, payment verification, refund processing, wallet adjustment, withdrawal processing, course/coupon/consultancy CRUD, support tickets.

A user carries a single role; the system does not formally model dual-role users, although the dashboard surface is unified (`/dashboard`) and adapts by role.

### 1.4 Major Domains

| Domain | Key paths |
|---|---|
| Auth | `src/lib/auth.ts`, `src/app/(marketing)/auth/actions/*` |
| Tutor expertise | `src/app/(member)/tutor/expertise`, `src/app/admin/expertises` |
| Tutor requests / matching | `src/app/(member)/student/request-tutor`, `src/app/admin/requests`, `src/app/admin/requests/actions.ts` |
| Payments | `src/app/(member)/student/payments`, `src/app/admin/requests/actions.ts` |
| Wallet | `src/app/(member)/wallet/actions.ts`, `src/app/admin/wallets` |
| Withdrawals | `src/app/(member)/tutor/earnings/actions.ts`, `src/app/admin/withdrawals/actions.ts` |
| Refunds | `src/app/(member)/student/actions.ts` (submit), `src/app/actions/admin.ts` (process) |
| Consultancy | `src/app/(member)/consultancy`, `src/app/admin/consultancy` |
| Courses / departments | `src/app/admin/courses`, `src/app/admin/departments` |
| Support | `src/app/actions/support.ts`, `src/app/admin/support`, `src/app/(marketing)/contact` |
| Admin platform | `src/app/admin/users`, `src/app/admin/coupons`, `src/app/admin/settings`, `src/app/admin/visitors` |
| Notifications | `src/lib/notification.ts`, `src/lib/discord.ts`, `src/app/api/notifications/*`, `src/components/NotificationBell.tsx`, `public/sw.js` |

### 1.5 Prisma Models (names)

User, Department, Course, TutorExpertise, TutorRequest, Payment, WalletTransaction, WithdrawalRequest, Coupon, CouponRedemption, PlatformSetting, ConsultancyTopic, ConsultancyRequest, RefundRequest, SupportTicket, Notification, PushSubscription, VisitorLog, PaymentInfo, PasswordResetRequest, EmailVerificationRequest, PendingRegistration.

### 1.6 Existing Notification Surface (snapshot)

- **In-app store:** `Notification` table (title/message/actionUrl/isRead/createdAt).
- **Web Push:** VAPID-configured `web-push` + service worker; `PushSubscription` stores per-device credentials.
- **Transactional email:** Resend-based, 16+ inline-HTML templates rendered ad-hoc inside server actions.
- **Discord webhooks:** Six `notify*` helpers in `src/lib/discord.ts` used as an internal ops channel for admin awareness.
- **Frontend UX:** Single `NotificationBell` dropdown rendered in `Topbar`; 30 s polling fallback; visibilitychange refetch; deep link via `actionUrl`.

---

## II. Notification System Audit

### 2.1 What Currently Exists

| Capability | Status | Location |
|---|---|---|
| `Notification` table (CRUD-ready) | ✅ | `prisma/schema.prisma` |
| `PushSubscription` table | ✅ | `prisma/schema.prisma` |
| `createNotification(userId, title, message, actionUrl?)` — DB write + web-push fan-out | ✅ | `src/lib/notification.ts:18` |
| Web Push VAPID config + auto-prune of 404/410 subscriptions | ✅ | `src/lib/notification.ts:4-65` |
| Service worker (`push`, `notificationclick`) | ✅ | `public/sw.js` |
| `usePushNotifications` hook (subscribe, register) | ✅ | `src/hooks/usePushNotifications.ts` |
| `GET /api/notifications?limit=` → `{ notifications, unreadCount }` | ✅ | `src/app/api/notifications/route.ts` |
| `PUT /api/notifications/read-all` | ✅ | `src/app/api/notifications/read-all/route.ts` |
| `PUT /api/notifications/[id]/read` (ownership-checked) | ✅ | `src/app/api/notifications/[id]/read/route.ts` |
| `POST /api/notifications/subscribe` (idempotent) | ✅ | `src/app/api/notifications/subscribe/route.ts` |
| `NotificationBell` dropdown, unread badge, mark-read, ARIA, focus trap | ✅ | `src/components/NotificationBell.tsx` |
| 30 s polling fallback + focus-based refetch | ✅ | `src/components/NotificationBell.tsx:40-63` |
| Resend transactional email (`sendNoReplyEmail`, `sendSupportEmail`) | ✅ | `src/lib/mail.ts` |
| Six Discord ops webhooks (`notifyNewCourseRequest`, `notifyPaymentSubmission`, `notifyRefundRequest`, `notifyWithdrawRequest`, `notifyConsultancyRequest`, `notifySupportRequest`) | ✅ | `src/lib/discord.ts` |

### 2.2 Partially Implemented

| Item | Reality | Gap |
|---|---|---|
| Tutor-request submission | Student receives nothing in-app; only a Discord ping (`notifyNewCourseRequest`) | No student-facing confirmation, no persistence |
| Payment submission | Discord-only (`notifyPaymentSubmission`) | No student in-app confirmation, no tutor signal |
| Refund request submission | Discord-only (`notifyRefundRequest`) | No student in-app confirmation |
| Withdrawal request submission | Discord-only (`notifyWithdrawRequest`) | No tutor in-app record |
| Support ticket submission | Email to support + Discord (`notifySupportRequest`); user receives auto-reply only via contact form path | No in-app ticket trail for the user |
| Consultancy request | `createNotification` + email sent (good), but no admin-side in-app notification | Admin relies on dashboard list only |
| Realtime | Web Push works for opted-in devices; everyone else uses 30 s polling | No server-initiated update path for in-app UI |
| Deep linking | `actionUrl` exists but is free-form string; no validation, no typed target resolver | Risk of stale/broken links |

### 2.3 Missing

- **Type/category/priority enum** on `Notification` — every record is an unstructured triple of strings.
- **Notification templates** — every call site composes its own title/message HTML.
- **Notification preferences** — no model, no API, no UI; users cannot mute or pick channels.
- **Bulk operations** beyond "mark all read" — no bulk delete, no filter-by-type, no archive.
- **Pagination / cursor** — `take(limit)` without cursor; lists capped in practice at the client `limit`.
- **Soft delete / archive / retention / TTL** — `Notification` rows live until user cascade-delete.
- **Aggregation / deduplication** — repeated similar events (e.g., multiple new messages) each create a row.
- **Retry / idempotency / outbox** — `createNotification` is fire-and-forget; a failure between DB write and push leaves an unpushed in-app row, and a crashed server action may skip the notification entirely with no replay.
- **Scheduling / reminders** — no "send in 24 h" or "remind me" capability; **no background job infrastructure at all**.
- **Notifications for many events** (see §VI): course approval/rejection, tutor expertise changes, blocking/deletion, role changes, session completion, failed jobs, security events.
- **Admin notification surface** — admins have no in-app notifications; they rely on Discord + dashboard lists.
- **Tests** — zero test coverage for notification code.
- **Observability** — no metrics, no delivery logs, no per-notification status.

### 2.4 Duplicated / Inconsistent

- Two admin action modules overlap conceptually: `src/app/admin/requests/actions.ts` (tutor allocation, payment verification, refund approval) and `src/app/actions/admin.ts` (wallet adjustment, user blocking, coupon/course/consultancy CRUD). Notification logic is sprinkled across both with no shared helper beyond `createNotification`.
- Email HTML is hand-rolled inline at every call site → visual inconsistency, no shared brand header/footer, no central template.
- "Tutor request submitted" → only Discord. "Consultancy request submitted" → in-app + email + Discord. Same kind of event, three different coverage profiles.
- `NotificationBell` calls `/api/notifications?limit=20` directly while the bell hardcodes `20`; the API default is `50`. Mismatch.

### 2.5 What Should Never Change (without explicit migration)

- NextAuth session shape and JWT strategy (`src/lib/auth.ts`).
- The `User.role` enum and three-role model.
- All `/api/notifications/*` route contracts (method, path, response shape) — third-party integrations and the existing client depend on them.
- The `Notification.user` cascade-delete relationship (deletion hygiene depends on it).
- VAPID configuration semantics in `src/lib/notification.ts`.
- Resend as the email provider and the existing `MAIL_FROM_*` configuration surface.
- Discord webhook helper signatures in `src/lib/discord.ts` (admin dashboards reference them).

---

## III. Architecture Analysis

### 3.1 Frontend Flow

```
Topbar
  └── NotificationBell (client)
        ├── usePushNotifications()           ← opt-in push subscription
        ├── fetchNotifications()             ← GET /api/notifications?limit=20
        ├── 30 s polling (when no push sub)  ← setInterval
        ├── visibilitychange refetch         ← immediate on tab focus
        ├── markAsRead(id)                   ← PUT /api/notifications/[id]/read
        ├── markAllAsRead()                  ← PUT /api/notifications/read-all
        └── <Link href={notification.actionUrl}>  ← deep link
Service Worker (public/sw.js)
  ├── push event        → showNotification
  └── notificationclick → focus/open actionUrl
```

State is local `useState` only — no SWR, React Query, Context, or Zustand. Updates are optimistic on the client; the server remains the source of truth but the bell does not refetch after a successful mutation.

### 3.2 Backend Flow

```
server action / route handler
  ├── performs business write (prisma.$transaction)
  ├── await createNotification(userId, title, message, actionUrl?)
  │     ├── prisma.notification.create
  │     ├── prisma.pushSubscription.findMany({ where:{ userId } })
  │     └── Promise.all(subs.map(s => webpush.sendNotification(...)))
  └── (optionally) await sendNoReplyEmail(...) / notifyX*(discord)
```

**Coupling:** notification send happens inline with the business transaction. There is no event bus, no outbox, no queue. If `createNotification` throws, callers either swallow it or let it surface. The DB write and the push fan-out are not atomic — a push failure does not roll back the in-app row, and a DB-write failure suppresses the push entirely.

### 3.3 Database Flow

`Notification` rows are written synchronously by the same server action that performs the originating business write. `userId` is the only lookup key. Unread count is computed live via `prisma.notification.count({ where:{ userId, isRead:false } })` on every list call. There are **no indexes** on `(userId, isRead, createdAt)` — every list and every count is a heap scan today; at scale this is the first thing to fix.

### 3.4 API Flow

| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `/api/notifications` | GET | list + unread count | session |
| `/api/notifications/read-all` | PUT | bulk mark read | session |
| `/api/notifications/[id]/read` | PUT | single mark read | session + ownership |
| `/api/notifications/subscribe` | POST | register push subscription | session |

There is no DELETE, no filter, no pagination cursor, no per-type filter, and no admin endpoint.

### 3.5 Authentication & Authorization

NextAuth JWT session. Every notification route extracts `(session.user as any).id` and scopes queries by it. Ownership is enforced on single-notification writes. The authorization model is correct and should be preserved verbatim.

### 3.6 Notification Lifecycle (current)

```
action → business write → createNotification()
  → DB row inserted
  → push fan-out (best-effort, prune 410/404)
[no read receipt of push delivery]
[no retry on failure]
[no scheduling]
[bell polls or refetches on focus] → user sees row → mark read → row stays forever
```

Stages missing vs. an enterprise lifecycle (§IV): scheduled/deferred delivery, queued outbox, delivery receipts, retry, expiration, archival, hard/soft delete.

### 3.7 State Management

Pure local React state inside `NotificationBell`. No cross-component signal — opening the bell, navigating, or completing an action elsewhere does not refresh the badge. If a push arrives while the tab is open, the badge updates only after the next poll/focus.

### 3.8 Caching

None. No HTTP `Cache-Control`, no SWR cache, no CDN caching of notification payloads (correctly — they are user-scoped).

### 3.9 Scalability & Maintainability

- Heap-scan queries and inline send coupling are the two structural limits today.
- String-typed titles/messages make analytics, preferences, and templates impossible without a migration.
- Lack of templates means visual inconsistency and high maintenance cost (one brand header change → N edits).

---

## IV. Notification Lifecycle

### 4.1 Target Enterprise Lifecycle

```
1. Triggering event (user/system/admin action, time-based)
2. Business transaction commits
3. Event emitted to Notification Service (typed envelope)
4. Notification Service:
   a. resolves template + audience
   b. applies preferences / mute / dedup / aggregation windows
   c. writes Notification row (status=PENDING)
   d. enqueues per-channel deliveries
5. Channel workers (in-app, email, push, future: SMS, browser, webhook):
   a. attempt delivery
   b. record delivery receipt (SENT / FAILED / EXPIRED)
   c. retry with backoff (channel-specific)
6. Client renders, records read receipt
7. Scheduler:
   - reminder derivation
   - TTL expiration → ARCHIVED
   - retention window → soft delete → hard delete
```

### 4.2 Gap vs. Current

| Stage | Today | Gap |
|---|---|---|
| 1 Trigger | inline calls scattered | no central registry |
| 2 Commit boundary | notification may run before/after commit ambiguously | must run after commit |
| 3 Typed envelope | string triple | typed event struct |
| 4 Preferences/dedup | none | missing entirely |
| 5 Channel workers | inline `web-push` + Resend | no worker, no retry |
| 6 Delivery receipts | none | missing |
| 7 Scheduling/retention | none | missing |

---

## V. Role Analysis

### 5.1 Administrator

**Should receive:** new tutor request, new payment submission, new refund request, new withdrawal request, new consultancy request, new support ticket, content report (future), failed job (future), security anomaly (future), abusive-account signal (future).

**Today:** receives **no** in-app notification. All awareness flows through Discord webhooks and dashboard lists. Admins are effectively second-class notification citizens.

**Should differ by:** high signal density, batched where possible (per-admin "5 requests pending" summaries), critical-priority security/ops events surfaced above routine flows.

### 5.2 Teacher (Tutor)

**Should receive:** new tuition allocation, payment verified, withdrawal approved/rejected, refund raised against them (when applicable), student completed session, student left a review, course/expertise change by admin, account status change (block/unblock, role change).

**Today:** receives allocation + payment-verified emails (no in-app) and withdrawal status emails (no in-app). Most other lifecycle events are silent.

### 5.3 Student

**Should receive:** registration welcome, email/password events, tutor assigned, payment verified/rejected, refund approved/rejected, consultancy booked/updated, support ticket created/resolved, course/access change, account status change.

**Today:** well-covered for auth (email) and refund (in-app + email + push). Missing in-app confirmations for several workflows that today only go to Discord.

### 5.4 Dual-Role User (Student + Tutor)

Although not formally modeled, the dashboard shell adapts to role. The notification system **must**:

- Tag every notification with the relevant **context role** (as `recipientRoleHint`) so a user toggling between Student and Tutor surfaces can filter sensibly.
- Default to "all notifications for this user" but expose a per-context filter in the notification center.

---

## VI. User Journey & Event Matrix

Legend — **Delivery**: I = in-app, E = email, P = web push, D = Discord ops, — = none.
**Now** = current behavior. **Target** = blueprint target (channel selection still subject to user preferences in Phase 10).

### 6.1 Authentication & Identity

| Event | Triggered by | Receiver | Priority | Now | Target | Realtime | Persistent | Actionable | Deep link |
|---|---|---|---|---|---|---|---|---|---|
| Registration welcome / OTP | system → user | student/tutor | high | E | I+E | no | yes (auth log) | yes (verify) | `/auth/verify` |
| Email verification (new + existing user) | system | user | high | E | I+E | no | yes | yes | `/auth/verify` |
| Password reset code | system | user | critical | E | I+E | no | yes | yes | `/auth/reset` |
| Password reset success | system | user | high | E | I+E | no | yes | no | `/auth/signin` |
| Login from new device (future) | system | user | high | — | I+E | yes | yes | yes (review) | `/settings/security` |
| Role change by admin | admin | user | critical | — | I+E+P | yes | yes | yes | `/dashboard` |
| Account blocked/unblocked | admin | user | critical | — | I+E | yes | yes | yes (contact support) | `/contact` |

### 6.2 Tutor Expertise & Verification

| Event | Triggered by | Receiver | Priority | Now | Target | Realtime | Persistent | Actionable | Deep link |
|---|---|---|---|---|---|---|---|---|---|
| Tutor adds/updates expertise | tutor | tutor (receipt) | low | — | I | no | yes | no | `/tutor/expertise` |
| Admin modifies tutor expertise | admin | tutor | medium | — | I | yes | yes | yes | `/tutor/expertise` |
| Admin deletes tutor expertise | admin | tutor | high | — | I+E | yes | yes | yes | `/tutor/expertise` |

### 6.3 Tutor Request / Matching

| Event | Triggered by | Receiver | Priority | Now | Target | Realtime | Persistent | Actionable | Deep link |
|---|---|---|---|---|---|---|---|---|---|
| Student submits tutor request | student | student (receipt), admin | med / high | D | I(student)+I+D(admin) | yes (admin) | yes | yes (admin: open) | `/student`, `/admin/requests` |
| Admin assigns tutor | admin | student, tutor | high | I+E (both) | I+E+P (both) | yes | yes | yes | `/student`, `/tutor` |
| Student cancels request | student | admin, tutor | medium | D | I+D | yes (admin) | yes | yes | `/admin/requests` |
| Session completed | student | tutor, admin | medium | — | I | no | yes | yes (review) | `/tutor` |

### 6.4 Payments & Wallet

| Event | Triggered by | Receiver | Priority | Now | Target | Realtime | Persistent | Actionable | Deep link |
|---|---|---|---|---|---|---|---|---|---|
| Student submits payment | student | student (receipt), admin | med / high | D | I+D | yes (admin) | yes | yes (admin: verify) | `/student/payments`, `/admin/requests` |
| Admin verifies payment | admin | student, tutor | critical | E | I+E+P | yes | yes | yes | `/student`, `/tutor` |
| Admin rejects payment | admin | student | high | E | I+E+P | yes | yes | yes (resubmit) | `/student/payments` |
| Wallet recharge (self) | user | user | low | — | I | no | yes | no | `/wallet` |
| Wallet debit (purchase) | system | user | medium | — | I | no | yes | no | `/wallet` |
| Admin balance adjustment | admin | user | high | I+E+P | I+E+P | yes | yes | yes | `/wallet`, `/admin/wallets` |

### 6.5 Withdrawals

| Event | Triggered by | Receiver | Priority | Now | Target | Realtime | Persistent | Actionable | Deep link |
|---|---|---|---|---|---|---|---|---|---|
| Tutor requests withdrawal | tutor | tutor (receipt), admin | high | D | I+D | yes (admin) | yes | yes (admin: process) | `/tutor/earnings`, `/admin/withdrawals` |
| Admin approves withdrawal | admin | tutor | critical | E | I+E+P | yes | yes | no | `/tutor/earnings` |
| Admin rejects withdrawal | admin | tutor | high | E | I+E+P | yes | yes | yes | `/tutor/earnings` |

### 6.6 Refunds

| Event | Triggered by | Receiver | Priority | Now | Target | Realtime | Persistent | Actionable | Deep link |
|---|---|---|---|---|---|---|---|---|---|
| Student requests refund | student | student (receipt), admin | high | D | I+D | yes (admin) | yes | yes (admin: process) | `/student`, `/admin/requests` |
| Admin approves refund | admin | student | critical | I+E+P | I+E+P | yes | yes | no | `/wallet` |
| Admin rejects refund | admin | student | high | I+E+P | I+E+P | yes | yes | yes (contact) | `/student` |

### 6.7 Consultancy

| Event | Triggered by | Receiver | Priority | Now | Target | Realtime | Persistent | Actionable | Deep link |
|---|---|---|---|---|---|---|---|---|---|
| Student books consultancy | student | student, admin | high | I+E + D | I+E+D | yes (admin) | yes | yes (admin: open) | `/consultancy`, `/admin/consultancy` |
| Admin changes consultancy status | admin | student | high | — | I+E | yes | yes | yes | `/consultancy` |
| Admin CRUD on consultancy topics | admin | (system) | low | — | — | no | no | no | — |

### 6.8 Support

| Event | Triggered by | Receiver | Priority | Now | Target | Realtime | Persistent | Actionable | Deep link |
|---|---|---|---|---|---|---|---|---|---|
| User submits support ticket | user | user (receipt), admin | medium | E + D | I+E+D | yes (admin) | yes | yes | `/admin/support` |
| Admin resolves ticket | admin | user | high | E | I+E | yes | yes | yes (reopen) | `/contact` |

### 6.9 Content (Courses / Departments / Coupons)

| Event | Triggered by | Receiver | Priority | Now | Target | Realtime | Persistent | Actionable | Deep link |
|---|---|---|---|---|---|---|---|---|---|
| Admin course CRUD | admin | (system) | low | — | — | no | no | no | — |
| Coupon redemption | user | user (receipt) | low | — | I | no | yes | no | `/wallet` |
| Course reported (future) | student | admin | high | — | I+D | yes | yes | yes | `/admin/courses` |

### 6.10 System & Security

| Event | Triggered by | Receiver | Priority | Now | Target | Realtime | Persistent | Actionable | Deep link |
|---|---|---|---|---|---|---|---|---|---|
| Failed login burst | system | user + admin | high | — | I+E (user), I+D (admin) | yes | yes | yes | `/settings/security` |
| Background job failure (future) | system | admin | critical | — | I+D | yes | yes | yes | `/admin/logs` (future) |
| Rate-limit trip on sensitive route | system | admin | medium | — | I+D | yes | yes | yes | `/admin/users` |

---

## VII. Notification Categories & Types

### 7.1 Categories (recommended enum)

`SYSTEM`, `AUTH`, `SECURITY`, `TUTOR_REQUEST`, `BOOKING`, `PAYMENT`, `WALLET`, `WITHDRAWAL`, `REFUND`, `CONSULTANCY`, `SUPPORT`, `COURSE`, `REVIEW`, `MESSAGE`, `ADMIN`, `ANNOUNCEMENT`.

### 7.2 Types (recommended enum)

`INFO`, `SUCCESS`, `WARNING`, `ERROR`, `CRITICAL`, `REMINDER`, `ACTION_REQUIRED`, `APPROVAL`, `REJECTION`, `SYSTEM`, `ANNOUNCEMENT`.

### 7.3 Priority

`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. Priority drives sort order in the dropdown, badge behavior (critical shows red), and channel selection (critical → push+email+in-app; low → in-app only).

---

## VIII. Delivery Channels

### 8.1 Today

- **In-app:** ✅ (NotificationBell)
- **Web Push:** ✅ (opt-in via VAPID)
- **Email:** ✅ (Resend)
- **Discord ops:** ✅ (admin-only internal)
- **SMS:** ❌
- **Browser Notification (future):** partial — Web Push already produces a native notification via the service worker
- **Webhook (outbound, customer-facing):** ❌
- **Mobile push:** ❌

### 8.2 Target Abstraction

Introduce a `Channel` interface with providers per channel:

```
Channel
├── InAppChannel      (write to Notification table)
├── EmailChannel      (Resend)
├── PushChannel       (web-push; FCM/APNs future)
├── DiscordChannel    (existing webhook helpers)
├── SmsChannel        (stub; future)
└── WebhookChannel    (stub; future)
```

Business logic emits a **typed event**; the Notification Service resolves recipients, applies preferences, and fans out to the channel set. Adding a channel becomes a new provider implementation — no business logic change.

---

## IX. Database Review

### 9.1 Current Schema

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  actionUrl String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 9.2 Issues

1. **No indexes** on `userId`, `(userId, isRead)`, or `createdAt` → heap scans.
2. **No type / category / priority** columns → cannot filter, cannot template, cannot preference.
3. **No soft delete / archived / expiresAt** → infinite growth.
4. **No delivery receipts** → no observability, no retry target.
5. **No de-dup key** → cannot coalesce repeated similar events.
6. **No `recipientRoleHint`** → cannot route dual-role notifications.
7. **No metadata JSON** → callers cannot attach structured context (e.g., `requestId`, `amountBdt`).
8. **`PushSubscription` lacks device metadata** (UA, lastSeen, platform) and an active flag.

### 9.3 Recommended Migration (Phase 2, additive only)

Additive columns (do not remove existing fields):

- `type        String`  (NotificationType enum value)
- `category    String`  (NotificationCategory enum value)
- `priority    String   @default("MEDIUM")`
- `archived    Boolean  @default(false)`
- `readAt      DateTime?`
- `expiresAt   DateTime?`
- `metadata    Json?`
- `dedupKey    String?`
- `actorUserId String?` (who caused it)
- `recipientRoleHint String?`

Indexes:

- `@@index([userId, isRead, createdAt(sort: Desc)])`
- `@@index([userId, archived, createdAt(sort: Desc)])`
- `@@index([dedupKey, createdAt])` (unique optional)
- `@@index([expiresAt])` (for the retention sweeper)

New models (additive):

- `NotificationPreference` — per-user per-category channel matrix.
- `NotificationDelivery` — per-notification per-channel status (sent/failed/expired, attempts, lastError, sentAt).

All existing rows backfill to `type="SYSTEM"`, `category="SYSTEM"`, `priority="MEDIUM"`, `archived=false`, `readAt = isRead ? updatedAt : null`. **No existing row is dropped.**

---

## X. API Review

### 10.1 Existing Endpoints (keep all)

| Endpoint | Method | Notes |
|---|---|---|
| `/api/notifications` | GET | keep; add `cursor`, `type`, `category`, `archived` query params |
| `/api/notifications/read-all` | PUT | keep |
| `/api/notifications/[id]/read` | PUT | keep |
| `/api/notifications/subscribe` | POST | keep |

### 10.2 Missing Endpoints (Phase 4, additive)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/notifications` | DELETE | delete single (soft then hard) |
| `/api/notifications/bulk` | POST | bulk archive/delete/mark-read by filter |
| `/api/notifications/[id]` | DELETE | single archive/delete |
| `/api/notifications/preferences` | GET / PUT | read / update per-user preferences |
| `/api/notifications/unread-count` | GET | cheap badge endpoint (no list payload) |
| `/api/admin/notifications/broadcast` | POST | admin announcement (admin-only) |

### 10.3 Authorization

All endpoints enforce NextAuth session; mutations require ownership (existing pattern in `[id]/read`). Admin endpoints require `session.user.role === "ADMIN"`. No changes to existing route contracts.

### 10.4 Performance

- Today: list query + count query per bell fetch, both heap scans.
- Target: covered compound index, optional `unreadCount`-only endpoint, cursor pagination.

---

## XI. Frontend UX Review

### 11.1 Current State

- Single `NotificationBell` dropdown (350 × 400 px), shared across all dashboards via `Topbar`.
- ARIA: bell label, `aria-haspopup`, `aria-expanded`, dialog role, live region, focus trap (`useFocusTrap`).
- Optimistic mark-as-read; no error rollback; no loading skeleton; no error UI; no toast on failure.
- Hardcoded client `limit=20`; server default 50.
- No filters, no grouping by date/category, no infinite scroll, no pagination.
- No dedicated `/notifications` route — everything lives in the dropdown.
- Mobile: same 350 px dropdown inside a layout that becomes off-canvas below 1024 px; no responsive tuning.

### 11.2 Recommended UX Direction

- **Bell behavior unchanged** as the entry point; keep current polling/focus refetch.
- **New route** `/notifications` for the full Notification Center (filter by category/type/read, date sections, infinite scroll, bulk actions). Bell dropdown becomes a 5-item preview with "View all →" link.
- **Skeletons + error toast** for fetch and mutation failures.
- **Type-aware icons + color accents** per category and priority.
- **Aggregated items** (e.g., "3 new messages") rendered as a single expandable row.
- **Action buttons** on ACTION_REQUIRED items (e.g., "Approve" / "Reject" inline) wired to existing admin endpoints — no new business APIs.
- **Mobile bottom-sheet** treatment under 1024 px.

### 11.3 Accessibility

Current ARIA implementation is strong. Preserve it. Additions:
- `role="log"` for the live notification stream region.
- Visible focus ring on action buttons.
- High-contrast priority accents verified against WCAG AA.

---

## XII. Realtime Architecture Review

### 12.1 Current Realtime

- **Web Push** is the only server-initiated channel; it requires opt-in and a registered service worker, and it produces a native OS notification rather than an in-DOM update.
- **Polling fallback**: 30 s `setInterval` while no push subscription is present, plus an immediate refetch on `visibilitychange`.
- **No WebSocket, SSE, socket.io, Pusher, or in-process event bus.**

### 12.2 Future-Ready Options (documented only; not implemented here)

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **Server-Sent Events (SSE)** | HTTP-native, simple auth, plays well with Next.js route handlers, one-way (which is what we need) | One connection per user; needs sticky sessions or a fanout layer | **Phase 9 recommended baseline** |
| **WebSocket** | Bidirectional, lower latency | Heavier infra, more complex auth | Defer unless bidirectional need appears |
| **Polling** (current) | Trivial | Wasteful, latency floor | Keep as graceful fallback |
| **Queue + worker fanout** | Durable, retryable, decouples send from business transaction | Requires queue infra (none today) | Introduce when outbox/Phase 4 lands |

**Recommendation:** in Phase 9, layer an SSE endpoint (`/api/notifications/stream`) behind the existing auth, broadcasting only to the owning user; keep Web Push for OS-level delivery; keep polling as the ultimate fallback. Business logic never talks to SSE directly — it talks to the Notification Service, which writes a row and the SSE subscriber picks it up via Postgres LISTEN/NOTIFY (or polling inside the SSE producer).

---

## XIII. Best Practices Review

| Dimension | Today | Target |
|---|---|---|
| Scalability | heap scans, inline send | indexes, channel workers, queue |
| Maintainability | stringly-typed, duplicated templates | typed events + central templates |
| Loose coupling | inline calls at every action site | Notification Service boundary |
| Event-driven | none | typed event envelope + dispatcher |
| Performance | count + list on every poll | covered index + cheap unread-count endpoint |
| Security | ownership + session enforced | preserve; add rate-limit on broadcast + preferences writes |
| Extensibility | adding a channel touches N call sites | add a `Channel` provider |
| Testing | none | unit tests on dispatcher, templates, preferences; integration tests on endpoints; e2e on bell |
| Monitoring | console.error only | Sentry already wired; add per-channel delivery metrics |
| Observability | none | `NotificationDelivery` table + dashboards |
| Failure recovery | fire-and-forget | outbox + retry with exponential backoff |
| Idempotency | none | `dedupKey` unique constraint + idempotent channel workers |
| Retry strategy | none | per-channel retry policy (push 3×, email 5× exponential) |
| Rate limiting | `src/lib/rateLimit.ts` exists | apply to broadcast + preferences writes |
| Preferences / mute | none | `NotificationPreference` model + UI |
| Future push (mobile) | blocked by single-channel push impl | `Channel` abstraction unblocks FCM/APNs later |
| Future mobile apps | n/a | typed events + preferences model portable to a future API |

---

## XIV. Gap Analysis

### 14.1 Already Implemented (preserve, do not touch)

- In-app `Notification` CRUD primitives.
- Web Push subscription lifecycle (including 410/404 auto-prune).
- Resend-based email helpers and existing transactional sends.
- Discord webhook helpers.
- NextAuth-scoped notification endpoints.
- `NotificationBell` dropdown + ARIA + focus trap.
- Polling + visibilitychange refresh fallbacks.

### 14.2 Partially Implemented (complete in Phase 3-5)

- Student in-app confirmations for tutor request / payment / refund submission (currently Discord-only).
- Admin in-app surface (currently none).
- Email templates (exist but inconsistent and inline).
- Deep linking (exists but unvalidated).

### 14.3 Missing (introduce in Phases 2-13)

Prioritized:

1. **P0** — DB indexes (performance), typed event envelope, central templates, single-notification + bulk delete.
2. **P1** — Notification Preferences model + API + UI, admin in-app notification surface, Notification Center page.
3. **P2** — Delivery receipts + retry + outbox, SSE realtime, scheduling + reminders, retention sweeper.
4. **P3** — Broadcast/announcement tooling, per-event analytics, SMS/webhook/mobile-push channel stubs.

---

## XV. Phase-by-Phase Implementation Roadmap

> **Hard rule for every phase:** no change to business logic, no change to API behavior, no change to auth, authorization, dashboards, course/payment/booking/refund/withdrawal workflows. Every phase is additive or internally refactor-only. Each phase ships behind the existing API contract.

### Phase 1 — Current System Audit (this document)

- **Objective:** Lock the baseline.
- **Reason:** Every later phase references §II and §VI as the contract.
- **Files involved:** none.
- **Dependencies:** none.
- **Risk:** none.
- **Testing:** n/a.
- **Acceptance:** this document reviewed and approved.
- **Rollback:** n/a.
- **Complexity:** trivial.
- **User impact:** none.

### Phase 2 — Notification Database Improvements

- **Objective:** Additive Prisma migration adding type/category/priority/archived/readAt/expiresAt/metadata/dedupKey/actorUserId/recipientRoleHint, indexes, `NotificationPreference`, `NotificationDelivery`. Backfill existing rows.
- **Reason:** everything downstream (templates, preferences, analytics, retention) needs these columns.
- **Files likely involved:** `prisma/schema.prisma`, new `prisma/migrations/...`.
- **Dependencies:** none.
- **Risk:** low — additive only; existing queries untouched.
- **Testing:** migration on a clone DB; verify existing bell still works end-to-end.
- **Acceptance:** migration applies cleanly; existing app behavior unchanged; new columns queryable.
- **Rollback:** drop new columns/models (no existing data depends on them).
- **Migration notes:** backfill `type="SYSTEM"`, `category="SYSTEM"`, `priority="MEDIUM"`, `readAt` from `isRead`.
- **Complexity:** low-medium.
- **User impact:** none visible.

### Phase 3 — Backend Event Standardization

- **Objective:** Introduce a typed `NotificationEvent` envelope + a single `NotificationService.dispatch(event)` entry point. Keep `createNotification` signature intact as a thin delegator so existing call sites still work.
- **Reason:** removes scattered stringly-typed construction; lets future channels hook in without touching call sites.
- **Files likely involved:** new `src/lib/notifications/types.ts`, `src/lib/notifications/service.ts`, `src/lib/notifications/templates.ts`, `src/lib/notifications/events/*.ts`. Existing `src/lib/notification.ts` becomes a façade.
- **Dependencies:** Phase 2.
- **Risk:** medium — refactor risk; mitigate by keeping `createNotification` signature unchanged.
- **Testing:** unit tests on dispatcher + templates; golden-file tests on rendered titles/messages; integration tests on all six existing `createNotification` call sites.
- **Acceptance:** all six existing call sites produce byte-identical Notification rows + identical emails + identical pushes as before; new typed events exist but are not yet required.
- **Rollback:** revert to direct `createNotification`.
- **Complexity:** medium.
- **User impact:** none.

### Phase 4 — Notification Service Refactoring (channels + outbox + receipts)

- **Objective:** Implement `Channel` providers (InApp, Email, Push, Discord) behind the service; introduce `NotificationDelivery` writes; add per-channel retry with exponential backoff and an outbox table (or in-transaction write + async sweeper) so the business commit boundary is respected.
- **Reason:** durability, observability, retry — the foundation for everything realtime and analytical later.
- **Files likely involved:** `src/lib/notifications/channels/*`, `src/lib/notifications/outbox.ts`, `src/app/api/notifications/*` (additive endpoints only).
- **Dependencies:** Phase 2, Phase 3.
- **Risk:** medium — must preserve exact current send behavior for in-app/email/push.
- **Testing:** contract tests asserting identical output across old/new path; chaos test injecting channel failure and verifying retry + final failure row.
- **Acceptance:** existing notifications still deliver; new failures are recorded as `NotificationDelivery(status=FAILED)` rather than swallowed.
- **Rollback:** disable channel fan-out, route everything back through `createNotification`'s current direct path.
- **Complexity:** high.
- **User impact:** none visible (better reliability).

### Phase 5 — Admin Notifications (in-app surface)

- **Objective:** Make admins first-class notification recipients for the events listed in §6.1–6.10 (tutor request, payment submission, refund request, withdrawal request, consultancy request, support ticket, future system/security events). Replace ad-hoc "Discord-only" gaps with in-app rows for admins while preserving Discord pings.
- **Reason:** admins today rely on dashboards + Discord; an in-app surface enables batching, filters, and analytics.
- **Files likely involved:** `src/app/admin/requests/actions.ts`, `src/app/actions/admin.ts`, `src/app/admin/withdrawals/actions.ts`, `src/app/actions/support.ts`, plus typed event emitters from Phase 3.
- **Dependencies:** Phase 3, Phase 4.
- **Risk:** medium — touches admin workflows; rule is to **add** notifications without altering any control flow or response payload.
- **Testing:** per-action integration tests asserting (a) original behavior unchanged, (b) Notification row(s) created for the correct admin recipient(s).
- **Acceptance:** every listed admin event produces an in-app row; Discord pings unchanged.
- **Rollback:** remove new emitter calls; original behavior intact.
- **Complexity:** medium.
- **User impact:** admins see notifications in the bell for the first time.

### Phase 6 — Teacher Notifications

- **Objective:** Fill teacher-side gaps (expertise change by admin, account blocked/unblocked, role change, session completed, review received). Convert existing email-only teacher notifications to also create in-app rows.
- **Reason:** parity with student experience; teachers currently silent on important events.
- **Files likely involved:** `src/app/actions/admin.ts`, `src/app/admin/requests/actions.ts`, `src/app/admin/withdrawals/actions.ts`, `src/app/(member)/student/actions.ts` (session completion hook).
- **Dependencies:** Phase 3, Phase 4.
- **Risk:** medium.
- **Testing:** per-event assertions on in-app row + email send + (where applicable) push.
- **Acceptance:** all teacher events from §VI produce the specified channel set.
- **Rollback:** remove new emitter calls.
- **Complexity:** medium.
- **User impact:** teachers gain actionable in-app signals.

### Phase 7 — Student Notifications

- **Objective:** Fill student-side gaps (in-app confirmation for tutor request / payment / refund submission, course/access change, consultancy status change, support ticket lifecycle, account status change).
- **Reason:** students today only get Discord-facing signals for their own submissions.
- **Files likely involved:** `src/app/(member)/student/actions.ts`, `src/app/(member)/consultancy/page.tsx`, `src/app/actions/support.ts`, `src/app/actions/admin.ts`.
- **Dependencies:** Phase 3, Phase 4.
- **Risk:** medium.
- **Testing:** same pattern as Phase 5/6.
- **Acceptance:** all student events from §VI produce the specified channel set.
- **Rollback:** remove new emitter calls.
- **Complexity:** medium.
- **User impact:** students gain immediate in-app confirmation of submissions.

### Phase 8 — Shared Notification Center

- **Objective:** Build a dedicated `/notifications` route with category/type filters, date sections, infinite scroll, bulk actions, ACTION_REQUIRED inline actions, mobile bottom-sheet. Keep `NotificationBell` as a 5-item preview with "View all →" link. Bell behavior preserved.
- **Reason:** the dropdown has hit its complexity ceiling.
- **Files likely involved:** new `src/app/(member)/notifications/page.tsx` and components; additive changes to `NotificationBell.tsx` (preview + link).
- **Dependencies:** Phase 2 (filter columns), Phase 4 (new endpoints).
- **Risk:** low-medium — UI-only; no business logic touched.
- **Testing:** component tests; e2e on filter + bulk action flows.
- **Acceptance:** bell works exactly as before for the top-5 preview; Notification Center renders all items with filters working.
- **Rollback:** hide the route, restore bell-only.
- **Complexity:** medium.
- **User impact:** major positive — full-fidelity notification UX.

### Phase 9 — Realtime Preparation (SSE)

- **Objective:** Add `/api/notifications/stream` SSE endpoint; service worker not required; backend pushes new rows for the authenticated user only. Keep polling as fallback when SSE is unavailable.
- **Reason:** sub-second badge updates without OS push opt-in.
- **Files likely involved:** new `src/app/api/notifications/stream/route.ts`; new `src/hooks/useNotificationStream.ts`; `NotificationBell.tsx` chooses SSE → push → polling in that order.
- **Dependencies:** Phase 4.
- **Risk:** medium — long-lived connections; mitigate by sticky-session expectation or short-reconnect strategy.
- **Testing:** integration test with two sessions asserting badge update within N seconds.
- **Acceptance:** tab-open + new event → badge updates without manual refresh; polling still works if SSE fails.
- **Rollback:** disable the SSE route; client falls back.
- **Complexity:** medium-high.
- **User impact:** faster, smoother updates.

### Phase 10 — Notification Preferences

- **Objective:** Surface `NotificationPreference` (per-category × per-channel matrix) via API + settings UI. Default = current behavior (everything on). Channels honor preferences before send.
- **Reason:** user agency, reduced notification fatigue, future regulatory compliance.
- **Files likely involved:** `src/app/(member)/settings/notifications/*`, `src/app/api/notifications/preferences/*`, channel providers from Phase 4.
- **Dependencies:** Phase 2, Phase 4.
- **Risk:** medium — must never accidentally suppress critical (CRITICAL priority, security/auth) notifications; these remain non-mutable.
- **Testing:** unit tests on preference resolver; property test asserting CRITICAL events ignore preferences.
- **Acceptance:** users can mute non-critical categories per channel; critical events always deliver.
- **Rollback:** treat all preferences as "on".
- **Complexity:** medium.
- **User impact:** major positive — control over their feed.

### Phase 11 — Accessibility Hardening

- **Objective:** Audit Notification Center + preferences + bell against WCAG 2.2 AA; add `role="log"`, visible focus rings, high-contrast priority accents, keyboard-only flows for bulk actions.
- **Reason:** the existing bell is good; the new surfaces must match.
- **Files likely involved:** Notification Center + preferences components.
- **Dependencies:** Phase 8, Phase 10.
- **Risk:** low.
- **Testing:** axe + manual keyboard pass.
- **Acceptance:** zero critical a11y issues.
- **Rollback:** n/a (CSS/DOM only).
- **Complexity:** low.
- **User impact:** positive for assistive-tech users.

### Phase 12 — Performance Optimization

- **Objective:** Cover the hot queries with the Phase 2 indexes in practice; add `/api/notifications/unread-count` cheap endpoint; cache the bell badge per session for a short TTL; add cursor pagination to Notification Center.
- **Reason:** bell fetch is the highest-frequency request in the app.
- **Files likely involved:** `src/app/api/notifications/*`, `NotificationBell.tsx`.
- **Dependencies:** Phase 2, Phase 8.
- **Risk:** low — query optimization + a new endpoint.
- **Testing:** load test bell endpoint at N RPS.
- **Acceptance:** p95 bell fetch < 100 ms at production scale.
- **Rollback:** revert to list endpoint.
- **Complexity:** low-medium.
- **User impact:** snappier UI.

### Phase 13 — Regression Testing

- **Objective:** End-to-end regression of every workflow in §VI before any of Phases 2-12 are considered "done" in aggregate. Both automated (Playwright) and manual.
- **Reason:** the cardinal rule — **no business behavior changes**.
- **Files likely involved:** new tests under `tests/notifications/*`.
- **Dependencies:** all prior phases.
- **Risk:** none (testing only).
- **Testing:** the regression suite itself.
- **Acceptance:** every workflow produces its prior business outcome; new Notification rows are additive only.
- **Rollback:** n/a.
- **Complexity:** medium.
- **User impact:** none.

### Phase 14 — Documentation

- **Objective:** Update `AGENTS.md` / `CLAUDE.md` / new `docs/notifications.md` with: event catalog, template authoring guide, channel provider guide, preference rules, runbook for retry failures.
- **Reason:** the system is now extensible; onboarding must be self-serve.
- **Files involved:** docs only.
- **Dependencies:** all prior phases.
- **Risk:** none.
- **Testing:** review.
- **Acceptance:** a new engineer can add a notification end-to-end from the doc alone.
- **Rollback:** n/a.
- **Complexity:** low.
- **User impact:** none.

---

## XVI. Regression Protection

The following are **invariants** that every phase must respect. Any phase that cannot satisfy them must be re-scoped.

1. **No existing business logic changes.** Every server action in `src/app/actions/*`, `src/app/admin/*/actions.ts`, and `src/app/(member)/*/actions.ts` must produce the same database effect, the same response payload, and the same control flow.
2. **No existing API behavior changes.** `/api/notifications`, `/api/notifications/read-all`, `/api/notifications/[id]/read`, `/api/notifications/subscribe` keep method, path, request shape, response shape, and status codes. New parameters and new endpoints are allowed; changes to existing ones are not.
3. **No authentication changes.** NextAuth config, session shape, JWT strategy untouched.
4. **No authorization changes.** Ownership checks, admin guards, role checks untouched.
5. **No dashboard functionality changes.** `/dashboard`, `/admin/*`, `/student`, `/tutor`, `/wallet`, `/consultancy` surfaces keep their current capabilities.
6. **No course workflow changes.** Course CRUD, departments, coupons untouched.
7. **No payment workflow changes.** Payment submission, verification, rejection, MFS integration untouched.
8. **No booking workflow changes.** Tutor request, allocation, cancellation, completion untouched.
9. **Only notification architecture and UX should evolve.** New columns, new models, new templates, new endpoints, new UI — all welcome; existing contracts, all preserved.
10. **Critical notifications are non-suppressible.** Even after preferences (Phase 10), CRITICAL priority events (security, auth, account status) always deliver on every available channel.

---

*End of blueprint.*

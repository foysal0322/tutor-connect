# Notification System — Manual Regression Checklist

**Phase 13 deliverable.** Use this checklist before declaring any notification
phase "done" in aggregate. It walks through every event in the blueprint's
§VI matrix and verifies the **business outcome is unchanged** while the new
Notification rows are additive.

> **Invariant (blueprint §XVI):** no existing business logic, API behavior,
> auth, authorization, dashboard, course, payment, booking, refund, or
> withdrawal workflow may change. New Notification rows are additive only.

## How to use this checklist

For each event below, perform the action on a clean staging DB and verify:

1. **Business outcome** — the action still produces its pre-notification effect
   (DB write, status transition, email, Discord ping, payment).
2. **Additive Notification rows** — the new in-app row(s) appear for the
   listed recipient(s).
3. **Channels** — the channel set matches the blueprint target column.
4. **Preferences honor** — muting a category suppresses EMAIL/PUSH for
   non-critical events; CRITICAL/AUTH/SECURITY events always deliver.

---

## §6.1 Authentication & Identity

- [ ] **Role change by admin** → user receives in-app CRITICAL notification
  (regardless of preferences). Verify role still changes in DB.
- [ ] **Account blocked/unblocked** → user receives in-app CRITICAL
  notification. Verify `isBlocked` toggles correctly and login is gated.

## §6.2 Tutor Expertise

- [ ] **Admin updates tutor expertise** (`/admin/expertises`) → tutor gets
  in-app INFO notification. Verify expertise row updates.
- [ ] **Admin deletes tutor expertise** → tutor gets in-app WARNING. Verify
  row is removed.

## §6.3 Tutor Request / Matching

- [ ] **Student submits tutor request** →
  - student receipt (INFO, low priority) appears in bell
  - admin(s) get in-app ACTION_REQUIRED row
  - Discord `notifyNewCourseRequest` still fires
- [ ] **Admin assigns tutor** →
  - student gets `Tutor Assigned` in-app
  - tutor gets `New Tuition Allocation!` typed event (BOOKING/HIGH)
  - emails to both still send
  - request status flips to MATCHED
- [ ] **Student cancels pending request** → admin notified; request status
  flips to CANCELLED.
- [ ] **Student marks session complete** (`completeTutorRequest`) →
  - assigned tutor gets SESSION_COMPLETED notification
  - admins get BATCHED notification
  - rating/review recorded
  - request status → COMPLETED

## §6.4 Payments & Wallet

- [ ] **Student submits payment** →
  - student receipt in-app
  - admin(s) in-app ACTION_REQUIRED
  - Discord `notifyPaymentSubmission` fires
  - payment record created, request status updates
- [ ] **Admin verifies payment (approve)** →
  - student gets PAYMENT.VERIFIED (CRITICAL) in-app
  - tutor gets TUTOR.PAYMENT_VERIFIED in-app
  - emails to both still send
  - request status → ACCEPTED
- [ ] **Admin rejects payment** →
  - student gets PAYMENT.REJECTED in-app
  - email still sends
  - payment record deleted, request → MATCHED
- [ ] **Admin wallet adjustment** →
  - user gets typed WALLET.ADJUSTED event
  - email still sends
  - WalletTransaction row recorded
  - balance updates atomically; insufficient-balance guard works

## §6.5 Withdrawals

- [ ] **Tutor requests withdrawal** →
  - admin(s) in-app ACTION_REQUIRED
  - Discord `notifyWithdrawRequest` fires
  - balance check enforced
- [ ] **Admin approves withdrawal** →
  - tutor gets WITHDRAWAL.APPROVED in-app
  - email still sends
  - status → APPROVED
- [ ] **Admin rejects withdrawal** →
  - tutor gets WITHDRAWAL.REJECTED in-app
  - email still sends
  - status → REJECTED

## §6.6 Refunds

- [ ] **Student requests refund** →
  - student receipt in-app
  - admin(s) in-app ACTION_REQUIRED
  - Discord `notifyRefundRequest` fires
- [ ] **Admin approves refund** →
  - student gets typed REFUND.APPROVED (CRITICAL)
  - email still sends
  - wallet credited atomically; WalletTransaction recorded
  - request status → CANCELLED
- [ ] **Admin rejects refund** →
  - student gets typed REFUND.REJECTED
  - email still sends

## §6.7 Consultancy

- [ ] **Student books consultancy** →
  - student gets typed CONSULTANCY.BOOKED
  - admin(s) in-app ACTION_REQUIRED
  - confirmation email still sends
- [ ] **Admin changes consultancy status** →
  - student gets CONSULTANCY.STATUS_CHANGED
  - status transitions correctly

## §6.8 Support

- [ ] **User submits support ticket** →
  - if user has an NSUone account matching ticket email, in-app receipt
  - admin(s) in-app INFO
  - Discord + confirmation email still fire
- [ ] **Admin resolves ticket** →
  - if matching user exists, in-app SUPPORT.RESOLVED
  - resolution email still sends

## §6.9 Content

- [ ] **Admin course/department/coupon CRUD** → no notifications required
  (per blueprint §6.9 — these are (system) targets with no recipient).

---

## Preferences — Phase 10 contract

For each of the following, mute the category via `/settings/notifications`
and trigger an event:

- [ ] **Mute WALLET for EMAIL** → next admin wallet adjustment: no email,
  in-app still appears, dispatch still records the row.
- [ ] **Mute PAYMENT for PUSH** → next payment.verified: no push delivery
  (NotificationDelivery(PUSH) NOT created), in-app + email fire normally.
- [ ] **Mute SUPPORT entirely (EMAIL + PUSH)** → next support.resolved:
  Notification row still created, deliveries only IN_APP.
- [ ] **AUTH category is locked** → cannot be muted in UI; attempts to POST
  `category: 'AUTH'` to `/api/notifications/preferences` are silently
  dropped (server enforces).
- [ ] **SECURITY category is locked** → same as AUTH.
- [ ] **CRITICAL priority event** (`user.blocked`, `payment.verified`,
  `refund.approved`, `user.role_changed`) → fires on every channel even
  when the user has muted the category.
- [ ] **Default state** → fresh user (no preference rows) receives every
  notification on every channel (byte-identical to pre-Phase-10).

---

## Performance — Phase 12 contract

- [ ] **Bell polling does not fetch the list when count is unchanged.**
  Open DevTools Network tab. With the bell closed and no realtime transport,
  wait 60s. Observe: requests to `/api/notifications/unread-count` only —
  NOT `/api/notifications?limit=5` on every cycle. The list fetch happens
  only when the count delta is non-zero.
- [ ] **Badge updates immediately on local mutation.** Click "Mark all as
  read" — badge drops to 0 without waiting for the next poll.
- [ ] **`Cache-Control: private, max-age=5`** present on the unread-count
  response. Inspect headers in DevTools.
- [ ] **SSE still preferred.** When the SSE transport connects, periodic
  polling stops entirely. Verify in Network tab: no `/unread-count` polls
  while `EventSource` is open.
- [ ] **p95 bell fetch < 100ms** at production scale (load test with 10k
  notification rows; index on `(userId, isRead, createdAt)` should keep
  this fast).

---

## API contracts — Phase 8/12 invariants

These must not regress:

- [ ] `GET /api/notifications` (no params) returns `{ notifications,
  unreadCount, nextCursor }` — `nextCursor` is additive.
- [ ] `GET /api/notifications?limit=5` returns at most 5 items.
- [ ] `GET /api/notifications?cursor=X` returns the next page.
- [ ] `GET /api/notifications?category=PAYMENT` filters by category.
- [ ] `GET /api/notifications?archived=true` returns archived rows.
- [ ] `PUT /api/notifications/[id]/read` — 404 when id belongs to another
  user.
- [ ] `PUT /api/notifications/read-all` — only marks caller's rows.
- [ ] `DELETE /api/notifications/[id]` — archives (does not hard-delete);
  ownership-checked.
- [ ] `POST /api/notifications/bulk` — always scoped by userId; foreign
  IDs in `ids[]` silently no-op.
- [ ] `GET /api/notifications/unread-count` — returns `{ unreadCount }`
  only; respects archived=false.
- [ ] `GET /api/notifications/preferences` — returns full matrix with
  defaults for missing rows.
- [ ] `PUT /api/notifications/preferences` — rejects AUTH/SECURITY; never
  accepts `channelInApp: false`.
- [ ] `GET /api/notifications/stream` — 401 when unauth; pushes `ready`,
  `notification`, `unread` events for the owning user only.

---

## Automated coverage

Unit tests in `src/lib/notifications/__tests__/preferences.test.ts` cover
the pure preference-filter logic (15 assertions). Run with `npm test`.

Adding Playwright e2e tests of the full notification flow is a separate
infrastructure decision — the manual checklist above covers the same
behavior surface in the interim.

# Notification System

This document is the **operating manual** for the tutor-connect notification
system. The blueprint at [`NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md`](../NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md)
is the architecture source-of-truth; this doc is the day-to-day reference
for engineers adding or debugging notifications.

**Phases implemented:** 1–14 (audit, schema, dispatch, channels, admin/
teacher/student events, Notification Center, realtime SSE, preferences,
accessibility, performance, regression tests, documentation).

---

## Table of contents

1. [Mental model](#mental-model)
2. [Event catalog](#event-catalog)
3. [Adding a new notification](#adding-a-new-notification)
4. [Template authoring guide](#template-authoring-guide)
5. [Channel provider guide](#channel-provider-guide)
6. [Preferences rules](#preferences-rules)
7. [Realtime transport](#realtime-transport)
8. [Performance characteristics](#performance-characteristics)
9. [Runbook: retry failures](#runbook-retry-failures)
10. [Testing](#testing)

---

## Mental model

Every notification starts as a **typed event** handed to a single entry
point:

```
business action
  └── dispatch({ event, userId, title, message, ... })
        ├── resolves channels (event.channels or [IN_APP, PUSH])
        ├── applies preferences (CRITICAL bypass, AUTH/SECURITY bypass)
        ├── writes Notification row + PENDING NotificationDelivery rows
        │   (single transaction — commit boundary respected)
        └── after commit: attempts each channel inline
              ├── InApp (no-op; the row IS the delivery)
              ├── Push (web-push via VAPID; 410/404 auto-prune)
              ├── Email (Resend; only when event specifies channels)
              └── Discord (webhook; admin/ops channel)
```

The `createNotification(userId, title, message, actionUrl?)` legacy façade
still exists for backward compatibility — it delegates to `dispatch` with
`event: "legacy.raw"` and the default channel set.

**Hard rule:** business logic, API contracts, auth, and dashboards are
never touched by notification changes. New notifications are additive.

---

## Event catalog

Every event currently emitted by the system, grouped by recipient. The
`event` string is the analytics key; recipients and channels reflect the
default (preferences may suppress EMAIL/PUSH).

### Admin recipients (via `notifyAdmins()`)

| Event | Triggered by | Priority | Category | Channels |
|---|---|---|---|---|
| `tutor_request.submitted` | student submits tutor request | HIGH | TUTOR_REQUEST | in-app |
| `tutor_request.cancelled` | student cancels pending request | MEDIUM | TUTOR_REQUEST | in-app |
| `tutor_request.completed` | student marks session complete | LOW | BOOKING | in-app |
| `payment.submitted` | student submits payment | HIGH | PAYMENT | in-app |
| `refund.submitted` | student requests refund | HIGH | REFUND | in-app |
| `withdrawal.submitted` | tutor requests withdrawal | HIGH | WITHDRAWAL | in-app |
| `consultancy.submitted` | student books consultancy | HIGH | CONSULTANCY | in-app |
| `support.submitted` | user submits support ticket | MEDIUM | SUPPORT | in-app |

### Tutor recipients

| Event | Triggered by | Priority | Category | Channels |
|---|---|---|---|---|
| `tutor.allocated` | admin assigns tutor to request | HIGH | BOOKING | in-app, push |
| `tutor.payment_verified` | admin verifies student payment | HIGH | PAYMENT | in-app, push |
| `tutor.session_completed` | student marks session complete | MEDIUM | BOOKING | in-app, push |
| `tutor.expertise_updated` | admin edits tutor expertise | MEDIUM | COURSE | in-app, push |
| `tutor.expertise_deleted` | admin deletes tutor expertise | HIGH | COURSE | in-app, push |
| `withdrawal.approved` | admin approves withdrawal | HIGH | WITHDRAWAL | in-app, push |
| `withdrawal.rejected` | admin rejects withdrawal | HIGH | WITHDRAWAL | in-app, push |

### Student recipients

| Event | Triggered by | Priority | Category | Channels |
|---|---|---|---|---|
| `payment.verified` | admin verifies payment | CRITICAL | PAYMENT | in-app, push |
| `payment.rejected` | admin rejects payment | HIGH | PAYMENT | in-app, push |
| `refund.approved` | admin approves refund | CRITICAL | REFUND | in-app, push |
| `refund.rejected` | admin rejects refund | HIGH | REFUND | in-app, push |
| `tutor_request.submitted_receipt` | student submits tutor request | LOW | TUTOR_REQUEST | in-app, push |
| `payment.submitted_receipt` | student submits payment | MEDIUM | PAYMENT | in-app, push |
| `refund.submitted_receipt` | student requests refund | MEDIUM | REFUND | in-app, push |
| `consultancy.booked` | student books consultancy | HIGH | CONSULTANCY | in-app, push |
| `consultancy.status_changed` | admin changes consultancy status | HIGH | CONSULTANCY | in-app, push |

### User-level (any role)

| Event | Triggered by | Priority | Category | Channels |
|---|---|---|---|---|
| `wallet.adjusted` | admin credits/debits wallet | HIGH | WALLET | in-app, push |
| `user.blocked` | admin blocks user | CRITICAL | SECURITY | in-app, push |
| `user.unblocked` | admin unblocks user | CRITICAL | SECURITY | in-app, push |
| `user.role_changed` | admin changes user role | CRITICAL | AUTH | in-app, push |
| `support.submitted_receipt` | user submits support ticket | LOW | SUPPORT | in-app, push |
| `support.resolved` | admin resolves ticket | MEDIUM | SUPPORT | in-app, push |

---

## Adding a new notification

1. **Pick a unique `event` string.** Convention: `domain.verb` (e.g.
   `refund.approved`, `tutor.expertise_updated`). The string is the
   analytics/dedup key.

2. **Decide recipient + channel set.** See the catalog above for the
   pattern. Most events use the default `[IN_APP, PUSH]` channel set;
   admin events go through `notifyAdmins()` which fans out one row per
   admin.

3. **Call `dispatch()` from the server action after the business write
   commits.** Always wrap in try/catch so notification failures never
   surface into the business transaction:

   ```typescript
   import { dispatch } from '@/lib/notifications/service';

   try {
     await dispatch({
       event: 'your_domain.your_verb',
       userId: recipientId,
       title: 'Short title',
       message: 'One-sentence body.',
       actionUrl: '/path/to/deep/link',
       type: 'INFO',           // INFO | SUCCESS | WARNING | ERROR | CRITICAL | REMINDER | ACTION_REQUIRED | APPROVAL | REJECTION | SYSTEM | ANNOUNCEMENT
       category: 'YOUR_DOMAIN',// see types.ts NotificationCategory
       priority: 'MEDIUM',     // LOW | MEDIUM | HIGH | CRITICAL
       actorUserId: actionTakerId,
       recipientRoleHint: 'STUDENT', // STUDENT | TUTOR | ADMIN
       metadata: { requestId, amount }, // free-form JSON
     });
   } catch (err) {
     console.error('Failed to notify:', err);
   }
   ```

4. **For admin fan-out**, use `notifyAdmins()` instead of `dispatch()`. It
   creates one row per non-blocked admin automatically.

5. **If the event should bypass user preferences** (security-critical),
   set `priority: 'CRITICAL'` or use the AUTH/SECURITY category. The
   resolver enforces non-suppression for both.

6. **Update the catalog** in this document.

---

## Template authoring guide

Templates are optional. Today every event supplies inline `title` and
`message`; the template registry (`src/lib/notifications/templates.ts`)
exists as scaffolding for the future.

When to register a template:

- The same `event` is emitted from multiple call sites with identical copy.
- You want to A/B test notification wording without code changes.
- You need analytics on rendered titles without parsing free-form strings.

To register:

```typescript
import { registerTemplate } from '@/lib/notifications/templates';

registerTemplate({
  event: 'refund.approved',
  type: 'SUCCESS',
  category: 'REFUND',
  priority: 'CRITICAL',
  actionUrl: '/wallet',
  resolve: (metadata) => ({
    title: 'Refund Approved',
    message: `${metadata.amount} BDT has been credited to your wallet.`,
  }),
});
```

When `dispatch` receives an event without inline `title`/`message`, it
falls back to the template registry. Inline values always win.

---

## Channel provider guide

Adding a new delivery channel (e.g. SMS, mobile push, outbound webhook)
takes three steps:

1. **Implement the `NotificationChannel` interface** in
   `src/lib/notifications/channels/`. The contract is in `types.ts`:

   ```typescript
   export interface NotificationChannel {
     name: ChannelName;
     send(payload: ChannelPayload): Promise<ChannelSendOutcome>;
     retryPolicy: RetryPolicy;
   }
   ```

   - `send()` returns `{ status: 'SENT' | 'FAILED' | 'EXPIRED',
     recipientCount?, error? }`. EXPIRED is for "endpoint gone, stop
     retrying" (e.g. 410 Gone on push).
   - `retryPolicy.maxAttempts` includes the first inline attempt. The
     outbox sweeper handles retries 2..N with exponential backoff.

2. **Register the channel** in `src/lib/notifications/channels/index.ts`:

   ```typescript
   const registry = new Map<ChannelName, NotificationChannel>([
     // ...existing entries
     [SmsChannel.name, SmsChannel],
   ]);
   ```

3. **Add the channel name to the type union** in
   `src/lib/notifications/types.ts` (`NotificationChannel`).

Callers can now opt in by passing `channels: [..., 'SMS']` on their event.
Adding a channel never changes business logic — the dispatcher handles the
fan-out.

**Important:** the `DEFAULT_DISPATCH_CHANNELS` array is intentionally
`[IN_APP, PUSH]` only. Adding a channel here changes the behavior of every
existing notification — do so with care and only when the new channel
should fire on every event by default.

---

## Preferences rules

User preferences live in the `NotificationPreference` table: one row per
`(userId, category)` with boolean flags for `channelInApp`,
`channelEmail`, `channelPush`.

### Bypass rules (never suppress)

The resolver at `src/lib/notifications/preferences.ts` enforces three
non-negotiable bypasses:

1. **CRITICAL priority always delivers on every requested channel.** A
   user cannot mute `user.blocked` or `payment.verified`.
2. **AUTH and SECURITY categories always deliver** regardless of priority
   or stored preference row. This protects against a stray row
   accidentally silencing account-block alerts.
3. **IN_APP is never removed by preferences.** The bell + Notification
   Center are the audit surface; users have archive/mute via the
   Notification Center for individual rows.

### Mutable channels

Only EMAIL and PUSH are user-mutable in the preferences UI. DISCORD,
SMS (future), and WEBHOOK (future) are admin/ops channels and are not
suppressed by user preferences.

### Defaults

No stored preference row = everything on. Existing users see zero
behavior change until they opt into muting via `/settings/notifications`.

### API

- `GET /api/notifications/preferences` — returns the full 12×3 matrix with
  defaults filled in.
- `PUT /api/notifications/preferences` — upserts per-category rows.
  Rejects AUTH/SECURITY silently; never persists `channelInApp: false`.

---

## Realtime transport

The bell uses a transport fallback ladder (Phase 9):

1. **SSE** (`/api/notifications/stream`) — preferred. One long-lived
   connection per tab; pushes `ready`, `notification`, and `unread`
   events scoped to the authenticated user. Polls DB every 10s as the
   producer (documented baseline pending Postgres LISTEN/NOTIFY).
2. **Web Push** — OS-level native notification when the tab is
   backgrounded. Requires user opt-in (VAPID).
3. **30s polling** — fallback when neither SSE nor push is active.
   Phase 12 optimization: polls the cheap `/api/notifications/unread-count`
   endpoint instead of the full list; the preview list is re-fetched
   only when the count changes.

The hook at `src/hooks/useNotificationStream.ts` self-heals on error and
reconnects on visibility regain.

---

## Performance characteristics

- **Bell polling:** O(1) HTTP request per 30s per tab. The unread-count
  endpoint is bounded by the `(userId, isRead, createdAt)` index from
  Phase 2; the response is `Cache-Control: private, max-age=5` so multiple
  tabs coalesce.
- **In-memory badge cache** (`src/hooks/badgeCache.ts`): single-flight
  dedupes concurrent fetches within a 5s window. Optimistic decrement on
  mark-read; full invalidation on visibilitychange.
- **Notification Center:** cursor pagination (30 items/page) via
  `IntersectionObserver`. Server-side initial render for fast paint.
- **Preferences lookup in dispatch:** one indexed query per dispatch.
  CRITICAL priority and locked categories short-circuit before the DB hit.

---

## Runbook: retry failures

Each channel write records a `NotificationDelivery` row with one of:
`PENDING`, `SENT`, `FAILED`, `EXPIRED`, `RETRYING`.

### Common scenarios

**Symptom:** NotificationDelivery rows stuck in `RETRYING`.

- **Cause:** transient channel failure (push endpoint returned 5xx, Resend
  timed out). The outbox sweeper (`src/lib/notifications/outbox.ts`)
  retries with exponential backoff up to `retryPolicy.maxAttempts`.
- **Action:** wait. If rows remain RETRYING after 10 minutes, the sweeper
  is either not running or the channel is degraded. Check Sentry for
  channel errors.

**Symptom:** push subscriptions disappear overnight.

- **Cause:** endpoints return 410/404; the push channel auto-prunes them
  per subscription.
- **Action:** none — this is correct behavior. The user will be
  re-prompted to subscribe on next bell interaction.

**Symptom:** user reports "I never got the notification" but the row
exists in the DB.

- **Cause (most common):** user muted the category for EMAIL/PUSH. Direct
  them to `/settings/notifications` or check the Notification Center at
  `/notifications` — the row is always there.
- **Cause (less common):** CRITICAL event delivered but the user's
  NotificationDelivery rows show FAILED. Inspect `lastError` on the
  delivery rows for the failing channel.

**Symptom:** admin reports no notifications despite a flow running.

- **Cause:** `notifyAdmins()` only targets non-blocked admins. Verify the
  admin's `isBlocked` flag is false.

### Useful queries

```sql
-- Recent delivery failures by channel
SELECT channel, status, COUNT(*) FROM "NotificationDelivery"
WHERE "updatedAt" > NOW() - INTERVAL '1 hour'
GROUP BY channel, status;

-- Notifications for a user that never delivered
SELECT n.id, n.title, nd.channel, nd.status, nd."lastError"
FROM "Notification" n
LEFT JOIN "NotificationDelivery" nd ON nd."notificationId" = n.id
WHERE n."userId" = '<user-id>'
  AND (nd.status IS NULL OR nd.status IN ('FAILED', 'RETRYING'))
ORDER BY n."createdAt" DESC
LIMIT 50;
```

---

## Testing

### Unit tests

Pure-logic unit tests live in
`src/lib/notifications/__tests__/`. Run with:

```bash
npm test
```

Current coverage:

- `preferences.test.ts` — the preference-filter bypass rules (CRITICAL,
  AUTH/SECURITY, IN_APP non-mutation). 15 assertions. These are the
  tests that must never regress — they protect against accidental
  suppression of security-critical notifications.

### Manual regression

See [`docs/notification-regression-checklist.md`](./notification-regression-checklist.md)
for the full e2e regression plan covering every event in the blueprint's
§VI matrix. Run through it before declaring any notification phase done.

### Adding tests

When adding a new pure helper to the notification system (resolver logic,
template resolution, dedup keys), add a unit test alongside it. Tests that
require a database should be documented in the regression checklist until
a Playwright/Jest e2e harness is introduced.

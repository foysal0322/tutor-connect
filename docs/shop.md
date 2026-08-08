# NSUOne Shop — Developer & Operations Guide

**Status:** Phases 0–14 shipped (2026-08-08)
**Source of truth:** `NSUONE_SHOP_BLUEPRINT.md` (architecture), this file (operational)
**Scope:** Everything a new engineer needs to extend, debug, or operate the Shop module.

---

## 1. Quick Start (for a new engineer)

### 1.1 Mental model

NSUOne Shop is a **peer-to-peer campus marketplace** layered on top of the existing tutor-connect platform. It reuses:

- **Auth** — NextAuth JWT, email-verification gate, `requireRole()` for admin.
- **Wallet** — the single source of truth for money. Every Shop BDT is a `WalletTransaction` row.
- **Dashboard shell** — `AdaptiveShell` swaps between member sidebar and marketing navbar.
- **Notifications** — `createNotification` + `sendNoReplyEmail` + Discord webhooks.
- **Design system** — `PageHeader`, `KPI`, `DataGrid`, `Sheet`, `Tabs`, `FormCard`, tokens.

It does NOT touch:

- Tutor expertise, tutor requests, payments, MFS providers, withdrawals, refunds, consultancy, coupons, or any existing server-action contract.

### 1.2 Where things live

```
src/lib/shop/                          # domain logic (pure, testable)
  types.ts                             # string-typed enums mirroring Prisma
  service.ts                           # commission math, BDT formatting
  policy.ts                            # eligibility, lifecycle, settings coercion
  escrow.ts                            # WalletTransaction row builders
  queries.ts                           # browse/detail/seller read queries
  orders-queries.ts                    # order list/detail queries
  images.ts                            # filesystem storage abstraction
  notify.ts                            # event dispatcher (in-app + email + Discord)

src/app/(member)/shop/                 # all shop routes (AdaptiveShell wraps)
  page.tsx                             # public browse
  listing/[id]/page.tsx                # public detail + buy + review
  category/[slug]/page.tsx             # category browse
  seller/[id]/page.tsx                 # public storefront
  selling/                             # seller dashboard + create/edit
  orders/                              # buyer + seller order views
  disputes/                            # member dispute list + thread
  saved/                               # saved listings
  boost/                               # boost server action
  actions.ts                           # save/unsave/review/report actions

src/app/admin/shop/                    # admin hub (requireRole ADMIN)
  page.tsx                             # overview KPIs
  listings/ orders/ disputes/ reports/
  payouts/ sellers/ categories/ settings/

src/app/api/shop/
  images/route.ts                      # POST multipart upload
  sweep/auto-finalize/route.ts         # cron-protected sweep

src/components/shop/                   # all shop-specific components
```

### 1.3 First task ideas

- **Add a new category** — `/admin/shop/categories`, click "New category".
- **Change the commission rate** — `/admin/shop/settings`, "Economics" tab.
- **Suspend a seller** — `/admin/shop/sellers`, "Suspend" button.
- **Resolve a dispute** — `/admin/shop/disputes/[id]`, use the resolver form.

---

## 2. Event Catalog

Every Shop event flows through `src/lib/shop/notify.ts` → `notifyShopEvent(event, payload)`. The dispatcher fans out to in-app (`createNotification`), email (`sendNoReplyEmail`), and Discord (`notifyShop*` in `src/lib/discord.ts`).

| Event | Triggered by | In-app to | Email to | Discord | Deep link |
|---|---|---|---|---|---|
| `order:placed` | Buyer places order | buyer + seller | seller | ✓ | `/shop/orders/{id}` |
| `order:shipped` | Seller marks shipped | buyer | buyer | — | `/shop/orders/{id}` |
| `order:delivered` | Buyer confirms delivery | seller | seller | — | `/shop/orders/{id}` |
| `order:completed` | Buyer completes OR auto-finalize | seller | seller | — | `/wallet` |
| `order:cancelled` | Buyer cancels (pre-ship) | buyer + seller | seller | — | `/wallet` |
| `order:refunded` | Admin refunds via dispute | buyer | — | — | `/wallet` |
| `dispute:opened` | Buyer or seller opens dispute | counterparty | — | ✓ | `/shop/disputes/{id}` |
| `dispute:resolved` | Admin resolves dispute | buyer + seller | — | — | `/shop/orders/{id}` |
| `listing:approved` | Admin approves listing | seller | — | — | `/shop/selling` |
| `listing:rejected` | Admin rejects/takedowns listing | seller | — | — | `/shop/selling` |
| `listing:reported` | User reports listing | admin (Discord) | — | ✓ | `/admin/shop/reports` |
| `review:received` | Buyer leaves review | seller | — | — | `/shop/selling` |

### Adding a new event

1. Add the event key to the `Event` union in `src/lib/shop/notify.ts`.
2. Add a `case` in the `switch` block with the notification logic.
3. If it needs Discord, add a helper in `src/lib/discord.ts` and call it from the case.
4. Fire it from the relevant server action: `await notifyShopEvent('your:event', { ... })`.
5. **Always fire AFTER the transaction commits** — notification failures must never roll back business state.

---

## 3. Money Flow Reference

### 3.1 The four `WalletTransaction.type` values

| Type | Direction | When | Amount |
|---|---|---|---|
| `SHOP_ESCROW` | Debit (negative) | Buyer places order | Full subtotal |
| `SHOP_PAYOUT` | Credit (positive) | Order completes | Subtotal − commission |
| `SHOP_COMMISSION` | Credit (positive) | Order completes | Subtotal × rate |
| `SHOP_REFUND` | Credit (positive) | Order cancelled/refunded | Full subtotal |
| `SHOP_BOOST` | Debit (negative) | Seller boosts listing | Flat boost fee |
| `SHOP_BOOST_REVENUE` | Credit (positive) | Seller boosts listing | Flat boost fee |

### 3.2 The atomic transaction boundary

Every money write happens inside `prisma.$transaction(async (tx) => { ... })` with:

1. **Re-read** the listing/order inside the tx (prevents race conditions).
2. **Re-validate** all preconditions (status, ownership, balance).
3. **Write** all rows atomically (wallet tx + order update + event + listing update).
4. **Commit** — or roll back entirely.

Notifications fire **after** the tx commits, outside the try/catch of the business logic. A notification failure logs an error but does not propagate.

### 3.3 Commission capture timing

Commission is captured **only at settlement** (COMPLETED), never at escrow. This means:

- Refunds return 100% of the subtotal to the buyer.
- The platform only earns on successful deliveries.
- The commission **rate** is snapshotted per-order (`ShopOrder.commissionRate`) so global rate changes don't retroactively affect open orders.

### 3.4 Platform wallet

Commission + Boost revenue credits the **first ADMIN user** (ordered by `createdAt`). This is a pragmatic v1 choice — Phase 10+ could introduce a dedicated platform wallet.

---

## 4. Order Lifecycle State Machine

```
AWAITING_CONFIRMATION → ESCROWED → SHIPPED → DELIVERED → COMPLETED
                         │           │          │
                         │           │          └──→ DISPUTED → COMPLETED | REFUNDED
                         │           └──→ DISPUTED
                         ├──→ CANCELLED
                         └──→ REFUNDED (admin)
```

### Allowed transitions (see `src/lib/shop/policy.ts`)

- `ESCROWED` → `SHIPPED` (seller), `CANCELLED` (buyer), `REFUNDED` (admin)
- `SHIPPED` → `DELIVERED` (buyer), `DISPUTED` (buyer or seller), `REFUNDED` (admin)
- `DELIVERED` → `COMPLETED` (buyer or auto-finalize), `DISPUTED`
- `DISPUTED` → `COMPLETED` (admin resolves for seller), `REFUNDED` (admin resolves for buyer)

### Auto-finalize

The sweep endpoint (`/api/shop/sweep/auto-finalize`) transitions `DELIVERED` orders past their `autoFinalizeAt` timestamp (default 72h) to `COMPLETED`, as long as no dispute is open. It's idempotent and safe to call as often as desired.

**Cron setup (Vercel):**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/shop/sweep/auto-finalize",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Manual trigger:**

```bash
curl -X POST https://your-domain.com/api/shop/sweep/auto-finalize \
  -H "Authorization: Bearer $SHOP_CRON_SECRET"
```

---

## 5. Image Pipeline

### 5.1 Current (Phase 5)

- Endpoint: `POST /api/shop/images` (multipart, `file` field).
- Storage: local `/public/uploads/shop/` (random hex filename, no extension trust).
- Validation: magic-byte MIME check (JPEG/PNG/WebP), 4 MB max, 30 uploads/hour/user.
- **Not yet implemented**: EXIF stripping, server-side resize, NSFW scanning.

### 5.2 Migrating to object storage (Phase 10+ future)

Only `src/lib/shop/images.ts` needs to change. Replace `storeImage()` and `deleteImage()` with S3/R2 calls. The route handler and uploader component stay identical.

```typescript
// Future src/lib/shop/images.ts
export async function storeImage(buffer: Buffer, mime: string) {
  const key = `shop/${crypto.randomUUID()}.${extensionFor(mime)}`;
  await s3.putObject({ Bucket: 'nsuone-shop', Key: key, Body: buffer, ContentType: mime });
  return { url: `https://cdn.nsuone.com/${key}`, filename: key };
}
```

### 5.3 Adding `sharp` for EXIF + resize (recommended before public launch)

```bash
npm install sharp
```

Then in `src/lib/shop/images.ts`, after the MIME check:

```typescript
import sharp from 'sharp';

export async function storeImage(buffer: Buffer, mime: string) {
  const processed = await sharp(buffer)
    .rotate() // auto-orient from EXIF
    .removeAlpha()
    .flatten({ background: '#ffffff' })
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  // ... write to disk
}
```

---

## 6. Admin Operations Runbook

### 6.1 Handling a dispute

1. Go to `/admin/shop/disputes`.
2. Click "resolve →" on the dispute.
3. Read the thread (buyer/seller messages).
4. Check the "Seller paid?" indicator:
   - **No (escrowed)** — your resolution moves money. "Refund buyer" returns the full escrow; "Pay seller" releases payout + captures commission.
   - **Yes (already settled)** — your resolution is decision-only. Coordinate any clawback manually via `/admin/wallets` adjustment.
5. Write a clear note (visible to both parties) and submit.

### 6.2 Handling a report

1. Go to `/admin/shop/reports`.
2. Click the listing to view it.
3. Choose "Takedown" (removes from public browse, status → REMOVED) or "Dismiss".

### 6.3 Suspending a seller

1. Go to `/admin/shop/sellers`.
2. Click "Suspend".
3. Effect: all their ACTIVE listings → PAUSED; they cannot create new listings; in-flight orders continue normally.
4. Restore anytime with the same button.

### 6.4 Changing commission or limits

1. Go to `/admin/shop/settings`.
2. Adjust the relevant field. New transactions read the updated values immediately (60s cache).
3. **Existing orders keep their snapshotted rate** — changes are forward-only.

---

## 7. Seller Onboarding

### First listing checklist

A new seller should:

1. Verify their email (required before listing).
2. Visit `/shop/selling` and click "New listing".
3. Upload 1–6 photos (JPEG/PNG/WebP, max 4 MB each).
4. Fill title, description, category, condition, price, quantity, location.
5. Publish — the listing goes ACTIVE immediately (unless moderation mode is MANUAL).

### Boost (optional)

Sellers can pay a flat fee (default 100 BDT) to pin a listing for 7 days. Boosted listings:

- Sort above non-boosted in browse results.
- Show a transparent "Boosted" gradient badge.
- Are still free to list — Boost is an optional visibility upgrade, never a gate.

---

## 8. Anti-Leakage Notes

The platform cannot perfectly detect off-platform (cash) transactions. The mitigation strategy is:

1. **Escrow protection** — buyers get a refund path; sellers get guaranteed payment. This is the #1 magnet for using the platform path.
2. **In-person pay** — the platform supports "meet, inspect, then tap Pay in-app" so the "I want to see it first" excuse is solved inside the platform.
3. **Reputation** — on-platform sales build reviews → badge → visibility. Off-platform sales → invisible.
4. **Report button** — "Report off-platform request" reason on every listing. Buyers can flag sellers who ask for cash.
5. **TOS clause** — off-platform payment is prohibited; violations may result in suspension.

**Expected leakage: 15–30% in year one.** This is normal and drops as review volume builds.

---

## 9. Database Schema Reference

All Shop models are in `prisma/schema.prisma`. Key relationships:

```
User 1───* ShopListing *───1 ShopCategory
User 1───* ShopOrder (as buyer)
User 1───* ShopOrder (as seller)
ShopOrder 1───* ShopOrderEvent
ShopOrder 1───1 ShopDispute (optional)
ShopDispute 1───* ShopDisputeMessage
ShopOrder 1───1 ShopReview (optional, buyer → seller)
User 1───* ShopSavedListing *───1 ShopListing
User 1───1 ShopSellerProfile
ShopListing 1───* ShopBoost (Phase 12)
ShopListing 1───* ShopReport
```

### Indexes (all additive)

- `ShopListing`: `[status, categoryId, createdAt(desc)]`, `[sellerId, status]`, `[title]`, `[boostedUntil]`
- `ShopOrder`: `[buyerId, status, createdAt(desc)]`, `[sellerId, status, createdAt(desc)]`, `[status, autoFinalizeAt]`
- `ShopDispute`: `[status, createdAt(desc)]`
- `ShopReview`: `[toUserId, createdAt(desc)]`, `[listingId]`
- `ShopSavedListing`: unique `[userId, listingId]`

---

## 10. Testing Checklist

### Manual smoke test (happy path)

- [ ] Create a listing as seller (with images).
- [ ] Browse `/shop` as a buyer; verify the listing appears.
- [ ] Open the listing detail; verify images, description, seller card.
- [ ] Click "Buy with escrow" → order placed → wallet debited.
- [ ] As seller, mark order "shipped".
- [ ] As buyer, confirm "delivery".
- [ ] As buyer, "complete" the order → seller wallet credited, platform commission captured.
- [ ] Leave a review → seller's avgRating updates.
- [ ] Verify notifications fired at each step (check NotificationBell).

### Unhappy paths

- [ ] Buy with insufficient balance → error shown, no debit.
- [ ] Cancel order before shipping → full refund, inventory restored.
- [ ] Open dispute → order status → DISPUTED.
- [ ] Admin resolves dispute for buyer → refund processed.
- [ ] Admin resolves dispute for seller → payout released.
- [ ] Auto-finalize sweep transitions DELIVERED → COMPLETED.

### Admin flows

- [ ] Suspend a seller → their active listings pause.
- [ ] Take down a listing via reports queue.
- [ ] Change commission rate → new orders use new rate; existing orders keep old rate.
- [ ] Boost a listing → it sorts first in browse with a badge.

---

## 11. Future Work (not in blueprint)

- **Inquiry chat** — pre-order messaging between buyer and seller (Phase 8 of the original notification blueprint's gap analysis).
- **Coupon support** — extend the existing `Coupon` model's scope to `SHOP`.
- **Mobile push** — FCM/APNs via the `Channel` abstraction (when mobile apps ship).
- **Analytics** — per-listing conversion funnels, seller leaderboards.
- **Bulk operations** — admin bulk-approve, bulk-takedown.

---

*Last updated: 2026-08-08. For architecture decisions, see `NSUONE_SHOP_BLUEPRINT.md`. For day-to-day ops, this file.*

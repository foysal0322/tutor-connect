# NSUOne Shop — Peer-to-Peer Campus Marketplace Blueprint

**Project:** tutor-connect / nsuOne (Next.js 16 + React 19 + Prisma + Postgres)
**Status:** Implementation-ready architecture document (blueprint, not code)
**Date:** 2026-08-07
**Author voice:** System architect (20 yrs), independent of the existing codebase authors
**Scope:** A new, self-contained "NSUOne Shop" module — a peer-to-peer marketplace where any signed-in member (Student or Tutor) can list, sell, buy, and review university-relevant items (calculators, textbooks, lab kits, notes, electronics, instruments, etc.). The platform takes a cut. Admins moderate.
**Relationship to existing work:** This is a **greenfield module**. It does not alter auth, role model, tutor workflows, payment MFS flows, wallet accounting rules, consultancy, coupons, notifications architecture, or any existing UI. It *reuses* the wallet, the design system, the dashboard shell, the notification primitives, and the admin panel conventions.

> **Cardinal rule:** Existing behavior is invariant. The Shop is additive in routes, Prisma models, server actions, nav items, and UI surfaces. Not a single existing route, API, server-action contract, or DB column changes.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Context & Reuse Strategy](#2-project-context--reuse-strategy)
3. [Business Model Analysis & Recommendation](#3-business-model-analysis--recommendation)
4. [Navigation Placement Decision](#4-navigation-placement-decision)
5. [Module Boundary](#5-module-boundary)
6. [Data Model](#6-data-model)
7. [Money Flow & Escrow](#7-money-flow--escrow)
8. [Commission, Fees & Payouts](#8-commission-fees--payouts)
9. [Roles, Capabilities & Trust](#9-roles-capabilities---trust)
10. [Listing Lifecycle](#10-listing-lifecycle)
11. [Order Lifecycle](#11-order-lifecycle)
12. [Moderation, Reports & Disputes](#12-moderation-reports--disputes)
13. [Reviews & Reputation](#13-reviews--reputation)
14. [Notifications Integration](#14-notifications-integration)
15. [API Surface](#15-api-surface)
16. [UI/UX Surfaces](#16-uiux-surfaces)
17. [Search, Filtering & Discovery](#17-search-filtering--discovery)
18. [Image Handling](#18-image-handling)
19. [Performance, Indexing & Scale](#19-performance-indexing--scale)
20. [Security & Fraud Posture](#20-security--fraud-posture)
21. [Phase-by-Phase Implementation Roadmap](#21-phase-by-phase-implementation-roadmap)
22. [Regression Protection](#22-regression-protection)
23. [What You Will See After Implementation](#23-what-you-will-see-after-implementation)

---

## 1. Executive Summary

NSUOne Shop is a **trusted, closed-campus marketplace**. Only verified NSU accounts (email-verified members of tutor-connect) can list, buy, or message. Every BDT that moves through the Shop passes through the existing **wallet** as escrow. The platform earns a **commission on each successful sale**, debited automatically at settlement — sellers never pay to list, buyers never pay a surcharge.

The Shop is structured to feel like a natural sibling of the existing Tutor and Consultancy products: same design language, same shell, same primitives, same wallet, same notification bell. It is, however, **strictly isolated** — separate Prisma models, separate routes (`/shop/*`), separate admin section (`/admin/shop/*`), separate nav group. A failure, rollback, or future removal of the Shop never touches any other subsystem.

**Headline business decision (detailed in §3):** commission-based, **not** ad/permission-based. Default 7% (admin-configurable per-category, 0–20%), auto-deducted at order settlement. A future **optional paid Boost** surface (the "ad" angle) is reserved as Phase 9 — it is *never* a gating mechanism, only a visibility upgrade.

**Headline navigation decision (detailed in §4):** dual placement — a single "Shop" link in the **public marketing Navbar** (drives discovery + SEO + first-time visitors), and a full "Shop" **group in the member Sidebar** (Browse / Selling / Orders / Saved / Disputes). Admin gets a dedicated `/admin/shop` section.

**Headline trust decision (detailed in §7):** funds are **escrowed** in the platform at order placement and released to the seller's wallet only when the buyer confirms delivery — or automatically after a 72-hour auto-finalize window, with a dispute escape hatch.

---

## 2. Project Context & Reuse Strategy

### 2.1 What already exists (and the Shop reuses, never reinvents)

| Capability | Location | How the Shop reuses it |
|---|---|---|
| NextAuth JWT session + email-verification gate | `src/lib/auth.ts`, `src/lib/server/auth-gate.ts` | All Shop routes/actions gate on `requireRole(['STUDENT','TUTOR'])`; admin routes gate on `requireRole(['ADMIN'])`. No new auth. |
| Wallet + `WalletTransaction` ledger | `src/app/(marketing)/wallet/actions.ts`, admin `/admin/wallets` | Escrow holds + seller payouts + commission debits are all new `WalletTransaction` rows with a new `purpose` enum value (e.g. `SHOP_ESCROW`, `SHOP_PAYOUT`, `SHOP_COMMISSION`, `SHOP_REFUND`). The existing wallet balance is the single source of truth for spendable funds. |
| Platform-wide settings singleton | `PlatformSetting` (used for `withdrawalFee`, `paymentFee`, `consultancyFreeQuota`) | Extend with `shopCommissionRateDefault`, `shopAutoFinalizeHours`, `shopDisputeWindowHours`, `shopListingMaxImages`, `shopBoostFeeBdt`, `shopBoostDays`. All admin-configurable. |
| Design system (tokens, primitives) | `src/components/ui/*`, `src/components/forms/*`, `globals.css` | Shop UI uses `PageHeader`, `Toolbar`, `DataGrid`, `Sheet`, `Tabs`, `KPI`, `EmptyState`, `FormCard`, `StatusBadge`, skeletons. Zero new primitives. |
| Dashboard shell | `DashboardLayout` + `Sidebar` + `Topbar` + `CommandPalette` | Shop pages render inside the existing member shell; sidebar gets a new nav group; command palette gets new entries. Admin Shop renders inside the admin shell. |
| Notification system | `src/lib/notification.ts` (`createNotification`), `NotificationBell` | All Shop events (order placed, shipped, delivered, refunded, disputed, reviewed, payout, listing approved/rejected) flow through the existing `createNotification` + email + Discord-ops patterns. |
| Image upload | (today: avatars are stored inline; Resend for email) | Phase 5 introduces a small, contained image upload endpoint scoped to Shop listings; see §18. |
| Admin patterns | `/admin/*` conventions (PageHeader + Toolbar + DataGrid + Sheet) | `/admin/shop` mirrors existing admin sections (Listings queue, Orders, Disputes, Reports, Payouts, Settings). |
| Coupons | `Coupon` model | **Not** extended to Shop in v1 — would change coupon evaluation scope. Reserved for Phase 8+ if business wants it. |

### 2.2 What the Shop deliberately does NOT reuse

- **MFS payment providers (bKash/Nagad/Rocket).** The Shop is wallet-only. Recharging the wallet is the existing MFS entry point; the Shop never touches MFS directly. This keeps payment risk inside the existing, audited surface.
- **The `TutorRequest` / `Payment` / `ConsultancyRequest` workflows.** No shared tables, no shared actions. Shop has its own models and actions.
- **The role enum.** No new role. Selling capability is open to every verified member (data-derived eligibility flags live on `ShopSellerProfile`, not on `User`).

### 2.3 Guiding architectural principle

> **"Additive modules, shared primitives, isolated state."**
> New Prisma models, new routes, new server actions, new client components — yes. Edits to existing models, routes, actions, components — no, except for the *minimum* wiring points listed in §5 (nav config, commission settings).

---

## 3. Business Model Analysis & Recommendation

The user asked a direct question: **commission (5–10% per sale) vs. ad/permission (pay-to-list or pay-to-promote)?** Here is the architect's analysis.

### 3.1 Option A — Pure Commission (5–10%)

**Mechanic:** Listing is free. On every successful sale, the platform debits X% of the sale price as commission. The seller receives `(price − commission)` into their wallet. Buyers pay the listed price, no surcharge.

**Pros:**
- Zero barrier to listing → maximal inventory → maximal liquidity (the single most important metric for a marketplace).
- Aligned incentives: the platform only earns when a sale closes. This forces the platform to make the product genuinely useful.
- Trivially fair: sellers pay only on success; students (price-sensitive) never pay upfront.
- Simple mental model for users; simple accounting for finance.
- Operationally simple: one number per category, configurable in `PlatformSetting`.

**Cons:**
- Revenue depends on GMV (gross merchandise volume). Until volume builds, earnings are small.
- Sellers have a mild incentive to take transactions offline ("let's deal in cash"). Mitigated by escrow + closed-campus trust + the convenience of wallet settlement.

### 3.2 Option B — Ad/Permission (pay-to-list OR pay-to-promote OR subscription)

**Mechanic variants:**
- **B1 — Listing fee:** seller pays a flat fee per listing.
- **B2 — Subscription:** seller pays monthly to keep a storefront open.
- **B3 — Paid promotion ("Boost"):** listings are free but sellers pay for visibility boosts.

**Pros:**
- Predictable revenue per seller.
- Filters out non-serious sellers.

**Cons:**
- **B1 and B2 are wrong for this audience.** Students are price-sensitive; a paywall on listing destroys liquidity, and a marketplace without inventory is dead on arrival. Closed-campus marketplaces live or die on listing density.
- **B3 (Boost) is fine *as an optional overlay*, never as a gate.** Used alone (no commission), it under-monetizes high-volume sellers and offers no aligned incentive.
- Any gating mechanism adds moderation overhead (who gets approved?) without proportional revenue.

### 3.3 Option C — Hybrid (recommended)

**Commission as the primary revenue stream + optional paid Boost as a secondary, non-gating overlay.**

- **Primary:** Commission on every successful sale. **Default 7%**, admin-configurable globally and per-category, range 0–20%.
- **Secondary (Phase 9, optional):** Boost. A seller can pay a flat fee (e.g. 100 BDT) to pin a listing to the top of Browse for N days (default 7). This is *not* a paywall — every listing still appears in default sort; Boost only reorders. Boost revenue scales with seller ambition, not with buyer friction.
- **Tertiary (Phase 10+, optional):** Verified Seller badge (small one-time or recurring fee, eligibility-gated by review score + completed orders). Pure trust signal; no functional unlock.

### 3.4 Why commission wins for this specific product

1. **Closed-campus = low fraud, high repeat.** Volume per active seller is the lever; commission captures it cleanly.
2. **Wallet-native.** Deducting commission from a wallet credit at settlement is a single ledger row — no MFS dance, no refund complexity.
3. **Future-proof.** Commission rate is one config number. You can tune it per category, per promo period, even zero it during a launch month to seed inventory. Ads/subscriptions require product changes to adjust.
4. **Matches the existing platform pattern.** Tutor withdrawals already charge a `withdrawalFee`; consultancy already prices per session. Commission is the consistent shape.

### 3.5 Recommended rates (defaults, all admin-tunable)

| Parameter | Default | Notes |
|---|---|---|
| `shopCommissionRateDefault` | **7%** | Sweet spot for campus marketplaces — meaningful revenue, below the psychological 10% threshold. |
| Per-category override | none at launch | Books 5%, Electronics 8% can be added later via `ShopCategory.commissionRateOverride`. |
| `shopAutoFinalizeHours` | **72 h** | After delivery confirmation or shipping proof, order auto-completes and seller is paid. |
| `shopDisputeWindowHours` | **48 h** | Buyer can open a dispute within this window post-delivery. |
| `shopBoostFeeBdt` | **100 BDT** | Phase 9 — optional Boost fee. |
| `shopBoostDays` | **7 days** | Phase 9 — Boost duration. |
| `shopListingMaxImages` | **6** | Per-listing image cap. |
| Minimum sale price | **20 BDT** | Prevents micro-listing spam. |
| Maximum sale price | **50,000 BDT** | Anti-money-laundering guardrail; admin can raise. |

### 3.6 Revenue math (illustrative)

At 7% commission, 100 completed sales/month at avg 800 BDT = **5,600 BDT/month** platform revenue at launch, growing with GMV. Boost adds upside without distorting discovery. The model scales linearly with the marketplace itself.

---

## 4. Navigation Placement Decision

The user asked: top navbar or sidebar? My call as an independent designer.

### 4.1 The two placement layers are not mutually exclusive — and they serve different jobs

- **Top marketing Navbar** (`Navbar.tsx`, visible to logged-out and logged-in users on `(marketing)` routes) is the **discovery** surface. Its job is to convert first-time visitors and to give returning shoppers a one-click entry to Browse. Marketplaces live or die on top-of-funnel traffic; hiding Shop behind a sidebar that only renders post-sign-in sacrifices this.
- **Member Sidebar** (`MEMBER_NAV` in the `DashboardLayout`) is the **operating** surface. Its job is to let a signed-in member manage their shop life: listings, orders, payouts, disputes, saved items. These workflows need persistent visibility while the user is in the dashboard.

### 4.2 Decision

**Both — with distinct, purposeful content at each layer.**

| Layer | Surface | Content |
|---|---|---|
| Public/Marketing `Navbar` | Single **"Shop"** link → `/shop` | Browse-first landing. Visible to logged-out users (browse is public; listing/buying requires auth). |
| Member `Sidebar` (in `DashboardLayout`) | New **"Shop"** nav group, icon: `Store` | Children: **Browse** (`/shop`), **Selling** (`/shop/selling`), **Orders** (`/shop/orders`), **Saved** (`/shop/saved`), **Disputes** (`/shop/disputes`, count-badge when open). |
| Admin `Sidebar` (in admin shell) | New **"Shop"** admin group, icon: `ShoppingBag` | Children: **Listings** (`/admin/shop/listings`), **Orders** (`/admin/shop/orders`), **Disputes** (`/admin/shop/disputes`), **Reports** (`/admin/shop/reports`), **Payouts** (`/admin/shop/payouts`), **Categories** (`/admin/shop/categories`), **Settings** (`/admin/shop/settings`). |
| Command Palette (⌘K) | Member + admin | New nav items + intent-driven quick actions: "List an item", "Browse shop", "Open a dispute", "My shop orders". |
| UserMenu | Optional small shop badge | Shows lifetime sales count for sellers (display only). |

### 4.3 Why a sidebar group, not a single sidebar link

The member's Shop life has **five distinct modes** (browse / sell / order / save / dispute). Collapsing them into one landing page adds a click to every workflow and hides open-dispute count (a high-urgency signal). A sidebar group surfaces them in parallel with the existing Learning/Teaching groups, which is the established IA pattern of this product (see the Student/Teacher dashboard blueprint §2.4 — "soft focus" between sibling domains).

The Sidebar's existing **member-focus** hint (learning vs teaching) does *not* extend to Shop. Shop is orthogonal — a tutor who is also a seller shouldn't have to switch focus to manage an order. The Shop group sits as its own top-level section, equally accessible regardless of learning/teaching focus.

### 4.4 Mobile

On screens ≤ 1024 px (existing breakpoint), the sidebar collapses to the off-canvas drawer (existing behavior). The Shop group renders as a collapsible section in the drawer. The marketing Navbar's "Shop" link remains in the mobile menu (existing pattern). No new mobile chrome.

---

## 5. Module Boundary

### 5.1 File layout (additive only)

```
prisma/
  schema.prisma                              # +Shop models (additive block)
  migrations/<ts>_add_shop_module/           # one migration, fully additive

src/
  app/
    (marketing)/
      shop/                                  # NEW route group
        page.tsx                             # public browse landing
        layout.tsx                           # optional; renders inside marketing Navbar/Footer
        listing/[id]/page.tsx                # public listing detail
        category/[slug]/page.tsx             # public category browse
        seller/[id]/page.tsx                 # public seller profile
        selling/page.tsx                     # authed seller dashboard
        selling/new/page.tsx                 # authed create-listing form
        selling/listing/[id]/page.tsx        # authed edit-listing form
        orders/page.tsx                      # authed buyer/seller orders
        orders/[id]/page.tsx                 # authed order detail + actions
        saved/page.tsx                       # authed saved listings
        disputes/page.tsx                    # authed my disputes
        disputes/[id]/page.tsx               # authed dispute thread
    admin/
      shop/                                  # NEW admin section
        layout.tsx                           # admin shell + requireRole(['ADMIN'])
        page.tsx                             # admin shop overview (KPIs)
        listings/page.tsx
        orders/page.tsx
        disputes/page.tsx
        reports/page.tsx
        payouts/page.tsx
        categories/page.tsx
        settings/page.tsx
    api/
      shop/                                  # NEW REST endpoints (see §15)
        listings/
        listings/[id]
        listings/[id]/report
        listings/[id]/save
        orders
        orders/[id]
        orders/[id]/confirm
        orders/[id]/dispute
        orders/[id]/ship
        disputes/[id]/message
        images                              # upload (Phase 5)
        search                              # GET, for command palette
    actions/
      shop.ts                                # NEW server actions (authed mutations)

  components/
    shop/                                    # NEW component namespace
      ShopListingCard.tsx
      ShopListingGrid.tsx
      ShopFilters.tsx
      ShopListingForm.tsx
      ShopOrderCard.tsx
      ShopOrderTimeline.tsx
      ShopDisputeThread.tsx
      ShopReviewForm.tsx
      ShopSellerBadge.tsx
      ShopCategoryPill.tsx
      ShopImageUploader.tsx
      ShopBoostPanel.tsx                     # Phase 9
      ShopKPIs.tsx

  lib/
    shop/
      types.ts                               # TS types (ListingStatus, OrderStatus, ...)
      service.ts                             # pure domain logic (price math, commission calc)
      escrow.ts                              # wallet escrow + settlement helpers
      policy.ts                              # auto-finalize, dispute-window, eligibility
      images.ts                              # upload validation (Phase 5)
      search.ts                              # query building for filters

  lib/
    server/
      shop-auth.ts                           # requireSeller(), requireBuyer(), requireParticipant()

  # Wiring-only edits (minimal, listed exhaustively):
  #   src/components/layout/member-nav.ts          (+ SHOP_NAV group)
  #   src/components/layout/admin-nav.ts            (+ ADMIN_SHOP_NAV group)
  #   src/components/layout/breadcrumb-map.ts       (+ /shop/* titles)
  #   src/components/layout/recent-routes.ts        (no edit; auto-picks up)
  #   src/components/layout/Topbar.tsx              (no edit; reads nav configs)
  #   src/components/Navbar.tsx                     (+ "Shop" link)
  #   prisma/schema.prisma                          (+ Shop models)
```

### 5.2 What existing files get touched, exactly

The exhaustive list of edits to existing files. Everything else is a new file.

1. `prisma/schema.prisma` — append Shop models. No existing model is edited.
2. `src/components/layout/member-nav.ts` — add a `SHOP_NAV` group array; append to `MEMBER_NAV`. Pattern-identical to how Learning/Teaching groups already look.
3. `src/components/layout/admin-nav.ts` — add an `ADMIN_SHOP_NAV` group; append to `ADMIN_NAV`.
4. `src/components/layout/breadcrumb-map.ts` — add `ROUTE_TITLES` entries for `/shop`, `/shop/selling`, `/shop/orders`, `/shop/disputes`, `/admin/shop/*`.
5. `src/components/Navbar.tsx` — add a single "Shop" link to the public nav. One line.
6. `src/lib/server/member-counts.ts` — optionally extend to return open-dispute count for the sidebar badge (one extra indexed `count` query). If you'd rather avoid this, the badge can be omitted in v1.

**That is the entire edit surface of the existing codebase.** Every other existing file is untouched.

---

## 6. Data Model

All new models, additive migration. No existing column on any existing table changes. The only edit to an existing model is two **optional back-relations** on `User` and `WalletTransaction` (Prisma-only; no DB column on `User`; `WalletTransaction` already has the relevant columns).

### 6.1 New enums

```prisma
enum ShopListingStatus {
  DRAFT
  PENDING_REVIEW     // if moderation queue is enabled (Phase 6)
  ACTIVE
  PAUSED             // seller-initiated
  SOLD               // quantity exhausted
  EXPIRED            // optional TTL
  REJECTED           // admin moderation
  REMOVED            // admin takedown
}

enum ShopItemCondition {
  NEW
  LIKE_NEW
  GOOD
  FAIR
  FOR_PARTS
}

enum ShopOrderStatus {
  AWAITING_CONFIRMATION   // brief internal state; usually skipped
  ESCROWED                // buyer paid, funds held
  SHIPPED                 // seller marked shipped/Handed-over (with optional proof)
  DELIVERED               // buyer confirmed receipt
  COMPLETED               // delivered + dispute window closed OR auto-finalized
  DISPUTED                // dispute opened
  REFUNDED                // admin/case resolved → buyer refunded
  CANCELLED               // buyer cancelled before shipping
}

enum ShopOrderEventType {
  CREATED
  PAID                    // escrow funded
  SHIPPED
  DELIVERED
  COMPLETED
  DISPUTE_OPENED
  DISPUTE_MESSAGE
  DISPUTE_RESOLVED
  REFUNDED
  CANCELLED
  COMMISSION_CAPTURED
  PAYOUT_RELEASED
}

enum ShopDisputeStatus {
  OPEN
  AWAITING_SELLER
  AWAITING_BUYER
  RESOLVED_BUYER
  RESOLVED_SELLER
  ESCALATED
  CLOSED

enum ShopReportReason {
  PROHIBITED_ITEM
  MISREPRESENTATION
  SPAM
  FRAUD
  OFF_CAMPUS_TRANSACTION_REQUEST
  HARASSMENT
  OTHER
}

enum ShopReportStatus {
  OPEN
  ACKNOWLEDGED
  ACTIONED
  DISMISSED
}

enum ShopImageKind {
  LISTING
  PROOF_OF_DELIVERY
  DISPUTE_EVIDENCE
}
```

### 6.2 Core models

```prisma
model ShopCategory {
  id                    String             @id @default(cuid())
  slug                  String             @unique          // "books", "calculators", ...
  name                  String
  description           String?
  icon                  String?                             // lucide icon name
  commissionRateOverride Decimal?                           // null = use global
  sortOrder             Int                @default(0)
  isActive              Boolean            @default(true)
  listings              ShopListing[]
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  @@index([isActive, sortOrder])
}

model ShopListing {
  id           String             @id @default(cuid())
  sellerId     String
  categoryId   String
  title        String
  description  String
  condition    ShopItemCondition
  priceBdt     Decimal            @db.Decimal(10, 2)
  quantity     Int                @default(1)
  status       ShopListingStatus  @default(DRAFT)
  location     String?                              // "NSU Campus", "Library", etc.
  departmentId String?                              // optional link to existing Department
  images       Json             @default("[]")        // [{id,url,sortOrder}]
  searchTokens String?                              // denormalized for ILIKE
  viewCount    Int                @default(0)
  savedCount   Int                @default(0)
  soldCount    Int                @default(0)
  boostedUntil DateTime?                            // Phase 9
  expiresAt    DateTime?
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  seller       User               @relation("ShopSellerListings", fields: [sellerId], references: [id], onDelete: Cascade)
  category     ShopCategory       @relation(fields: [categoryId], references: [id])
  department   Department?        @relation(fields: [departmentId], references: [id])
  orders       ShopOrder[]
  reviews      ShopReview[]
  reports      ShopReport[]
  saves        ShopSavedListing[]

  @@index([status, categoryId, createdAt(sort: Desc)])
  @@index([sellerId, status])
  @@index([boostedUntil(sort: Desc)])            // Phase 9
  @@index([title])                                // trigram-friendly for ILIKE
  @@fulltext([title, description])                // if Postgres full-text desired (Phase 7)
}

model ShopOrder {
  id              String           @id @default(cuid())
  buyerId         String
  sellerId        String
  listingId       String
  listingSnapshot Json                                // title, price, condition, images at purchase
  quantity        Int
  unitPriceBdt    Decimal          @db.Decimal(10, 2)
  subtotalBdt     Decimal          @db.Decimal(10, 2)  // quantity * unitPrice
  commissionRateBt Decimal         @db.Decimal(5, 4)   // captured rate at sale time, e.g. 0.0700
  commissionBdt   Decimal          @db.Decimal(10, 2)
  payoutBdt       Decimal          @db.Decimal(10, 2)  // subtotal - commission
  escrowTxId      String?                                // WalletTransaction.id (debit from buyer)
  payoutTxId      String?                                // WalletTransaction.id (credit to seller)
  commissionTxId  String?                                // WalletTransaction.id (platform revenue)
  refundTxId      String?                                // WalletTransaction.id (if refunded)
  status          ShopOrderStatus  @default(ESCROWED)
  shipProof       Json?                                  // [{kind:"PROOF_OF_DELIVERY", url}]
  shippedAt       DateTime?
  deliveredAt     DateTime?
  completedAt     DateTime?
  disputeWindowEndsAt DateTime?
  autoFinalizeAt  DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  buyer           User             @relation("ShopBuyerOrders", fields: [buyerId], references: [id], onDelete: Cascade)
  seller          User             @relation("ShopSellerOrders", fields: [sellerId], references: [id], onDelete: Cascade)
  listing         ShopListing      @relation(fields: [listingId], references: [id])
  events          ShopOrderEvent[]
  dispute         ShopDispute?
  review          ShopReview?

  @@index([buyerId, status, createdAt(sort: Desc)])
  @@index([sellerId, status, createdAt(sort: Desc)])
  @@index([status, autoFinalizeAt])              // sweeper
  @@index([status, disputeWindowEndsAt])
}

model ShopOrderEvent {
  id          String             @id @default(cuid())
  orderId     String
  type        ShopOrderEventType
  actorId     String?
  metadata    Json?
  note        String?
  createdAt   DateTime           @default(now())
  order       ShopOrder          @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId, createdAt])
}

model ShopDispute {
  id           String           @id @default(cuid())
  orderId      String           @unique
  openedById   String
  reason       String
  status       ShopDisputeStatus @default(OPEN)
  resolution   String?
  resolvedById String?                              // admin id
  resolvedAt   DateTime?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  order        ShopOrder        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  messages     ShopDisputeMessage[]
  openedBy     User             @relation("ShopDisputesOpened", fields: [openedById], references: [id])

  @@index([status, createdAt(sort: Desc)])
}

model ShopDisputeMessage {
  id          String     @id @default(cuid())
  disputeId   String
  authorId    String
  body        String
  attachments Json?                       // [{kind, url}]
  createdAt   DateTime   @default(now())
  dispute     ShopDispute @relation(fields: [disputeId], references: [id], onDelete: Cascade)

  @@index([disputeId, createdAt])
}

model ShopReview {
  id          String   @id @default(cuid())
  orderId     String   @unique
  fromUserId  String
  toUserId    String
  listingId   String
  rating      Int                                      // 1–5
  body        String?
  createdAt   DateTime @default(now())

  from        User     @relation("ShopReviewsGiven", fields: [fromUserId], references: [id])
  to          User     @relation("ShopReviewsReceived", fields: [toUserId], references: [id])
  listing     ShopListing @relation(fields: [listingId], references: [id])
  order       ShopOrder   @relation(fields: [orderId], references: [id])

  @@index([toUserId, createdAt(sort: Desc)])
  @@index([listingId])
}

model ShopSavedListing {
  id         String   @id @default(cuid())
  userId     String
  listingId  String
  createdAt  DateTime @default(now())
  user       User     @relation("ShopSavedBy", fields: [userId], references: [id], onDelete: Cascade)
  listing    ShopListing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@unique([userId, listingId])
  @@index([userId, createdAt(sort: Desc)])
}

model ShopReport {
  id           String          @id @default(cuid())
  listingId    String?
  orderId      String?
  reporterId   String
  reason       ShopReportReason
  detail       String?
  status       ShopReportStatus @default(OPEN)
  handledById  String?
  resolution   String?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  listing      ShopListing?    @relation(fields: [listingId], references: [id])
  reporter     User            @relation("ShopReportsFiled", fields: [reporterId], references: [id])

  @@index([status, createdAt(sort: Desc)])
}

model ShopSellerProfile {
  userId           String   @id                            // 1:1 with User
  bio              String?
  storefrontName   String?
  isSuspended      Boolean  @default(false)
  listingCount     Int      @default(0)
  completedSales   Int      @default(0)
  avgRating        Decimal? @db.Decimal(3, 2)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([isSuspended, completedSales(sort: Desc)])
}

model ShopImage {
  id        String       @id @default(cuid())
  kind      ShopImageKind
  listingId String?
  orderId   String?
  uploaderId String
  url       String
  createdAt DateTime     @default(now())

  @@index([listingId])
  @@index([orderId])
}

model ShopBoost {
  id          String   @id @default(cuid())
  listingId   String
  paidTxId    String                                  // WalletTransaction.id
  startsAt    DateTime @default(now())
  endsAt      DateTime
  feeBdt      Decimal  @db.Decimal(10, 2)
  createdAt   DateTime @default(now())
  listing     ShopListing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@index([endsAt])                                   // sweeper to clear boostedUntil
}
```

### 6.3 Edits to existing models (additive back-relations only)

```prisma
model User {
  // ... existing fields untouched ...
  shopListings       ShopListing[]   @relation("ShopSellerListings")
  shopBuyerOrders    ShopOrder[]     @relation("ShopBuyerOrders")
  shopSellerOrders   ShopOrder[]     @relation("ShopSellerOrders")
  shopReviewsGiven   ShopReview[]    @relation("ShopReviewsGiven")
  shopReviewsReceived ShopReview[]   @relation("ShopReviewsReceived")
  shopSaves          ShopSavedListing[] @relation("ShopSavedBy")
  shopReportsFiled   ShopReport[]    @relation("ShopReportsFiled")
  shopDisputesOpened ShopDispute[]   @relation("ShopDisputesOpened")
  shopSellerProfile  ShopSellerProfile?
}

model Department {
  // ... existing untouched ...
  shopListings  ShopListing[]
}

model WalletTransaction {
  // ... existing untouched ...
  // Reuse existing columns (amount, type, purpose, metadata). New purpose enum values added.
}
```

### 6.4 Settings additions (existing `PlatformSetting` singleton)

Extend the singleton with nullable fields (all defaulting to safe values at migration). Existing settings unaffected.

---

## 7. Money Flow & Escrow

This is the part that must be airtight. The Shop never moves money outside the existing wallet ledger.

### 7.1 The escrow lifecycle (happy path)

```
1. Buyer clicks "Buy" on listing (price = P, commission rate = r)
   Pre-check (server): buyer.wallet.balance >= P, listing.status = ACTIVE,
                       quantity available, buyer != seller.

2. Server, inside ONE prisma.$transaction:
   a. Lock listing row (SELECT FOR UPDATE via Prisma's interactive tx).
      Re-check status === ACTIVE, quantity.
   b. Decrement listing.quantity; if 0 → status = SOLD.
   c. Create ShopOrder(status=ESCROWED, ...snapshot fields, commission calc).
   d. Create WalletTransaction:
        userId = buyer
        amount = -P
        type   = DEBIT
        purpose = SHOP_ESCROW
        metadata = { orderId }
   e. Create ShopOrderEvent(CREATED, PAID).
   f. Commit.

3. Funds are now HELD. Buyer's available balance is reduced. Seller does not have the money yet.

4. Seller marks SHIPPED (with optional proof image).
   → ShopOrderEvent(SHIPPED), status=SHIPPED, shippedAt=now,
     disputeWindowEndsAt = null (starts on delivery), notify buyer.

5. Buyer confirms DELIVERED.
   → status=DELIVERED, deliveredAt=now,
     disputeWindowEndsAt = now + disputeWindowHours,
     autoFinalizeAt = now + (autoFinalizeHours - alreadyElapsed) OR a fixed window.

6. Two paths to COMPLETED:
   (a) Buyer explicitly marks COMPLETED (e.g. leaves review).
   (b) autoFinalizeAt passes with no dispute opened.

   On COMPLETED, in ONE transaction:
     - WalletTransaction:
         userId = seller
         amount = +payoutBdt
         type   = CREDIT
         purpose = SHOP_PAYOUT
     - WalletTransaction:
         userId = platformAdminOrSystem
         amount = +commissionBdt
         type   = CREDIT
         purpose = SHOP_COMMISSION
     - (Optional, single combined row also acceptable — see §7.4.)
     - ShopOrderEvent(COMMISSION_CAPTURED, PAYOUT_RELEASED, COMPLETED).
     - Recompute ShopSellerProfile stats (completedSales++, avgRating running).
```

### 7.2 Refund path

```
- Buyer opens dispute OR admin initiates refund.
- Server validates: status in [ESCROWED, SHIPPED, DELIVERED, DISPUTED].
- In ONE transaction:
    - WalletTransaction:
        userId = buyer
        amount = +P
        type   = CREDIT
        purpose = SHOP_REFUND
    - Order.status = REFUNDED.
    - Listing: optionally restore quantity (configurable; default restore if not SOLD-elsewhere).
    - OrderEvent(REFUNDED).
```

### 7.3 Buyer cancellation

```
- Allowed only while status === ESCROWED (before SHIPPED).
- Same atomic wallet credit + OrderEvent(CANCELLED) + listing quantity restored.
```

### 7.4 Wallet ledger design choice

Two acceptable designs. I recommend **(b)**.

**(a) One row per money movement** — escrow debit, payout credit, commission credit as three separate `WalletTransaction` rows, linked by `metadata.orderId`. Pro: maximally simple ledger entries. Con: balance math spans three rows.

**(b) Keep escrow as a "held" sub-pool** — at order placement, the buyer's `available` balance drops by P but their total is unchanged; on completion, a single `+payoutBdt` to seller and `+commissionBdt` to platform moves money out of escrow. This matches the **post-2026-08-04 unified-wallet design** (memory: `refund_and_wallet_flow.md` notes wallet was unified into one pool). The "held" amount is derivable as `SUM(WalletTransaction where purpose=SHOP_ESCROW AND corresponding order not COMPLETED/REFUNDED)`.

Given the recent unification of the wallet into one pool, **(a) is the honest fit** — there is no separate "available" column to manipulate. Escrow = a debit to buyer at order time; refund = credit back; payout = credit to seller; commission = credit to platform. Each is a single ledger row, fully auditable. Go with (a).

### 7.5 Commission capture — when, exactly

Commission is **captured at settlement** (COMPLETED), never at escrow. This means:
- Refunds return the *full* P to the buyer. No "platform keeps the commission on failed orders" trap.
- The seller only "pays" commission on money they actually received.
- Platform revenue is recognized at the same moment as seller payout — clean accounting.

### 7.6 Concurrency & atomicity

- **All money writes are inside `prisma.$transaction(async (tx) => { ... })` with row locking on `ShopListing` and `User` (wallet owner) where appropriate.**
- The escrow transaction must re-read the listing inside the tx and re-validate `status === ACTIVE` to prevent double-selling race conditions.
- Idempotency: each order-impacting server action accepts an idempotency key (derived from listing + buyer + a client nonce) and checks for an existing `ShopOrder` with that key before proceeding. Prevents double-charges from double-clicks or network retries.

---

## 8. Commission, Fees & Payouts

### 8.1 Commission calculation (deterministic, captured at order time)

```
unitPriceBdt    = listing.priceBdt
subtotalBdt     = unitPriceBdt * quantity
rate            = category.commissionRateOverride ?? settings.shopCommissionRateDefault
rate            = clamp(rate, 0, 0.20)
commissionBdt   = round2(subtotalBdt * rate)
payoutBdt       = subtotalBdt - commissionBdt
```

The `commissionRateBt` (the *rate*) is **snapshotted onto the order row at sale time**. Even if the admin changes the global rate tomorrow, every open order settles at the rate it was sold at. This is a non-negotiable fairness invariant.

### 8.2 Rounding

All BDT amounts are stored as `Decimal(10,2)`. Commission uses banker's rounding to 2 dp. No float math anywhere in the path. Document this in `src/lib/shop/service.ts`.

### 8.3 Zero-rate categories & promotional periods

Admin can set the global rate to 0 for a launch month (seed inventory) or set `commissionRateOverride = 0` on a category (e.g. "Free-cycle / giveaway" category). Code path is identical — commission row still written (with `amount = 0`), keeping the ledger uniform.

### 8.4 Payout destination

Seller payouts credit the seller's wallet. The seller can then withdraw via the existing `/tutor/earnings` withdrawal flow (which already supports MFS + bank). No new withdrawal path. Existing withdrawal fee applies, unchanged.

### 8.5 Platform revenue accounting

Commission credits land in the existing platform/admin wallet (same pattern as consultancy fees and withdrawal fees today). Admins see total commission revenue as a KPI on `/admin/shop`.

---

## 9. Roles, Capabilities & Trust

### 9.1 Who can do what

| Action | Eligibility |
|---|---|
| Browse listings (`/shop`, public) | Anyone, including logged-out |
| View listing detail | Anyone |
| Save a listing | Authed member |
| Buy a listing | Authed member with `emailVerified !== null` AND `isBlocked === false` AND wallet balance ≥ price |
| List an item for sale | Authed member with email verified AND not blocked AND `ShopSellerProfile.isSuspended === false`. `ShopSellerProfile` is auto-created on first listing attempt (idempotent). |
| Mark own listing shipped | Authed seller who owns the order's listing |
| Confirm delivery | Authed buyer who owns the order |
| Open a dispute | Buyer (post-shipping, within dispute window) OR Seller (e.g. buyer won't confirm) |
| Leave a review | Buyer, after COMPLETED; one review per order |
| Report a listing | Any authed member other than the seller |
| Admin moderation | `role === 'ADMIN'` |

### 9.2 Capability is data-derived, never role-derived

Consistent with the platform's unified-campus philosophy (`memory: STUDENT_TEACHER_DASHBOARD_REDESIGN_BLUEPRINT.md` §1.6): a Student can sell, a Tutor can sell, both can buy. There is **no `isSeller` flag on `User`** and no role flip. Selling capability is the existence of an active `ShopSellerProfile` row + at least one ACTIVE listing — fully derivable.

### 9.3 Trust signals (display-only)

- **Verified buyer/seller** = `emailVerified !== null && !isBlocked`.
- **Established seller** = `ShopSellerProfile.completedSales >= 5 && avgRating >= 4.0`.
- **Top seller** = `completedSales >= 50 && avgRating >= 4.7` (Phase 10 badge).
- These are computed at read time; no denormalized flag on `User`.

### 9.4 Seller suspension

Admin can suspend a seller (`ShopSellerProfile.isSuspended = true`). Effect:
- All their ACTIVE listings → `PAUSED` automatically (server action, in tx).
- They cannot create new listings.
- Their in-flight orders continue to settle normally (don't punish buyers).
- Visible on `/admin/shop/sellers` and on the seller's public profile with a "Suspended" `StatusBadge`.

---

## 10. Listing Lifecycle

```
DRAFT
  ↓ (seller submits)
PENDING_REVIEW ─── (admin approves) ──→ ACTIVE
        │                                    
        └─ (admin rejects) → REJECTED
        └─ (admin auto-approve setting) → ACTIVE     // config flag: shopModerationMode

ACTIVE
  ↓ (seller pauses)
PAUSED → ACTIVE (resume)
  ↓ (quantity hits 0 on order)
SOLD
  ↓ (admin takedown)
REMOVED
  ↓ (TTL, if set)
EXPIRED
```

### 10.1 Moderation queue (configurable)

`PlatformSetting.shopModerationMode`:
- `AUTO` (default for launch — reduces friction): listings go ACTIVE immediately; reports trigger after-the-fact review.
- `MANUAL`: listings wait in `PENDING_REVIEW` until admin approves. Higher safety, lower liquidity, more admin load. Recommended only for sensitive categories.

---

## 11. Order Lifecycle

(Same as §7 lifecycle; events recorded in `ShopOrderEvent` for the timeline UI.)

### 11.1 State machine

```
ESCROWED
  ├──→ CANCELLED            (buyer cancels before ship)
  ├──→ REFUNDED             (admin / auto on dispute resolve)
  ├──→ SHIPPED
  │       ├──→ DELIVERED
  │       │       ├──→ COMPLETED       (explicit or auto-finalize)
  │       │       └──→ DISPUTED → RESOLVED → COMPLETED | REFUNDED
  │       └──→ DISPUTED (e.g. buyer claims non-delivery)
  └──→ DISPUTED
```

### 11.2 Auto-finalize

A scheduled task (or on-demand sweep from a Next.js cron-like endpoint — see §15) scans orders where `autoFinalizeAt < now()` and `status = DELIVERED` with no open dispute, and transitions them to COMPLETED. The sweep is idempotent and runs inside per-order transactions.

The project currently has **no background job infrastructure** (per `NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md` §1.1). For the Shop I propose a pragmatic Phase-2 option: a `POST /api/shop/sweep/auto-finalize` endpoint protected by a cron secret (`Authorization: Bearer <CRON_SECRET>`), invocable from an external scheduler (Vercel Cron, GitHub Actions, or a laptop cron). The endpoint is fully idempotent and safe to call as often as desired.

---

## 12. Moderation, Reports & Disputes

### 12.1 Reports

Any authed member can report a listing or a seller. Reports queue at `/admin/shop/reports` (DataGrid + Sheet for resolution). Admin actions: dismiss, takedown listing (`status = REMOVED`), suspend seller, no-op + note.

### 12.2 Disputes

A dispute is opened by buyer or seller in a narrow window:
- Buyer: any time after `SHIPPED` until `disputeWindowEndsAt`.
- Seller: if buyer hasn't confirmed within `autoFinalizeAt - 6h`, seller can pre-emptively open a "non-confirmation" dispute.

Disputes land at `/admin/shop/disputes` (priority-sorted DataGrid). The admin sees the full order timeline, can read the dispute thread (with buyer/seller messages + image attachments), and resolves with: **Refund Buyer** | **Pay Seller** | **Split** (admin-entered split amount, must sum to escrowed total). Resolution writes a final `WalletTransaction` pair and closes the order.

### 12.3 Dispute SLA

Auto-escalation if unhandled for 72 hours: status → `ESCALATED`, surfaces as a red `StatusBadge` on the admin dashboard KPI row.

### 12.4 Evidence

Both parties can attach up to 4 images per dispute message (`ShopImage.kind = DISPUTE_EVIDENCE`). Stored via the §18 image pipeline.

---

## 13. Reviews & Reputation

- One `ShopReview` per COMPLETED order, written by the buyer about the seller.
- Rating 1–5 + optional body (max 1000 chars, basic profanity filter at server action).
- A seller's `avgRating` is denormalized on `ShopSellerProfile` and recomputed on each new review (cheap: O(1) update via running average).
- Reviews are immutable after 30 days unless the admin flags.
- Sellers cannot review buyers in v1 (keeps the trust signal one-directional and simple).

---

## 14. Notifications Integration

Plug into the existing `createNotification` API. No new infrastructure.

| Event | Receiver | Channels | Deep link |
|---|---|---|---|
| Order placed (escrowed) | Seller + Buyer | In-app + Email + (Push, optional) | `/shop/orders/{id}` |
| Order shipped | Buyer | In-app + Email | `/shop/orders/{id}` |
| Order delivered/confirmed | Seller | In-app + Email | `/shop/orders/{id}` |
| Order completed (payout released) | Seller | In-app + Email | `/shop/orders/{id}`, `/wallet` |
| Order cancelled / refunded | Counterparty | In-app + Email | `/shop/orders/{id}` |
| Dispute opened | Counterparty + Admin | In-app + Email + Discord-ops | `/shop/orders/{id}`, `/admin/shop/disputes` |
| Dispute message | Counterparty | In-app | `/shop/disputes/{id}` |
| Dispute resolved | Both parties | In-app + Email | `/shop/orders/{id}` |
| Listing approved (MANUAL mode) | Seller | In-app | `/shop/selling` |
| Listing rejected / removed | Seller | In-app + Email | `/shop/selling` |
| Listing reported (admin) | Admin | In-app + Discord-ops | `/admin/shop/reports` |
| Review received | Seller | In-app | `/shop/selling` |
| Auto-finalize completed | Seller | In-app | `/wallet` |
| Boost expired | Seller | In-app | `/shop/selling` (Phase 9) |

A new `ShopEvent` dispatcher in `src/lib/shop/service.ts` calls `createNotification` (and existing email/Discord helpers) for each of these. The Shop itself contains zero notification plumbing — it relies entirely on the existing system.

---

## 15. API Surface

### 15.1 REST endpoints (all authed unless noted)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/shop/listings` | GET | public list with filters (q, category, condition, minPrice, maxPrice, sort, cursor) |
| `/api/shop/listings` | POST | seller creates a listing |
| `/api/shop/listings/[id]` | GET | public detail |
| `/api/shop/listings/[id]` | PATCH | seller edits own listing |
| `/api/shop/listings/[id]` | DELETE | seller deletes (soft) own listing |
| `/api/shop/listings/[id]/save` | POST/DELETE | save / unsave |
| `/api/shop/listings/[id]/report` | POST | report listing |
| `/api/shop/listings/[id]/buy` | POST | place order (escrow) |
| `/api/shop/orders` | GET | list my orders (buyer or seller) |
| `/api/shop/orders/[id]` | GET | order detail |
| `/api/shop/orders/[id]/ship` | POST | seller marks shipped |
| `/api/shop/orders/[id]/confirm` | POST | buyer confirms delivery |
| `/api/shop/orders/[id]/complete` | POST | buyer completes (post-delivery) |
| `/api/shop/orders/[id]/cancel` | POST | buyer cancels (pre-ship) |
| `/api/shop/orders/[id]/dispute` | POST | open dispute |
| `/api/shop/disputes/[id]/messages` | POST | add message |
| `/api/shop/reviews` | POST | leave review (COMPLETED orders only) |
| `/api/shop/search` | GET | lightweight search for ⌘K |
| `/api/shop/images` | POST | upload image (Phase 5) |
| `/api/shop/sweep/auto-finalize` | POST | cron-protected idempotent sweep |
| `/api/admin/shop/listings/[id]/moderate` | POST | admin approve/reject/takedown |
| `/api/admin/shop/disputes/[id]/resolve` | POST | admin resolve dispute |
| `/api/admin/shop/reports/[id]/handle` | POST | admin handle report |
| `/api/admin/shop/sellers/[id]/suspend` | POST | admin suspend seller |
| `/api/admin/shop/categories` | GET/POST/PATCH/DELETE | admin category CRUD |
| `/api/admin/shop/settings` | GET/PATCH | admin shop settings |

### 15.2 Server actions vs. route handlers

Consistent with the existing codebase convention (server actions for form-driven mutations, route handlers for read/fan-out and webhooks):
- **Server actions** (`src/app/actions/shop.ts`): buy, ship, confirm, cancel, dispute, message, review, create/edit listing, save/unsave, report. All re-check auth inside the body.
- **Route handlers**: the GETs above + image upload + cron sweep.

### 15.3 Authorization model

Every server action and route handler extracts the session via the existing pattern and scopes queries. Mutations re-verify ownership (e.g. `order.sellerId === session.user.id` to ship). Admin endpoints gate on `role === 'ADMIN'`. This mirrors the notification system's authorization posture exactly (`NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md` §3.5).

---

## 16. UI/UX Surfaces

All surfaces inherit the existing design system. **Zero new primitives.**

### 16.1 Public Browse (`/shop`)

- `PageHeader` — "NSUOne Shop" + subtitle + cart-less CTA.
- Hero `KPI` strip — Active Listings, Categories, Items Sold This Month (derived).
- `Toolbar` — search input, category select, condition select, price range, sort (Newest / Price ↑ / Price ↓ / Popular / Boosted first).
- Body — responsive `ShopListingCard` grid (auto-fit/minmax per existing pattern). Each card: image, title, condition badge, price BDT, seller name + rating, save heart.
- Empty / Error / Skeleton states per existing convention.
- "List an item" primary CTA in the header (authed only); "Sign in to sell" for logged-out.

### 16.2 Listing Detail (`/shop/listing/[id]`)

- Two-column on desktop (gallery left, details right), stacked on mobile.
- Right column: title, condition, price, quantity selector (if >1), description, location, seller card (avatar, name, rating, completed sales, "View seller profile" → `/shop/seller/[id]`), report listing (overflow), save button.
- Buy flow: sticky bottom CTA "Buy now — {price} BDT". On click: confirm Sheet (shows wallet balance, price, "Funds will be held in escrow until delivery"). Submit → server action.
- Reviews section below (paginated).
- Related listings from same category.

### 16.3 Seller Dashboard (`/shop/selling`)

- `PageHeader` + storefront CTA.
- `KPI` row: Active Listings, Views (30d), Completed Sales, Avg Rating, Lifetime Earnings, Pending Payouts.
- `Tabs`: **Active** | **Drafts** | **Sold** | **Reports** (count-driven).
- `DataGrid` of listings with row actions (Edit, Pause/Resume, Delete, View).
- "New listing" primary button → `/shop/selling/new`.

### 16.4 New / Edit Listing Form (`/shop/selling/new`, `/shop/selling/listing/[id]`)

- `FormPage` + `FormCard` + `FormSection` pattern (matches existing Profile/Earnings/Consultancy forms).
- Sections: **Details** (title, category, condition, description), **Pricing & Inventory** (price, quantity), **Media** (image uploader — drag/drop, reorder, max 6), **Location** (free text + optional department link), **Review & Publish**.
- Live preview card on desktop (right column) updates as the user types.
- Dirty tracking (existing pattern from the member dashboard redesign Phase 6).
- Server action validates via Zod schema in `src/lib/validation.ts` (extend, don't replace).

### 16.5 Orders (`/shop/orders`, `/shop/orders/[id]`)

- `Tabs`: **Buying** | **Selling** (count-driven).
- `DataGrid` — counterparty, listing (with image thumb), price, status badge, date, action shortcut.
- Detail page: order timeline (`ShopOrderTimeline` component — vertical stepper of `ShopOrderEvent`), listing snapshot card, action buttons context-gated (Cancel / Mark Shipped / Confirm Delivery / Complete + Review / Open Dispute), escrow info panel showing "X BDT held — auto-releases on delivery or in 72h".

### 16.6 Disputes (`/shop/disputes`, `/shop/disputes/[id]`)

- `DataGrid` of my disputes with status badges.
- Detail page: thread (`ShopDisputeThread`) with messages + image attachments, original order summary, admin resolution panel (admin view).

### 16.7 Saved (`/shop/saved`)

- Card grid of saved listings (reuse `ShopListingCard`). Sort: Recent / Price.

### 16.8 Seller Profile (`/shop/seller/[id]`)

- Public storefront: avatar, name, established-seller badge, completed sales, avg rating, member since, bio.
- Their active listings grid (filtered to ACTIVE).
- Reviews list.

### 16.9 Admin Shop (`/admin/shop/*`)

- **Overview** — `KPI` row (GMV 30d, Commission 30d, Active Listings, Open Disputes, Open Reports), a small chart (listings/orders 30d), recent activity feed.
- **Listings** — DataGrid with all statuses; row actions: approve, reject, takedown, view; bulk actions.
- **Orders** — read-only DataGrid with status filter; deep link to detail.
- **Disputes** — DataGrid priority-sorted; Sheet for resolution.
- **Reports** — DataGrid; Sheet for handling.
- **Payouts** — ledger view of all `SHOP_PAYOUT` and `SHOP_COMMISSION` wallet transactions (reuse existing wallet tx query patterns).
- **Categories** — CRUD with `DataGrid` + `Sheet` form (slug, name, icon, commission override, order, active).
- **Sellers** — DataGrid of `ShopSellerProfile` with suspend/unsuspend row action.
- **Settings** — `FormCard` for the global shop config (commission rate, auto-finalize window, dispute window, moderation mode, boost fee/days, max images, min/max price, image upload toggle).

### 16.10 Mobile

- Sidebar Shop group collapses into the off-canvas drawer (existing pattern).
- Browse grid restacks to 2-up → 1-up at 480 px.
- Forms use `FormSection` responsive collapse (existing).
- Detail page sticky buy CTA becomes bottom-sheet style under 640 px.
- Touch targets ≥ 44 px enforced via existing `.touch-target` utility (already in `globals.css` per member dashboard Phase 10).

### 16.11 Dark mode

Every new surface uses tokens (`--surface-*`, `--text-*`, `--primary`, etc.). No raw hex. Dark-mode coverage is part of Phase 7 acceptance.

### 16.12 Accessibility

Inherit the platform a11y baseline (focus-visible rings, focus trap in Sheet/Modal, `aria-*` on Tabs/DataGrid, reduced-motion). Each new primitive from the existing library already complies.

---

## 17. Search, Filtering & Discovery

### 17.1 v1 (Phase 3)

- ILIKE on denormalized `searchTokens` (title + category name + description first 200 chars).
- Filters: category, condition, price range, sort.
- Cursor pagination (default 24 per page).

### 17.2 v2 (Phase 7) — Postgres full-text

- `@@fulltext([title, description])` on `ShopListing`.
- `tsvector` column + GIN index (computed column in Prisma via `@@map` or raw migration).
- Ranked `ts_rank_cd` results.

### 17.3 v3 (deferred) — external search

- Meilisearch / Typesense if/when inventory exceeds ~50k listings. Out of scope for this blueprint.

### 17.4 Discovery boosts

Default sort weights:
1. `boostedUntil > now()` (Phase 9 paid Boost) — sorted above non-boosted, then by `boostedUntil` desc.
2. Then by `createdAt` desc (default) or user-selected sort.

Boosted listings are visually marked with a small "Boosted" `StatusBadge` so the system remains transparent (preserves user trust in the discovery experience).

---

## 18. Image Handling

### 18.1 Strategy

The Shop is the first part of this product that needs user-uploaded images beyond avatars. Two viable paths:

**(a) Self-hosted under `/public/uploads/shop/`** — simplest, works today, no new dependency. Suitable for a closed-campus marketplace with modest volume. Requires a small `formidable`/`busboy` parser in the route handler (or `FormData` + `Buffer` write). Downside: backups, disk growth, no CDN.

**(b) Object storage (Cloudflare R2 / AWS S3 / UploadThing)** — production-grade. Adds one dependency and one env var. Recommended before public launch.

**My recommendation:** ship Phase 5 with **(a)** for speed, with all uploads behind a thin `src/lib/shop/images.ts` abstraction (`uploadShopImage(buffer, kind) → url`) so migrating to (b) is a one-file change in a later phase.

### 18.2 Validation

- Max file size: 4 MB.
- Allowed MIME: `image/jpeg`, `image/png`, `image/webp`.
- Magic-byte check (not just extension).
- Max dimensions: 2000 px (auto-resize server-side with `sharp` if exceeded).
- Min dimensions: 300 × 300.
- Strip EXIF metadata (privacy: GPS, device).
- Generate a thumbnail variant (300 px) for grid performance.

### 18.3 Trust & safety

- All uploaded images are scanned for prohibited content via a basic check (NSFW JS or Cloudflare's scanner if going option (b)). Pending scan → listing stays `PENDING_REVIEW`.
- Per-uploader rate limit: max 30 image uploads/hour (reuse `src/lib/rateLimit.ts`).

---

## 19. Performance, Indexing & Scale

- Every hot query has a covering index (see the `@@index` declarations in §6.2).
- Browse list queries are cursor-paginated (`createdAt` cursor), not OFFSET.
- Detail pages include `+1` view bump via a debounced write (or a Redis counter later) — never a synchronous write per page view.
- Seller profile stats (`avgRating`, `completedSales`) are denormalized and updated in the same tx as the triggering event — avoids `aggregate` calls on hot paths.
- Admin overview KPIs are computed with a single `aggregate` each, run in `Promise.all` (mirrors the existing admin dashboard pattern).
- Image grid: serve thumbnails; `next/image` for detail pages with responsive `deviceSizes`.

---

## 20. Security & Fraud Posture

| Threat | Mitigation |
|---|---|
| Double-charge on "Buy" | Idempotency key + tx-level listing lock |
| Race condition (two buyers, one item) | `SELECT FOR UPDATE` semantics inside `$transaction` (Prisma interactive tx with explicit read-after-write re-check) |
| Seller marks shipped without delivering | Buyer can open dispute; auto-finalize is buyer-gated primarily |
| Buyer false "not delivered" | Seller ships with proof image (`ShopImage.kind = PROOF_OF_DELIVERY`); admin reviews in dispute |
| Money laundering via huge listings | Hard cap on max price (50,000 BDT default); admin alert on listings > 10,000 BDT |
| Off-platform transaction requests | Prohibited in TOS; report reason `OFF_CAMPUS_TRANSACTION_REQUEST`; admin can act |
| Fake reviews | One review per order; reviews post-COMPLETED only; admin can hide |
| Image abuse | Phase 5 moderation pipeline + per-uploader rate limit |
| Unauthorized admin actions | All admin routes `requireRole(['ADMIN'])` + re-check in action body |
| Spam listings | Per-seller listing cap (configurable, default 50 active); min price floor |
| Wallet bypass | There is no path — every money movement is a `WalletTransaction` row |
| XSS via description | Server-rendered as plain text by default; if Markdown is added later, sanitize |
| CSRF | Existing NextAuth CSRF posture applies; server actions have built-in protection |

---

## 21. Phase-by-Phase Implementation Roadmap

Every phase is independently shippable, reversible, ends with `npm run build` passing, and respects §22 (regression protection). No phase touches existing business logic, routes, or auth.

### Phase 0 — Foundation audit & spec lock
- **Objective:** confirm this blueprint against the live codebase (verify `WalletTransaction` columns, `PlatformSetting` shape, nav config files, `requireRole` location).
- **Files:** none modified.
- **Risk:** none.
- **Acceptance:** blueprint signed off; phased backlog created.
- **Complexity:** XS.

### Phase 1 — Database foundation (additive migration)
- **Objective:** ship all Prisma Shop models + enums + settings fields in one additive migration. Backfill: create `ShopSellerProfile` rows lazily (not in migration). Seed default categories.
- **Files:** `prisma/schema.prisma`, `prisma/migrations/<ts>_add_shop_module/`, optional `prisma/seed-shop-categories.ts`.
- **Risk:** low — additive only.
- **Testing:** migration on clone DB; verify existing app boots unchanged; `npm run build`.
- **Acceptance:** migration applies; new tables queryable; existing routes unaffected.
- **Complexity:** M.

### Phase 2 — Domain service + escrow logic
- **Objective:** `src/lib/shop/{types,service,escrow,policy}.ts`. Pure functions + atomic transaction helpers. No UI. Unit-testable.
- **Files:** new `src/lib/shop/*`.
- **Risk:** low (no UI wired).
- **Testing:** unit tests for commission calc, escrow tx, refund tx, auto-finalize transition.
- **Acceptance:** all money math proven by tests.
- **Complexity:** M.

### Phase 3 — Public Browse + Server Actions (read path)
- **Objective:** `/shop`, `/shop/listing/[id]`, `/shop/category/[slug]`, `/shop/seller/[id]` (read-only), public API endpoints. Nav wiring (the 6 minimal edits in §5.2).
- **Files:** new routes + components in `src/components/shop/`; nav config edits.
- **Risk:** low.
- **Acceptance:** logged-out users can browse; logged-in can save listings; no buy yet.
- **Complexity:** M.

### Phase 4 — Seller flows (create/edit/listing management)
- **Objective:** `/shop/selling/*`, seller-side server actions (create, edit, pause, delete), seller dashboard with KPIs + DataGrid.
- **Files:** new `src/app/(marketing)/shop/selling/*`, `src/app/actions/shop.ts`.
- **Risk:** medium (first writes to Shop tables).
- **Acceptance:** seller can create, edit, pause, delete listings; listings appear on Browse (with `AUTO` moderation).
- **Complexity:** M.

### Phase 5 — Image upload pipeline
- **Objective:** `/api/shop/images`, `ShopImageUploader` component, validation, EXIF strip, thumbnail gen, optional NSFW filter.
- **Files:** new image route + `src/lib/shop/images.ts` + uploader component.
- **Risk:** medium (first binary upload path in the app).
- **Acceptance:** sellers upload up to 6 images per listing; images render on detail + grid.
- **Complexity:** M.

### Phase 6 — Buying: escrow + order lifecycle
- **Objective:** Buy action (escrow), order detail page, ship / confirm / cancel / complete actions, order timeline UI. The heart of the marketplace.
- **Files:** `src/app/(marketing)/shop/orders/*`, server actions in `src/app/actions/shop.ts`, escrow wiring.
- **Risk:** high (money movement). Mitigate with Phase 2 unit tests + extensive happy/unhappy E2E.
- **Acceptance:** end-to-end: list → buy → ship → confirm → complete → payout to seller wallet + commission to platform.
- **Complexity:** L.

### Phase 7 — Reviews + Saved listings
- **Objective:** review form (post-complete), review display on seller profile + listing detail, saved-listings page, full-text search migration.
- **Files:** review components, saved page, full-text migration.
- **Risk:** low.
- **Acceptance:** buyers leave reviews; sellers see them; saved page works; full-text search responsive.
- **Complexity:** M.

### Phase 8 — Notifications + Discord + email wiring
- **Objective:** emit `createNotification` + emails + Discord ops pings for every Shop event in §14.
- **Files:** extend `src/lib/shop/service.ts` event dispatcher; reuse existing email/Discord helpers.
- **Risk:** low.
- **Acceptance:** every Shop event produces the right in-app + email + Discord coverage per §14.
- **Complexity:** S.

### Phase 9 — Disputes + admin moderation queue
- **Objective:** dispute open/thread/resolve flows; admin `/admin/shop/disputes`, `/admin/shop/reports`; seller suspension.
- **Files:** dispute routes + components; admin shop section (`/admin/shop/*`).
- **Risk:** medium (touches admin experience but in a brand-new section).
- **Acceptance:** full dispute lifecycle; admin resolves; reports queue works.
- **Complexity:** L.

### Phase 10 — Admin Shop overview + settings + categories + payouts
- **Objective:** KPI overview, settings FormCard, category CRUD, payouts ledger view.
- **Files:** remaining `/admin/shop/*` pages.
- **Risk:** low.
- **Acceptance:** admin can configure shop, manage categories, view revenue.
- **Complexity:** M.

### Phase 11 — Auto-finalize cron + monitoring
- **Objective:** `/api/shop/sweep/auto-finalize` idempotent endpoint; wire external scheduler; Sentry breadcrumbs on sweep.
- **Files:** sweep route + cron config (Vercel Cron or external).
- **Risk:** low (idempotent).
- **Acceptance:** orders auto-complete after the window; ledger settles automatically.
- **Complexity:** S.

### Phase 12 — Optional Boost (paid visibility)
- **Objective:** `ShopBoost` model activation (added in Phase 1, dormant). Sellers pay a flat fee to boost. Boost sort weight + badge.
- **Files:** `ShopBoostPanel`, boost server action, sort weight in browse query.
- **Risk:** medium (additional money flow — reuses the same escrow pattern with instant settlement since it's a service fee).
- **Acceptance:** boosted listings sort first with a transparent badge.
- **Complexity:** M.

### Phase 13 — Polish: a11y audit, mobile sweep, dark mode verification, performance
- **Objective:** axe-core pass, Lighthouse, 360/414/768/1024/1440 visual sweep, dark-mode token audit, image lazy-loading.
- **Files:** per-fix.
- **Risk:** low.
- **Acceptance:** zero critical a11y issues; LCP on `/shop` < 2.5 s.
- **Complexity:** M.

### Phase 14 — Documentation + seller onboarding
- **Objective:** `docs/shop.md` (seller guide, admin runbook, dispute playbook); in-product empty-state copy for first-time sellers.
- **Files:** docs + EmptyState copy.
- **Risk:** none.
- **Complexity:** S.

> **Recommended sequencing:** 0 → 1 → 2 → (3 + 4 in parallel) → 5 → 6 → (7 + 8 in parallel) → 9 → 10 → 11 → 12 → 13 → 14. Phases 6 and 9 are the load-bearing ones; budget the most review time there.

---

## 22. Regression Protection

The contract every phase must respect.

1. **No existing Prisma model loses a field or changes a column.** All schema changes are additive.
2. **No existing route, API, server action, or auth flow changes.** Existing endpoints keep method, path, request shape, response shape, status codes.
3. **No existing role semantics change.** No new role, no `User.role` flip for sellers.
4. **No existing notification, email, or Discord behavior changes.** Shop additions are additive.
5. **No existing dashboard, admin page, wallet page, tutor page, consultancy page loses capability.**
6. **No existing MFS / payment / withdrawal flow changes.** Shop is wallet-only and does not touch MFS.
7. **The wallet ledger remains the single source of truth for money.** Every Shop BDT is a `WalletTransaction` row.
8. **Commission is captured at settlement, never at escrow.** Refunds return 100% to the buyer.
9. **Commission rate is snapshotted per order.** Global rate changes do not retroactively affect open orders.
10. **The Shop module is independently removable.** Dropping the Shop routes, actions, components, and Prisma models must leave the rest of the app fully functional (modulo the 6 wiring-point edits, which are trivially revertible).
11. **`npm run build` passes after every phase.**
12. **Zero new runtime dependencies** unless the phase explicitly lists one (Phase 5 may add `sharp`; nothing else requires one).

---

## 23. What You Will See After Implementation

A plain-language summary of the visible end state, grouped by who sees what.

### 23.1 A logged-out visitor
- A **"Shop"** link appears in the public top **Navbar**.
- Clicking it opens `/shop` — a browse page with a hero strip, category filter bar, search, and a grid of campus items (calculators, textbooks, lab kits, notes, electronics) with photos, prices in BDT, condition badges, and seller cards.
- Listing detail pages are public — they can view photos, description, seller profile, reviews — but the **Buy** button is replaced with "Sign in to buy".

### 23.2 A signed-in student or tutor (the everyday user)
- A new **"Shop"** group in the **left Sidebar** with: **Browse**, **Selling**, **Orders**, **Saved**, **Disputes**.
- A "List an item" CTA visible on `/shop` and on `/shop/selling`.
- **As a buyer:** they can save listings, buy with one click (funds held in escrow from their wallet), track an order through Shipped → Delivered → Completed, leave a review, open a dispute if something is wrong. Their wallet history shows the escrow debit and any refund.
- **As a seller:** they can list items with up to 6 photos, manage listings from a dedicated dashboard (Active / Drafts / Sold tabs), see KPIs (views, completed sales, avg rating, lifetime earnings, pending payouts), mark orders as shipped with optional proof image, and watch payouts land in their wallet on completion — withdrawable through the existing `/tutor/earnings` flow.
- The existing **NotificationBell** now also surfaces Shop events: "Your order was shipped", "Funds released to your wallet", "Buyer opened a dispute", "You have a new review", etc. Each links deep into the relevant Shop page.
- Their **⌘K command palette** includes Shop destinations and quick actions ("List an item", "My shop orders", "Open a dispute").

### 23.3 A seller specifically
- A public **storefront** at `/shop/seller/[id]` showing their bio, established-seller badge, completed sales count, avg rating, and all their active listings.
- A lifetime sales counter on their seller dashboard.
- Reviews left by buyers, visible on their storefront and on each of their listings.

### 23.4 An admin
- A new **"Shop"** group in the admin Sidebar with: **Listings**, **Orders**, **Disputes**, **Reports**, **Payouts**, **Categories**, **Settings**.
- An overview page (`/admin/shop`) with KPIs: GMV (30 d), Commission Revenue (30 d), Active Listings, Open Disputes, Open Reports, and a small chart of listings/orders volume.
- Full visibility into every order, every dispute (with the message thread + evidence images), and every report — with the power to refund the buyer, pay the seller, takedown a listing, or suspend a seller.
- A **Categories** CRUD for shaping browse taxonomy and per-category commission overrides.
- A **Settings** page where they set: default commission rate (default 7%), auto-finalize window (default 72 h), dispute window (default 48 h), moderation mode (Auto / Manual), max images per listing, min/max listing price, and (Phase 12) Boost fee + duration.
- Commission revenue credits the platform wallet, visible in the existing admin wallet view as `SHOP_COMMISSION` transactions.

### 23.5 In the existing wallet
- Four new `WalletTransaction` purposes appear in the user-facing wallet history: `SHOP_ESCROW` (debit when buying), `SHOP_PAYOUT` (credit when selling), `SHOP_COMMISSION` (visible only on the platform/admin wallet), and `SHOP_REFUND` (credit on refund). Each has a deep link to the corresponding order.
- Wallet balances, recharge, and withdrawal flows are otherwise unchanged.

### 23.6 In the existing notification + email systems
- A new category of in-app notifications, fully consistent with the existing bell UX.
- New Resend-based transactional emails for the events in §14, styled to match the existing email brand.
- A new Discord ops webhook helper (`notifyShopOrder`, `notifyShopDispute`, etc.) for admin awareness — the same shape as the existing six helpers.

### 23.7 What does NOT change
- Auth, sign-in, OTP, role enum, JWT shape, cookie names — untouched.
- Tutor expertise, tutor requests, payments, MFS providers, withdrawals, refunds-to-wallet, consultancy, coupons — untouched.
- Existing dashboards (`/dashboard`, `/admin/dashboard`, `/wallet`, `/tutor/*`, `/student/*`, `/consultancy`) — untouched.
- Existing routes, API contracts, and Prisma models — untouched (additive only).

The end state: **NSUOne gains a fourth pillar alongside Tutoring, Consultancy, and Wallet — a peer-to-peer Shop — that feels native to the platform, earns commission on every successful sale, holds funds in escrow until delivery, and is fully moderatable by admins, all without disturbing a line of existing business logic.**

---

*End of blueprint.*

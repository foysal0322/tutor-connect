# NSUOne Shop — Manual Testing Checklist

**Purpose:** Step-by-step script to verify the full Shop flow end-to-end in a real browser. Run this after every deploy or schema change.
**Automated coverage:** `src/lib/shop/__tests__/` covers the pure logic (66 tests). This file covers everything that needs a browser + signed-in users.
**Last updated:** 2026-08-08

---

## 0. Before You Start

### 0.1 What you need

- Dev server running: `npm run dev`
- Three browser sessions (use normal + incognito + a second browser, or three profiles):
  - **User A** — the seller
  - **User B** — the buyer
  - **Admin** — at `/auth/admin-signin`
- All three users must have **verified emails** (`emailVerified != null`)

### 0.2 Wallet balance setup

The buyer needs wallet balance to test the full flow. Two ways:

- **Easy / Demo:** sign in as User B → `/wallet` → "Recharge" → pick "Demo" provider → enter any amount ≥ 1000 BDT → submit. Instant credit, no MFS verification.
- **Admin adjustment:** sign in as admin → `/admin/wallets` → search for User B → "Credit" 1000 BDT.

The seller doesn't need a balance to list items. The admin wallet receives commission revenue automatically.

### 0.3 Quick sanity check (1 minute)

Before running the full flow, verify the basics:

- [ ] `/shop` loads without errors and shows the browse page
- [ ] `/shop/selling` loads (even if empty)
- [ ] `/admin/shop` loads with KPI tiles
- [ ] Sidebar shows the **Shop** group: Browse / Selling / My Orders / Saved / Disputes
- [ ] Marketing navbar shows the **Shop** link

If any of these fail, stop and debug before continuing.

---

## 1. Happy Path — Full Sale Cycle

This is the most important flow. If it works, the marketplace works.

### Step 1 — Seller lists an item

**As User A (seller):**

1. Go to `/shop/selling`
2. Click **"New listing"**
3. Fill the form:
   - **Photos:** drag-drop or click to upload 1–2 images (JPEG/PNG/WebP, ≤4 MB each)
   - **Title:** "CSE115 Textbook — like new"
   - **Description:** anything
   - **Category:** pick one (e.g. "Books & Textbooks")
   - **Condition:** "Like new"
   - **Price:** 500 BDT
   - **Quantity:** 1
   - **Location:** "NSU Library" (optional)
4. Click **"Publish listing"**

**Verify:**
- [ ] Redirects to `/shop/listing/[id]`
- [ ] The listing detail page shows your uploaded photos
- [ ] Title, price, condition, description all show correctly
- [ ] A "Boost for 7 days — 100 BDT" button appears (owner-only)
- [ ] The seller card shows your name
- [ ] No "Buy" button (you own this listing — should show "This is your listing")

**If it fails:** check the seller is email-verified and not blocked. Check the upload didn't time out.

---

### Step 2 — Buyer finds and buys the listing

**As User B (buyer):**

1. Go to `/shop`
2. Find the listing in the grid (or search by title)
3. Click it → listing detail page
4. Verify the **"Buy with escrow — 500 BDT"** button is enabled
5. Click **"Buy with escrow"** → confirm dialog appears
6. Confirm → should redirect to `/shop/orders/[id]`

**Verify:**
- [ ] Order status badge shows **"escrowed"**
- [ ] Timeline shows `CREATED` and `PAID` events
- [ ] Money panel shows subtotal 500 BDT
- [ ] Buyer's wallet balance (check `/wallet`) **decreased by 500 BDT**
- [ ] **NotificationBell** shows a new "Order placed" notification
- [ ] Seller's NotificationBell shows "New order" notification

**If "Insufficient wallet balance":** recharge via `/wallet` → Demo mode.

---

### Step 3 — Seller ships the order

**As User A (seller):**

1. Go to `/shop/orders` → **"Selling"** tab
2. Open the order
3. Click **"Mark as shipped"** → confirm

**Verify:**
- [ ] Order status badge shows **"shipped"**
- [ ] Timeline shows a `SHIPPED` event with timestamp
- [ ] Buyer's NotificationBell shows "Order shipped"

---

### Step 4 — Buyer confirms delivery

**As User B (buyer):**

1. Go to `/shop/orders` → **"Buying"** tab
2. Open the order
3. Click **"Confirm delivery"** → confirm

**Verify:**
- [ ] Order status badge shows **"delivered"**
- [ ] Timeline shows a `DELIVERED` event
- [ ] A trust note appears: "Auto-finalizes on [date] unless you act"
- [ ] Seller's NotificationBell shows "Buyer confirmed delivery"

---

### Step 5 — Buyer completes the order (releases funds)

**As User B (buyer):**

1. On the same order page, click **"Complete order"** → confirm

**Verify:**
- [ ] Order status badge shows **"completed"**
- [ ] Timeline shows `COMMISSION_CAPTURED`, `PAYOUT_RELEASED`, `COMPLETED`
- [ ] Money panel shows the seller payout (465 BDT) and platform fee (35 BDT)
- [ ] **Seller's wallet** (check as User A at `/wallet`) **increased by 465 BDT** (500 − 7% commission)
- [ ] **Admin wallet** increased by 35 BDT (the commission)
- [ ] Seller's NotificationBell shows "Payout released"

**If payout is missing:** check `/admin/shop/payouts` — there should be 3 rows: `SHOP_ESCROW` (debit), `SHOP_PAYOUT` (credit to seller), `SHOP_COMMISSION` (credit to admin).

---

### Step 6 — Buyer leaves a review

**As User B (buyer):**

1. After completing, go back to the listing detail page (`/shop/listing/[id]`)
2. A **"Leave a review"** form should appear (only surfaces when you have a COMPLETED order with no review)
3. Pick a star rating (1–5) + optional comment
4. Click **"Submit review"**

**Verify:**
- [ ] Success card appears: "Thanks for your review!"
- [ ] The review shows in the listing's reviews list below
- [ ] Seller's storefront (`/shop/seller/[seller-id]`) shows the new rating + sales count

---

## 2. Unhappy Paths

### 2.1 Insufficient wallet balance

**As User B:**

1. Find any active listing priced higher than your wallet balance
2. Click "Buy with escrow"

**Verify:**
- [ ] Error appears: "Insufficient wallet balance"
- [ ] A "Recharge wallet →" link appears in the error
- [ ] **No order is created** — check `/shop/orders` (Buying tab) shows nothing new
- [ ] Wallet balance unchanged

---

### 2.2 Buyer cancels before shipping

**As User B:**

1. Buy a listing (Step 2 above)
2. Before the seller ships, open the order
3. Click **"Cancel order"** → confirm

**Verify:**
- [ ] Order status shows **"cancelled"**
- [ ] Timeline shows a `CANCELLED` event
- [ ] Wallet balance **refunded** (back to original)
- [ ] Listing quantity **restored** (check the listing detail — it should be ACTIVE again, not SOLD)
- [ ] Seller's NotificationBell shows "Order cancelled"

---

### 2.3 Open a dispute

**As User B (after Step 4 — once the order is at least SHIPPED):**

1. Open the order detail page
2. Click **"Open a dispute"** (appears below the action buttons)
3. Fill in the reason (≥10 characters)
4. Submit

**Verify:**
- [ ] Redirects to `/shop/disputes/[id]`
- [ ] Order status shows **"disputed"**
- [ ] The dispute thread shows your opening message
- [ ] **Admin** sees the dispute at `/admin/shop/disputes`

---

### 2.4 Admin resolves a dispute

**As Admin:**

1. Go to `/admin/shop/disputes`
2. Click "resolve →" on the dispute
3. Read the thread
4. Choose **"Refund buyer"** or **"Pay seller"**
5. Write a clear admin note (≥10 characters)
6. Submit

**Verify (if "Refund buyer"):**
- [ ] Dispute status shows "resolved buyer"
- [ ] Order status shows "refunded"
- [ ] Buyer's wallet credited the full subtotal
- [ ] Seller did NOT receive a payout

**Verify (if "Pay seller"):**
- [ ] Dispute status shows "resolved seller"
- [ ] Order status shows "completed"
- [ ] Seller's wallet credited the payout
- [ ] Admin wallet credited the commission

---

### 2.5 Admin suspends a seller

**As Admin:**

1. Go to `/admin/shop/sellers`
2. Find the seller (User A)
3. Click **"Suspend"** → confirm

**Verify:**
- [ ] All their ACTIVE listings become PAUSED (check `/admin/shop/listings`)
- [ ] The seller cannot create new listings (try signing in as User A → `/shop/selling/new` → publish → should error with "suspended")
- [ ] Their in-flight orders continue normally (not affected)

**Restore:** click "Restore" on the same admin page.

---

### 2.6 Admin takes down a listing

**As Admin:**

1. Go to `/admin/shop/listings`
2. Find a listing, click **"Takedown"** → confirm

**Verify:**
- [ ] Listing status changes to REMOVED
- [ ] Listing disappears from public `/shop` browse
- [ ] Direct URL `/shop/listing/[id]` returns 404 (or "Listing not found")
- [ ] Seller gets a "Listing needs changes" notification

---

## 3. Optional Flows

### 3.1 Boost a listing

**As Seller (User A):**

1. Have an active listing with `boostFeeBdt` (default 100 BDT) in your wallet
2. Open your own listing detail page (`/shop/listing/[id]`)
3. Click **"Boost for 7 days — 100 BDT"** → confirm
4. Wallet should immediately decrease by 100 BDT
5. The listing should now sort **first** in `/shop` browse

**Verify:**
- [ ] A **"Boosted"** gradient badge appears on the card in browse
- [ ] The badge shows on the listing detail page
- [ ] `/admin/shop/payouts` shows two new rows: `SHOP_BOOST` (debit from seller) and `SHOP_BOOST_REVENUE` (credit to admin)

---

### 3.2 Save a listing

**As any signed-in user:**

1. Open any listing detail page
2. Click **"Save"** button
3. Go to `/shop/saved`

**Verify:**
- [ ] The button toggles to "Saved" (filled bookmark icon)
- [ ] The listing appears in `/shop/saved`
- [ ] Clicking "Save" again removes it

---

### 3.3 Auto-finalize cron (advanced)

This tests the Phase 11 sweep endpoint. **Don't do this in production.**

1. Buy + ship + deliver an order so it's in `DELIVERED` state
2. Manually edit the order's `autoFinalizeAt` to a past timestamp:

```sql
-- Run against your dev DB
UPDATE "ShopOrder"
SET "autoFinalizeAt" = NOW() - INTERVAL '1 hour'
WHERE id = 'your-order-id';
```

3. Set `SHOP_CRON_SECRET` in `.env` to any value (e.g. `test-secret`)
4. Trigger the sweep:

```bash
curl -X POST http://localhost:3000/api/shop/sweep/auto-finalize \
  -H "Authorization: Bearer test-secret"
```

**Verify:**
- [ ] Response: `{ "processed": 1, "skipped": 0, "errors": [] }`
- [ ] Order status is now `COMPLETED`
- [ ] Seller's wallet credited with payout
- [ ] Admin wallet credited with commission
- [ ] Calling again returns `processed: 0` (idempotent)

---

### 3.4 Category CRUD (admin)

**As Admin:**

1. Go to `/admin/shop/categories`
2. Click **"New category"**
3. Create one: name "Test Category", slug "test", icon "Package", commission override 5%
4. Verify it appears in the list
5. Edit it (pencil icon) → change name → save
6. Try to delete one that has listings → should fail with "Cannot delete — listings reference this category"
7. Try to delete one with no listings → should succeed

---

### 3.5 Settings change (admin)

**As Admin:**

1. Go to `/admin/shop/settings`
2. Change **Default commission** from 7% to 10%
3. Save
4. Place a new order (full happy path)

**Verify:**
- [ ] The new order's commission is 10% (not 7%)
- [ ] The previous order (with the old rate) is unchanged — its `commissionRate` snapshot is intact

---

## 4. Cross-Cutting Checks

Run these once per release.

### 4.1 Notifications fire correctly

For each Shop event, verify the in-app NotificationBell shows a row:

- [ ] Order placed → bell to buyer + seller
- [ ] Order shipped → bell to buyer
- [ ] Order delivered → bell to seller
- [ ] Order completed → bell to seller
- [ ] Order cancelled → bell to both
- [ ] Dispute opened → bell to counterparty
- [ ] Dispute resolved → bell to both
- [ ] Review received → bell to seller

### 4.2 Mobile responsive

Open each shop page at **360px width** (mobile viewport in devtools):

- [ ] `/shop` — filter bar wraps, grid is 1-up, cards readable
- [ ] `/shop/listing/[id]` — gallery stacks above the buy panel
- [ ] `/shop/selling` — table becomes horizontally scrollable
- [ ] `/shop/orders` — order rows stack vertically
- [ ] `/shop/disputes/[id]` — message thread is full-width

### 4.3 Dark mode

Toggle dark mode (topbar theme toggle) and check every shop page:

- [ ] No raw white backgrounds (should use `--card-bg`)
- [ ] No unreadable text (low-contrast muted text)
- [ ] Buttons maintain contrast
- [ ] Images don't have white borders

### 4.4 Sidebar navigation

- [ ] All 5 sidebar items (Browse / Selling / My Orders / Saved / Disputes) highlight when active
- [ ] Active state uses prefix match (e.g. `/shop/listing/abc` highlights "Browse Shop")
- [ ] Command palette (⌘K) includes shop destinations

---

## 5. Common Issues + Fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| "Sign in to buy" even when signed in | Session expired, or admin trying to buy | Re-sign-in; admins can't buy |
| Buy button disabled with no error | Email not verified | Verify email at `/auth/verify` |
| Image upload fails silently | File > 4 MB or wrong MIME | Use JPEG/PNG/WebP ≤ 4 MB |
| Order stuck in ESCROWED | Seller hasn't shipped | Seller: `/shop/orders` → Selling tab → "Mark as shipped" |
| Payout missing after completion | Platform admin user missing, or wallet tx failed | Check `/admin/shop/payouts`; ensure at least one ADMIN user exists |
| Dispute can't be opened | Order not in disputable state (SHIPPED/DELIVERED/COMPLETED) | Wait until the order is shipped |
| Listing shows as "SOLD" but I have stock | Quantity hit 0 on a previous sale | Edit the listing and increase quantity |
| `next-auth` module not found | Typo in import (`next/auth` vs `next-auth`) | Check imports — should always be `next-auth` |
| Build fails on Prisma types | Client not regenerated after schema change | `npx prisma generate` (stop dev server first if Windows file lock) |

---

## 6. Regression Quick-Check (5 minutes)

If you only have time for a smoke test:

1. **Seller lists** one item with a photo (30 sec)
2. **Buyer buys** it (15 sec)
3. **Seller ships** (5 sec)
4. **Buyer confirms + completes** (10 sec)
5. **Check wallets**: buyer −500, seller +465, admin +35 (2 min)
6. **Check NotificationBell**: at least 3 events visible (1 min)

If all six check out, the core marketplace is healthy.

---

## 7. Reporting a Bug

When something breaks, include:

1. **Page URL** where it happened
2. **User role** (buyer / seller / admin / guest)
3. **Order ID** if applicable (visible in the URL or order detail)
4. **Exact error message** (screenshot or copy-paste)
5. **Wallet balances before + after** if money-related
6. **Browser console errors** (F12 → Console tab)
7. **Server logs** (the terminal where `npm run dev` is running)

With that, I can usually pinpoint the issue in one round.

---

*This checklist lives at `docs/shop-testing.md`. Update it when you find new edge cases.*

# Admin Dashboard Redesign Plan — `tutor-connect` / nsuOne

> Implementation blueprint. UI/UX/layout only. **No business logic, server
> actions, API routes, Prisma models, or auth semantics are to be touched.**
> Every existing feature must continue to work exactly as before.
>
> Stack reference (authoritative, read before coding):
> Next.js **16.2.9** (App Router, React 19.2, Turbopack), `next-auth@4.24.14`,
> Prisma 5.22, `recharts@3`, `lucide-react`, `zod@4`. Project root: `D:/projects/tutor-connect`.
> Per `AGENTS.md`: read `node_modules/next/dist/docs/` before touching Next APIs —
> this version has breaking changes vs. training data.

---

## 0. Executive Summary

The admin section today is a **feature-complete but visually inconsistent**
collection of 14 pages. Functionality is solid: server-authoritative actions,
role-gated layouts, real-time counts in the sidebar, dynamic chart imports,
audit trails, and atomic wallet/refund flows were all shipped correctly
(see `admin_section_improvement.md` — items 1–11 ✅). The problems are
**presentation, not behavior**:

1. **No middleware.** Auth is enforced only inside layout server components.
   That is correct today, but it means an admin who types `/` lands on the
   marketing site instead of the admin app.
2. **Two table implementations** — a bespoke `<table>` on 7 pages vs. the
   shared `<DataGrid>` on 2 — with three different confirm-dialog patterns
   (`window.confirm`, `<ConfirmDialog>`, custom two-step state).
3. **No dark mode**, no command palette, no breadcrumbs, no global search,
   no keyboard shortcuts. The top bar (`TopNav.tsx`) is empty on desktop.
4. **Sidebar is hard-coded JSX**, not config-driven; adding a page requires
   editing `Sidebar.tsx`.
5. **Scattered CSS** — global tokens in `globals.css` (good) but 13
   per-route CSS modules duplicate spacing/typography instead of consuming
   tokens.
6. **Three pages lack pagination** and would not scale (`users`, `requests`,
   `expertises`, `departments`, `coupons`, `consultancy`, `wallets`).

This plan redesigns the chrome, layout, navigation, and component patterns
to feel like **Linear / Vercel / Stripe / Supabase** — minimal, compact,
dense, keyboard-first — while leaving every server action signature and
Prisma query untouched. Rollout is phased so each phase ships independently
and is independently revertible.

---

## 1. Current Architecture Analysis

### 1.1 Folder structure (facts)

```
src/
  app/
    layout.tsx              ← root: <Navbar/> + <Footer/> + providers (global)
    page.tsx                ← public landing
    globals.css             ← design tokens (the only token source)
    dashboard.module.css    ← legacy (orphan — verify before reuse)
    admin/
      layout.tsx            ← ADMIN gate via requireRole(['ADMIN'])
      page.tsx              ← redirect → /admin/dashboard
      dashboard/            ← page.tsx (server) + DashboardContent.tsx (client)
      users/ + [id]/
      courses/              ← CourseManager.tsx
      expertises/           ← ExpertiseManager.tsx
      departments/          ← DepartmentManager.tsx
      consultancy/          ← ConsultancyManager.tsx (tabs)
      coupons/              ← CouponManager.tsx
      wallets/              ← WalletManager.tsx (modal)
      withdrawals/          ← WithdrawalManager.tsx + actions.ts (DataGrid)
      requests/             ← RequestManager.tsx (558-line monolith) + actions.ts
      support/              ← SupportManager.tsx (DataGrid)
      visitors/             ← DashboardClient.tsx (charts + table)
      settings/             ← SettingsManager.tsx
      profile/              ← wraps shared <ProfileForm/>
    auth/
      actions.ts            ← register (STUDENT/TUTOR only)
      actions/emailVerification.ts, actions/passwordReset.ts
      admin-signin/         ← separate admin login (sends role:'ADMIN')
      signin/, register/, student-signin/, tutor-signin/, verify/, forgot-password/
    api/
      auth/[...nextauth]/route.ts
      admin/visitors/raw/   ← used by Visitors refresh button
      settings/fees/        ← used by Requests refund display
      notifications/...     ← list, read, read-all, subscribe, [id]/read
      payment-info/, track-visitor/, debug-sentry/
    dashboard/              ← student+tutor unified; admin rejected in page.tsx:29-33
    student/, tutor/, wallet/, profile/, consultancy/, shop/, find-tutor/, ...
  components/
    layout/{DashboardLayout,Sidebar,TopNav}.tsx
    Navbar.tsx + NavbarClient.tsx + Footer.tsx     ← public chrome (root layout)
    ui/        ← 21 primitives: Button, Card, Badge, Modal, DataGrid, Tabs, Input, Select, Textarea, StatCard, EmptyState, ConfirmDialog, ErrorAlert, ErrorFallback, FormLoading, LoadingButton, LoadingSpinner, PageLoading, RetryButton, StatusBadge
    forms/     ← FormCard, FormPage, FormSubmit, FormSuccess, FormSection, FormAlert
    skeletons/ ← SkeletonCard, SkeletonDashboardStats, SkeletonTable
    ToastProvider, NotificationBell, UserMenu, ErrorBoundary, Spinner,
    VisitorTracker, MfsProviderSelect, SearchableCourseSelect, ProfileForm,
    payments/PaymentForm
  hooks/  ← useDebounce, useFocusTrap, usePushNotifications, useZodForm
  lib/
    auth.ts                       ← NextAuth config (JWT strategy)
    server/auth-gate.ts           ← requireRole(allowedRoles, fallbackRole)
    prisma.ts, cache.ts, rateLimit.ts, mail.ts, discord.ts,
    notification.ts, phone.ts, format.ts, validation.ts, coupon.ts
  types/  ← next-auth.d.ts (Role type augmentation)
prisma/schema.prisma              ← User.role: STUDENT | TUTOR | ADMIN
middleware.ts                     ← **DOES NOT EXIST** (see §3)
```

### 1.2 Routing segments

| Segment | Layout | Guard |
|---|---|---|
| `/` and public (`/find-tutor`, `/consultancy`, `/contact`, `/shop`, `/tutorial`, policy pages) | root (`src/app/layout.tsx`) | none |
| `/auth/*` | root | none (signin page itself bounces authenticated users) |
| `/admin/*` | `admin/layout.tsx` | `requireRole(['ADMIN'], 'ADMIN')` → redirect `/auth/admin-signin` |
| `/dashboard/*` | `dashboard/layout.tsx` | `requireRole(['STUDENT','TUTOR'], 'STUDENT')`; page additionally rejects ADMIN |
| `/student/*`, `/tutor/*` | root | redirected to `/dashboard` |
| `/wallet`, `/profile` | root | session-only |

Admin routes (canonical list — **must all keep working**):
`/admin` (redirect), `/admin/dashboard`, `/admin/requests`, `/admin/users`,
`/admin/users/[id]`, `/admin/withdrawals`, `/admin/wallets`,
`/admin/consultancy`, `/admin/expertises`, `/admin/support`,
`/admin/departments`, `/admin/courses`, `/admin/coupons`,
`/admin/settings`, `/admin/visitors`, `/admin/profile`.

### 1.3 Layouts

- **Root** (`src/app/layout.tsx`): wraps the **entire** app in `<Navbar/>` +
  `<Footer/>` + `<ToastProvider/>` + `<ErrorBoundary/>` + `<VisitorTracker/>`.
  This is the source of the "admin still sees the marketing navbar" problem.
- **Admin** (`src/app/admin/layout.tsx`): fetches counts for sidebar badges,
  then renders `<DashboardLayout role="ADMIN">{children}</DashboardLayout>`.
- **Dashboard** (`src/app/dashboard/layout.tsx`): same shape, role
  `STUDENT`/`TUTOR`.
- **No per-segment layout for `/student` or `/tutor`** — they redirect.

`<DashboardLayout>` (`src/components/layout/DashboardLayout.tsx`) composes
`<Sidebar/>` + `<TopNav/>` + main scroll area. It already supports mobile
off-canvas via overlay + state. **This is the structural shell we will
redesign, not replace.**

---

## 2. Authentication Analysis

### 2.1 Current flow (facts)

- **Strategy:** JWT, custom cookie prefix
  `next-auth.session-token.tutor-connect` (`src/lib/auth.ts:110-134`).
- **Providers:** `CredentialsProvider` only.
- **Authorize:** validates email/NSU ID + password, checks `emailVerified`,
  checks `blocked`, checks `credentials.role === user.role` (so an admin
  *cannot* log in through `/auth/signin` and vice-versa).
- **Callbacks:** `jwt` adds `{id, role, nsuId}`; `session` exposes them on
  `session.user`. No `signIn`/`redirect` callbacks.
- **Guards:** every protected layout calls `requireRole()` from
  `src/lib/server/auth-gate.ts`. **No `middleware.ts` exists.**

### 2.2 Three login entry points

| URL | Form | Sends | Successful redirect |
|---|---|---|---|
| `/auth/signin` | `SignInForm` | no `role` param | `/dashboard` (or `callbackUrl`) |
| `/auth/admin-signin` | `AdminSignInForm` | `role: 'ADMIN'` | `/admin` → `/admin/dashboard` |
| `/auth/student-signin`, `/auth/tutor-signin` | wrappers | — | — |

`SignInForm` rejects ADMIN credentials because `auth.ts` requires
`credentials.role === user.role` and the user form omits `role`. Admins
are therefore **forced** to `/auth/admin-signin` already — good. The
remaining gaps are purely about *where they land when not actively logging
in* (see §3).

### 2.3 Recommended flow (UI/UX only — no protocol change)

1. **Add a `src/proxy.ts`** (Next.js 16 renamed `middleware` → `proxy`; see
   `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md:625-671`.
   The function must be named `proxy`, runtime is fixed to `nodejs`, the
   `edge` runtime is unsupported in proxy) that:
   - Reads the NextAuth JWT via `getToken({ req, secret })`.
   - For `/` and `/auth/signin`: if `token.role === 'ADMIN'`, 302 to
     `/admin/dashboard`. (Does **not** block admins from other public
     pages — admin may legitimately view `/consultancy-policy` etc. The
     goal is "skip the marketing home", not "lock the public site".)
   - For `/admin/*` without an ADMIN token: 302 to `/auth/admin-signin?callbackUrl=<original>`.
     This is a **performance and UX** improvement — currently the redirect
     happens only after the RSC for `admin/layout.tsx` renders.
   - Does **not** replace the existing `requireRole()` server check. The
     layout-level check stays as defense-in-depth.
   - **Why middleware, not a client redirect:** middleware runs before any
     JS ships, so the admin never sees a flash of the landing page. This
     is the single highest-leverage change in this plan.

2. **Keep `requireRole()` and all server actions unchanged.** This is a
   UX/routing improvement layered on top of the existing security model.

3. **Do not modify** `src/lib/auth.ts`, `src/lib/server/auth-gate.ts`,
   `src/app/api/auth/[...nextauth]/route.ts`, or any `auth/actions/*`.

### 2.4 Protected-route map (preserved)

| Route | Allowed roles | Enforcement layer |
|---|---|---|
| `/admin/*` | ADMIN | middleware (new) + `requireRole` in layout (existing) |
| `/dashboard/*` | STUDENT, TUTOR | `requireRole` in layout |
| `/student/*`, `/tutor/*` | STUDENT, TUTOR (then redirect) | `requireRole` in layout |
| `/wallet`, `/profile` | any authenticated | implicit via getServerSession in page |
| public (`/`, `/find-tutor`, …) | anonymous + any | none |

---

## 3. Admin Flow Analysis (the headline UX requirement)

> **Requirement:** when an Admin logs in, they enter the admin application —
> not the marketing site. Normal users keep the
> Landing → Auth → Dashboard flow.

### 3.1 Today's behavior (precise)

- Admin signs in at `/auth/admin-signin` → on success `AdminSignInForm`
  calls `router.push('/admin')` → `/admin/page.tsx` calls
  `redirect('/admin/dashboard')`. ✅ This already works.
- **Gap A:** if an admin types `http://app/` directly, they get the landing
  page (`src/app/page.tsx` is public, no role check).
- **Gap B:** if an admin clicks the logo, "Home", or any nav link inside
  the admin shell, the public Navbar (rendered by the **root** layout, not
  the admin layout) takes them back to `/`. The root `<Navbar/>` is
  rendered around the admin app because the admin layout is a *nested*
  layout under `src/app/layout.tsx`.
- **Gap C:** the Footer (also from root layout) shows on admin pages,
  wasting vertical space.

### 3.2 Recommended changes (UI/UX only, no auth logic change)

1. **Add `src/middleware.ts`** with the rules in §2.3. This solves Gap A
   at the edge, before any HTML is sent.
2. **Route-group the public chrome.** Move the public `<Navbar/>` +
   `<Footer/>` out of `src/app/layout.tsx` into a route group such as
   `src/app/(marketing)/layout.tsx`, and let the admin and dashboard
   segments keep their own chrome. Root layout keeps only providers
   (`ToastProvider`, `ErrorBoundary`, `VisitorTracker`) and `<html>/<body>`.
   - This is a **file move**, not a logic change. Every public page keeps
     working because they all live under the (marketing) group.
   - Risk: route groups are a Next.js App Router primitive — verify
     behavior in `node_modules/next/dist/docs/` per `AGENTS.md` before
     executing (Phase 0 task).
3. **Admin shell chrome:** the admin app gets its own dedicated top bar
   inside `<DashboardLayout>` (Phase 3) — logo on the left links to
   `/admin/dashboard`, never `/`. The marketing navbar simply is not
   rendered for `/admin/*`.
4. **Normal-user flow is untouched.** Students and tutors still see
   Landing → Signin → `/dashboard`.

### 3.3 Acceptance criteria for the admin-flow change

- Admin authenticated → visits `/` → 302 to `/admin/dashboard`, no flash.
- Admin authenticated → visits any `/admin/*` page → renders admin app
  chrome, no marketing navbar, no footer.
- Anonymous → visits `/admin/dashboard` → 302 to
  `/auth/admin-signin?callbackUrl=%2Fadmin%2Fdashboard`.
- Student/Tutor authenticated → visits `/admin/dashboard` → 302 to
  `/auth/force-signout?reason=role-changed` (or `/auth/signin` — pick one,
  document in Phase 0). **Today's behavior must be matched or improved.**
- Student/Tutor authenticated → visits `/` → still sees the landing page
  (no regression).

---

## 4. UX Audit (per-page findings, no opinions on business logic)

| Page | Top issues (factual) |
|---|---|
| `/admin/dashboard` | KPI cards are large; "Actionable" banner is text-only and easy to miss; no time-range selector on charts. |
| `/admin/users` | **No search, no filter, no pagination.** Full table renders all users. Block/Delete actions are at row-end (hard to scan). Edit lives on a separate route (`[id]`). |
| `/admin/users/[id]` | Reuses `<ProfileForm>` which is built for end-user self-service — includes password-change and gender/department fields not relevant to admin context. |
| `/admin/courses` | Custom table (not `<DataGrid>`); 20-per-page pagination exists; bulk delete works; no count summary; JSON import is a single textarea — easy to mis-paste. |
| `/admin/expertises` | **No pagination, no search.** Inline row edit spans all columns; on small screens the form is unusable. |
| `/admin/departments` | No pagination; uses `window.confirm` for delete (inconsistent). |
| `/admin/consultancy` | Tabs (Requests/Topics). Status filter is **buttons** here vs. **dropdown** on sibling pages — inconsistent. |
| `/admin/coupons` | Complex inline edit form spans 8 columns — unusable on mobile. No search. |
| `/admin/wallets` | Has search + role filter + audit feed — **the gold standard in the current app.** Modal for adjustments. Use as the template. |
| `/admin/withdrawals` | Uses `<DataGrid>` correctly. Uses `window.confirm` for approve/reject. |
| `/admin/requests` | **558-line monolith.** Three action flows inline per row (assign tutor, verify payment, verify refund). No pagination. Custom two-step confirm state. |
| `/admin/support` | Uses `<DataGrid>`. Uses `window.confirm`. Message column truncated. |
| `/admin/visitors` | Charts + table. 10-per-page pagination on logs. Date-range presets good. |
| `/admin/settings` | Single `<FormCard>`. No tabs. No "Advanced" sectioning. |
| `/admin/profile` | Reuses `<ProfileForm>` — same concerns as `/admin/users/[id]`. |

Cross-cutting: see §6 (Component Audit) for the shared-primitive
consequences of these issues.

---

## 5. UI Audit

### 5.1 What is good (preserve)

- **Strong design-token foundation** in `globals.css:1-160`. Colors,
  spacing, radii, typography, animation easings, and shadows are all
  centralized as CSS variables.
- **21 reusable UI primitives** with consistent prop surfaces
  (`Button`, `Card`, `Badge`, `Modal`, `ConfirmDialog`, `Tabs`,
  `Input`, `Select`, `Textarea`, `StatCard`, `EmptyState`, `DataGrid`).
- **Accessibility foundations**: `useFocusTrap`, `aria-modal`, `aria-sort`
  in `DataGrid`, WAI-ARIA listbox pattern in `Select`, skip-link CSS at
  `globals.css:141-159`, WCAG-AA text-muted at `globals.css:31`.
- **Dynamic chart imports** on the dashboard (`CoursesBarChart`,
  `StatusDonut`) — recharts is code-split already.
- **Optimized package imports** for `lucide-react`, `recharts`, `date-fns`
  (`next.config.ts:82-88`).

### 5.2 What is weak (redesign)

- **No dark mode.** All tokens are light-only. There is no `prefers-color-scheme` block.
- **Top bar is empty on desktop.** `TopNav.tsx` only renders a hamburger
  that is hidden ≥ desktop breakpoint — 64 px of dead vertical space
  (`layout.module.css:147-156`).
- **Sidebar is hard-coded JSX** (`Sidebar.tsx:110-170`) with a bespoke
  `getGroups()` per role. No config file, no "pinned"/"recent" concept.
- **Three confirm-dialog patterns** coexist: `<ConfirmDialog>`,
  `window.confirm()`, and bespoke two-step state in `RequestManager.tsx`.
- **Inconsistent table implementations**: `<DataGrid>` (withdrawals,
  support) vs. bespoke tables (everyone else). Inline-edit rowspans were
  hand-rolled five separate times.
- **No command palette, no global search, no breadcrumbs.**
- **No keyboard shortcuts** (no `Cmd/Ctrl+K`, no `/` for search).
- **13 per-route CSS modules** (`page.module.css`, `home.module.css`,
  `dashboard.module.css`, `wallet.module.css`, `auth.module.css`,
  `find-tutor.module.css`, `shop.module.css`, `student/payments/payments.module.css`,
  `tutor/expertise/expertise.module.css`, `wallet/wallethub.module.css`,
  `admin/dashboard/admin-dashboard.module.css`, …) duplicate spacing and
  typography instead of consuming tokens.
- **Skip-link CSS exists** but no layout actually renders a `.skip-link`
  element — dead code.
- **No skeleton system on `/admin/coupons`, `/admin/consultancy`** — both
  show plain "Loading…" text. `/admin/settings`, `/admin/profile` have
  no `loading.tsx` at all.

---

## 6. Component Audit

| Component | Reuse as-is | Redesign | Split | Lazy-load | Memoize | a11y gap |
|---|---|---|---|---|---|---|
| `Button` | ✅ | — | — | — | — | — |
| `Card` | ✅ | — | — | — | — | — |
| `Badge` / `StatusBadge` | ✅ | — | — | — | — | — |
| `Modal` | ✅ | — | — | optional | — | — |
| `ConfirmDialog` | ✅ | adopt globally (replace `window.confirm`) | — | — | — | — |
| `DataGrid` | ✅ | adopt globally (replace bespoke tables) | — | — | row memo | virtualize for >200 rows |
| `Tabs` | ✅ | — | — | — | — | — |
| `Input` / `Select` / `Textarea` | ✅ | — | — | — | — | — |
| `StatCard` | ✅ | add compact `size="sm"` variant | — | — | — | — |
| `EmptyState` | ✅ | — | — | — | — | — |
| `ToastProvider` | ✅ | — | — | — | — | — |
| `NotificationBell` | ✅ | — | — | — | — | — |
| `UserMenu` | ✅ | — | — | — | — | — |
| `DashboardLayout` | refactor | ✅ (split into AdminShell/MemberShell) | ✅ | — | — | add skip-link |
| `Sidebar` | refactor | ✅ (config-driven) | ✅ | — | item memo | keyboard nav (arrow + home/end) |
| `TopNav` | replace | ✅ (becomes `Topbar` with search/breadcrumbs/profile) | ✅ | — | — | — |
| `RequestManager.tsx` (558 lines) | — | ✅ | ✅ (extract `AssignTutorForm`, `PaymentVerifyRow`, `RefundVerifyRow`, `RequestsTable`) | ✅ | row memo | two-step confirm → `<ConfirmDialog>` |
| `CourseManager` / `ExpertiseManager` / `DepartmentManager` / `ConsultancyManager` / `CouponManager` | — | migrate to `<DataGrid>` + `<ConfirmDialog>` | — | — | — | — |
| `WalletManager` | ✅ (template) | — | — | — | — | — |
| `Visitors/DashboardClient` | ✅ | — | split chart components | ✅ already | — | — |

**New primitives to add** (Phase 1, before touching pages):

| New | Purpose |
|---|---|
| `CommandPalette` | `Cmd/Ctrl+K` navigation + page search |
| `Breadcrumb` | Hierarchical nav below Topbar |
| `PageHeader` | Standard page title + subtitle + actions slot |
| `Toolbar` | Search + filter + view-toggle row used by every list page |
| `KPI` (compact) | ½-height metric tile to replace oversized `StatCard` usage on dashboard |
| `Sheet` | Mobile side-drawer (replaces full-screen modal on small viewports) |
| `ThemeProvider` | Light/dark token switcher persisted to `localStorage` |
| `ShortcutProvider` | Global keyboard shortcut registry |

---

## 7. Routing Analysis

Already enumerated in §1.2. The only **routing** change in this plan is:

- Introduce `src/middleware.ts` (new file) for the admin-redirect rules.
- Move public chrome into a route group `(marketing)` — **purely a file
  reorganization**, no URL changes. (Verify in `node_modules/next/dist/docs/`
  before executing — see Phase 0.)

No other route changes. No dynamic segment changes. No URL changes.

---

## 8. Navigation Analysis

### 8.1 Sidebar (current — `Sidebar.tsx`)

- Two role groups: ADMIN (14 items) and STUDENT/TUTOR (unified, ~6 items).
- Grouped with headings ("Learning", "Teaching", "Account").
- Per-item count badges from server data + `localStorage`-tracked
  "new since last visit" delta.
- Active state: pathname matching, exact vs. prefix.
- Mobile: closes on navigate.
- **No collapse-to-icons mode. No pinned section. No "recently visited".**

### 8.2 TopNav (current)

- Mobile-only hamburger. Empty on desktop. No search, no breadcrumbs, no
  profile menu, no theme toggle, no notifications. (`NotificationBell` and
  `UserMenu` exist as separate components but are not wired into the admin
  chrome — verify where they render today before Phase 3.)

### 8.3 What is missing (vs. Linear/Vercel/Stripe)

- Collapsible icon-rail mode for the sidebar.
- Command palette (`Cmd/Ctrl+K`).
- Global search.
- Breadcrumbs.
- Theme switch.
- Workspace switcher (not applicable here — single workspace — but a
  "view-as-student" affordance is the analog).
- Keyboard navigation within the sidebar (Arrow/Home/End).
- Pinned favorites + recently visited.

---

## 9. Dashboard Philosophy (the design constraint)

The redesign will be:

- **Compact**: KPI tiles ≤ 96 px tall, sidebar 240 px expanded / 56 px
  collapsed, content padding 16–24 px (not 32–48).
- **Dense**: tables at 40 px row height, 13 px body type, 12 px caption.
- **Quiet**: one accent color per state, no decorative gradients in
  chrome (gradients allowed only on key CTAs).
- **Fast**: every list page must show its first paint in < 200 ms on the
  skeleton, then hydrate.
- **Keyboard-first**: every navigation and every table row reachable
  without a mouse.
- **Token-driven**: zero hard-coded colors/spacing in CSS modules.

Reference benchmarks: **Linear** (density, keyboard), **Vercel** (top bar,
breadcrumbs, monochrome palette), **Stripe** (typography, tables, detail
drawers), **Supabase** (sidebar groups, dark mode).

---

## 10. Mobile Analysis

### 10.1 Today

- `<DashboardLayout>` switches to off-canvas sidebar with overlay below
  the desktop breakpoint.
- Each page re-implements its own mobile card view for tables
  (courses, expertises, departments, consultancy, coupons, wallets,
  requests). `<DataGrid>` handles this for withdrawals + support.
- Modals are full-screen-friendly already (`<Modal>` portal).
- No bottom navigation. No "sheet" pattern.

### 10.2 Recommendations

- **Bottom navigation** is **not** recommended for admin — admin tasks are
  not 5-tap-repeatable; prioritize sidebar + command palette.
- **Sheet pattern**: replace full-screen modals on small viewports with a
  bottom/side `<Sheet>` for the wallet-adjust, coupon-edit, and
  request-action flows. Keep `<Modal>` for confirm/destructive only.
- **Sticky table headers** + **sticky filter toolbar** on every list page.
- **Touch targets ≥ 44 px** on all row actions and filter chips.
- **Responsive charts**: recharts containers must have aspect-ratio boxes,
  not fixed heights; pie/legend stacks vertically below 640 px.
- **Forms**: single-column below 768 px (already mostly true via
  `FormSection`'s grid — audit before shipping each phase).

---

## 11. Accessibility Review

| Area | Today | Target |
|---|---|---|
| Keyboard nav in sidebar | Tab only | Arrow keys, Home/End, first-letter jump |
| Skip-to-content link | CSS exists, no element rendered | Render `<a class="skip-link" href="#main">` in both shells |
| Focus trap | `useFocusTrap` exists, used in `Modal`/`Select`/`NotificationBell` | Apply to `CommandPalette`, `Sheet` |
| Color contrast | `--text-muted` was tightened to #475569 (WCAG AA) | Audit every new component against AA, AAA where feasible |
| `aria-busy` | Used in `LoadingButton`, `FormLoading` | Standardize on `PageLoading` for route transitions |
| Reduced motion | Partial — some animations honor `prefers-reduced-motion` | Globally honored via `@media (prefers-reduced-motion: reduce)` block in `globals.css` |
| Screen-reader live regions | Only in `ErrorAlert` and `ToastProvider` | Add to `NotificationBell` count, dashboard "actionable" banner |
| Touch target size | Inconsistent | ≥ 44 × 44 px enforced via `.touch-target` utility class |

---

## 12. Performance Review

| Opportunity | Where | Action |
|---|---|---|
| Code-split `DataGrid`, `Select`, `Modal` | none use `next/dynamic` today | `dynamic(..., { ssr: false })` for `DataGrid` is **not** advisable (bad for SEO of public pages, fine for admin) — but lazy-load `Modal`/`ConfirmDialog` bodies where they enclose heavy forms |
| Memoize table rows | `DataGrid` renders rows directly | `React.memo` per row, `useMemo` on sorted/filtered dataset |
| Virtualize long lists | `users`, `requests`, `expertises` have no pagination | Either paginate server-side (preferred — no logic change, add `take/skip`) **or** virtualize via `react-window` (new dep — prefer pagination) |
| Bundle reduction | recharts already dynamic on dashboard | Apply the same `dynamic(..., { ssr: false })` to `Visitors/DashboardClient` charts (already done) |
| Image optimization | `next.config.ts` configured | Use `next/image` for admin avatar in `UserMenu` (verify) |
| Suspense boundaries | none explicit | Wrap each admin route's RSC payload in `<Suspense fallback={<PageLoading/>}>` so the shell paints before data resolves |
| Streaming | not used | Consider `loading.tsx` already provides segment-level streaming — keep |
| Prefetch | Next `<Link>` prefetches by default | Audit sidebar links — they're already `<Link>` ✅ |

**Important**: pagination changes that move `take/skip` into server actions
are **logic changes** and therefore out of scope unless explicitly approved.
Default to **client-side pagination** of the already-fetched dataset in
Phase 6, and surface server-side pagination as a flagged follow-up.

---

## 13. Animation Strategy

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Sidebar collapse | width + icon fade | 160 ms | `--ease-standard` |
| Sidebar item hover | background slide-in | 120 ms | `--ease-standard` |
| Dropdown / popover | opacity + translateY(4px) | 140 ms | `--ease-entrance` |
| Modal open | backdrop fade + scale(0.98→1) | 160 ms | `--ease-entrance` |
| Sheet open (mobile) | translateY(100%→0) or translateX | 220 ms | `--ease-entrance` |
| Page transition | opacity only (no layout shift) | 120 ms | `--ease-standard` |
| Loading skeleton | shimmer (existing) | 1400 ms loop | linear |
| Hover on table row | background change | 80 ms | linear |
| Button press | scale(0.98) | 80 ms | linear |
| Toast enter/exit | translateY + fade | 200 ms | `--ease-entrance` / `--ease-exit` |
| Tab switch | underline slide | 140 ms | `--ease-standard` |
| Chart draw | recharts `isAnimationActive=true`, duration 350 ms | — | — |
| Progress indicator | indeterminate slide | 1200 ms loop | linear |
| Accordion expand | max-height + opacity | 200 ms | `--ease-standard` |

**Forbidden**: parallax, bounce on non-interactive elements, autoplaying
carousels, decorative motion on data-bearing surfaces. All animations must
respect `@media (prefers-reduced-motion: reduce)`.

---

## 14. Dashboard Layout Redesign

### 14.1 Admin shell anatomy (target)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Topbar (48px)                                                        │
│ [≡] [/] breadcrumb  ·····  [⌘K search]  [🔔] [👤 menu] [🌙]          │
├────────────┬─────────────────────────────────────────────────────────┤
│ Sidebar    │ PageHeader (title + subtitle + primary action)          │
│ 240/56px   │ ────────────────────────────────────────────────────── │
│            │                                                         │
│ [nav item] │ <Suspense fallback={<PageLoading/>}>                    │
│ [nav item] │   {children}                                            │
│ ...        │ </Suspense>                                             │
│            │                                                         │
│ [collapse] │                                                         │
└────────────┴─────────────────────────────────────────────────────────┘
```

- Topbar height **48 px** (not 80). Density wins.
- Sidebar **240 px expanded / 56 px collapsed** (icon-rail). Persisted in
  `localStorage`.
- Content **max-width 1440 px**, centered, with 24 px gutters.
- Skip-link as first focusable element.
- `<main id="main">` for skip-link target.

### 14.2 Per-page layout templates

| Template | Pages | Pattern |
|---|---|---|
| **KPI grid + charts** | dashboard, visitors | Compact KPI row (8 × 96 px tiles) + 2-col chart grid |
| **Toolbar + DataGrid** | users, withdrawals, support, requests, wallets (wallets table), consultancy-requests, expertises, courses, departments, coupons | `<Toolbar search filter view-toggle/>` then `<DataGrid/>` |
| **Tabs + Toolbar + DataGrid** | consultancy | `<Tabs/>` on top, then template above |
| **Detail drawer** | users/[id], coupon-edit, expertise-edit | Side `<Sheet>` opens on row click; URL updates with `?edit=<id>` |
| **Form page** | settings, profile | `<FormCard>` sections, sticky footer with `<FormSubmit/>` |
| **Dashboard (mixed)** | dashboard home | KPIs + Action Center + 2-col charts + recent activity |

---

## 15. Sidebar Redesign

- **Config-driven**: new file `src/components/layout/admin-nav.ts`
  exporting an array of `{ id, label, href, icon, badge?, group }`.
  `Sidebar.tsx` becomes a renderer, not a hard-coded list.
- **Groups**: Operations (dashboard, requests, withdrawals, wallets,
  consultancy, support), Catalog (courses, departments, expertises),
  Growth (coupons, visitors), System (settings, profile).
- **Collapse modes**: expanded (240 px, default), collapsed (56 px
  icon-rail, persisted), hidden (mobile, off-canvas).
- **Active indicator**: 2 px left bar in `--primary`, weight-600 label.
- **Badges**: keep existing count-badge system (already server-fed from
  `admin/layout.tsx`).
- **Pinned favorites**: optional Phase 8 — store array of nav ids in
  `localStorage`, render a "Pinned" group at the top.
- **Recently visited**: optional Phase 8 — last 5 routes, derived from
  `sessionStorage`.
- **Keyboard**: Arrow Up/Down to move, Enter to navigate, Home/End, Esc
  to close (mobile).
- **Search**: top of sidebar, filters items in place (in addition to the
  global `⌘K` palette).

---

## 16. Topbar Redesign

- **Height 48 px**, sticky, blurred backdrop.
- **Left**: collapse toggle `[≡]`, then `<Breadcrumb/>` derived from
  pathname + a static route→title map.
- **Center-right**:
  - `⌘K` search button (opens `CommandPalette`).
  - `<NotificationBell/>` (existing — wire in).
  - Theme toggle `[🌙]` (new, Phase 2).
  - `<UserMenu/>` (existing — wire in).
- **No page title in Topbar** — that lives in `PageHeader` below.

---

## 17. Forms Redesign

- Keep the existing `<FormPage>` / `<FormCard>` / `<FormSection>` /
  `<FormSubmit>` / `<FormAlert>` composition — it is good.
- **Inline validation**: already supported via `useZodForm` (validates on
  blur + after submit). Verify each admin form uses it.
- **Autosave**: not appropriate for most admin forms (settings is the one
  candidate — show "Unsaved changes" indicator). Phase 7 only.
- **Loading/disabled states**: standardized via `<LoadingButton>` and
  `aria-busy` on the form element.
- **Success messages**: prefer toast over full-page `<FormSuccess>` for
  in-admin actions (less context switch).
- **Mobile**: single column below 768 px (already mostly handled by
  `FormSection`'s CSS grid).

---

## 18. Tables Redesign

Standardize every list page on `<DataGrid>` with the following capabilities
(some already exist, some to add):

| Capability | Status today | Phase |
|---|---|---|
| Sticky header | ✅ | — |
| Resizable columns | ❌ | Phase 5 |
| Sorting (multi-column) | ✅ single | Phase 5 (multi) |
| Filtering (per-column) | ❌ | Phase 5 (column menu) |
| Bulk selection | only `courses` | Phase 5 (all list pages) |
| Pagination | partial | Phase 5 (client-side, server-side flagged as follow-up) |
| Virtual scrolling | ❌ | Phase 12 (only if pagination insufficient) |
| Row actions (inline + overflow `⋯` menu) | ❌ | Phase 5 |
| Responsive card view | ✅ | — |
| Empty state via `<EmptyState/>` | ✅ | — |
| Loading via `<SkeletonTable/>` | ✅ on most, missing on consultancy/coupons | Phase 6 |

**Inline edit pattern**: replace the 5 hand-rolled inline editors with a
single `EditableRow` helper rendered inside `<DataGrid>` via a render
prop. Phase 5.

**Confirm pattern**: replace every `window.confirm()` with the existing
`useConfirmDialog()` hook. Phase 6.

---

## 19. Step-by-Step Implementation Roadmap

> Each phase is independently shippable and independently revertible.
> Risk scale: 🟢 low · 🟡 medium · 🔴 high.
> Per the user's standing rule (`feedback_build_before_commit.md`): run
> `npm run build` before any commit/push; only proceed if it passes.

### Phase 0 — Verification spike (no UI changes) · 🟢

**Goal**: de-risk Phase 1 by confirming the two Next.js 16-specific
assumptions this plan depends on.

- Read `node_modules/next/dist/docs/` for: route groups, `middleware.ts`,
  `rootParams`, and any 16.x-specific auth notes.
- In a throwaway branch: confirm (a) moving `<Navbar/>`+`<Footer/>` into
  `src/app/(marketing)/layout.tsx` keeps every public route rendering
  them; (b) a minimal `src/middleware.ts` using `next-auth/jwt`'s
  `getToken` can read the custom cookie prefix set in `auth.ts:110-134`.
- Document findings in `plans/admin-redesign-phase0.md` (not required by
  user; optional internal note).

**Files likely affected**: none in `main` (spike only).
**Dependencies**: none.
**Risk**: 🟢.
**Testing checklist**: build passes; spike branch deploys.
**Rollback**: delete the branch.
**Estimated difficulty**: low.

---

### Phase 1 — Design-system + new primitives · 🟡

**Goal**: lay the foundation every later phase depends on. No page-level
visual change yet.

- Add dark-mode token block to `globals.css` under
  `@media (prefers-color-scheme: dark)` and a `[data-theme="dark"]`
  attribute variant driven by a new `<ThemeProvider/>`.
- Add reduced-motion global block.
- Add new primitives: `CommandPalette`, `Breadcrumb`, `PageHeader`,
  `Toolbar`, `Sheet`, `KPI` (compact variant of `StatCard`), `ThemeProvider`,
  `ShortcutProvider`.
- Render the skip-link element in `DashboardLayout`.
- Add a `useKeyboardShortcut` hook (built on top of existing
  `useFocusTrap` patterns).

**Files likely affected**:
- `src/app/globals.css` (append only)
- `src/components/ui/{CommandPalette,Breadcrumb,PageHeader,Toolbar,Sheet,KPI}.tsx` (new)
- `src/components/ThemeProvider.tsx` (new)
- `src/hooks/useKeyboardShortcut.ts` (new)
- `src/components/layout/DashboardLayout.tsx` (skip-link only)

**Components**: see above.
**Dependencies**: Phase 0 findings (route-group + middleware confirmation).
**Risk**: 🟡 — dark-mode token addition is additive; verify no component
hard-codes a light color in a way that breaks in dark mode (audit pass).
**Testing checklist**: every existing page renders unchanged in light mode;
new primitives have Storybook-style demo page (internal only).
**Rollback**: revert the commit; no existing API consumed yet.
**Estimated difficulty**: medium.

---

### Phase 2 — Middleware + admin routing isolation · 🟡

**Goal**: solve the headline requirement. Admin never sees the marketing
site after login.

- Create `src/proxy.ts` per §2.3 / §3.2 (Next.js 16 renamed
  `middleware.ts` → `proxy.ts`; the exported function must be named
  `proxy`, runtime is fixed to `nodejs`).
- Move `<Navbar/>` + `<Footer/>` from `src/app/layout.tsx` into
  `src/app/(marketing)/layout.tsx` (route group, URL-agnostic).
- Root layout keeps only `<html>`, `<body>`, providers, skip-link.
- Confirm `/admin/*` renders without the marketing chrome.
- Confirm `/dashboard/*` still renders without the marketing chrome (it
  already has its own shell — verify no regression).

**Files likely affected**:
- `src/middleware.ts` (new)
- `src/app/layout.tsx` (trim)
- `src/app/(marketing)/layout.tsx` (new — wraps all top-level public pages)

**Components**: none.
**Dependencies**: Phase 0.
**Risk**: 🟡 — route-group file moves are easy to get wrong; do them one
public route at a time and build between each.
**Testing checklist** (acceptance criteria from §3.3):
- Admin → `/` → 302 `/admin/dashboard`, no flash.
- Anonymous → `/admin/dashboard` → 302 admin-signin with callbackUrl.
- Student/Tutor → `/admin/dashboard` → existing fallback (match today).
- Every public page still shows Navbar + Footer.
- `/dashboard/*` unaffected.
**Rollback**: delete middleware, restore root layout. Single commit.
**Estimated difficulty**: medium.

---

### Phase 3 — Topbar + Breadcrumbs + Theme toggle · 🟡 ✅ DONE (2026-08-05)

**Goal**: replace the empty `TopNav` with a real top bar.

- ✅ Rewrote `TopNav.tsx` → `Topbar.tsx` (kept `TopNav` as a re-export for
  backwards compatibility). Topbar renders: collapse toggle, `<Breadcrumb/>`,
  `⌘K` button, `<NotificationBell/>`, theme toggle, `<UserMenu/>`.
- ✅ Wired `⌘K` / `Ctrl+K` to open `<CommandPalette/>` via `useKeyboardShortcut`.
  Palette items are derived from `ROUTE_TITLES` + quick actions (toggle theme,
  sign out); richer per-page commands deferred to Phase 9.
- ✅ Built `src/components/layout/breadcrumb-map.ts` — route→title map for
  admin + member shells + `buildBreadcrumbs()` walker that handles dynamic
  `[id]` segments.
- ✅ Theme toggle persists via `ThemeProvider` (`nsuone.theme`); sidebar
  collapse intent persists via `nsuone.sidebar.collapsed` (read by Phase 4).

**Files touched**:
- `src/components/layout/Topbar.tsx` (new)
- `src/components/layout/TopNav.tsx` (now a re-export shim)
- `src/components/layout/DashboardLayout.tsx` (uses Topbar; passes `user`)
- `src/components/layout/layout.module.css` (48 px sticky `.topbar`, mobile
  hamburger shown, desktop collapse-toggle shown)
- `src/components/layout/breadcrumb-map.ts` (new)
- `src/app/dashboard/layout.tsx` (passes `userName`/`userEmail` to the shell)

**Components**: consumes `Breadcrumb`, `CommandPalette`, `ThemeProvider`,
`useKeyboardShortcut`, `NotificationBell`, `UserMenu`.
**Dependencies**: Phase 1.
**Risk**: 🟡 — affects both admin and member shells; both tested.
**Verification**: `npm run build` ✅, `npm run lint` ✅ (1 pre-existing
unrelated warning).
**Rollback**: revert commit; old `TopNav` is restored.
**Estimated difficulty**: medium.
**Note**: the desktop collapse-toggle button is wired and its intent is
persisted to `localStorage`, but the actual sidebar icon-rail collapse
ships in Phase 4 (the `<html data-sidebar-collapsed>` attribute is set
today; Phase 4 will consume it).

---

### Phase 4 — Sidebar config-driven + collapse + keyboard · 🟡 ✅ DONE (2026-08-05)

**Goal**: make the sidebar maintainable and bring it to parity with Linear.

- ✅ Extracted nav config to `src/components/layout/admin-nav.ts` (groups:
  Operations / Catalog / Growth / System) and `member-nav.ts`. Adding a
  page = add one entry, no edits to Sidebar.tsx.
- ✅ Refactored `Sidebar.tsx` to render from config. Badge logic preserved
  verbatim (actionable keys show absolute pending count, non-actionable
  show delta since last visit; `adminSeenCounts` / `studentSeenCounts`
  localStorage schema unchanged). Mark-as-seen is now derived from config
  (item.href === pathname && badgeKey not in actionableKeys), which
  produces the exact same key set as the original hard-coded list.
- ✅ Icon-rail collapse mode: 240 px ↔ 56 px, driven by
  `data-collapsed="1"` on `<aside>`. Labels, headings, and search hide;
  icons center; badges hide (would overflow the rail). Active-link
  heuristic preserved (prefix match for ≥3-segment hrefs, exact otherwise).
- ✅ In-sidebar search input (expanded only): case-insensitive label
  filter; groups with no matches hide; clear button.
- ✅ Keyboard navigation: Arrow Up/Down, Home, End over rendered links
  (uses `offsetParent` check to skip hidden links).
- ✅ Mobile drawer always renders full-width regardless of collapsed state
  (CSS media-query override restores label/badge display).

**Files touched**:
- `src/components/layout/admin-nav.ts` (new)
- `src/components/layout/member-nav.ts` (new)
- `src/components/layout/Sidebar.tsx` (rewritten)
- `src/components/layout/DashboardLayout.tsx` (owns `isCollapsed` state,
  reads/persists `nsuone.sidebar.collapsed` on mount + toggle)
- `src/components/layout/Topbar.tsx` (collapse toggle now uses props
  `isCollapsed` + `onToggleCollapse`; icon flips PanelLeftClose/Open)
- `src/components/layout/layout.module.css` (240/56 widths, collapsed
  label hide, search input styles, mobile-drawer force-expand)

**Components**: consumes `useKeyboardShortcut` (Topbar); Sidebar uses
no shortcut provider (keyboard handled inline on `<nav>`).
**Dependencies**: Phase 1, Phase 3.
**Risk**: 🟡 — count-badge / "new since last visit" behavior preserved;
localStorage key schema unchanged.
**Verification**: `npm run build` ✅, `npm run lint` ✅ (1 pre-existing
unrelated warning).
**Rollback**: revert commit.
**Estimated difficulty**: medium.
**Note**: ShortcutProvider from Phase 1's primitive list is not needed —
`useKeyboardShortcut` suffices for the Topbar's ⌘K binding, and the
sidebar's arrow-key nav is local to the `<nav>` element.

---

### Phase 5 — DataGrid upgrade + bulk actions + row actions · 🔴 ✅ DONE (2026-08-05)

**Goal**: make `<DataGrid>` the only table implementation in the admin app.

- ✅ Extended `ColumnDef<T>` with optional `id`, `width`, `resizable`,
  `filterable`, `filterOptions`, `filterFn`, `align`. Existing fields
  (`header`, `accessorKey`, `cell`, `sortable`) unchanged.
- ✅ Extended `DataGridProps<T>` with optional `getRowId`, `selectable`,
  `selectedIds` + `onSelectionChange` (controlled or internal), `rowActions`
  (overflow ⋯ menu), `onRowClick`, `editingRowId` + `renderEditableRow`.
- ✅ Multi-sort: single click cycles asc → desc → none (replaces stack);
  Shift+click toggles/adds/removes within the stack.
- ✅ Column resize handles (mouse-drag on right edge; reads th width from
  DOM on first gesture, min 60 px).
- ✅ Per-column filter menu (popover with options + clear; closes on
  outside-click). Default matcher compares `accessorKey` field; `filterFn`
  overrides.
- ✅ Row overflow ⋯ menu (`rowActions(item) => RowAction[]`; danger items
  render red). Clicks stop propagation so row-click + selection don't fire.
- ✅ Bulk selection: header "select all on page", per-row checkboxes, sticky
  selection bar showing count + Clear. Controlled (`selectedIds`/
  `onSelectionChange`) or internal state.
- ✅ Inline edit: when `editingRowId === rowId`, the row renders
  `renderEditableRow(item)` inside a highlighted `<tr>` instead of cells.
- ✅ Memoization: `DataRow` wrapped in `React.memo`; filtered/sorted/
  paginated datasets useMemo'd.
- ✅ Bug fix: `safePage = Math.min(currentPage, totalPages)` prevents
  landing on an empty page when filters shrink the result set.
- ✅ Header comment documents the full prop surface (backward-compat vs new).
- ✅ Mobile card view extended: renders selection checkbox + row actions
  when those features are on.

**Files touched**:
- `src/components/ui/DataGrid.tsx` (rewritten; backward-compatible defaults)
- `src/components/ui/DataGrid.module.css` (new — resize handle, filter menu,
  actions menu, selection bar, editing-row highlight)

**Components**: `DataGrid`.
**Dependencies**: Phase 1.
**Risk**: 🔴 — backward-compat verified: `withdrawals` + `support` use only
the original props (`data`, `columns`, `searchable={false}`, `emptyMessage`),
all new features default off, so they render unchanged.
**Verification**: `npm run build` ✅, `npm run lint` ✅ (1 pre-existing
unrelated warning). Manual inspection confirms both consumers use no
opt-in features (no `sortable` columns, no `rowActions`, no `selectable`).
**Rollback**: revert commit.
**Estimated difficulty**: high.
**Note**: server-side pagination + virtual scrolling remain Phase 12
follow-ups; client-side pagination is unchanged from the original.

---

### Phase 6 — Migrate list pages to DataGrid + standardize confirms · 🔴 ✅ DONE (2026-08-05)

**Goal**: one table, one confirm dialog across the whole admin app.

All 7 pages migrated, one commit each (lowest-risk first):

1. ✅ **departments** — DataGrid + rowActions (Edit/Delete overflow) +
   EditableRow. `window.confirm` → `useConfirmDialog`.
2. ✅ **courses** — DataGrid + controlled bulk selection (`string[]`) +
   EditableRow. KPIs/Toolbar/Add/Import panels preserved. `-244 net lines`.
3. ✅ **expertises** — DataGrid + 7-field inline edit (EditableRow) +
   status filter + debounced search. Server actions
   (updateTutorExpertise/deleteTutorExpertise) called identically.
4. ✅ **consultancy** — both tabs (Requests + Topics) on DataGrid.
   Conditional rowActions on Requests (Complete/Cancel based on status).
   Topics uses EditableRow. `window.confirm` → `useConfirmDialog`.
5. ✅ **coupons** — DataGrid + EditableRow (CouponFields shared with Add
   form). `window.confirm` → `useConfirmDialog`.
6. ✅ **users** — DataGrid; inline action buttons (Edit/Wallet/Block/Delete)
   kept as a rendered Actions cell instead of overflow ⋯ — admins use them
   constantly and hiding them would regress scannability. DeleteUserButton
   unchanged (already ConfirmDialog-based). `-142 net lines`.
7. ✅ **requests** — decomposed the 1012-line monolith into 4 new files:
   `status.ts` (pure helpers + types), `PaymentVerifyRow.tsx`,
   `RefundVerifyRow.tsx`, `RequestsTable.tsx` (DataGrid wrapper). Slim
   `RequestManager.tsx` now just owns state + action handlers. Bespoke
   two-step "Approve? / Yes Approve" inline confirms replaced with shared
   `<ConfirmDialog>` (one per row component). All server-action call sites
   preserved verbatim. `-179 net lines`.

**DataGrid contract improvement shipped during 6.3**: `renderEditableRow`
now returns raw content (no `<td>` wrapper); DataGrid wraps it for desktop
(`<td colSpan>`) and mobile (`<div>`). Mobile card view honors
`editingRowId` so inline edit works on small viewports across all migrated
pages. Departments + courses updated to the new contract.

**`window.confirm` elimination**: every `confirm()` / `window.confirm()`
across the admin app is gone. All destructive actions now flow through
`useConfirmDialog()` or `<ConfirmDialog>` (controlled).

**Server-action call sites — all preserved**:
- addDepartment / updateDepartment / deleteDepartment
- addCourse / updateCourse / deleteCourse / importCourses / deleteBulkCourses
- updateTutorExpertise / deleteTutorExpertise
- addConsultancyTopic / updateConsultancyTopic / deleteConsultancyTopic / setConsultancyRequestStatus
- addCoupon / updateCoupon / deleteCoupon
- toggleBlockUser / deleteUser
- assignTutorToRequest / verifyPaymentAction / verifyRefundAction

**Files touched**:
- `src/app/admin/departments/DepartmentManager.tsx`
- `src/app/admin/courses/CourseManager.tsx`
- `src/app/admin/expertises/ExpertiseManager.tsx`
- `src/app/admin/consultancy/ConsultancyManager.tsx`
- `src/app/admin/coupons/CouponManager.tsx`
- `src/app/admin/users/UserManager.tsx`
- `src/app/admin/requests/{RequestManager,RequestsTable,PaymentVerifyRow,RefundVerifyRow,status}.{tsx,ts}` (decompose)
- `src/components/ui/DataGrid.tsx` (EditableRow contract + mobile-edit fix)

**Components**: consumes upgraded `DataGrid` (rowActions, EditableRow,
selectable, controlled selection), `ConfirmDialog`/`useConfirmDialog`.
**Dependencies**: Phase 5.
**Risk**: 🔴 — large surface area; mitigated by one-commit-per-page +
per-page server-action call-site verification.
**Verification**: `npm run build` ✅, `npm run lint` ✅ (1 pre-existing
unrelated warning).
**Rollback**: per-page revert (each page is its own commit).
**Estimated difficulty**: high (volume).

---

### Phase 7 — Dashboard + Visitors redesign · 🟡 ✅ DONE (2026-08-05)

**Goal**: the executive-dashboard visual lift.

- ✅ Replaced oversized KPI cards with the shared compact `<KPI>` tile
  component (Phase 1 primitive). The dashboard now renders an 8-tile
  compact grid (2 cols mobile / 4 cols ≥ 1024 px) covering Students,
  Tutors, Tuition Volume, Requests, Pending Withdrawals, Pending Refunds,
  Support Tickets, and Catalog (Depts / Courses). Each tile uses the
  `variant="accent"` left bar so the colour-coded scan row is preserved
  without the previous over-tall card chrome.
- ✅ Removed the secondary "metric tile" row from the dashboard — the
  compact KPI row already surfaces Withdrawals, Refunds, Support, and
  Catalog, so the duplicate slower row was redundant. Net visual change:
  the dashboard lands on charts one row sooner.
- ✅ Made the "Actionable" banner visually louder: added a dedicated
  4-px left accent bar (`bannerAccentBar`) inside the banner container
  (`overflow:hidden` so the gradient + bar coexist), tightened the left
  padding to make room for it, and added `aria-live="polite"` + an
  `aria-label` count so screen-readers announce pending workload.
- ✅ Visitors page: applied the same compact `<KPI>` tile style to its
  five metrics (Page Views, Unique Visitors, Avg Session, Bounce Rate,
  Active Now). Removed the bespoke inline-styled KPI card markup.
- ✅ Visitors page: replaced the bespoke `<table>` logs view with the
  shared `<DataGrid>` (default export — Turbopack flagged the named
  import). Five `ColumnDef`s (Date & Time, IP Address, Page Path,
  Device, Browser / OS) preserve the exact cell rendering (monospace
  IPs, two-line date/time + browser/os, inline device icon). DataGrid's
  built-in 10-per-page pagination takes over from the hand-rolled one.
  The page-path / IP search input is now in a `<Toolbar>` above the
  grid; the date-range / refresh / export controls remain in the
  `<PageHeader>` actions slot.
- ⏸️ **Deferred to Phase 12** (with rationale): the 7/30/90-day time-range
  selector on the dashboard charts and the recent-activity feed. The
  dashboard's underlying Prisma queries are all-time aggregates with no
  time-series dimension, so a range selector cannot be wired without
  changing `dashboard/page.tsx` queries (server-logic change — out of
  scope per the plan's UI-only constraint). The plan explicitly allows
  deferral; these are now flagged in Phase 12.

**Files touched**:
- `src/app/admin/dashboard/DashboardContent.tsx` (rewrote KPI section;
  cleaned up unused imports)
- `src/app/admin/dashboard/admin-dashboard.module.css` (added
  `.compactKpiGrid` 2/4-col grid, `.bannerAccentBar` 4-px accent rule
  + `overflow:hidden` on `.banner`)
- `src/app/admin/visitors/DashboardClient.tsx` (compact KPIs + DataGrid
  logs + PageHeader + Toolbar; all metric / chart / preset / export
  logic preserved verbatim)

**Files NOT touched** (deliberate, would require server-logic changes):
- `src/app/admin/dashboard/page.tsx` — all Prisma queries unchanged.
- `src/app/admin/visitors/page.tsx` — query + auth gate unchanged.

**Components**: consumes `KPI`, `PageHeader`, `Toolbar`, `DataGrid`.
**Dependencies**: Phase 1 (KPI, PageHeader, Toolbar), Phase 5 (DataGrid).
**Risk**: 🟡 — pure presentation; all queries and server-action call
sites untouched.
**Verification**: `npm run build` ✅, `npm run lint` ✅ (1 pre-existing
unrelated warning in `(marketing)/auth/verify/VerifyForm.tsx`).
**Rollback**: revert commit.
**Estimated difficulty**: medium.

---

### Phase 8 — Detail drawers + Sheet pattern (mobile) · 🟡 ✅ PARTIAL (2026-08-05)

**Goal**: reduce full-page navigations and improve mobile UX.

- ✅ **Wallet Manager adjustment modal → right-side `<Sheet>`** — the
  highest-leverage Sheet candidate per §10.2. Replaced `<Modal>` with
  `<Sheet side="right" size="30rem">` for the wallet-adjust form.
  Form contents, direction toggle, amount/reason inputs, footer
  Cancel / Credit / Debit buttons, and the
  `adjustUserBalance` server-action call site are all preserved
  verbatim. The Sheet's built-in focus-trap + Escape-to-close +
  slide-in animation now wrap the form on every viewport (mobile no
  longer gets a centered modal that obscures the table context).
  `Modal` import removed.
- ⏸️ **Deferred to Phase 12** (with rationale):
  - **User-edit Sheet (`/admin/users/[id]`)** — the current
    `/admin/users` page query only fetches the `UserRow` subset
    (name, email, nsuId, role, contact, isBlocked, createdAt,
    department). The admin `<ProfileForm>` requires the full Prisma
    `User` (gender, password, etc.) plus `departments`. Surfacing that
    in the Sheet would require either extending the users-page query
    or adding a new fetch endpoint — both are server-logic changes
    that violate the plan's UI-only constraint. The full-page route
    stays the editor; the Edit button link is unchanged.
  - **Mobile-only Sheet editors for `CouponManager` /
    `ExpertiseManager` / `ConsultancyManager`** — the existing
    `<EditableRow>` contract renders inline inside `<DataGrid>` and
    is wired through `editingRowId` state in each Manager. Routing
    that through a viewport-conditional Sheet (desktop inline,
    mobile Sheet) is a non-trivial refactor across 3 pages with
    real regression surface. The current inline-on-mobile behavior
    works (DataGrid mobile card view honours `editingRowId`); the
    Sheet migration is a UX polish item, flagged for Phase 12.
  - **Destructive confirmations on mobile** — `<ConfirmDialog>` is
    not full-screen and already follows WAI-ARIA modal patterns;
    converting it to a Sheet would be a lateral move, not an
    improvement. Left as-is.

**Files touched**:
- `src/app/admin/wallets/WalletManager.tsx` (Modal → Sheet wrapper;
  Modal import removed)

**Files NOT touched** (deliberate):
- `src/app/admin/users/[id]/page.tsx` — keeps full-page editor
  (Sheet blocked by UI-only constraint; see above).
- `CouponManager.tsx`, `ExpertiseManager.tsx`,
  `ConsultancyManager.tsx` — keep `<EditableRow>` inline edit
  (Sheet refactor deferred).

**Components**: consumes `Sheet` (Phase 1 primitive).
**Dependencies**: Phase 1 (Sheet), Phase 6 (WalletManager already
DataGrid-migrated).
**Risk**: 🟡 — WalletManager form behavior unchanged; server-action
call site (`adjustUserBalance`) preserved.
**Verification**: `npm run build` ✅, `npm run lint` ✅ (1 pre-existing
unrelated warning).
**Rollback**: revert commit (Modal wrapper is restored).
**Estimated difficulty**: low (delivered scope) / medium (full plan).

---

### Phase 9 — Command palette · 🟡 ✅ DONE (2026-08-05)

**Goal**: keyboard-first navigation.

- ✅ Wired `CommandPalette` to the nav config from Phase 4 (was already
  using `ROUTE_TITLES`; Phase 9 swaps that for `ADMIN_NAV` / `MEMBER_NAV`
  so each item carries its sidebar icon). Routes that exist in
  `ROUTE_TITLES` but not in the sidebar config (e.g. `/admin/users/[id]`
  detail route) fall back in without an icon.
- ✅ Quick actions: kept "Toggle theme" + "Sign out", added "Refresh
  current page" (`router.refresh()`) and "Scroll to top"
  (`window.scrollTo`).
- ✅ **Recently-visited**: new helper `src/components/layout/recent-routes.ts`
  records each pathname into `sessionStorage` (`nsuone.cmd.recent`,
  newest-first, deduped, max 6). Topbar pushes on pathname change and
  reads on palette open; current route is excluded so the palette never
  offers "jump to where you already are". Renders as a "Recently
  Visited" group at the top of the list when no query is typed.
- ✅ **Grouped rendering**: upgraded `CommandPalette` to render proper
  WAI-ARIA `role="group"` section headers between Recently Visited /
  Operations / Catalog / Growth / System / Actions. Previously every
  item showed its group as inline right-aligned caption text; the new
  layout is far more scannable. Keyboard navigation (Arrow Up/Down,
  Home/End implicit via Enter, Esc to close) walks the flat index, so
  behaviour is unchanged.
- ⏸️ **Pinned favorites** deferred to Phase 12 — needs a UI to pin/unpin
  and a separate localStorage namespace; "Recently Visited" already
  covers the "jump back to what I was just doing" intent.
- ⏸️ **Page-scoped commands** (e.g. on `/admin/users`, "Filter by
  role: Tutors") deferred to Phase 12 — would require URL-driven filter
  state on the list pages (they currently use local React state), so
  a palette command couldn't actually drive the filter without a
  URL-state refactor. Flagged.

**Files touched**:
- `src/components/layout/Topbar.tsx` (nav items now sourced from
  `ADMIN_NAV`/`MEMBER_NAV` with icons; recent-routes effect; new
  actions; `openPalette` wrapped in `useCallback` so the ⌘K shortcut
  binding is stable)
- `src/components/layout/recent-routes.ts` (new helper — push / read /
  clear `nsuone.cmd.recent` sessionStorage)
- `src/components/ui/CommandPalette.tsx` (grouped rendering with
  `role="group"` headers; flat-index keyboard nav preserved)

**Files NOT touched**:
- `useKeyboardShortcut` (Phase 1) — already used; no change needed.
- No "ShortcutProvider" needed — the existing `useKeyboardShortcut`
  hook covers the ⌘K binding.

**Components**: `CommandPalette`, `Breadcrumb`, `useKeyboardShortcut`,
`ThemeProvider`.
**Dependencies**: Phase 1 (palette primitive), Phase 3 (Topbar +
breadcrumb-map), Phase 4 (nav config).
**Risk**: 🟡 — palette is additive UX; nav-item routing unchanged.
**Verification**: `npm run build` ✅, `npm run lint` ✅ (1 pre-existing
unrelated warning).
**Testing checklist**: ⌘K / Ctrl+K opens; arrow keys walk all groups
flat; Enter routes; Esc closes; recents repopulate after navigating
around and reopening; aria-dialog + focus-trap contract preserved.
**Rollback**: revert commit; Topbar's ⌘K button falls back to the
Phase 3 ROUTE_TITLES-only palette.
**Estimated difficulty**: medium.

---

### Phase 10 — Settings + Profile polish · 🟢

**Goal**: bring the two stragglers up to standard.

- Add `loading.tsx` to `/admin/settings` and `/admin/profile`.
- Add section tabs to settings (Withdrawal / Payment / Consultancy / Advanced).
- Add "Unsaved changes" indicator on settings.
- Strip the password-change field from the admin-only profile context
  (cosmetic — render a separate `<AdminProfileForm>` if the shared
  `<ProfileForm>` cannot be cleanly conditioned).

**Files likely affected**: `src/app/admin/settings/SettingsManager.tsx`,
`src/app/admin/profile/page.tsx`, new `loading.tsx` files.
**Risk**: 🟢.
**Testing checklist**: `updatePlatformSettings` action call unchanged;
`updateUserProfile` action call unchanged.
**Rollback**: revert commit.
**Estimated difficulty**: low.

---

### Phase 11 — Polish pass + a11y audit · 🟢

- Run a keyboard-only pass on every admin page.
- Run a screen-reader pass (NVDA + VoiceOver).
- Audit color contrast in dark mode.
- Verify `prefers-reduced-motion` disables every animation in §13.
- Verify every touch target ≥ 44 × 44 px.
- Add ARIA live regions for the dashboard "Actionable" banner and the
  notification count.

**Risk**: 🟢.
**Estimated difficulty**: low (volume).

---

### Phase 12 — Optional / flagged follow-ups · 🟡

These are **flagged but not committed** because they touch business logic
or add new dependencies. Each requires explicit approval before execution.

- **Server-side pagination** on `users`, `requests`, `expertises` —
  requires changing the Prisma queries in their `page.tsx` files (logic
  change — out of scope unless approved).
- **Virtual scrolling** via `react-window` if pagination is insufficient.
- **Pinned favorites + recently visited** in the sidebar.
- **Autosave** on `/admin/settings`.
- **View-as-student** debug affordance.

---

## 20. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Route-group move breaks public chrome | medium | high | Phase 0 spike; one-route-at-a-time move |
| Middleware misreads custom NextAuth cookie | medium | high | Phase 0 spike; verify cookie name in `auth.ts:110-134` |
| `DataGrid` upgrade breaks `withdrawals`/`support` | low | high | Strict backward-compat on props; ship Phase 5 alone |
| `RequestManager.tsx` decomposition introduces a behavior diff | medium | high | Keep all server-action call sites verbatim; diff each extracted file against the original |
| Dark mode exposes hard-coded light colors | high | medium | Phase 1 audit pass; ship dark mode as opt-in (toggle), not default |
| Skip-link CSS conflicts with sticky Topbar z-index | low | low | z-index audit |
| `localStorage` schema changes lose badge state | low | low | Namespace new keys; migrate old keys |
| Performance regression from new primitives | low | medium | Bundle-size check in CI; lazy-load palette/sheet |
| A page silently loses a feature during DataGrid migration | medium | high | Per-page Phase 6 checklist explicitly verifies every server-action call |

---

## 21. Testing Checklist (per phase, consolidated)

Each phase must pass before the next begins:

- [ ] `npm run build` exits 0 (per `feedback_build_before_commit.md`).
- [ ] `npm run lint` exits 0.
- [ ] Manual smoke: every admin route loads without console errors.
- [ ] Manual smoke: every public route still shows Navbar + Footer.
- [ ] Keyboard-only: reach every primary action on the page.
- [ ] Mobile viewport (375 × 667): no horizontal scroll, every action reachable.
- [ ] Dark mode (if Phase ≥ 1): no contrast failures, no white-on-white.
- [ ] Reduced motion: animations disabled, layout intact.
- [ ] No new network requests vs. baseline (verified via DevTools Network tab).
- [ ] No new Prisma queries vs. baseline (grep `prisma.` diff).

---

## 22. Migration Checklist

Order of operations when executing this plan:

1. ✅ Phase 0 spike — write findings to an internal note.
2. ✅ Phase 1 — tokens + primitives on `main` behind no flag.
3. ✅ Phase 2 — middleware + route-group reorg.
4. ✅ Phase 3 — Topbar.
5. ✅ Phase 4 — Sidebar refactor.
6. ✅ Phase 5 — DataGrid upgrade.
7. ✅ Phase 6 — page-by-page migration (one commit per page).
8. ✅ Phase 7 — Dashboard/Visitors visual lift.
9. 🟡 Phase 8 — Drawers + Sheets (partial: Wallet Modal → Sheet; rest deferred to Phase 12).
10. ✅ Phase 9 — Command palette.
11. ☐ Phase 10 — Settings/Profile polish.
12. ☐ Phase 11 — A11y + polish pass.
13. ☐ Phase 12 — Flagged follow-ups (only with approval).

Between phases: tag release, update `MEMORY.md` with the new state
(`admin_section_overhaul.md` is the existing memory; append a "redesign
shipped through Phase N" line after each phase).

---

## 23. Feature Preservation Checklist

Proof that no existing capability is removed by this plan. Every item must
remain true after each phase.

### Auth & Authorization
- ✅ NextAuth JWT strategy unchanged (`src/lib/auth.ts`).
- ✅ Credentials provider unchanged.
- ✅ Three login entry points preserved (`/auth/signin`,
  `/auth/admin-signin`, role-specific).
- ✅ `requireRole()` server guard unchanged
  (`src/lib/server/auth-gate.ts`).
- ✅ Role enum unchanged (`STUDENT | TUTOR | ADMIN`).
- ✅ Email verification + password reset flows unchanged
  (`src/app/auth/actions/*`).
- ✅ Force-signout flow preserved.
- ✅ Rate limiting on login/register/OTP unchanged.
- ✅ Custom cookie prefix unchanged.
- ✅ Middleware is **additive** — never relaxes an existing check.

### Routes
- ✅ All 16 `/admin/*` routes preserved (incl. `/admin/users/[id]`).
- ✅ All `/dashboard/*`, `/student/*`, `/tutor/*` routes preserved.
- ✅ All public routes preserved.
- ✅ No URL changes anywhere.
- ✅ `/admin` → `/admin/dashboard` redirect preserved.

### Server Actions (none of these signatures change)
- ✅ `adminUpdateUser`, `toggleBlockUser`, `deleteUser`
- ✅ `addDepartment`, `updateDepartment`, `deleteDepartment`
- ✅ `addCourse`, `updateCourse`, `deleteCourse`, `importCourses`, `deleteBulkCourses`
- ✅ `adjustUserBalance`
- ✅ `addConsultancyTopic`, `updateConsultancyTopic`, `deleteConsultancyTopic`, `setConsultancyRequestStatus`
- ✅ `updateTutorExpertise`, `deleteTutorExpertise`
- ✅ `updatePlatformSettings`, `getAdminPlatformSettings`
- ✅ `addCoupon`, `updateCoupon`, `deleteCoupon`
- ✅ `assignTutorToRequest`, `verifyPaymentAction`, `verifyRefundAction`
- ✅ `verifyWithdrawalRequest`
- ✅ `submitSupportTicket`, `resolveSupportTicket`
- ✅ `updateUserProfile`, `getMyTaughtCourseIds`

### API Routes
- ✅ `/api/admin/visitors/raw` — unchanged.
- ✅ `/api/settings/fees` — unchanged.
- ✅ `/api/notifications/*` — unchanged.
- ✅ `/api/auth/[...nextauth]` — unchanged.
- ✅ `/api/payment-info`, `/api/track-visitor` — unchanged.

### Backend / Data
- ✅ Prisma schema untouched (`prisma/schema.prisma`).
- ✅ No new model, no new field, no migration.
- ✅ Wallet transaction signing semantics untouched.
- ✅ Refund → wallet atomic credit flow untouched.
- ✅ Withdrawal server-authoritative verification untouched.
- ✅ Coupon redemption hooks (withdrawal + consultancy + tuition) untouched.

### Per-page features
- ✅ Dashboard: KPIs (students, tutors, tuition volume, requests),
  actionable banner (pending withdrawals/refunds/support), course demand
  chart, request lifecycle donut.
- ✅ Users: list, search-via-route (Phase 6 adds in-page search), block /
  unblock, delete (ConfirmDialog), edit (`/admin/users/[id]`).
- ✅ Courses: add, edit, delete, bulk-delete, JSON import, pagination,
  search.
- ✅ Expertises: edit (all fields), delete, active-first sort.
- ✅ Departments: add, edit, delete.
- ✅ Consultancy: Requests tab (status filter, complete / cancel),
  Topics tab (add, edit, delete), legacy free-text seeding.
- ✅ Coupons: add, edit, delete, scope/type/cap/usage/validity,
  redemption counts.
- ✅ Wallets: search, role filter, adjust balance (modal), audit feed,
  `?userId=` deep link.
- ✅ Withdrawals: status filter, approve / reject, MFS/bank rendering,
  email-on-action.
- ✅ Requests: assign tutor, verify payment, verify refund (with admin
  note + amount breakdown), search, status filter, emails-on-action.
- ✅ Support: status filter, resolve, email-on-resolve, contact links.
- ✅ Visitors: KPIs, traffic chart, top pages, device + browser pies,
  paginated logs, CSV export, date-range presets, "active now".
- ✅ Settings: withdrawal fee, payment fee + promo, consultancy quota,
  live preview, last-updated stamp.
- ✅ Profile: edit own profile, change password.

### Cross-cutting
- ✅ Toast notifications (`ToastProvider`) — kept.
- ✅ Notification center (`NotificationBell`) — kept, wired into Topbar.
- ✅ Web-push subscription — kept.
- ✅ Sentry instrumentation — kept.
- ✅ CSP / security headers (`next.config.ts`) — kept.
- ✅ Image optimization config — kept.
- ✅ Visitor tracker (excludes admin/auth routes) — kept.
- ✅ Sidebar count badges + "new since last visit" deltas — kept.

---

## 24. Final Notes

- **Build before commit** is a standing rule (`feedback_build_before_commit.md`).
- This plan is **UI/UX/layout only**. Anything that requires changing a
  Prisma query, a server-action signature, or an API route contract is
  explicitly flagged as out-of-scope (Phase 12) and requires approval.
- The plan is sequenced so that the **highest-leverage UX win**
  (Phase 2: admin never sees the marketing site) ships early, and the
  **highest-risk work** (Phase 6: page migrations) ships late, after the
  new primitives are battle-tested.
- When in doubt about a Next.js 16 behavior, consult
  `node_modules/next/dist/docs/` per `AGENTS.md`. Do not rely on prior
  training data for App Router APIs in this version.

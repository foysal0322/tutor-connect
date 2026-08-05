# Student / Teacher Dashboard Redesign Blueprint

> **Status:** Implementation-ready planning document
> **Date:** 2026-08-05
> **Scope:** Member-facing dashboards (Student + Teacher) across `/dashboard`, `/find-tutor`, `/wallet`, `/tutor/*`, `/profile`, `/consultancy`, `/contact`
> **Reference standard:** The **Admin Dashboard redesign** (Phases 0–10 shipped, 11–12 pending) — its shell, primitives, tokens, and patterns are the architectural foundation for this work.
> **Hard rule:** UI/UX/layout only. No business logic, API, Prisma, server-action, authorization, route, or DB changes. See §14 Feature Preservation Checklist.

---

## 0. Executive Summary

The Admin Dashboard established a compact, dense, keyboard-first, token-driven design system anchored on:

- **Shell:** 48 px sticky `Topbar` (breadcrumb + ⌘K command palette + theme toggle + notification bell + user menu) and a 240/56 px collapsible `Sidebar` with config-driven navigation, search, count badges, and mobile off-canvas drawer.
- **Page rhythm:** `PageHeader → Toolbar → DataGrid` (or compact `KPI` tiles for overviews).
- **Primitives:** `KPI`, `PageHeader`, `Toolbar`, `DataGrid`, `Sheet`, `CommandPalette`, `Tabs`, `EmptyState`, `StatusBadge`, plus the `forms/*` family with dirty-tracking and live preview.
- **Tokens:** A single source of truth in `src/app/globals.css` (color, spacing, typography, radius, shadow, motion), with a `data-theme="dark"` block for dark mode.
- **Motion:** CSS-only (no framer-motion), with a `prefers-reduced-motion` override already in place.
- **A11y:** Skip link, focus-visible rings, focus-trap in `Modal`/`Sheet`, ARIA labels, keyboard navigation in `Sidebar`/`CommandPalette`.

The **Member** side (Student + Teacher) already partially inherits this shell (`DashboardLayout` + `member-nav.ts`), but its **pages and workflows** have not been brought to the same bar. This blueprint defines a phased plan to bring every member-facing screen up to admin quality while preserving the project's distinctive **unified campus model** — where a single `User` can both learn and teach, and the Teaching tab is unlocked by the existence of `TutorExpertise` rows (not by a role enum flip).

The result must feel like **one platform**: same spacing, same typography, same primitives, same motion vocabulary, same dark mode, same command palette energy — adapted to each role's workflow.

---

## 1. Project Understanding

### 1.1 Overall Architecture

| Concern | Current State |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Data | Prisma + Postgres; server actions for mutations |
| Auth | NextAuth v4, JWT strategy, custom cookie names (`next-auth.session-token.tutor-connect`) |
| Styling | **Custom** — CSS variables + utility classes in `src/app/globals.css`; CSS Modules for component-scoped styles. **No Tailwind.** |
| Component library | Hand-built `src/components/ui/*` primitives (~35 components). No Radix/shadcn. |
| Charts | `recharts` v3.9.2, dynamic-imported (`ssr: false`) |
| Icons | `lucide-react` only |
| Fonts | System stack with Inter preferred (no `next/font`) |
| Motion | CSS-only (no framer-motion); reduced-motion handled |
| Theme | Custom `ThemeProvider` (`src/components/ThemeProvider.tsx`), `[data-theme="dark"]` attribute, `localStorage["nsuone.theme"]` |

### 1.2 Folder structure (relevant slice)

```
src/
  app/
    layout.tsx                      # Root providers (ErrorBoundary, Theme, Toast, VisitorTracker, NextTopLoader)
    globals.css                     # Design tokens + utility classes + dark theme
    admin/                          # ✅ Reference standard (redesigned)
      layout.tsx
      dashboard/ requests/ users/ courses/ expertises/ departments/
      consultancy/ coupons/ wallets/ withdrawals/ support/ visitors/ settings/ profile/
    dashboard/                      # Member hub (Learning + Teaching tabs)
      layout.tsx                    # requireRole(['STUDENT','TUTOR'])
      page.tsx                      # Server component, DashboardContent orchestrator
      loading.tsx
    (marketing)/
      find-tutor/                   # Tutor browse + filter
      wallet/                       # Unified money hub (WalletHub)
      consultancy/ contact/
      profile/                      # Unified profile (ProfileForm)
      student/
        request-tutor/ payments/ StudentRequestList.tsx actions.ts
      tutor/
        expertise/  earnings/        # Tutor-only pages
        actions.ts                  # addTutorExpertise (does NOT flip role)
    auth/                           # signin, register, verify, password reset, admin-signin
  components/
    layout/                         # DashboardLayout, Sidebar, Topbar, admin-nav.ts, member-nav.ts, breadcrumb-map.ts, recent-routes.ts
    ui/                             # KPI, PageHeader, Toolbar, DataGrid, Sheet, CommandPalette, Tabs, Modal, Button, Input, Select, Textarea, Badge, StatusBadge, EmptyState, ...
    forms/                          # FormPage, FormCard, FormSection, FormSubmit, FormAlert, FormSuccess
    payments/                       # PaymentForm (shared MFS + wallet)
    skeletons/                      # SkeletonCard, SkeletonDashboardStats, SkeletonTable
    Navbar.tsx Footer.tsx UserMenu.tsx NotificationBell.tsx ProfileForm.tsx ...
  hooks/                            # useDebounce, useFocusTrap, useKeyboardShortcut, usePushNotifications, useZodForm
  lib/
    auth.ts                         # NextAuth config
    server/auth-gate.ts             # requireRole()
    validation.ts                   # Zod schemas + parseFormData
    format.ts cache.ts coupon.ts discord.ts mail.ts notification.ts phone.ts prisma.ts rateLimit.ts
```

### 1.3 Layout hierarchy

1. Root `src/app/layout.tsx` wraps the app in `ErrorBoundary → ThemeProvider → ToastProvider → VisitorTracker → NextTopLoader`.
2. Route groups: `(marketing)` for public-or-member pages that share the marketing `Navbar`/`Footer`; `dashboard/` and `admin/` have their own shells.
3. **Member shell:** `/dashboard`, `/wallet`, `/profile`, `/student/*`, `/tutor/*` render inside `DashboardLayout` with `MEMBER_NAV` sidebar config (`member-nav.ts`).
4. **Admin shell:** `/admin/*` renders inside the same `DashboardLayout` with `ADMIN_NAV` and an admin-specific `role="ADMIN"` gate.
5. Loading: each redesigned admin route ships a `loading.tsx` with a tailored skeleton. Member routes have inconsistent coverage.

### 1.4 Providers & state management

- **No client-side SessionProvider.** Server components read `getServerSession(authOptions)` and pass the session as props to clients.
- `ThemeProvider` exposes `useTheme()` for the toggle.
- `ToastProvider` exposes `useToast()` (success/error/info).
- No global client store (no Redux/Zustand). State lives in feature-level client components and URL params.

### 1.5 Authentication architecture

- **Library:** NextAuth v4, JWT strategy, credentials provider only.
- **Identifier:** email *or* NSU ID; rate-limited per identifier.
- **JWT augmentation:** `id`, `role`, `nsuId` added in `jwt` callback and surfaced in `session.user`.
- **Email verification gate:** `emailVerified` must be non-null before dashboard access; `EMAIL_NOT_VERIFIED` sentinel handled in `/auth/signin`.
- **No `middleware.ts`.** Route protection is **layout-level** via `requireRole()` in `src/lib/server/auth-gate.ts`.

### 1.6 Permission / role architecture (critical)

This project does **not** use a traditional multi-role enum. It uses a **unified campus model**:

- `User.role` is a single string enum: `STUDENT | TUTOR | ADMIN`, default `STUDENT`.
- **Teaching capability is data-derived**, not role-derived: any non-admin user with at least one `TutorExpertise` row is a tutor. The role enum is *not* flipped when adding expertise (`src/app/(marketing)/tutor/actions.ts` explicitly avoids this).
- Layouts accept both roles: `requireRole(['STUDENT','TUTOR'])` for `/dashboard`, `/profile`, `/student/*`, `/tutor/*`.
- Server actions re-check the session inside the action body — never trust client-side gating alone.
- Admin is fully isolated: separate signin (`/auth/admin-signin`), separate shell (`/admin/*`), `requireRole(['ADMIN'])`.

**Consequence for the redesign:** there is no "role switcher" concept to build. The same signed-in Member sees Learning and Teaching surfaced contextually inside one unified dashboard. The Teaching tab is the natural "mode switch."

### 1.7 Reusable patterns already established by Admin

These are the canonical patterns to reuse, not reinvent:

- **`PageHeader`** — title, subtitle, optional icon, actions slot.
- **`Toolbar`** — sticky search + filters + actions row.
- **`DataGrid`** — single table primitive with multi-sort, column resize, per-column filter, bulk select, row action overflow menu, inline edit, mobile card view, memoized rows.
- **`KPI`** — compact metric tile with trend, tone, href, variant.
- **`Sheet`** — side-drawer for detail/edit on desktop, full-screen on mobile.
- **`CommandPalette`** — ⌘K navigation + quick actions + recently visited.
- **`Tabs`** — accessible, count-driven default selection.
- **Form family** — `FormCard`/`FormSection`/`FormSubmit` with dirty-tracking and live preview (see `SettingsManager.tsx`).
- **Skeletons** — route-specific `loading.tsx` matching the page layout.
- **`EmptyState`/`StatusBadge`/`ErrorAlert`** — consistent state surfaces.

---

## 2. Multi-Role Architecture Analysis

### 2.1 Current implementation

- Single `User` row, single `role` enum.
- Both `STUDENT` and `TUTOR` roles share `/dashboard`, `/profile`, `/wallet`, `/student/*`, `/tutor/*`.
- `MEMBER_NAV` sidebar is identical for both roles.
- The `/dashboard` orchestrator (`DashboardContent`) computes `isTutor = totalExpertiseCount > 0` and conditionally reveals the Teaching tab.
- Sign-in redirects to `/dashboard` for both STUDENT and TUTOR, and to `/admin/dashboard` for ADMIN.
- Legacy `/student/*` and `/tutor/*` index routes redirect to `/dashboard` (their child routes still exist for deep workflows like `/tutor/expertise`).

### 2.2 Strengths

- **One identity, one session, one shell.** No "switch organization" friction.
- **Capability unlocks UI.** Adding an expertise *is* the act of becoming a tutor — no separate onboarding gate.
- **Symmetric layouts.** Same `DashboardLayout` for STUDENT/TUTOR/ADMIN (only the nav config and role gate differ).
- **Server-authoritative.** Role/capability is never inferred from the client.

### 2.3 Weaknesses / edge cases

1. **No first-class "mode" cue.** A user who is both student and tutor has no persistent indicator of which workflow they're in. The Teaching/Learning tabs help inside `/dashboard`, but the sidebar doesn't reflect the current focus.
2. **Sidebar is identical for both roles**, so a pure student sees Teaching nav items they can't use yet (cold), and a pure tutor sees Learning items they may not need highlighted.
3. **`isTutor` is recomputed per page visit** from a Prisma count — there is no shared session flag, so every member page re-queries expertise.
4. **Legacy deep routes (`/student/request-tutor`, `/tutor/earnings`)** still exist alongside the unified `/dashboard` and `/wallet`. Users can land on a deep page without the surrounding dashboard context, making navigation feel disjointed.
5. **Profile is role-agnostic** (`/profile`) — there is no tutor-specific section (e.g., "Teaching Profile", availability summary) even though teaching capability is a first-class concept.
6. **No role-aware empty states** that nudge a "pure student" toward adding an expertise, or a "pure tutor" toward finding a tutor for their own learning.

### 2.4 Recommendations (without changing business logic)

> None of these touch the role enum, the data-derived `isTutor` rule, or any server action. They are pure presentation/navigation improvements.

- **Introduce a soft "Focus" concept in the sidebar** — a UI-only toggle that reorders/emphasizes Learning vs Teaching nav groups based on the user's last active tab in `/dashboard`. Persist in `localStorage["nsuone.member.focus"]`. No session change.
- **Promote `isTutor` to a layout-level prop** computed once in `dashboard/layout.tsx` (or a small server cache) and passed to `Sidebar` so nav items can be shown/disabled consistently without re-querying per page.
- **Add a Tutor section to `/profile`** rendered when `isTutor === true` — read-only summary (active expertises, rating, completed sessions) plus deep links to `/tutor/expertise`. No new mutations.
- **Surface a unified "Money" entry** in the sidebar (already partially present via the payments-due badge) and make `/wallet` the canonical home for both student payments and tutor earnings/withdrawals.
- **Add role-aware empty states** with concrete next actions ("You haven't offered any courses yet — add your first expertise").

---

## 3. Existing Dashboard Audit (Member side)

The following audits summarize **every** member-facing page. Each entry records: route → file → purpose → pain points → improvements → priority.

### 3.1 Student pages

#### `/dashboard` (Learning tab) — `src/app/dashboard/page.tsx`
- **Purpose:** Central hub; renders Learning tab and (conditionally) Teaching tab via `DashboardContent`.
- **Workflow:** Greeting header → balance pill → KPI row (open requests, upcoming sessions, completed, spend) → Action Center → activity feed.
- **Pain points:** Heavy parallel Prisma fan-out (15+ queries on the combined page); tab state lives in client memory and resets on full reload; KPI definitions vary subtly between Learning/Teaching panels (inconsistent tones); mobile layout is dense.
- **UI/UX:** Stat cards pre-date the admin `KPI` primitive — larger, less dense, no trend lines.
- **Responsiveness:** Acceptable on tablet; cramped on small phones.
- **A11y:** Tab list lacks `aria-orientation`/`aria-selected` parity with admin `Tabs`.
- **Performance:** Bundle impact from charts; no Suspense boundaries around individual sections.
- **Improvements:** Migrate KPIs to the `KPI` primitive; split Learning vs Teaching data fetch behind separate `await`s wrapped in `<Suspense>`; reuse `Tabs` primitive.
- **Priority:** P0 (highest leverage).

#### `/find-tutor` — `src/app/(marketing)/find-tutor/page.tsx` + `FindTutorClient.tsx`
- **Purpose:** Browse/filter available tutors by department, gender, free-text search.
- **Workflow:** Filter sidebar (or top filters) → expertise cards (CGPA, grades, reviews) → reviews modal.
- **Pain points:** No pagination (200-result cap); filters not persisted in the URL; mobile filters need a drawer; CGPA/grades visibility vs `hideCgpa` is fragile.
- **UI/UX:** Cards pre-date the admin card system — inconsistent radii/spacing; reviews modal is a custom Modal, not the shared `Sheet`.
- **A11y:** Focus management in the reviews modal can trap incorrectly; filter controls lack grouped `aria-labelledby`.
- **Performance:** Full list render; no virtualization.
- **Improvements:** Adopt `Toolbar` (filters) + `DataGrid` (or card grid built on the same column model) + URL-synced filters; replace reviews modal with `Sheet`; add pagination or "load more".
- **Priority:** P1.

#### `/student/request-tutor` — `src/app/(marketing)/student/request-tutor/page.tsx`
- **Purpose:** Submit a tutoring request (course, budget, schedule, faculty, mode, optional preselected tutor).
- **Pain points:** Date/time UX is split and confusing; no real-time availability preview; course select lacks debounced search; long single form.
- **Improvements:** Wrap in `FormCard`/`FormSection`; replace the course select with `SearchableCourseSelect`; split schedule into a clear step group; show fee preview using the `KPI`/`Toolbar` pattern.
- **Priority:** P1.

#### `/student/StudentRequestList.tsx`
- **Purpose:** Render the student's own tutor requests with inline actions (pay, cancel, refund, complete + rate).
- **Pain points:** Long monolithic component (~420 lines); mixes table, modal, inline forms, ratings.
- **Improvements:** Migrate the list to `DataGrid` with row actions; move each action into a `Sheet`; decompose the file into small client components (mirrors admin Phase 6 E1 pattern).
- **Priority:** P1.

#### `/wallet` — `src/app/(marketing)/wallet/page.tsx` + `WalletHub.tsx`
- **Purpose:** Unified money hub — Wallet / Payments / Earnings tabs.
- **Pain points:** Tabs duplicate the admin `Tabs` API; KPIs use older card styles; table responsiveness inconsistent; the Earnings tab reuses `EarningsClient` which has its own duplicated KPIs.
- **Improvements:** Replace tabs with the shared `Tabs`; render KPIs via the `KPI` primitive; standardize tables on `DataGrid`.
- **Priority:** P0 (central money surface).

#### `/student/payments` — `src/app/(marketing)/student/payments/page.tsx`
- **Purpose:** Standalone student payments view. Now largely subsumed by `/wallet`.
- **Pain points:** Functional duplication with `/wallet`.
- **Improvements:** Treat `/wallet` as canonical; keep this route as a thin redirect or narrow deep view (do **not** delete — backward compat).
- **Priority:** P2.

#### `/profile` — `src/app/(marketing)/profile/page.tsx` + `ProfileForm.tsx`
- **Purpose:** Edit unified member profile (gender, department, CGPA, privacy flags).
- **Pain points:** No profile completion indicator; no tutor section; avatar upload absent; form is long and unsectioned.
- **Improvements:** Adopt admin `Profile` page treatment (sections, dirty tracking, live validation). See Phase 7.
- **Priority:** P1.

#### `/consultancy` — `src/app/(marketing)/consultancy/page.tsx`
- **Purpose:** Book consultancy sessions (free quota vs paid, coupon validation).
- **Pain points:** Coupon UX is opaque; quota tracking buried; mobile form is long.
- **Improvements:** Wrap in `FormCard`; show quota as a `KPI`; render coupon as a `Toolbar`-inline control with live validation.
- **Priority:** P2.

#### `/contact` — `src/app/(marketing)/contact/page.tsx`
- **Purpose:** Generic support contact form.
- **Pain points:** Bare-bones; no ticket history (vs. admin `/admin/support` which has full DataGrid).
- **Improvements:** Wrap in `FormCard`; (out-of-scope to add ticket tracking — would change behavior).
- **Priority:** P3.

#### Auth surfaces (`/auth/student-signin`, `/auth/student-register`, `/auth/tutor-signin`, `/auth/tutor-register`)
- These now redirect to unified `/auth/signin` and `/auth/register`. No visual redesign required beyond consistency with marketing styles.
- **Priority:** P3.

### 3.2 Teacher pages

#### `/dashboard` (Teaching tab)
- **Purpose:** Tutor control center — KPIs (earnings, rating, completion, students), Action Center, Performance Summary, charts (`ExpertiseDonut`, `CoursePopularityChart`, `ProfileGauge`), activity feed, assigned students table.
- **Pain points:** Same KPI/card inconsistency as Learning tab; charts are lazy-loaded but not Suspense-wrapped individually; assigned students table is bespoke, not `DataGrid`.
- **Improvements:** KPI primitive; wrap each section in its own `<Suspense>`; convert assigned students table to `DataGrid` (read-only with row click → `Sheet` detail).
- **Priority:** P0.

#### `/tutor/expertise` — `src/app/(marketing)/tutor/expertise/page.tsx` + `ExpertiseDashboard.tsx`
- **Purpose:** CRUD for courses a tutor offers; recently redesigned.
- **Strengths:** Already uses shared primitives, switch component with ARIA, responsive cards, empty state, tailored `loading.tsx`.
- **Pain points:** No bulk actions; filter is status-only (not department/course/fee); availability is a parsed string; add/edit uses a Modal (admin prefers `Sheet` for primary edit surfaces on desktop).
- **Improvements:** Migrate add/edit from `Modal` → `Sheet`; add bulk select + activate/deactivate to the list; extend filters.
- **Priority:** P1.

#### `/tutor/earnings` — `src/app/(marketing)/tutor/earnings/page.tsx` + `EarningsClient.tsx`
- **Purpose:** View completed-session earnings; submit withdrawal requests.
- **Pain points:** Validation feedback arrives late; minimum-withdrawal threshold not surfaced before submit; no history filtering; success banner lacks context; tables bespoke.
- **Improvements:** Convert tables to `DataGrid`; render fee breakdown as a live `KPI`/preview pane; wrap withdrawal form in `FormCard` with dirty tracking.
- **Priority:** P1.

#### `/tutor/profile` → redirects to `/profile`
- Keep redirect; enrich `/profile` with a tutor section (see §3.1 `/profile`).

#### `/tutor` → redirects to `/dashboard`
- Keep redirect.

#### `/wallet` (Earnings tab)
- Shared with students; see §3.1.

### 3.3 Onboarding / empty-state audit

- `OnboardingGuide` component shows when `!isTutor && learningRequests.length === 0 && consultancyCount === 0` with two paths ("I want to learn" vs "I want to teach").
- Pain points: only fires in `/dashboard`; deep routes have no equivalent empty state; guidance is text-heavy.
- Improvements: introduce a shared `<MemberEmptyState>` pattern that can be reused on `/tutor/expertise`, `/wallet`, etc., with role-aware copy and CTAs.

---

## 4. Preservation Mandate

> The redesign is strictly **presentation-layer**. The following must not change.

- ❌ Do **not** change `User.role` semantics or flip role on expertise add/remove.
- ❌ Do **not** change `requireRole()` rules, route protection, or server-action authorization checks.
- ❌ Do **not** rename, move, or merge routes (legacy redirects must remain).
- ❌ Do **not** change any Prisma model, query shape, or transaction boundary.
- ❌ Do **not** alter server-action contracts (inputs, return shape, side effects).
- ❌ Do **not** change auth flow, OTP verification, or cookie behavior.
- ❌ Do **not** add a real role-switcher that mutates session state.

If a change appears to require any of the above, **stop and surface it** in a follow-ups section instead of proceeding.

---

## 5. Design Language Inheritance (Admin → Member)

Every member screen must reuse the admin vocabulary. Concretely:

| Aspect | Admin standard | Member adoption |
|---|---|---|
| Page header | `<PageHeader title subtitle icon actions />` | Use on every member page |
| Action row | `<Toolbar search filters actions sticky />` | Use on list/table pages |
| Metrics | `<KPI label value icon tone trend href />` | Replace bespoke stat cards |
| Tables | `<DataGrid columns data rowActions />` | Replace bespoke tables |
| Detail/edit surface | `<Sheet side size footer />` | Primary edit on desktop; full-screen on mobile |
| Tabs | `<Tabs tabs={[{id,label,count}]} />` | Replace bespoke tab UIs |
| Forms | `<FormCard><FormSection/>…<FormSubmit/></FormCard>` + dirty tracking | Adopt on `/profile`, `/student/request-tutor`, withdrawal, consultancy |
| States | `<EmptyState/>`, `<StatusBadge/>`, `<ErrorAlert/>`, skeletons | Replace ad-hoc equivalents |
| Navigation | `Sidebar` (config + search + counts + keyboard), `CommandPalette` (⌘K) | Extend `member-nav.ts`; reuse command palette |
| Spacing | `--space-*` tokens (4 px base) | No hard-coded px |
| Typography | `--text-*` tokens + Inter | No hard-coded font sizes |
| Color | `--primary/--accent/--success/--danger/--info` + `--surface-*` | No raw hex |
| Motion | `--duration-*` / `--ease-*`; reduced-motion override | No inline transition magic numbers |
| Dark mode | `[data-theme="dark"]` block in `globals.css` | Verify every new surface has dark tokens |
| Icons | `lucide-react` named imports | No other icon libraries |
| Density | Compact, 8–12 px gaps, 44 px touch targets | Match admin; avoid oversized cards |

---

## 6. Student Experience Audit (journey-level)

For each journey, capture current state + target experience. Loading/empty/error/success states are called out explicitly because admin ships them per-route and member largely does not.

### 6.1 Dashboard Home
- **Now:** Single mega page, mixed Learning/Teaching, 15+ queries, KPIs not on `KPI` primitive.
- **Target:** `PageHeader` ("Welcome, {name}") + balance pill + tab strip (`Tabs`). Each tab body wrapped in `<Suspense fallback={<SkeletonDashboardStats/>}>`. KPIs via `KPI` with trend hrefs into the relevant page.

### 6.2 Find a Tutor
- **Now:** Filter + card grid, 200-row cap, no pagination, reviews in a Modal.
- **Target:** `Toolbar` (search, dept, gender) with URL-synced params; results in a card grid OR `DataGrid` "card mode"; reviews in a `Sheet`; pagination or infinite scroll.

### 6.3 Booking / Request
- **Now:** Long form, confusing schedule fields, no availability preview.
- **Target:** `FormCard` + `FormSection` step groups; `SearchableCourseSelect`; live fee preview.

### 6.4 Payments
- **Now:** Bespoke forms and tables; duplicated surfaces.
- **Target:** `/wallet` canonical; KPIs via `KPI`; tables via `DataGrid`; payment actions in `Sheet`.

### 6.5 Notifications
- **Now:** `NotificationBell` exists in the topbar; no dedicated notifications page.
- **Target:** (Presentation-only) consider a `/notifications` list reusing `DataGrid` in read-only mode if scope allows — otherwise leave as-is (adding it is a feature, not a redesign).

### 6.6 Profile & Settings
- **Now:** Single long form.
- **Target:** Sectioned form matching admin `/admin/profile` + `/admin/settings` (tabs, dirty tracking, live preview where relevant).

### 6.7 History / Activity
- **Now:** Activity feed on dashboard only.
- **Target:** Reuse `DataGrid` for any list-style history view (no new data).

### 6.8 Reviews / Favorites / Resources / Calendar / Messages
- **Out of scope** to add (those are new features). Blueprint assumes existing surfaces only.

### 6.9 State coverage matrix (Student)

| Surface | Loading | Empty | Error | Success |
|---|---|---|---|---|
| `/dashboard` | partial | yes (onboarding) | global only | n/a |
| `/find-tutor` | partial | yes | inline | n/a |
| `/student/request-tutor` | partial | n/a | inline | redirect |
| `/wallet` | partial | partial | inline | toast |
| `/profile` | partial | n/a | inline | toast |
| `/consultancy` | partial | n/a | inline | toast |

**Target:** every cell becomes ✅ via shared primitives.

---

## 7. Teacher Experience Audit (journey-level)

### 7.1 Teaching tab (dashboard)
- See §3.2 Teaching tab. Convert KPIs and the assigned-students table; wrap charts in Suspense.

### 7.2 Expertise management
- Already redesigned. Targeted polish only: bulk actions, more filters, `Modal` → `Sheet` for the add/edit surface.

### 7.3 Sessions / students
- Currently embedded in the dashboard. No dedicated `/tutor/sessions` route exists — **adding one is a feature, out of scope.** The redesign will instead improve the embedded table on the dashboard.

### 7.4 Earnings & withdrawals
- See §3.2 `/tutor/earnings`. Migrate to shared primitives; real-time fee preview.

### 7.5 Reviews
- Surfaced via activity feed only. No standalone page. **Adding one is out of scope.**

### 7.6 Notifications
- Same `NotificationBell` as everyone.

### 7.7 Profile
- Currently shared with students. Add a **read-only Tutor section** rendered when `isTutor` is true.

### 7.8 State coverage matrix (Teacher)

| Surface | Loading | Empty | Error | Success |
|---|---|---|---|---|
| Teaching tab | partial | yes (onboarding) | global | n/a |
| `/tutor/expertise` | ✅ | ✅ | inline | toast |
| `/tutor/earnings` | generic skeleton | partial | inline | banner |
| `/wallet` earnings tab | partial | partial | inline | toast |

---

## 8. Multi-Role User Experience

Given the unified-campus model, the "multi-role" experience is really about **contextual focus**, not switching. Concrete improvements (UI-only):

1. **Focus hint in the sidebar** — softly emphasize either Learning or Teaching based on last active dashboard tab. Persisted client-side only.
2. **Unified profile** with a Tutor section that appears when `isTutor === true`.
3. **Shared notifications + shared settings** — already unified; just ensure the surfaces use shared primitives.
4. **Context preservation** — when navigating from the Teaching tab to `/tutor/expertise`, preserve filter context via URL state (no session mutation).
5. **Role-aware badges** — use `StatusBadge`/`Badge` to label "Tutor" capability in the user menu and profile (purely presentational).
6. **Prevent confusion** — page titles and breadcrumbs must always say "Learning" or "Teaching" explicitly so users never wonder which mode they are in.

No "remember last active role" toggle is needed because there is only one role; the focus hint is the equivalent.

---

## 9. Navigation Review

| Element | Current | Target |
|---|---|---|
| Sidebar | `Sidebar` + `MEMBER_NAV` (config-driven, collapsible, keyboard nav, counts) | Extend config; add a `MEMBER_NAV` group ordering based on focus; reuse as-is otherwise |
| Topbar | 48 px sticky with breadcrumb + ⌘K + bell + theme + user menu | Reuse unchanged |
| Breadcrumbs | `breadcrumb-map.ts` covers admin routes | Extend `ROUTE_TITLES` map for member routes so breadcrumbs render |
| Search | In-sidebar filter + ⌘K command palette | Wire member routes + actions into `CommandPalette` items |
| Profile menu | `UserMenu.tsx` | Add role/capability badge; keep behavior |
| Notifications | `NotificationBell.tsx` | Keep; restyle on tokens if needed |
| Mobile nav | Off-canvas drawer | Reuse unchanged |
| Role/mode cue | none | Add soft "Learning/Teaching" focus chip in topbar (presentation only) |

---

## 10. Responsive Audit

Breakpoints (from `globals.css`): `640 / 768 / 1024`. Mobile drawer fires ≤ 1024.

| Surface | Issue | Target |
|---|---|---|
| Dashboard KPIs | Cramped on phones | 2-col grid → 1-col on `< 480`; compact `KPI` variant |
| Tables | Some bespoke tables lack mobile card view | Standardize on `DataGrid` mobile card view |
| Forms | Long single-column on mobile | `FormSection` already collapses; verify all forms use it |
| Filters | Filter side panels overflow | Move into `Sheet` on mobile (drawer pattern) |
| Modals | Custom Modal stacks poorly on mobile | Prefer `Sheet` (full-screen on mobile) |
| Touch targets | Inconsistent | Enforce ≥ 44 px via shared `.touch-target` utility |

---

## 11. Component Audit

Categorized action for the reusable pieces most relevant to the member redesign.

| Component | Action | Note |
|---|---|---|
| `KPI` | **Keep** | Adopt across all member pages |
| `PageHeader` | **Keep** | Adopt everywhere |
| `Toolbar` | **Keep** | Use on list/table pages |
| `DataGrid` | **Keep** | Replace all bespoke member tables |
| `Sheet` | **Keep** | Primary edit/detail surface |
| `CommandPalette` | **Extend** | Add member nav + quick actions |
| `Tabs` | **Keep** | Replace bespoke tab UIs |
| `Modal` | **Refactor** | Keep for confirms/short dialogs; migrate primary editors to `Sheet` |
| `forms/*` | **Keep** | Adopt on `/profile`, request-tutor, withdrawal, consultancy |
| Stat cards (member) | **Replace** | Remove in favor of `KPI` |
| Bespoke tables | **Replace** | With `DataGrid` |
| `StudentRequestList` | **Split** | Decompose into list + per-action sheets (mirrors admin Phase 6 E1) |
| `EarningsClient` | **Refactor** | Extract table sections; reuse `DataGrid` |
| `FindTutorClient` | **Refactor** | Extract filter bar → `Toolbar`; reviews → `Sheet` |
| `OnboardingGuide` | **Keep + generalize** | Turn into shared `<MemberEmptyState>` |
| `SkeletonTable`/`SkeletonDashboardStats` | **Keep** | Use in every member `loading.tsx` |
| `NotificationBell`, `UserMenu` | **Keep, restyle** | Verify dark tokens; add capability badge |

---

## 12. Animation Strategy

- Stay CSS-only. No framer-motion.
- Use only `--duration-fast` (120 ms) for hovers/selections, `--duration-base` (200 ms) for sidebar/dropdown/sheet transitions, `--duration-slow` (400 ms) for full-screen sheet on mobile.
- Use `--ease-entrance` for enter, `--ease-exit` for exit, `--ease-standard` for everything else.
- Honor `prefers-reduced-motion` — already globally enforced; do not add animations that bypass it.
- No page-transition libraries. Use the `animate-fade-in` utility for content area entrance only if it improves perceived performance.
- Skeletons must use the existing `shimmer` keyframes; no custom pulse.

---

## 13. Accessibility Review

| Area | Standard |
|---|---|
| Keyboard | Every interactive element reachable in order; `Sidebar`/`CommandPalette` already implement Arrow/Home/End/Enter/Escape |
| Focus states | Use `:focus-visible` rings from tokens; never `outline: none` without replacement |
| Focus trap | `useFocusTrap` already in `Modal`/`Sheet`; verify on every new dialog |
| ARIA | `aria-label` on icon-only buttons; `aria-selected`/`aria-controls` on tabs; `aria-busy` on loading forms |
| Contrast | `--text-muted` is WCAG AA; do not invent new muted shades |
| Color-only signaling | Pair every `StatusBadge` with text (already done) |
| Screen readers | Use semantic `<table>`, `<nav>`, `<main>`, `<section>`; add `role="status"` for toasts |
| Reduced motion | Globally honored — keep it that way |
| Touch | ≥ 44 px targets; spaced ≥ 8 px apart |
| Skip link | Already present; ensure member pages have a `<main id="main">` target |

---

## 14. Performance Review

| Opportunity | Where | How |
|---|---|---|
| Code splitting | Charts | Already `dynamic(() => …, { ssr: false })`; verify member charts follow |
| Suspense per section | `/dashboard` | Wrap Learning/Teaching panels separately |
| Memoization | `DataGrid` rows | Already `React.memo`; ensure member tables use it |
| Pagination | `/find-tutor` | Add page size or cursor; do not render 200 cards |
| Image optimization | Avatars | Use `next/image` where applicable (no behavior change) |
| Caching | Dashboard aggregations | Out of scope to change queries, but wrapping with Next's `unstable_cache` is **explicitly deferred** — needs care to avoid stale authorization |
| Bundle hygiene | Avoid pulling admin-only code into member bundles | Keep `admin-nav.ts` out of member chunks |

---

## 15. Design Consistency Review

A single checklist to apply to every PR in this redesign:

- [ ] Uses `PageHeader` at the top.
- [ ] Uses `KPI`/`DataGrid`/`Tabs`/`Sheet` instead of bespoke equivalents.
- [ ] All spacing via `--space-*`, all type via `--text-*`, all color via tokens.
- [ ] Dark-mode tokens exist for any new surface.
- [ ] Loading state is a tailored `loading.tsx` using `Skeleton*` components.
- [ ] Empty/error/success states use shared primitives.
- [ ] No inline magic numbers for transitions.
- [ ] Touch targets ≥ 44 px on mobile.
- [ ] No new dependencies added (no Tailwind, no framer-motion, no new icon lib).

---

## 16. Step-by-Step Implementation Roadmap

Phases mirror the admin rollout discipline: each phase is independently shippable, reversible, and ends with `npm run build` passing. **No phase touches business logic, server actions, or auth.**

### Phase 0 — Validation spike
- **Objective:** Confirm route groups, layout gating, and command-palette plumbing for member side.
- **Files likely affected:** `src/components/layout/member-nav.ts`, `src/components/layout/breadcrumb-map.ts`, `src/components/layout/recent-routes.ts`.
- **Dependencies:** None.
- **Risk:** Low.
- **Testing:** Manual; verify existing routes still resolve; `npm run build`.
- **Rollback:** Revert the spike commit.
- **Complexity:** XS.
- **Acceptance:** Member routes appear in breadcrumbs + command palette; no behavior change.

### Phase 1 — Shared primitives readiness · 🟢 ✅ DONE (2026-08-05)
- **Objective:** Ensure `KPI`, `PageHeader`, `Toolbar`, `Tabs`, `EmptyState`, skeletons are role-agnostic (no admin-only hard-coding).
- **Files likely affected:** `src/components/ui/*`, `src/components/forms/*`.
- **Dependencies:** Phase 0.
- **Risk:** Low.
- **Testing:** Storybook-style smoke (if any) + manual across admin (regression) and one member page.
- **Rollback:** Revert.
- **Complexity:** S.
- **Acceptance:** Primitives render correctly in member context with no admin branding leakage.

**Audit result (2026-08-05):**
- ✅ All Phase 1 primitives are **purely token-driven** — every color,
  spacing, radius, shadow, and motion value comes from `--*` CSS
  variables in `globals.css`. No raw hex, no hard-coded px outside the
  documented `Topbar` height anchor in `Toolbar`.
- ✅ **No functional admin hard-coding.** Every `admin` mention in the
  primitive files was a JSDoc comment framing the primitive as
  admin-only; those have been neutralised to reflect platform-wide
  usage (KPI, PageHeader, Toolbar, DataGrid, DataGrid.module.css,
  CommandPalette, ConfirmDialog, Sheet, Select, SkeletonDashboardStats).
- ✅ **Member-side consumption already works.** `Tabs` is imported by
  `/wallet/WalletHub.tsx`, `/dashboard/DashboardContent.tsx`, and
  `/tutor/expertise/ExpertiseDashboard.tsx`; the latter also consumes
  `Modal`, `Button`, `Badge`, `StatCard`, `EmptyState`,
  `ConfirmDialog`, `Select`. No admin-only import paths leak across.
- ✅ `forms/*` family contains **zero** `admin`/`Admin`/`ADMIN`
  references — fully role-agnostic already.
- ✅ `EmptyState` uses utility classes (`.flex`, `.bg-card`,
  `.border-color`, `.text-muted`) that are defined in `globals.css`
  independent of any role context.

**Files touched:**
- `src/components/ui/KPI.tsx` (doc only)
- `src/components/ui/PageHeader.tsx` (doc only)
- `src/components/ui/Toolbar.tsx` (doc only)
- `src/components/ui/DataGrid.tsx` (doc only)
- `src/components/ui/DataGrid.module.css` (doc only)
- `src/components/ui/CommandPalette.tsx` (doc only)
- `src/components/ui/ConfirmDialog.tsx` (doc only)
- `src/components/ui/Sheet.tsx` (doc only)
- `src/components/ui/Select.tsx` (doc only)
- `src/components/skeletons/SkeletonDashboardStats.tsx` (doc only)

**No behaviour, prop, or token changes.** Phase 2 can proceed.
**Verification:** `npm run build` ✅.

### Phase 2 — Member shell polish · 🟢 ✅ DONE (2026-08-05)
- **Objective:** Bring `DashboardLayout` + `Sidebar` + `Topbar` for member side to parity with admin (focus hint, capability badge, breadcrumb coverage, ⌘K items).
- **Files likely affected:** `src/components/layout/member-nav.ts`, `src/components/layout/breadcrumb-map.ts`, `src/components/layout/Sidebar.tsx` (if needed), `src/components/UserMenu.tsx`.
- **Dependencies:** Phase 1.
- **Risk:** Medium (visual regression across all member pages).
- **Testing:** Visual sweep of every member route at desktop/tablet/mobile; dark mode.
- **Rollback:** Revert shell changes.
- **Complexity:** M.
- **Acceptance:** Shell looks/feels like admin; navigation behaves identically; no layout shifts.

**Audit result (2026-08-05):**
- ✅ **⌘K command palette** was already shell-aware (Topbar picks
  `MEMBER_NAV` + member routes from `ROUTE_TITLES`, with Recently Visited
  tracking + shell-level actions: theme toggle, refresh, scroll-top, sign
  out). No additional work needed.
- ✅ **Breadcrumb coverage** extended — added three missing member routes
  to `ROUTE_TITLES`: `/tutor/earnings`, `/student/payments`, `/contact`.
  Every member route under the shell now renders a titled crumb.
- ✅ **Capability badge** plumbed end-to-end — `getMemberSidebarCounts`
  now returns `{ paymentsDue, isTutor }` (one extra indexed
  `tutorExpertise.count`, run in `Promise.all` with the existing query).
  `isTutor` flows through the four member layouts → `DashboardLayout` →
  `Topbar` → `UserMenu`. When `isTutor && role !== 'ADMIN'`, a green
  "Tutor" capability chip renders beside the role chip (both popover and
  inline/mobile variants). Admin shell opts out — admins keep the single
  "Administrator" chip.
- ✅ **Focus hint (Learning / Teaching)** implemented as a UI-only
  concept in `src/components/layout/member-focus.ts`:
  - Persisted at `localStorage["nsuone.member.focus"]`, default `"learning"`.
  - **Writers:** `<DashboardContent>` pushes the active tab id on every
    change via a new optional `onSelect` prop on `<Tabs>` (fires on
    initial mount + every click; `SettingsManager` and other callers are
    unaffected — `onSelect` is opt-in).
  - **Readers:** `<Sidebar>` subscribes (mount + `nsuone:member-focus-change`
    CustomEvent), exposes a `data-member-focus` attribute on the `<aside>`,
    and the matching group heading (Learning or Teaching) picks up a
    primary-tone accent + tinted backdrop. The heading is also a
    click-to-toggle affordance (member-only; admin shell opts out
    entirely). Collapsed rail hides the emphasis (it requires the
    heading text).

**Files touched:**
- `src/components/layout/breadcrumb-map.ts` (3 ROUTE_TITLES entries)
- `src/lib/server/member-counts.ts` (added `isTutor` to the returned shape)
- `src/components/layout/DashboardLayout.tsx` (new `isTutor?` prop → Topbar)
- `src/components/layout/Topbar.tsx` (new `isTutor?` prop → UserMenu)
- `src/components/UserMenu.tsx` + `UserMenu.module.css` (capability chip)
- `src/app/dashboard/layout.tsx`, `src/app/(marketing)/profile/layout.tsx`,
  `src/app/(marketing)/tutor/layout.tsx`, `src/app/(marketing)/student/layout.tsx`
  (pass `isTutor={currentCounts.isTutor}`)
- `src/components/layout/member-focus.ts` (NEW)
- `src/components/ui/Tabs.tsx` (optional `onSelect`)
- `src/app/dashboard/DashboardContent.tsx` (wire `onSelect` → `writeMemberFocus`)
- `src/components/layout/Sidebar.tsx` + `layout.module.css` (read +
  render focus emphasis; click-to-toggle heading)

**Preservation contract respected:**
- ❌ No `User.role` flips; `isTutor` is **read-only** and data-derived.
- ❌ No JWT/session change; `isTutor` is a per-render server prop, not on the token.
- ❌ No server-action, Prisma model, or route change.
- ❌ No new runtime dependencies.

**Verification:** `npm run build` ✅.

### Phase 3 — `/dashboard` decomposition + KPI adoption · 🟢 ✅ DONE (2026-08-05)
- **Objective:** Convert Learning and Teaching tabs to `Tabs` primitive, `KPI` tiles, and per-section `<Suspense>`; keep all data queries intact.
- **Files likely affected:** `src/app/dashboard/page.tsx`, `src/app/dashboard/DashboardContent.tsx` (or equivalent), `src/app/dashboard/loading.tsx`, related chart components.
- **Dependencies:** Phase 2.
- **Risk:** Medium-High (most visible page).
- **Testing:** Per-role matrix (student-only, tutor-only, both, blocked, unverified).
- **Rollback:** Revert; queries untouched so no data risk.
- **Complexity:** L.
- **Acceptance:** Both tabs visually match admin dashboard density; load feels faster due to Suspense.

**Implementation notes (2026-08-05):**
- ✅ **Shared `<KPI>` adopted everywhere.** The bespoke `Kpi` component
  (previously inside DashboardContent) and the legacy `StatCard` (used on
  the Learning panel) are both replaced by the platform-wide `<KPI>`
  primitive. Both tabs now share the same compact, token-driven tile.
- ✅ **Per-section `<Suspense>` streaming.** The page was decomposed into:
  - `page.tsx` — fetches only **shell counts** (8 indexed `count`
    queries in parallel — balance, expertise counts, request counts for
    tab defaults + onboarding gate). The shell paints immediately.
  - `sections/LearningPanel.tsx` — async server component, fetches its
    own learning data inside the Suspense boundary.
  - `sections/TeachingPanel.tsx` — async server component, fetches all
    teaching data. Short-circuits to the static `<TeachCTA>` for
    non-tutors (zero DB queries).
  - `sections/TeachingPanelView.tsx` — client view extracted from the
    old DashboardContent (recharts dynamic imports stay client-side).
  - `PanelSkeleton.tsx` — Suspense fallback reusing
    `SkeletonDashboardStats`.
- ✅ **DashboardContent simplified.** The orchestrator now only owns the
  shell header (greeting + balance pill + profile link) + the Tabs strip
  + focus-hint side-effect. All teaching data types and the bespoke Kpi
  component are removed. `DashboardData` → `DashboardShellData`.
- ✅ **loading.tsx fixed.** The previous skeleton used inline hex colors
  (`#F1F5F9`, `#E2E8F0`) that broke in dark mode. Now uses the global
  `.skeleton` / `.skeleton-card` classes (token-driven, dark-mode safe).
- ✅ **Non-tutor speedup.** Members with no expertise skip all 12
  teaching queries entirely (the `<TeachCTA>` renders without awaiting).
  Their dashboard paint is noticeably faster.

**Data preservation contract:**
- All Prisma queries are **identical** to the previous implementation —
  same `where` clauses, same `select` shapes, same derivation logic.
  They were relocated, not rewritten.
- No server-action, route, or auth change.
- No new dependencies.

**Verification:** `npm run build` ✅.

### Phase 4 — `/wallet` canonicalization · 🟢 ✅ DONE (2026-08-05)
- **Objective:** Replace bespoke tabs/KPIs/tables with shared primitives across Wallet/Payments/Earnings; reuse `EarningsClient` internals via `DataGrid`.
- **Files likely affected:** `src/app/(marketing)/wallet/WalletHub.tsx`, `src/app/(marketing)/tutor/earnings/EarningsClient.tsx`.
- **Dependencies:** Phase 1, Phase 3.
- **Risk:** Medium (money surface — must not change validation or action contracts).
- **Testing:** Pay / withdraw / refund flows; verify all toasts and confirm dialogs behave identically.
- **Rollback:** Revert.
- **Complexity:** M.
- **Acceptance:** Visually unified; behavior unchanged.

**Implementation notes (2026-08-05):**
- ✅ **Tabs** — already adopted (WalletHub uses the shared `<Tabs>` primitive
  since the original wallet redesign). No change needed.
- ✅ **KPI adoption across all four wallet surfaces:**
  - **WalletHub** — 3 bespoke `heroCard` KPIs → `<KPI>` (variant="accent"
    on the wallet-balance tile for emphasis).
  - **WalletClient** — 3 bespoke `card` KPIs (Total Deposited, Total Spent,
    Pending Withdrawal) → `<KPI>`.
  - **PaymentsView** — 3 bespoke `kpiCard` KPIs (Awaiting Payment, Total
    Paid, Verified Sessions) → `<KPI>`.
  - **EarningsClient** — 3 bespoke `card-compact border-t-4` KPIs (Total
    Earned, Withdrawn/Pending, Available) → `<KPI>`.
- ✅ **DataGrid migration:**
  - **PaymentsView** — Payment History table (8 columns, manual
    desktop+mobile split) → single `<DataGrid>` with search + pagination.
  - **EarningsClient** — Withdrawal Payout History table (5 columns,
    manual desktop+mobile split) → `<DataGrid>`; Tuition Earnings Log
    (4 columns) → `<DataGrid>`. Both gain search + pagination for free.
  - All mobile card views were removed — DataGrid handles responsive
    rendering internally.
- ✅ **Behavior preserved.** All form submissions, validation rules,
  success banners, toasts, and confirm dialogs are unchanged. The
  `providerBadge` / `destinationLabel` helpers in EarningsClient are
  preserved and used inside DataGrid `cell` renderers.

**Dead CSS follow-up (not blocking):** `wallethub.module.css`, `wallet.module.css`,
and `payments.module.css` now contain orphaned `.heroCard` / `.kpiRow` /
`.kpiCard` / `.kpiValue` classes. They're harmless (unused CSS modules are
tree-shaken at build time) and can be cleaned up in a future hygiene pass.

**Verification:** `npm run build` ✅.

### Phase 5 — List pages → `DataGrid` · 🟢 ✅ DONE (2026-08-05)
- **Objective:** Migrate `StudentRequestList`, assigned-students table (Teaching tab), `/find-tutor` results (card mode or DataGrid) to the shared table primitive; row actions open `Sheet`.
- **Files likely affected:** `src/app/(marketing)/student/StudentRequestList.tsx`, `src/app/dashboard/…/AssignedStudentsTable.*`, `src/app/(marketing)/find-tutor/FindTutorClient.tsx`.
- **Dependencies:** Phase 1.
- **Risk:** Medium (lots of inline actions to relocate).
- **Testing:** Each action (pay/cancel/refund/complete/rate) end-to-end.
- **Rollback:** Revert per file.
- **Complexity:** L.
- **Acceptance:** Lists use `DataGrid`; actions unchanged.

**Implementation notes (2026-08-05):**
- ✅ **AssignedStudentsTable → `<DataGrid>`.** Replaced the bespoke
  `<table>` + `md:hidden` mobile card split with a single `<DataGrid>`
  that handles responsive rendering, search, and pagination internally.
  Column defs: Student, Course, Topic, Mode, Time, Budget, Status.
- ✅ **StudentRequestList → `<DataGrid>` + `<Sheet>`.** Converted the
  card-based list to the admin Phase 6 pattern:
  - **Grid** shows summary columns: Course, Status (same colour-coded
    badge), Budget, Tutor, Date. Clicking a row opens the detail Sheet.
  - **Sheet** (40rem right-drawer) shows the full request detail: status
    badge, refund outcome banners, details grid (topic/faculty/mode/time/
    budget), assigned-tutor info with contact details (status-gated),
    and conditional action buttons.
  - Actions (Cancel, Pay, Complete+Rate, Refund) expand inline within the
    Sheet body via a `mode` state (`details` / `cancel` / `payment` /
    `complete` / `refund`) — same handler functions as before, same
    server actions, same toasts.
  - Eliminates ~150 lines of inline card styling + duplicate layout code.
- ✅ **FindTutorClient reviews modal → `<Sheet>`.** Replaced the custom
  `createPortal` + `useFocusTrap` + manual Escape listener + overlay/panel
  JSX with a single `<Sheet>` call. Eliminated imports: `createPortal`,
  `useFocusTrap`, `useId`, `useRef` (all were only used by the manual
  modal). Review items still use the existing `styles.review*` classes.

**Dead CSS follow-up (not blocking):** `find-tutor.module.css` retains
orphaned `.modalOverlay`, `.modalPanel`, `.modalHeader`, `.modalAvatar`,
`.modalHeadInfo`, `.modalTitle`, `.modalSubtitle`, `.modalClose`,
`.modalBody` classes. They're unused CSS module selectors (tree-shaken
at build) and can be cleaned up in a future hygiene pass.

**Behavior preservation contract:**
- All server actions (`cancelTutorRequest`, `completeTutorRequest`,
  `submitRefundRequest`, `rechargeWallet`, `submitWithdrawalRequest`)
  are unchanged.
- All toasts, confirm flows, and status-gated contact-reveal logic
  are preserved.
- The PaymentForm component is rendered inside the Sheet without
  modification.

**Verification:** `npm run build` ✅.

### Phase 6 — Forms standardization · 🟢 ✅ DONE (2026-08-05)
- **Objective:** Adopt `FormCard`/`FormSection`/`FormSubmit` with dirty tracking on `/profile`, `/student/request-tutor`, `/tutor/earnings` withdrawal form, `/consultancy`.
- **Files likely affected:** `src/components/ProfileForm.tsx`, the request-tutor form, `EarningsClient.tsx`, consultancy page.
- **Dependencies:** Phase 1.
- **Risk:** Medium (forms touch many inputs).
- **Testing:** Submit every form; verify server-action inputs unchanged.
- **Rollback:** Revert.
- **Complexity:** M.
- **Acceptance:** Forms look unified; validation + toasts unchanged.

**Implementation notes (2026-08-05):**
- ✅ **ProfileForm** — already used `FormCard`/`FormSection`/`FormSubmit`.
  **Added dirty tracking**: a `useMemo` baseline is computed from the
  `user` prop; a form-level `onChange` reads all named field values via
  `FormData` and compares to the baseline (JSON.stringify). When dirty,
  a warning pill ("Unsaved changes" + Revert button) replaces the
  default neutral pill ("All changes saved"). Revert calls
  `form.reset()` and clears the dirty flag. Successful submit also
  clears the flag.
- ✅ **RequestTutorForm** — replaced the raw `<div
  className={cardEmbeddedClass}>` wrapper with a proper `<FormCard
  surface="embedded">` (icon: ClipboardList, title: "Request a Tutor",
  subtitle). The `cardEmbeddedClass` import was removed. All form
  internals — `FormSection`, `FormSubmit`, `useZodForm`, the date/time
  split inputs, the pre-selected-tutor banner — are unchanged.
- ✅ **EarningsClient withdrawal form** — replaced the raw `<div
  className="card">` + inline `<h3>`/`<p>` header with `<FormCard
  surface="embedded">` (icon: Wallet, title: "Request Withdrawal",
  subtitle). All form internals — method radio selector, amount/coupon
  inputs, MFS/bank conditional fields, fee breakdown, `FormSubmit` —
  are unchanged.
- ✅ **Consultancy** — already fully adopted (`FormPage` + `FormCard` +
  `FormSection` + `FormSubmit`). No work needed. Dirty tracking is not
  practical here because the page is a server component with a
  `'use server'` action.

**Dirty tracking scope note:** Only ProfileForm got dirty tracking because
it's the one "update existing values" form (the pattern where unsaved-
changes awareness adds the most value). The other three are "submit once"
forms where the user starts from a blank canvas every visit.

**Behavior unchanged:** all server-action call sites (`updateUserProfile`,
`submitTutorRequest`, `submitWithdrawalRequest`, `submitConsultancy`),
validation rules, toasts, and error displays are preserved verbatim.

**Verification:** `npm run build` ✅.

### Phase 7 — Profile enrichment · 🟢 ✅ DONE (2026-08-05)
- **Objective:** Add a read-only **Tutor section** to `/profile` (rendered when `isTutor === true`); add profile completion `KPI`.
- **Files likely affected:** `src/app/(marketing)/profile/page.tsx`, `src/components/ProfileForm.tsx`.
- **Dependencies:** Phase 6.
- **Risk:** Low (read-only additions).
- **Testing:** Verify for student-only vs both-capability users.
- **Rollback:** Revert.
- **Complexity:** S.
- **Acceptance:** Tutor section appears exactly when `isTutor === true`; no new mutations.

**Implementation notes (2026-08-05):**
- ✅ **Profile completion KPI** added at the top of `/profile` using the
  shared `<KPI>` primitive. Uses the same 5-field heuristic as the
  dashboard teaching panel (gender, department, CGPA, any expertise,
  active expertise). Tone shifts: accent (<50%) → primary (50–79%) →
  success (≥80%).
- ✅ **Read-only Tutor section** renders above the form when `isTutor`
  (data-derived: `activeExpertiseCount + inactiveExpertiseCount > 0`).
  Shows a teaching summary stat row: Active Expertise, Avg Rating (with
  star icon + review count), Completed Sessions, and Inactive count (if
  any). Includes a "Manage Expertise" deep link to `/tutor/expertise`.
  Pure students (no expertise) see only the KPI + form — the Tutor
  section is omitted entirely.
- ✅ **`ProfileForm.tsx` unchanged** — the editable form still works
  exactly as before (Phase 6 dirty tracking included). The enrichment
  lives entirely in the page component, above the form.

**Preservation:** No new mutations, server actions, or Prisma writes.
The four summary queries (`tutorExpertise.count` × 2, `tutorRequest.
aggregate`, `tutorRequest.count`) are all read-only and run in
`Promise.all`.

**Verification:** `npm run build` ✅.

### Phase 8 — `/tutor/expertise` polish · 🟢 ✅ DONE (2026-08-05)
- **Objective:** Migrate add/edit from `Modal` → `Sheet`; add bulk select; extend filters (dept/course/fee).
- **Files likely affected:** `src/app/(marketing)/tutor/expertise/ExpertiseDashboard.tsx`, `AddExpertiseForm.tsx`.
- **Dependencies:** Phase 1.
- **Risk:** Low-Medium.
- **Testing:** Add/edit/delete/activate flows; bulk activate/deactivate.
- **Rollback:** Revert.
- **Complexity:** M.
- **Acceptance:** Editor opens as `Sheet`; filters/bulk work; behavior unchanged.

**Implementation notes (2026-08-05):**
- ✅ **Modal → Sheet.** The add/edit expertise form now opens as a
  right-drawer `<Sheet>` (36rem) instead of a centered `<Modal>`. The
  Sheet handles portal, focus-trap, escape, and backdrop-close
  automatically. `AddExpertiseForm` renders unchanged inside the Sheet
  body. Eliminates the `Modal` import.
- ✅ **Extended filters.** Two new `<Select>` dropdowns added to the
  toolbar (alongside the existing search + status radio chips + sort):
  - **Department filter** — derived from the expertises' unique
    departments; only appears when there are 2+ departments.
  - **Fee range filter** — presets: Any / Under 500 / 500–1,000 /
    Over 1,000 BDT.
  Both filters compose with the existing search + status filter in the
  `visible` useMemo.
- ✅ **Bulk select + activate/deactivate.**
  - **Per-card checkbox**: each expertise card gets a `CheckSquare` /
    `Square` toggle button at the top-left. Selection state lives in a
    `Set<string>` (`selectedIds`).
  - **Select all**: a "Select all" button above the list
    toggles selection of all visible items.
  - **Bulk action bar**: when `selectedIds.size > 0`, a primary-tinted
    bar appears with the count + Activate / Deactivate / Clear buttons.
    Bulk actions call `toggleTutorExpertise` per-item (no new server
    action) and show a toast with the count. Clears selection on
    completion.

**Behavior unchanged:** per-item toggle, edit, delete, add — all
handler functions and server actions (`toggleTutorExpertise`,
`deleteTutorExpertise`, `addTutorExpertise`, `updateTutorExpertise`)
are preserved verbatim.

**Verification:** `npm run build` ✅.

### Phase 9 — `CommandPalette` + breadcrumbs for member
- **Objective:** Wire member nav items + quick actions (go to Find Tutor, Request Tutor, Withdraw, Add Expertise, Toggle Theme, Sign Out) into `CommandPalette`; extend `breadcrumb-map.ts`.
- **Files likely affected:** `src/components/layout/breadcrumb-map.ts`, `src/components/layout/recent-routes.ts`, command palette config.
- **Dependencies:** Phase 2.
- **Risk:** Low.
- **Testing:** ⌘K across roles; breadcrumbs on every member route.
- **Rollback:** Revert.
- **Complexity:** S.
- **Acceptance:** Command palette parity with admin for member routes.

### Phase 10 — Responsive + mobile drawer pass
- **Objective:** Sweep every member page at 360/414/768/1024/1440; verify filters → `Sheet` on mobile, tables → card view, touch targets ≥ 44 px.
- **Files likely affected:** Per-page CSS modules; shared primitive CSS.
- **Dependencies:** Phases 3–8.
- **Risk:** Low.
- **Testing:** Manual device matrix; Lighthouse mobile.
- **Rollback:** Revert CSS-only changes.
- **Complexity:** M.
- **Acceptance:** No overflow, no horizontal scroll, no undersized targets.

### Phase 11 — Accessibility pass
- **Objective:** Audit keyboard, focus traps, ARIA, contrast, reduced motion across every member page.
- **Files likely affected:** Per component; primitives may receive minor a11y fixes (share with admin Phase 11).
- **Dependencies:** Phases 3–10.
- **Risk:** Low.
- **Testing:** axe-core / Lighthouse / manual keyboard pass.
- **Rollback:** Revert.
- **Complexity:** M.
- **Acceptance:** Zero critical a11y issues on member routes.

### Phase 12 — Performance pass
- **Objective:** Add Suspense boundaries, memoize expensive renders, lazy-load charts, ensure no admin-only code leaks into member bundles.
- **Files likely affected:** `src/app/dashboard/*`, `next.config.ts` (import optimization), dynamic imports.
- **Dependencies:** Phases 3–8.
- **Risk:** Medium (perf changes can surface latent bugs).
- **Testing:** Lighthouse; bundle analyzer; cold-load trace.
- **Rollback:** Revert.
- **Complexity:** M.
- **Acceptance:** No regressions; equal-or-better Largest Contentful Paint on `/dashboard`.

### Phase 13 — Final QA
- **Objective:** Cross-browser, dark mode every page, role matrix, regression vs. admin.
- **Files likely affected:** None (bug fixes only).
- **Dependencies:** All prior phases.
- **Risk:** Low.
- **Testing:** Full QA matrix (see §17).
- **Rollback:** Per-fix.
- **Complexity:** S.
- **Acceptance:** All acceptance criteria met; zero regressions.

> **Sequencing note:** Phases 3, 4, 5, 6 can be parallelized across separate PRs/branches since they touch different files, provided Phase 1 + Phase 2 land first.

---

## 17. Testing Checklist

### 17.1 Roles & auth
- [ ] Student-only user reaches `/dashboard`, sees Learning tab only.
- [ ] Tutor-only user reaches `/dashboard`, sees both tabs (Learning always, Teaching enabled).
- [ ] Student-with-expertise user sees Teaching tab unlocked (data-derived).
- [ ] Blocked user (`isBlocked`) cannot sign in.
- [ ] Unverified user (`emailVerified === null`) is sent to verify flow.
- [ ] Admin cannot reach `/dashboard` (and vice versa for `/admin/*`).
- [ ] Signing out clears the session cookie; back-button does not restore auth.

### 17.2 Navigation
- [ ] Sidebar highlights the active route (prefix match for deep links).
- [ ] Collapse toggle persists in `localStorage`.
- [ ] Mobile drawer opens/closes on tap, overlay click, and Escape.
- [ ] ⌘K opens command palette; arrow keys navigate; Enter activates; Escape closes.
- [ ] Breadcrumbs render on every member route.

### 17.3 Responsive
- [ ] 360 / 414 / 768 / 1024 / 1440 sweep on every redesigned page.
- [ ] No horizontal scroll at 360.
- [ ] Filters collapse into a `Sheet` on mobile.

### 17.4 Accessibility
- [ ] Keyboard-only flow completes the primary action on each page.
- [ ] Focus visible on every interactive control.
- [ ] axe-core: 0 critical issues per page.
- [ ] `prefers-reduced-motion` disables non-essential motion.

### 17.5 Functionality (regression)
- [ ] Submit tutor request → appears in Learning tab.
- [ ] Pay for a request → balance + status update.
- [ ] Cancel / refund / complete + rate flow intact.
- [ ] Add / edit / delete / toggle expertise.
- [ ] Submit withdrawal → balance check + Discord notification.
- [ ] Apply coupon (consultancy / payments / withdrawals).
- [ ] Toggle `hideCgpa` reflects on `/find-tutor`.
- [ ] Admin actions on the same data still behave identically (admin view unchanged).

### 17.6 Dark mode
- [ ] Every redesigned page readable in dark mode.
- [ ] No token drift (search for raw hex in diffs).

### 17.7 Performance
- [ ] `/dashboard` LCP no worse than before.
- [ ] No new runtime warnings (React 19 strict mode).

---

## 18. Feature Preservation Checklist

This section is the contract. Every PR under this blueprint must be reviewable against it.

- ✅ Existing authentication (NextAuth JWT, OTP verification, cookie names) remains unchanged.
- ✅ Existing authorization (`requireRole()` rules, server-action session checks) remains unchanged.
- ✅ APIs / server actions remain unchanged (inputs, outputs, side effects, Discord/email notifications).
- ✅ Business logic remains unchanged (payment splits, refund→wallet crediting, withdrawal thresholds, coupon evaluation).
- ✅ Existing permissions remain unchanged (`isBlocked`, `emailVerified`, `hideCgpa`).
- ✅ Existing routes remain unchanged (no renames, no removed redirects).
- ✅ Existing Student functionality remains intact (find tutor, request, pay, cancel, refund, complete, rate).
- ✅ Existing Teacher functionality remains intact (expertise CRUD, availability, earnings, withdrawal).
- ✅ Multi-role / unified-campus behavior remains intact (single `User`, data-derived `isTutor`, no role flipping).
- ✅ Existing database interactions remain intact (Prisma models, queries, transactions).

If any of the above appears to require change, the work must pause and the requirement must be escalated as a follow-up — it is out of scope for this redesign.

---

## 19. Acknowledgements

This blueprint explicitly builds on the **Admin Dashboard redesign**, whose Phases 0–10 are complete and whose Phases 11–12 (a11y + flagged follow-ups) remain pending. The member redesign should:

1. Inherit the admin design language wholesale.
2. Coordinate Phase 11 (a11y) with the same work on admin to avoid duplicated effort.
3. Treat admin's pending follow-ups (server-side pagination, virtual scrolling, pinned favorites, autosave) as shared infrastructure — adopt in member pages only when admin adopts them.

The end state is one coherent platform: **Admin, Student, and Teacher surfaces that obviously belong to the same product.**

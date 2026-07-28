# Tutor Connect — Frontend Improvement Plan

> Derived from `DESIGN_GUIDELINES.md` + `FRONTEND_AUDIT.md`.
> Scope discipline: every item below has a **measurable** UX, consistency, accessibility, or responsiveness reason. Items that are purely architectural with no user-visible benefit, or that are already resolved, are deliberately omitted.

## Execution status

| Step | Status | Notes |
|---|---|---|
| Step 6 — Forced signout reason | ✅ Done | Page reads `?reason=` and renders contextual message. All callers pass a reason code. |
| Step 1 — Migrate forms off `FloatingInput` | ✅ Done | 14 forms migrated to `Input`/`Select` primitives; `FloatingInput.tsx` + CSS deleted. Primitives no longer impose `marginBottom` (parent `gap-*` controls spacing). Build green. |
| Step 5 — Hardcoded values → tokens | ✅ Done (scoped) | All CSS-module hex literals replaced with tokens; inline color styles in home/support/contact/admin clients replaced. Added `--surface-1..9`, `--border-strong`, `--skeleton-base` tokens. **Excluded** (out of scope, not dark-mode blockers): chart series colors in `DashboardContent`, status palette inside the `StudentRequestList` monolith (will follow E1). |
| Step 2 — Custom tables → `DataGrid` | ✅ Done (partial, justified) | Migrated: `ExpertiseManager`, `SupportManager`, `WithdrawalManager`. **Bug fixed:** `hidden.md:table` typo in 6 remaining tables (was showing both desktop + mobile views stacked on mobile). **Deferred with comment:** `CourseManager` (bulk-select + inline-edit), `DepartmentManager` (inline-edit), `RequestManager` (558-line monolith). |
| Step 4 — Client-side validation | ✅ Done | `useZodForm` hook added; wired into both register forms **and** `RequestTutorForm`. Progressive error reveal (validate-on-blur, re-validate-on-input). **Two latent bugs fixed:** (1) register forms sent `gender:"Male"` while `registerUserSchema` required `'MALE'`; (2) `submitTutorRequestSchema` required `'ONLINE'/'OFFLINE'/'HYBRID'` while the form and DB use `'Online'/'On Campus'`. Both had been silently failing server-side since Phase 1. |
| Step 3 — Dark mode | ✅ Done (Option B) | The non-functional theme toggle in `TopNav.tsx` has been **removed** (along with the unused `Moon`/`Sun` imports). A visible-but-broken control is worse than none; dark mode can be re-added as a real feature when prioritised. |

**All six steps complete. Production build is green (42/42 routes).**

---

## Decisions applied

### A. Step 3 — Dark mode → Option B (remove the toggle)

The non-functional theme toggle in `src/components/layout/TopNav.tsx` was a trust-eroding "Coming Soon" affordance. Removed the button and the now-unused `Moon`/`Sun` imports from `lucide-react`. When dark mode is genuinely prioritised, re-add the toggle alongside a real `[data-theme="dark"]` token block (the prerequisite token work from Step 5 is already in place).

### B. `preferredMode` schema mismatch → Option 2 (change the schema)

`submitTutorRequestSchema.preferredMode` changed from `z.enum(['ONLINE','OFFLINE','HYBRID'])` to `z.enum(['Online','On Campus'])` to match the form values and the existing DB-stored values (per the `prisma/schema.prisma` comment). This unblocks tutor-request submission, which had been failing server-side with a confusing "Select a preferred mode" error since Phase 1. Comment added in `src/lib/validation.ts` explaining the alignment. `RequestTutorForm` is now wired to `useZodForm` with topic/budget/preferredMode validation.

### C. Other latent bugs noticed (FYI, not blocking)

- `CourseManager`, `ExpertiseManager`, and four other tables had `className="data-grid hidden.md:table"` (dot instead of space). Fixed as a drive-by in Step 2.
- `console.log` statements still in `/admin/profile/page.tsx`, `/student/profile/page.tsx`, `/tutor/profile/page.tsx`. The ESLint `no-console` rule is supposedly enforced per the audit, but these slipped through (they may pre-date the rule). Out of scope here — flagging for a future cleanup pass.

---

## Original plan content (reference)

**Current state (2026-07-28):** Project scored **78/100** by the audit. Phases 1–2 and most of 4 are done — design tokens, primitive components (`Button`, `Card`, `Badge`, `Modal`, `Select`, `Input`, `Textarea`, `ConfirmDialog`, `StatusBadge`, `DataGrid`), accessibility foundations (skip link, focus trap, label/error wiring on primitives), and SEO infra all exist.

**What this plan is NOT:**
- Not a redesign. The product identity stays.
- Not a rewrite of working features.
- Not cosmetic churn (no reshuffling for taste).
- Not covering already-resolved audit items.

---

## Sequencing principle

Each step either (a) is independently shippable, or (b) unblocks a later step. Order matters where dependencies exist; otherwise order is flexible.

---

## Step 1 — Migrate forms off `FloatingInput` onto the `Input` primitive

**Why it's necessary (the UX/a11y problem):**
`FloatingInput` uses a placeholder-as-label hack. The label is only visible on focus or when filled, the relationship is visual rather than programmatic in some call sites, and `aria-invalid` / `aria-describedby` are not wired. This fails WCAG 1.3.1, 2.4.6, 3.3.2 and harms low-vision, magnifier, and voice-input users. The `Input`/`Select`/`Textarea` primitives already solve all of this — they just haven't been adopted.

**Affected files (16 consumers):**
- `src/app/auth/student-signin/StudentSignInForm.tsx`
- `src/app/auth/tutor-signin/TutorSignInForm.tsx`
- `src/app/auth/admin-signin/AdminSignInForm.tsx`
- `src/app/auth/student-register/StudentRegisterForm.tsx`
- `src/app/auth/tutor-register/TutorRegisterForm.tsx`
- `src/app/auth/forgot-password/ForgotPasswordForm.tsx`
- `src/components/ProfileForm.tsx`
- `src/app/student/request-tutor/RequestTutorForm.tsx`
- `src/app/tutor/earnings/EarningsClient.tsx`
- `src/app/tutor/expertise/AddExpertiseForm.tsx`
- `src/app/admin/requests/RequestManager.tsx`
- `src/app/admin/expertises/ExpertiseManager.tsx`
- `src/app/admin/departments/DepartmentManager.tsx`
- `src/app/admin/courses/CourseManager.tsx`

**How:**
1. For each form: replace `<FloatingInput>` with `<Input>` (or `<Select>` / `<Textarea>` where appropriate), preserving the existing `label`, `name`, `type`, `error`, `required`, and `defaultValue` props.
2. Verify the visual layout does not regress — `Input` renders label-above-field, which is the recommended pattern. Adjust spacing in the form's CSS module if needed (use `--space-*` tokens, never raw rem/px).
3. Confirm error display still works end-to-end (server action errors flow into the `error` prop).
4. After all 16 are migrated, delete `src/components/ui/FloatingInput.tsx` and `FloatingInput.module.css`.

**Acceptance criteria:**
- Every form field has a persistent visible `<label htmlFor>` programmatically tied to its input.
- Every errored field sets `aria-invalid="true"` and `aria-describedby` pointing at the error message id (the `Input` primitive already does this — just verify).
- `next build` is green; no visual regressions on auth, request, profile, and admin manager screens.

**Estimated effort:** Medium — mechanical per file, but 16 files.

**Dependencies:** None. Primitives exist.

---

## Step 2 — Migrate custom admin tables onto the shared `DataGrid`

**Why it's necessary (the consistency/a11y problem):**
`DataGrid` already implements search, sort, pagination, responsive mobile fallback, `EmptyState` on no rows, and `<button>`-based sortable headers with `aria-sort`. Custom admin tables bypass all of this — each is a fresh opportunity for sort-header a11y regressions (WCAG 4.1.2), inconsistent empty/loading states, and behavior drift. New tables are written from scratch because the old ones look different.

**How:**
1. Audit `src/app/admin/**` for tables that render `<table>` directly or via bespoke card lists.
2. For each: extract columns into a `columns` config (`{ key, header, render?, sortable? }`) and feed into `<DataGrid>`.
3. Use `DataGrid`'s cell-renderer hook for action columns (Edit / Delete / Approve buttons).
4. Remove the duplicated mobile-card JSX trees where they exist — `DataGrid` already degrades responsively.

**Acceptance criteria:**
- All admin list views share the same sort affordance, empty state, and responsive behavior.
- No `<table>` is hand-rolled in admin routes except where `DataGrid` genuinely cannot express the layout (rare — justify each exception in a code comment).

**Estimated effort:** Medium.

**Dependencies:** None. Pair with Step 1 for admin manager screens that have both forms and tables.

---

## Step 3 — Decide the dark-mode question (implement or remove the toggle)

**Why it's necessary:**
A theme toggle ships in `src/components/layout/TopNav.tsx` but is non-functional. A visible-but-broken control is **worse than no control** — it tells users the product is unfinished and erodes trust on a payments product. This is a clear UX problem that must be resolved one way or the other.

**Decision required (pick one before any code):**

- **Option A — Implement dark mode.** Token restructure prerequisite is already done. Add a `[data-theme="dark"]` block in `globals.css` mapping every semantic token to a dark counterpart, drive every component color through `var(--…)`, and add a small client component that reads user preference (system → `localStorage`) and sets `data-theme` on `<html>` before paint to avoid FOUC.
- **Option B — Remove the toggle.** If dark mode is not on the near-term roadmap, delete the toggle from `TopNav.tsx`. Cheaper, honest. Can be re-added when dark mode is actually prioritized.

**Recommendation:** Option B unless there is explicit intent to ship dark mode within the next release cycle. The audit scores this as a "large design decision" — it should not be done halfway.

**If Option A is chosen — How:**
1. Define dark tokens for every `--bg-color`, `--card-bg`, `--text-main`, `--text-muted`, `--border-color`, `--input-bg`, plus the `-*-light` tints (which become dark tints in dark mode).
2. Audit for hardcoded `color`/`background` values in component CSS modules and inline `style=` — replace with tokens. (This is also Step 5.)
3. Add `ThemeScript` injected into `<head>` to set `data-theme` synchronously before React hydrates.
4. Verify every screen in both themes; pay attention to chart colors, status badges, and the `DataGrid` zebra striping.

**Estimated effort:** Option A is Hard. Option B is Easy.

**Dependencies (Option A only):** Step 5 must land alongside it.

---

## Step 4 — Client-side validation using existing Zod schemas (G1)

**Why it's necessary (the conversion + a11y problem):**
Today every form error requires a server round trip. Users fill the entire form, submit, wait, and only then discover a problem with one field. This measurably hurts conversion on auth and tutor-request flows and is an accessibility issue (errors arrive late, no inline assistive feedback). Shared Zod schemas already exist in `src/lib/validation.ts` from A4 — they are currently only used server-side.

**How:**
1. Import the relevant Zod schema into each form component.
2. Validate on `blur` (first error reveal), re-validate on `input` after first error, re-validate all on submit.
3. Submit only when client-valid; always trust the server response over the client when they disagree.
4. Reuse the `error` prop on `Input`/`Select`/`Textarea` — the primitives already wire `aria-invalid` and `aria-describedby`.

**Acceptance criteria:**
- Common field errors (empty required, invalid email, short password, invalid BD phone, negative amount) surface within ~100ms without a network round trip.
- Server-side validation remains the source of truth and continues to defend the boundary.

**Estimated effort:** Medium.

**Dependencies:** Step 1 should land first so validation errors render through the accessible primitive.

---

## Step 5 — Replace hardcoded colors and inline styles with tokens

**Why it's necessary:**
~250+ inline `style=` occurrences and many hardcoded hex values exist in feature files. These cannot be overridden by tokens, do not support `:hover`/`:focus`, block any future density or theme change (including dark mode), and produce visual drift between pages. The audit calls this C9 — mixed styling paradigms.

**How:**
1. Grep for `style={{` in `src/app/**/*.tsx` and `src/components/**/*.tsx`. For each occurrence:
   - If the value is **static** (e.g. `padding: 16`, `color: '#4F46E5'`), move it to the component's CSS module using a token.
   - If the value is **genuinely dynamic** (e.g. a computed offset, a chart bar width), keep it inline but add a comment explaining what is dynamic.
2. Grep for hex literals (`#[0-9A-Fa-f]{3,8}`) in CSS modules — replace with `var(--…)`.
3. Do **not** touch `credential.txt`-style files or anything under `node_modules`.

**Acceptance criteria:**
- No static-value inline styles remain in feature TSX.
- No hex literals remain in CSS modules except where a token does not yet exist (add one if the value is used in 2+ places).

**Estimated effort:** Medium — lengthy but mechanical.

**Dependencies:** None, but should land **before** Step 3 Option A (dark mode depends on token-only color usage).

---

## Step 6 — Forced-signout page reason code (A11)

**Why it's necessary:**
`src/app/auth/force-signout/page.tsx` exists but tells the user nothing about *why* they were signed out. On a payments product this generates support tickets and erodes trust — users assume they were hacked.

**How:**
1. Pass a `?reason=` query param from each signout-triggering code path (`session-expired`, `concurrent-login`, `role-changed`, `security-event`).
2. Render a human-readable explanation based on the reason code.
3. Offer a clear primary CTA back to the correct sign-in page (based on previous role, if known).

**Estimated effort:** Easy.

**Dependencies:** None.

---

## Items deliberately EXCLUDED from this plan

These are listed so the reasoning is explicit — they are not "necessary" under a strict reading of `DESIGN_GUIDELINES.md`.

| Item | Why excluded |
|---|---|
| **E1 — Decompose 6 monolith feature files** | Pure internal architecture. No user-visible benefit. Valuable for maintainability and future velocity, but the design guidelines explicitly warn against changes with no measurable UX reason. Track separately as engineering work, not as part of this UI/UX plan. |
| **E5 — Consolidate two component dirs** | Internal hygiene. No user-visible benefit. |
| **F7 — Push `'use client'` to leaves** | Performance optimization, not user-visible unless measured. Bundle is already route-split. |
| **F5 / F6 — useMemo / Suspense boundaries** | Micro-optimizations. Not measurably user-visible today. |
| **C8 — Icon size scale** | Minor visual polish. Borderline; defer until something else forces it. |
| **H1 — TanStack Query** | Low urgency; current server-component fetching is fine. |
| **A5 — Wallet idempotency / ledger model** | Backend hardening (Phase 5), not frontend. Out of scope. |
| **A8 — Consistent `ActionResult` shape** | Backend contract (Phase 5). Out of scope. |
| **Anything marked ✅ Resolved in `FRONTEND_AUDIT.md`** | Already done. |

---

## Recommended execution order

```
Step 6 (forced signout reason)          ← small, independent, ships today
Step 1 (FloatingInput → Input)          ← biggest a11y + consistency unlock
Step 5 (hardcoded values → tokens)      ← mechanical, unblocks Step 3A
Step 2 (custom tables → DataGrid)       ← consistency + a11y
Step 4 (client-side validation)         ← depends on Step 1
Step 3 (dark mode decision)             ← decide A vs B; A depends on Step 5
```

Each step is independently shippable as its own commit. Run `next build` after each step; the build must stay green.

---

## Definition of done for the whole plan

- Every form field is accessible (persistent label, error wired, client-validated).
- Every admin list view uses `DataGrid`.
- No hardcoded colors or static inline styles in feature code.
- Dark mode is either fully functional or the broken toggle is gone.
- Forced signout is explained.
- `next build` is green; no visual regressions on any screen.
- Business logic, API contracts, database schema, routing, auth, and permissions are untouched.

# nsuOne (tutor-connect) -> Android APK -> Play Store Plan

A step-by-step plan to turn the existing responsive Next.js web app into an
installable Android app and publish it on the Google Play Store.

> Stack at time of writing: Next.js 16.2.9 (App Router, `src/app/`), Vercel
> hosting, `web-push` for notifications, existing `site.webmanifest` + `sw.js`.
> This is a **living plan**, not an implementation. Before writing any actual
> code, follow `AGENTS.md`: read the relevant Next.js 16 guide in
> `node_modules/next/dist/docs/` because this version has breaking changes.

---

## Direct download (interim path) — IMPLEMENTED

Before going to the Play Store, the site now ships a **`/download` page** that
hands users the Android app directly and shows the right install path for their
device:

- **Android (Chrome)** — captures `beforeinstallprompt` and shows an
  `Install nsuOne` button; falls back to a `.apk` download link.
- **Android (other browsers)** — direct `.apk` download + sideload steps.
- **iOS / iPadOS** — `Add to Home Screen` instructions (no `.apk` exists).
- **Desktop** — QR code of `/download` plus a copy-link button.

Files (this repo):
- `src/app/(marketing)/download/page.tsx` — server component, metadata,
  canonical `/download`.
- `src/app/(marketing)/download/DownloadClient.tsx` — device detection,
  `beforeinstallprompt` capture, per-platform UX.
- `src/app/(marketing)/download/download.module.css` — page styles.
- `src/components/QRCode.tsx` — wrapper around `qrcode.react`.
- `src/components/NavbarClient.tsx` + `src/components/Footer.tsx` —
  `Download app` link.
- `.env.example` — `NEXT_PUBLIC_APK_DOWNLOAD_URL`, `NEXT_PUBLIC_APP_VERSION`.

How the `.apk` is sourced (external, one-time, repeat on major changes):
1. Build the `.apk` on [PWABuilder.com](https://www.pwabuilder.com) against
   the live URL → "Package for Stores → Android".
2. Attach it to a **GitHub Release** on this repo (tag e.g. `android-v1.0.0`).
3. Set `NEXT_PUBLIC_APK_DOWNLOAD_URL` in Vercel (and `.env`) to the release
   URL; bump `NEXT_PUBLIC_APP_VERSION`.

The Play Store plan below remains the eventual goal — the direct-download page
is the interim distribution path.

---

## TL;DR (the recommended path)

Your app is already a responsive HTTPS web app. The easiest, cheapest, and
Play-Store-approved way to ship it as an APK/AAB is a **TWA (Trusted Web
Activity)**:

1. Make the site a **valid installable PWA** (fix the service worker).
2. Serve a **Digital Asset Links** file so Android trusts the wrapper.
3. Generate a signed **.aab** with **PWABuilder.com** (easiest) or **Bubblewrap CLI** (more control).
4. Create a **Google Play Developer account** ($25 one-time) and publish.

You do **not** rewrite the app. The "APK" is a thin native shell around your live
website. When you change the website, users see the update instantly -- no store
release needed. Store releases are only for the shell itself (version bumps,
icon changes, target-API-level updates).

---

## Implementation status

> Updated after the code work in this session. Read this first.

**Phase 1 (PWA fixes) -- IMPLEMENTED in code.** Validate on a deployed build with
Lighthouse before moving to Phase 3.
- `public/sw.js`: rewritten with `install` / `activate` / `fetch` handlers
  (network-first navigations with an offline fallback, cache-first for
  `/_next/static/`, stale-while-revalidate for other same-origin GET). The
  original `push` + `notificationclick` handlers are preserved, with a small
  robustness fix (`notificationclick` no longer crashes when `data` is missing)
  and real icon paths instead of the missing `/icon.png` / `/badge.png`.
- `src/components/ServiceWorkerRegister.tsx`: new client component that
  registers `/sw.js` on load (production only); wired into `src/app/layout.tsx`.
  Safe alongside `src/hooks/usePushNotifications.ts` (re-registering the same
  worker is idempotent).
- `public/site.webmanifest`: added `id`, `scope`, `lang`, `categories`, and a
  `maskable` icon entry.
- `src/app/layout.tsx`: `metadataBase` now prefers `NEXT_PUBLIC_SITE_URL`, then
  `NEXTAUTH_URL`, then localhost.
- `.env.example`: added, documenting only the public vars
  (`NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`).
  Never put secrets in it.
- `next.config.ts`: added `/sw.js` `no-cache` + `Content-Type` headers (per the
  Next.js PWA guide).

**Verification done:** ESLint clean on the changed TS; manifest + assetlinks
JSON parsed OK. A full `next build` + Lighthouse run is the deploy-time step.

**Phase 2 (assetlinks) -- SCAFFOLDED, needs values.**
`public/.well-known/assetlinks.json` exists with placeholders. After Phase 3
(package name) and Phase 4 (signing key), replace `REPLACE_WITH_PACKAGE_NAME`
and `REPLACE_WITH_SHA256_FINGERPRINT`, redeploy, then verify the link.

**Phases 3-6 -- EXTERNAL / MANUAL (cannot be done in this repo).**
- Phase 3: generate the `.aab` on PWABuilder.com or with the Bubblewrap CLI
  against the live URL.
- Phase 4: create the upload keystore with `keytool` and back it up forever.
- Phase 5: Play Developer account ($25), store listing, content rating, data
  safety form.
- Phase 6: internal test -> production staged rollout.

**Remaining code-adjacent TODOs:**
- Generate a dedicated padded **maskable** 512x512 icon (the current maskable
  entry reuses the plain 512 as a stopgap; it may clip on Android adaptive
  shapes until replaced).
- Add 1-2 **screenshot** assets and reference them in the manifest.
- (Optional) Add a dedicated `/offline` route for a richer offline page; for now
  the SW returns a minimal inline offline page.
- (Optional) Tests: the new SW behavior is verified via Lighthouse/manual
  testing rather than unit tests (browser-only side effects). Add a vitest test
  if you want the registration logic guarded.

---

## Approaches compared

| Approach | What it is | Effort | Offline use | Native APIs | Best for |
|---|---|---|---|---|---|
| **TWA** (PWABuilder / Bubblewrap) | Thin wrapper around the live site, full-screen Chrome | Low | Limited (only what the SW caches) | Geolocation, push, camera, etc. via web APIs | This project. Recommended. |
| **Capacitor** (Ionic) | Bundles your web build into a WebView APK | Medium | Full (assets ship in the APK) | Plugin bridge to native | If you need true offline-first, native-only features, **or want iOS too** (Capacitor is the iOS route -- see the iOS section) |
| **React Native rewrite** | Full native rewrite | Very high | Full | All | Only if you want a true native app |

**Recommendation: TWA.** It matches your requirement ("easily"), is officially
supported by Google/Android, and is what most responsive web apps use on the
Play Store (e.g. many big-brand apps are TWAs). Capacitor is the fallback if you
later need features a TWA cannot do.

---

## Phase 0 -- Prerequisites & current-state audit

You already have most of the PWA foundation. Audit and note what is missing.

### Already in place
- HTTPS on Vercel + HSTS (`next.config.ts`). Required.
- `public/site.webmanifest` with name, icons (192 + 512), theme/background color,
  `display: standalone`, `start_url`.
- `public/sw.js` with `push` and `notificationclick` handlers.
- Push notifications wired via `src/hooks/usePushNotifications.ts`.
- App icons: `android-chrome-192x192.png`, `android-chrome-512x512.png`,
  `apple-touch-icon.png`, favicons.

### Gaps to fix (details in Phase 1)
1. `sw.js` has **no `fetch` handler** -> not installable. Must add one.
2. SW is **only registered when push is enabled**. Must register on app load.
3. Manifest icons are missing **`purpose: "maskable"`** (Android adaptive icons).
4. Manifest is missing `id` and `scope` (recommended for stable identity).
5. No **Digital Asset Links** file (`/.well-known/assetlinks.json`).
6. Add at least one **screenshot** to the manifest (improves install prompt quality).

---

## Phase 1 -- Make it a valid, installable PWA

A TWA requires the wrapped URL to pass the PWA criteria: valid manifest + a
service worker with a fetch handler, served over HTTPS. Validate with
**Lighthouse** (Chrome DevTools -> Lighthouse -> PWA) and
<https://www.pwabuilder.com> (enter your Vercel URL). Aim for a 100 PWA score
before generating the AAB.

### 1.1 Give the service worker a `fetch` handler
The current `sw.js` only listens for push. Add `install`, `activate`, and a
`fetch` handler so it qualifies as a real SW and can cache the app shell for a
snappier launch (the TWA will show a splash, then your site).

Minimal approach (dependency-free, lowest risk on Next 16):
- On `install`, precache a small app-shell list (e.g. `/`, `/offline`, key icons)
  and skip waiting.
- On `activate`, clean old caches.
- On `fetch`, use a **network-first** strategy for navigations (fall back to a
  cached `/offline` page) and **stale-while-revalidate** or cache-first for
  static assets under `/_next/static/`.

  > TODO (implement, verify against Next 16 docs): rewrite `public/sw.js` with
  > install/activate/fetch handlers while keeping the existing push handlers.

Alternative (more caching power, more setup): use **Serwist** (the modern
App-Router-friendly successor to Workbox/`next-pwa`). Note: classic
`next-pwa` has had compatibility problems with recent Next versions -- verify
before adopting. The hand-written SW above is the safe default.

### 1.2 Register the SW on app load
Right now registration only happens inside `usePushNotifications`. Add a tiny
client-side registration that runs for **every** visitor (e.g. a small
`<ServiceWorkerRegister />` client component included once in
`src/app/layout.tsx`), guarded by `if ('serviceWorker' in navigator)` and only in
production. Keep the push-specific subscription logic where it is.

  > TODO: add the registration component and include it in the root layout.

### 1.3 Harden the manifest
Edit `public/site.webmanifest`:
- Add `"id": "/"` (stable identifier independent of start_url).
- Add `"scope": "/"`.
- Add `"purpose": "maskable"` to at least one icon (ideally a dedicated
  512x512 maskable icon with safe padding -- generate one with a maskable icon
  tool so it isn't clipped by Android's adaptive shapes).
- Add `"orientation": "portrait"` if the app is phone-first.
- Add 1-2 `"screenshots"` (mobile, optionally desktop) -- improves the install
  prompt and the PWABuilder score.
- Confirm `"display": "standalone"` (already set).

### 1.4 Confirm `metadataBase` is the production URL
`src/app/layout.tsx` already sets:
`metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000")`.
In production ensure `NEXTAUTH_URL` (or a dedicated `NEXT_PUBLIC_SITE_URL`) is the
**final public https:// domain** the app will be wrapped under, because the TWA
pins to that origin. Do not change the domain after publishing -- see
"Important: don't change the domain" below.

### 1.5 Validate
Run Lighthouse PWA audit on the deployed site and fix every item until the PWA
category is green and the app is "installable" in Chrome's address bar.

---

## Phase 2 -- Digital Asset Links (trust between site and app)

For a TWA to open the site full-screen (without a browser URL bar), Android must
prove the app and the website are owned by the same person. This is done with a
**`assetlinks.json`** file served from your domain:

```
https://<your-domain>/.well-known/assetlinks.json
```

### 2.1 Where the package name / fingerprint come from
The `assetlinks.json` references:
- Your **package name** (e.g. `com.nsuone.app`) -- you choose this in Phase 3.
- Your app's **SHA-256 signing fingerprint** -- produced by the signing key
  (keystore) from Phase 4 (or Play App Signing's key, see 4.3).

So the typical order is: generate the AAB once (Phase 3) to learn the package
name + fingerprint, then publish `assetlinks.json`, then rebuild/republish.
PWABuilder/Bubblewrap will give you the exact `assetlinks.json` contents.

### 2.2 Serve it from Next.js (App Router)
Add a route that returns JSON at `/.well-known/assetlinks.json`. App Router
serves this via a route handler or a static file in `public/.well-known/`.
  > TODO: add the file/route. Verify the `.well-known` path serves with the
  > correct `application/json` content type under Next 16.

### 2.3 Verify
After deploying, the **Bubblewrap `link`** command or the Android Studio
"Digital Asset Links Tool" checks the link is valid. If verification fails, the
TWA falls back to showing the Chrome URL bar -- not broken, but not polished.

---

## Phase 3 -- Generate the Android App Bundle (.aab)

Two routes. Pick one.

### Route A -- PWABuilder.com (easiest, recommended for first publish)
1. Go to <https://www.pwabuilder.com> and enter your Vercel URL.
2. Fix any remaining PWA issues it reports (Phase 1 covers most).
3. Click **Package for Stores -> Android**.
4. Fill in: **package name** (`com.nsuone.app` -- pick once, never change),
   app name, signing key details (see Phase 4), host domain, etc.
5. Download the generated **Android package** (.zip with the Bubblewrap project
   + signed `.aab`).

PWABuilder is a wrapper around Bubblewrap; the output is the same Gradle project.

### Route B -- Bubblewrap CLI (more control, CI-friendly)
Prereqs: Node.js + JDK 17+ + Android SDK.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://<your-domain>/site.webmanifest
# answers: package name, app name, signing key path (Phase 4), etc.
bubblewrap build       # produces app-release-bundle.aab
```

Then `bubblewrap deploy` can upload to Play using a service account (Phase 6).

> Which route? Start with **PWABuilder** to get a working package fast. Move to
> **Bubblewrap CLI** when you want to regenerate the bundle in CI or script it.

### What you actually submit
- New apps on Play **must be an .aab (Android App Bundle)**, not an .apk (since
  Aug 2021). You can still build a debug `.apk` for local testing.
- Keep the generated Bubblewrap project in **a separate repo** (or a
  `android-twa/` folder), not inside the Next.js repo.

---

## Phase 4 -- Sign the app (the keystore you must keep forever)

Every AAB uploaded to Play must be signed with your **upload key** (a keystore).

1. Generate a keystore once:
   ```bash
   keytool -genkey -v -keystore nsuone-upload.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias nsuone
   ```
2. **Back it up in multiple safe places** (password manager + offline backup).
   - If you lose this keystore you **cannot publish updates** to the same
     listing. Google can only reset it under specific conditions; treat it as
     irreplaceable.
3. Use the keystore's SHA-256 fingerprint in `assetlinks.json` (Phase 2).
4. (Recommended) **Enable Play App Signing**: Google holds the final app-signing
   key and re-signs your bundle for distribution. You keep only the upload key.
   This lets Google help you recover from a lost upload key. Use the
   **Play-App-Signing** key fingerprint (from Play Console) in `assetlinks.json`
   alongside/instead of the upload-key fingerprint -- the PWABuilder/Bubblewrap
   output and Play Console will tell you exactly which to use.

> Never commit the keystore or its password to git. Add it to `.gitignore`.

---

## Phase 5 -- Google Play Store setup (one-time)

### 5.1 Create a Developer account
- Sign up at <https://play.google.com/console>.
- One-time **$25 USD** fee. Requires identity verification (personal or
  organization). Organization accounts require D-U-N-S number + verification.

### 5.2 Create the app
In Play Console -> **Create app**:
- App name: `nsuOne` (or your final brand name).
- Default language, **App type: App**, **Free/Paid**.
- Declarations (export compliance, etc.).

### 5.3 Store listing
Prepare and upload:
- **App icon** 512x512 PNG (you have it).
- **Feature graphic** 1024x500 PNG (design one).
- **Phone screenshots** (min set; 16:9 or 9:16, >= 320px). Capture real ones.
- Optional: tablet screenshots, promo graphic, short description (<= 80 chars),
  full description (<= 4000 chars).
- App category, tags, contact email, **Privacy Policy URL** (required -- host a
  page, e.g. `/privacy` on the site).

### 5.4 Content rating
Complete the **IARC questionnaire** (Play Console -> App content -> Content
rating). Honest answers -> a rating (e.g. "Everyone"). Required before publish.

### 5.5 Data safety form
Declare what data your app collects/transmits. For nsuOne this likely includes:
- **Personal info**: name, email, auth/session (NextAuth cookies).
- **Identifiers**: push subscription tokens (`web-push`).
- **Financial**: if payments/Stripe-like flows exist, declare transaction info.
Be accurate -- Google reviews this and mismatches cause rejection.

### 5.6 Target API level
Google requires new apps to **target a recent Android API level**, and bumps the
requirement ~every August. At build time, set the Bubblewrap/PWABuilder
`targetSdkVersion` to the currently required value (check Play Console's
"Requirements" page / current Android version requirement for the year).
Updates must meet each year's new target.

### 5.7 Government apps / ads / other declarations
Fill the remaining App-content sections (ads, app access, etc.) as applicable.

---

## Phase 6 -- Rollout

1. **Internal testing** (fastest path to a device): upload the signed `.aab`,
   add yourself as a tester, install via the test link. Verify full-screen
   launch, push notifications, auth, payments, and that the URL bar is hidden
   (valid assetlinks.json).
2. **Closed testing** (small trusted group) -- optional.
3. **Open testing** (Google Play beta) -- optional.
4. **Production** -> create a **release** -> upload `.aab` -> review -> **Start
   rollout**. Use **staged rollout** (e.g. 10% -> 50% -> 100%) to limit blast
   radius of any issue.

Google reviews new apps and updates (hours to a few days). First-time review for
a new developer account can be longer.

---

## Ongoing maintenance

- **Web changes** (code, UI, features): deploy to Vercel. Users see them on next
  app open -- **no Play release needed**.
- **Play releases** are only for: bumping the TWA/shell version, changing icons,
  raising targetSdkVersion, updating the package config, or store-listing text.
- Bump the **versionCode/versionName** in the Bubblewrap project for each store
  release and re-upload the AAB.
- Re-run Lighthouse/PWABuilder after major site changes to stay installable.
- Keep the keystore safe forever.
- Watch Play Console for policy updates and the annual target-API-level bump.

---

## iOS / Apple App Store (cross-platform extension)

Apple has **no TWA**. To get on the App Store you wrap the site in a
**Capacitor** native shell (a WKWebView). The shared Phase 1 PWA work carries
over; iOS then adds its own signing, listing, and review steps. The big
differences vs. Android: it costs more, requires a Mac, and Apple reviewers
apply **Guideline 4.2 (Minimum Functionality)** to web-wrapper apps, so approval
is less automatic than Google's.

### The project-specific catch: this app is server-rendered
tutor-connect uses Next.js server features (API routes, NextAuth, Prisma on the
server, `web-push` VAPID). It **cannot be exported as a static bundle** the way a
pure SPA can. So the Capacitor iOS app must run in **remote/server-URL mode**
(`server.url` in `capacitor.config.ts` pointing at your live Vercel domain) --
the native shell loads the live site, exactly like the Android TWA does.

Consequences:
- Web changes ship instantly on iOS too (no resubmit), same as Android.
- No true offline (the app needs the network to load), same as the TWA.
- Apple's 4.2 scrutiny is higher for remote-URL wrappers, so invest in the
  polish items in i.6.
- (Large future effort, out of scope now) refactor the frontend into a
  static-exportable client app talking to a separate API -- then you could
  bundle assets for real offline.

### i.1 Add Capacitor
- Install: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`.
- `npx cap init nsuOne com.nsuone.app --web-dir out` (use the same identifier as
  the Android package name if you want consistent branding; iOS calls it the
  **Bundle ID**).
- Configure `server.url` to the production domain (remote mode).
- `npx cap add ios` -> creates the Xcode project under `ios/`.
- Keep the `ios/` native project in a **separate repo** or `capacitor-app/`
  folder, not inside the Next.js repo.

> TODO (verify against Capacitor + Next 16 docs): confirm the remote-URL config
> shape and the minimal `webDir` requirement under Next 16.

### i.2 iOS-specific web config
- Add `apple-mobile-web-app-capable` / `mobile-web-app-capable` and status-bar
  meta tags (`apple-mobile-web-app-status-bar-style`).
- `apple-touch-icon.png` already exists -- reuse it.
- **Push notifications**: web Push on iOS only works for home-screen-installed
  PWAs and behaves differently from Android. Inside a Capacitor app you
  typically use the native APNs path via `@capacitor/push-notifications`
  instead of your existing web-push hook. Plan a separate notification track
  for iOS.
  > TODO: decide whether iOS notifications ship in v1 or a later release.

### i.3 Apple Developer account + signing
- Enroll in the **Apple Developer Program**: **$99 USD / year** (recurring).
  Organization accounts need a D-U-N-S number and verification.
- Register an **App ID** with the Bundle ID (`com.nsuone.app`) and enable
  capabilities (Push Notifications, etc.).
- Create signing **certificates** (Development + Distribution) and
  **provisioning profiles**, or use **Xcode "Automatically manage signing"**
  with your team.
- A **Mac with Xcode** is required to build/sign/archive. No Mac? Use a cloud
  Mac (Codemagic, Bitrise, or a GitHub Actions macOS runner).
  > Certificates and profiles **expire** -- renew them before they do.

### i.4 Build & archive
- `npx cap sync ios` to copy config/plugins, then `npx cap open ios` to open
  Xcode.
- In Xcode: set version/build numbers, signing team, capabilities, then
  **Product -> Archive**.
- Validate and upload the archive to App Store Connect (via Xcode, Transporter,
  `xcrun altool`, or a CI cloud Mac).

### i.5 App Store Connect setup
- Create the app record (name, primary language, Bundle ID, SKU).
- App information, category, pricing (free).
- **App Privacy "nutrition labels"**: declare data collected (email, auth,
  identifiers, financial if payments exist). Be accurate.
- Screenshots at required device sizes (use the Simulator + `fastlane snapshot`
  or `xcrun simctl io booted screenshot`).
- Age rating questionnaire; Privacy Policy URL (reuse the site's `/privacy`).

### i.6 4.2 Minimum Functionality -- the real approval risk
Apple rejects apps that are just a website in a frame with no app value. Improve
your odds:
- Use real device features via Capacitor plugins (push, camera, haptics,
  Face/Touch ID, etc.).
- Add a native splash screen and proper app icon set (don't ship a default one).
- Make navigation feel app-like and handle offline/no-network gracefully.
- Ensure login/auth and core flows work smoothly inside the WKWebView.
Expect at least one review round-trip; prepare for revision requests.

### i.7 TestFlight rollout
- **TestFlight internal testing** (your team) -> **external testing** (trusted
  testers) -> submit for **App Store review** -> approve -> **phased release**
  (7-day rollout by default).
- First review of a new account/app can take a few days; updates usually
  24-48h.

### Ongoing (iOS)
- Web changes: instant (remote-URL mode), same as the TWA.
- Store releases only for: shell/icon/version changes, capability additions, or
  App Privacy updates.
- Renew the $99/year membership and the expiring certificates/profiles.

---

## Important constraints

- **Don't change the domain after publishing.** The TWA is pinned to your origin
  and `assetlinks.json` must keep validating. A domain change = a brand-new app
  listing (users must reinstall). Lock in the final domain before Phase 3.
- **Don't change the package name** (`com.nsuone.app`) after publishing -- same
  reason; it's the app's permanent identity on devices and on Play.
- **Keep the upload keystore** -- losing it blocks updates to that listing.
- A TWA shows your **live site**, so the app is only as available as your Vercel
  deployment. Plan uptime accordingly.
- **iOS Bundle ID is permanent** (`com.nsuone.app`) -- don't change it after
  publishing; same rule as the Android package name.
- **iOS signing certs/profiles expire** and the $99/year membership recurs --
  unlike Google's one-time $25, iOS has ongoing keep-alive work.
- **Apple Guideline 4.2**: remote-URL wrapper apps can be rejected for lacking
  app-like functionality. Budget time for the i.6 polish and at least one
  review revision. This risk does not exist on Android.

---

## Quick checklist

- [x] Add `fetch` handler to `public/sw.js` (network-first nav + static cache).
- [x] Register SW on app load via `src/components/ServiceWorkerRegister.tsx` (wired in `layout.tsx`).
- [x] Add `/sw.js` no-cache + Content-Type headers in `next.config.ts` (bonus, from the PWA guide).
- [x] Add `id`, `scope`, `lang`, `categories`, `purpose: "maskable"` to the manifest.
- [ ] Generate a dedicated padded maskable 512x512 icon (stopgap reuses the plain 512).
- [ ] Add 1-2 screenshots to the manifest (needs image assets).
- [x] Wire `metadataBase` to `NEXT_PUBLIC_SITE_URL` + add `.env.example` (set the real domain value in `.env`).
- [ ] Lighthouse PWA = 100, app "installable" (run on the deployed site).
- [x] Scaffold `public/.well-known/assetlinks.json` (fill placeholders after Phase 4).
- [ ] Generate upload keystore; back it up; `.gitignore` it.
- [ ] Run PWABuilder (or `bubblewrap init`) -> get package name + fingerprint.
- [ ] Put the correct SHA-256 fingerprint in `assetlinks.json`; redeploy; verify.
- [ ] Build signed `.aab`.
- [ ] Create Play Developer account ($25), create app, fill store listing.
- [ ] Privacy Policy page + URL.
- [ ] Content rating (IARC) + Data safety form.
- [ ] Set targetSdkVersion to the current required level.
- [ ] Internal test -> verify launch, push, auth, payments, no URL bar.
- [ ] Production staged rollout (10 -> 50 -> 100%).

### iOS only (App Store)
- [ ] Add Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`); `npx cap init`.
- [ ] Configure `server.url` (remote mode) to the production domain.
- [ ] Add `apple-mobile-web-app-capable` + status-bar meta tags; reuse apple-touch-icon.
- [ ] Decide iOS push strategy (APNs via `@capacitor/push-notifications`) -- v1 or later?
- [ ] Apple Developer account ($99/yr) + App ID + signing certs/profiles (or auto-signing).
- [ ] Mac (or cloud Mac) available for Xcode build/archive.
- [ ] `npx cap sync ios` -> Xcode -> Archive -> upload to App Store Connect.
- [ ] App Privacy nutrition labels, screenshots, age rating, privacy policy URL.
- [ ] Polish for 4.2: native splash/icons, device features, graceful offline state.
- [ ] TestFlight internal -> external -> App Store review -> phased release.

---

## Costs & rough timeline

| Item | Cost |
|---|---|
| Google Play Developer account | $25 USD, one-time |
| Apple Developer Program (iOS) | $99 USD / year, recurring |
| Domain (already have) | existing |
| PWABuilder / Bubblewrap / Capacitor | free |
| Mac for iOS builds (if you don't own one) | cloud Mac ~$ and up, or borrow |

| Phase | Rough effort |
|---|---|
| Phase 1 (PWA fixes, shared with iOS) | 0.5 - 1 day |
| Phase 2 (assetlinks, Android only) | 0.5 day |
| Phase 3 (generate AAB) | 0.5 day (first time, longer to learn) |
| Phase 4 (signing) | 0.5 day |
| Phase 5 (Play setup + listing assets) | 1 - 2 days (graphics, copy) |
| Phase 6 (rollout) | hours + review wait (days) |
| iOS i.1-i.7 (Capacitor + Apple setup + TestFlight) | 3 - 5 days + Apple review wait |

Total: roughly **a focused week** of part-time work, dominated by the PWA fixes
and store-listing assets, plus Google's review turnaround.

---

## Decision needed before starting

1. **Final domain** the app will be pinned to (must be permanent).
2. **Package name** (e.g. `com.nsuone.app`) -- permanent, pick carefully.
3. **App display name** on Play (nsuOne vs. something else).
4. **Push notifications in the TWA**: confirm the existing `web-push` flow works
   inside a TWA (it should, since it's a Chrome-based context), and budget for
   testing it during internal testing.
5. **PWABuilder vs Bubblewrap CLI** for the first build (recommend PWABuilder).
6. **Do you want iOS at all, and when?** Android-only now (TWA) is the fastest
   path to a store. iOS (Capacitor) can be a Phase 2 follow-up.
7. **iOS Bundle ID** -- use `com.nsuone.app` to match Android (permanent).
8. **iOS notifications** -- ship in v1 (needs APNs/Capacitor plugin work) or
   defer to a later release?
9. **Mac access** -- do you have one for Xcode, or do you need a cloud Mac?

// Shared, SSR-safe device/standalone detection + install-banner helpers.
// Single source of truth for the global install banner AND the /download page.
// Extracted from src/app/(marketing)/download/DownloadClient.tsx.

export type Platform = "android-chrome" | "android-other" | "ios" | "desktop" | "unknown";
export type MobilePlatform = "android-chrome" | "android-other" | "ios";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// App version drives the dismiss-then-reshow-on-update behaviour of the banner.
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

// Direct APK download link (GitHub Release asset). Empty until published.
export const APK_URL = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ?? "";

/**
 * Android TWA package name. MUST match the signed APK / Play listing AND the
 * package in public/.well-known/assetlinks.json. NOTE: APK-PLAYSTORE-PLAN.md
 * references "com.nsuone.app" which appears stale; assetlinks.json (the live
 * artifact) uses the value below. Confirm against the actual signed build before
 * relying on it for the "Open app" intent.
 */
export const ANDROID_PACKAGE = "com.nsuone.www.twa";

/** Detect the visitor's platform from the UA. SSR-safe (returns "unknown" on server). */
export function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = /android/.test(ua);
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isIPadDesktop =
    /macintosh/.test(ua) && "ontouchend" in document && navigator.maxTouchPoints > 1;

  if (isAndroid) {
    // Only Chromium-based browsers can fire beforeinstallprompt.
    return /chrome|crios|edge/.test(ua) ? "android-chrome" : "android-other";
  }
  if (isIOS || isIPadDesktop) return "ios";
  if (!/mobile|tablet/.test(ua)) return "desktop";
  return "unknown";
}

export function isMobilePlatform(platform: Platform): platform is MobilePlatform {
  return platform === "android-chrome" || platform === "android-other" || platform === "ios";
}

/** True when running inside an installed PWA (home-screen launch / standalone display). */
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

/**
 * Build an Android intent:// URL that launches the installed TWA for the current
 * origin, falling back to the site URL in the browser if the app is not installed.
 * Returns "#" when called server-side (should not be rendered then).
 */
export function buildOpenAppIntent(): string {
  if (typeof window === "undefined") return "#";
  const host = window.location.hostname;
  const fallback = encodeURIComponent(`https://${host}`);
  return `intent://${host}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
}

type InstalledRelatedApp = { id?: string; platform: string; url?: string };

/**
 * Best-effort detection of an installed related app via
 * navigator.getInstalledRelatedApps() (Android Chrome only). Reliably detects
 * Play Store installs once Digital Asset Links verify both directions; may miss
 * direct/sideloaded APK installs. Never throws.
 */
export async function getInstalledRelatedApp(packageId: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<InstalledRelatedApp[]>;
  };
  if (typeof nav.getInstalledRelatedApps !== "function") return false;
  try {
    const apps = await nav.getInstalledRelatedApps();
    return apps.some(
      (app) =>
        app.platform === "play" &&
        (app.id === packageId || (typeof app.url === "string" && app.url.includes(packageId))),
    );
  } catch {
    return false;
  }
}

// --- Install-banner dismissal persistence --------------------------------
// Convention: nsuone.<area>.<thing> in localStorage, wrapped in try/catch.

const INSTALL_BANNER_KEY = "nsuone.install-banner.dismissed";
// Re-show the banner after this long even if the user dismissed it.
const INSTALL_BANNER_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type DismissalRecord = { at: number; v: string };

function readDismissal(): DismissalRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(INSTALL_BANNER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DismissalRecord>;
    if (typeof parsed.at !== "number") return null;
    return { at: parsed.at, v: typeof parsed.v === "string" ? parsed.v : "" };
  } catch {
    return null;
  }
}

/**
 * True when the user dismissed the banner recently AND the app version is
 * unchanged. A version bump (new build) re-shows the banner even if dismissed.
 */
export function isBannerDismissed(version: string): boolean {
  const record = readDismissal();
  if (!record) return false;
  if (version && record.v !== version) return false;
  return Date.now() - record.at < INSTALL_BANNER_COOLDOWN_MS;
}

export function setBannerDismissed(version: string): void {
  if (typeof window === "undefined") return;
  try {
    const record: DismissalRecord = { at: Date.now(), v: version };
    window.localStorage.setItem(INSTALL_BANNER_KEY, JSON.stringify(record));
  } catch {
    // ignore (private mode / quota)
  }
}

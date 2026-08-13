"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, Download, ExternalLink, Smartphone, X } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import {
  ANDROID_PACKAGE,
  APK_URL,
  APP_VERSION,
  buildOpenAppIntent,
  detectPlatform,
  getInstalledRelatedApp,
  isBannerDismissed,
  isMobilePlatform,
  isRunningStandalone,
  setBannerDismissed,
  type MobilePlatform,
  type Platform,
} from "@/lib/platform";
import { useBeforeInstallPrompt } from "@/hooks/useBeforeInstallPrompt";
import s from "./GlobalInstallBanner.module.css";

// Routes where an install prompt would be noise. The /download page already has
// its own banner; auth flows and the authenticated app shells should stay clean.
const SUPPRESSED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/api",
  "/auth",
  "/settings",
  "/notifications",
  "/download",
];

export default function GlobalInstallBanner() {
  const pathname = usePathname();
  const { toast } = useToast();
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [appInstalled, setAppInstalled] = useState(false);

  // Runs after hydration: detect platform, standalone mode, and any prior
  // dismissal. All three are set in one effect so there is no banner flash.
  useEffect(() => {
    setPlatform(detectPlatform());
    setStandalone(isRunningStandalone());
    setDismissed(isBannerDismissed(APP_VERSION));
  }, []);

  // Best-effort "is the native app already installed?" (Android Chrome only).
  useEffect(() => {
    if (platform !== "android-chrome") return;
    let active = true;
    getInstalledRelatedApp(ANDROID_PACKAGE)
      .then((installed) => {
        if (active) setAppInstalled(installed);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [platform]);

  const { installEvent, promptInstall } = useBeforeInstallPrompt(platform);

  function handleDismiss() {
    setBannerDismissed(APP_VERSION);
    setDismissed(true);
  }

  async function handleInstall() {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toast.success("Install started. Check your home screen when it finishes.");
      handleDismiss();
    }
  }

  function handleApkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!APK_URL) {
      event.preventDefault();
      toast.error("The Android build isn't published yet. Check back soon.");
      return;
    }
    toast.info(
      "Download starting. If nothing happens, enable installs from unknown sources.",
    );
  }

  const suppressed =
    !!pathname &&
    SUPPRESSED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));

  // SSR and the first client render evaluate platform === "unknown" (not mobile),
  // so the banner never renders during SSR -> no hydration mismatch. It appears
  // only after the effect above confirms a mobile, non-standalone, non-dismissed
  // visitor on a public route.
  if (!isMobilePlatform(platform) || standalone || dismissed || suppressed) {
    return null;
  }

  const mobile = platform as MobilePlatform;
  const isAndroid = mobile !== "ios";
  const message = isAndroid
    ? "Get a faster, full-screen app."
    : "Add to Home Screen for a native feel.";

  return (
    <section className={s.banner} role="region" aria-label="Install nsuOne">
      <span className={s.icon} aria-hidden="true">
        <Smartphone size={20} />
      </span>

      <div className={s.body}>
        <strong className={s.title}>Install nsuOne</strong>
        <span className={s.message}>{message}</span>
      </div>

      {isAndroid ? (
        appInstalled ? (
          <a className={s.cta} href={buildOpenAppIntent()}>
            <ExternalLink size={15} aria-hidden="true" />
            Open
          </a>
        ) : installEvent ? (
          <button type="button" className={s.cta} onClick={handleInstall}>
            <Download size={15} aria-hidden="true" />
            Install
          </button>
        ) : (
          <a
            className={s.cta}
            href={APK_URL || "/download"}
            onClick={handleApkClick}
            {...(APK_URL ? { download: true } : {})}
          >
            <Download size={15} aria-hidden="true" />
            Download
          </a>
        )
      ) : (
        <a className={s.cta} href="/download">
          Steps
          <ChevronRight size={15} aria-hidden="true" />
        </a>
      )}

      <button
        type="button"
        className={s.close}
        onClick={handleDismiss}
        aria-label="Dismiss install banner"
      >
        <X size={16} />
      </button>
    </section>
  );
}

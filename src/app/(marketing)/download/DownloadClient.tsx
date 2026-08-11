"use client";

import { useEffect, useState } from "react";
import { Download, Share, Plus, Copy, Check, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import QRCode from "@/components/QRCode";
import s from "./download.module.css";

type Platform = "android-chrome" | "android-other" | "ios" | "desktop" | "unknown";

// `beforeinstallprompt` is not in the default DOM lib types — declare a minimal
// shape so TS is happy without pulling in @types that may not match.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const APK_URL = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ?? "";
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = /android/.test(ua);
  const isIOS = /iphone|ipad|ipod/.test(ua);
  // iPadOS 13+ reports as Mac, but has no mouse pointer + multi-touch.
  const isIPadDesktop =
    /macintosh/.test(ua) && "ontouchend" in document && navigator.maxTouchPoints > 1;

  if (isAndroid) {
    return /chrome|crios|edge/.test(ua) ? "android-chrome" : "android-other";
  }
  if (isIOS || isIPadDesktop) return "ios";
  // Anything else with a fine pointer + not mobile → desktop.
  if (!/mobile|tablet/.test(ua)) return "desktop";
  return "unknown";
}

export default function DownloadClient() {
  const { toast } = useToast();
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [copied, setCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  // Detect platform once on mount (SSR-safe).
  useEffect(() => {
    setPlatform(detectPlatform());
    setPageUrl(window.location.href.split("#")[0]);
  }, []);

  // Capture the Android-Chrome install prompt so we can trigger it from our
  // own button instead of relying on the browser's timing.
  useEffect(() => {
    if (platform !== "android-chrome") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [platform]);

  async function handleInstallClick() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      toast.success("Install started — check your home screen when it finishes.");
    }
    setInstallEvent(null);
  }

  function handleApkClick() {
    if (!APK_URL) {
      toast.error("The Android build isn't published yet. Check back soon.");
      return;
    }
    toast.info("Download starting… If nothing happens, enable installs from unknown sources.");
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      toast.success("Link copied — open it on your phone.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically. Long-press the URL in your address bar.");
    }
  }

  // Don't flash platform-specific UI during SSR/first paint.
  if (platform === "unknown") {
    return (
      <div className={s.body}>
        <ApkNote />
      </div>
    );
  }

  return (
    <div className={s.body}>
      {platform === "android-chrome" && (
        <AndroidChromeBlock
          canInstall={!!installEvent}
          onInstall={handleInstallClick}
          onApk={handleApkClick}
        />
      )}

      {platform === "android-other" && <AndroidOtherBlock onApk={handleApkClick} />}

      {platform === "ios" && <IosBlock />}

      {platform === "desktop" && (
        <DesktopBlock url={pageUrl} copied={copied} onCopy={handleCopyLink} />
      )}

      <ApkNote />
    </div>
  );
}

function AndroidChromeBlock({
  canInstall,
  onInstall,
  onApk,
}: {
  canInstall: boolean;
  onInstall: () => void;
  onApk: () => void;
}) {
  return (
    <section className={s.platformBlock}>
      <h2 className={s.blockTitle}>Install on Android</h2>
      {canInstall ? (
        <>
          <button
            type="button"
            onClick={onInstall}
            className={`btn-primary ${s.primaryBtn}`}
          >
            <Download size={18} aria-hidden="true" />
            Install nsuOne
          </button>
          <p className={s.hint}>
            Adds the app to your home screen. No Play Store visit required.
          </p>
        </>
      ) : (
        <a
          href={APK_URL || "#"}
          onClick={onApk}
          className={`btn-primary ${s.primaryBtn}`}
          download
        >
          <Download size={18} aria-hidden="true" />
          Download the Android app
        </a>
      )}
      <details className={s.fallback}>
        <summary>Prefer the .apk file?</summary>
        <p className={s.hint}>
          {APK_URL ? (
            <>
              <a href={APK_URL} onClick={onApk} download>
                Download .apk directly
              </a>{" "}
              — you may need to allow &ldquo;install unknown apps&rdquo; for your
              browser in Settings.
            </>
          ) : (
            <>The standalone .apk isn&rsquo;t published yet.</>
          )}
        </p>
      </details>
    </section>
  );
}

function AndroidOtherBlock({ onApk }: { onApk: () => void }) {
  return (
    <section className={s.platformBlock}>
      <h2 className={s.blockTitle}>Install on Android</h2>
      <a
        href={APK_URL || "#"}
        onClick={onApk}
        className={`btn-primary ${s.primaryBtn}`}
        download
      >
        <Download size={18} aria-hidden="true" />
        Download the .apk
      </a>
      <ol className={s.steps}>
        <li>Open the downloaded file.</li>
        <li>
          If asked, allow <strong>install unknown apps</strong> for your browser
          in Settings.
        </li>
        <li>Tap Install.</li>
      </ol>
    </section>
  );
}

function IosBlock() {
  return (
    <section className={s.platformBlock}>
      <h2 className={s.blockTitle}>Add to Home Screen (iPhone / iPad)</h2>
      <p className={s.hint}>
        iOS doesn&rsquo;t support Android apps, but nsuOne works great as a
        home-screen web app — full-screen, with its own icon.
      </p>
      <ol className={s.steps}>
        <li>
          <Share size={16} aria-hidden="true" /> Tap the <strong>Share</strong>{" "}
          icon in Safari&rsquo;s toolbar.
        </li>
        <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
        <li>
          <Plus size={16} aria-hidden="true" /> Tap <strong>Add</strong>.
        </li>
      </ol>
    </section>
  );
}

function DesktopBlock({
  url,
  copied,
  onCopy,
}: {
  url: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section className={s.platformBlock}>
      <h2 className={s.blockTitle}>Get it on your phone</h2>
      <p className={s.hint}>
        Scan the code below with your phone camera to open this page on mobile.
      </p>
      <div className={s.qrWrap}>
        {url ? (
          <QRCode value={url} size={176} />
        ) : (
          <div className={s.qrPlaceholder} aria-hidden="true" />
        )}
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={`btn-secondary ${s.copyBtn}`}
      >
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {copied ? "Copied" : "Copy this page link"}
      </button>
    </section>
  );
}

function ApkNote() {
  return (
    <div className={s.note}>
      <ChevronRight size={14} aria-hidden="true" />
      <span>
        The Android app is the same site you&rsquo;re looking at now, wrapped to
        launch full-screen. Web updates appear instantly — no reinstall needed.
        {APP_VERSION && (
          <>
            {" "}
            <span className={s.version}>Current build: v{APP_VERSION}</span>
          </>
        )}
      </span>
    </div>
  );
}

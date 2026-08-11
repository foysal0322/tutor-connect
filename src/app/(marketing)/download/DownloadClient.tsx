"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Share,
  Plus,
  Copy,
  Check,
  Smartphone,
  Zap,
  Shield,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
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

const FEATURES = [
  {
    icon: Zap,
    title: "Instant",
    blurb: "Loads in under a second",
  },
  {
    icon: Smartphone,
    title: "Full-screen",
    blurb: "Native-feeling, no browser chrome",
  },
  {
    icon: RefreshCw,
    title: "Always up to date",
    blurb: "New features land automatically",
  },
  {
    icon: Shield,
    title: "Lightweight",
    blurb: "Tiny install, easy on storage",
  },
] as const;

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

  return (
    <div className={s.body}>
      <Hero
        platform={platform}
        url={pageUrl}
        copied={copied}
        onCopy={handleCopyLink}
      />

      <FeatureStrip />

      {/* Platform-specific CTA block. Desktop's CTA lives in the hero (QR). */}
      {platform === "android-chrome" && (
        <AndroidChromeBlock
          canInstall={!!installEvent}
          onInstall={handleInstallClick}
          onApk={handleApkClick}
        />
      )}

      {platform === "android-other" && <AndroidOtherBlock onApk={handleApkClick} />}

      {platform === "ios" && <IosBlock />}

      <ApkNote />
    </div>
  );
}

function Hero({
  platform,
  url,
  copied,
  onCopy,
}: {
  platform: Platform;
  url: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const label = platformLabel(platform);

  return (
    <header className={s.hero}>
      <div className={s.heroContent}>
        <span className={s.badge}>
          <span className={s.badgeDot} aria-hidden="true" />
          {label}
        </span>
        <h1 className={s.title}>
          Get the <span className={s.titleAccent}>nsuOne</span> app
        </h1>
        <p className={s.subtitle}>
          Faster, full-screen, and built for your phone. Install in seconds — no app
          store detour required.
        </p>
      </div>

      {platform === "desktop" ? (
        <QrFocus url={url} copied={copied} onCopy={onCopy} />
      ) : (
        <PhoneMockup />
      )}
    </header>
  );
}

function QrFocus({
  url,
  copied,
  onCopy,
}: {
  url: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className={s.qrFocus}>
      <div className={s.qrFocusFrame}>
        <span /><span /><span /><span />
        <div className={s.qrFocusInner}>
          {url ? (
            <QRCode value={url} size={220} />
          ) : (
            <div className={s.qrPlaceholder} aria-hidden="true" />
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={`btn-secondary ${s.copyBtn}`}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Copied" : "Copy link instead"}
      </button>
    </div>
  );
}

function platformLabel(platform: Platform): string {
  switch (platform) {
    case "android-chrome":
    case "android-other":
      return "Android detected";
    case "ios":
      return "iPhone / iPad detected";
    case "desktop":
      return "Desktop — send to your phone";
    default:
      return "Install nsuOne";
  }
}

function PhoneMockup() {
  return (
    <div className={s.phoneWrap} aria-hidden="true">
      <div className={s.phone}>
        <div className={s.phoneNotch} />
        <div className={s.phoneScreen}>
          <div className={s.phoneAppIcon}>
            <Smartphone size={28} />
          </div>
          <div className={s.phoneAppName}>nsuOne</div>
          <div className={s.phoneAppTag}>Campus marketplace</div>

          <div className={s.phoneTileRow}>
            <div className={s.phoneTile} />
            <div className={s.phoneTile} />
          </div>
          <div className={s.phoneTileRow}>
            <div className={s.phoneTile} />
            <div className={s.phoneTile} />
          </div>

          <div className={s.phoneFAB}>
            <Download size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureStrip({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={`${s.features} ${compact ? s.featuresCompact : ""}`}>
      {FEATURES.map(({ icon: Icon, title, blurb }) => (
        <li key={title} className={s.feature}>
          <span className={s.featureIcon}>
            <Icon size={18} aria-hidden="true" />
          </span>
          <span className={s.featureText}>
            <span className={s.featureTitle}>{title}</span>
            <span className={s.featureBlurb}>{blurb}</span>
          </span>
        </li>
      ))}
    </ul>
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
      <BlockHeader
        icon={<Download size={18} />}
        title="Install on Android"
        hint="Adds the app to your home screen. No Play Store visit required."
      />
      {canInstall ? (
        <button
          type="button"
          onClick={onInstall}
          className={`btn-primary btn-lg ${s.primaryBtn}`}
        >
          <Download size={18} aria-hidden="true" />
          Install nsuOne
        </button>
      ) : (
        <a
          href={APK_URL || "#"}
          onClick={onApk}
          className={`btn-primary btn-lg ${s.primaryBtn}`}
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
              <a href={APK_URL} onClick={onApk} download className={s.inlineLink}>
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
      <BlockHeader
        icon={<Download size={18} />}
        title="Install on Android"
        hint="Your browser blocks the one-tap install flow, but the .apk works the same."
      />
      <a
        href={APK_URL || "#"}
        onClick={onApk}
        className={`btn-primary btn-lg ${s.primaryBtn}`}
        download
      >
        <Download size={18} aria-hidden="true" />
        Download the .apk
      </a>
      <Stepper
        steps={[
          { icon: <Download size={14} />, text: "Open the downloaded file." },
          {
            text: "If asked, allow \u201cinstall unknown apps\u201d for your browser in Settings.",
          },
          { text: "Tap Install." },
        ]}
      />
    </section>
  );
}

function IosBlock() {
  return (
    <section className={s.platformBlock}>
      <BlockHeader
        icon={<Smartphone size={18} />}
        title="Add to Home Screen"
        hint="iOS doesn't support Android apps, but nsuOne works great as a home-screen web app — full-screen, with its own icon."
      />
      <Stepper
        steps={[
          {
            icon: <Share size={14} />,
            text: "Tap the Share icon in Safari's toolbar.",
          },
          { text: "Scroll and tap Add to Home Screen." },
          {
            icon: <Plus size={14} />,
            text: "Tap Add.",
          },
        ]}
      />
    </section>
  );
}

function BlockHeader({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className={s.blockHeader}>
      <span className={s.blockIcon} aria-hidden="true">
        {icon}
      </span>
      <div>
        <h2 className={s.blockTitle}>{title}</h2>
        <p className={s.hint}>{hint}</p>
      </div>
    </div>
  );
}

function Stepper({
  steps,
}: {
  steps: { icon?: React.ReactNode; text: React.ReactNode }[];
}) {
  return (
    <ol className={s.steps}>
      {steps.map((step, i) => (
        <li key={i} className={s.step}>
          <span className={s.stepNum} aria-hidden="true">
            {step.icon ?? i + 1}
          </span>
          <span className={s.stepText}>{step.text}</span>
        </li>
      ))}
    </ol>
  );
}

function ApkNote() {
  return (
    <div className={s.note}>
      <span className={s.noteIcon} aria-hidden="true">
        <ChevronRight size={14} />
      </span>
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

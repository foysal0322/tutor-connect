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
  X,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import QRCode from "@/components/QRCode";
import s from "./download.module.css";
import {
  APK_URL,
  APP_VERSION,
  detectPlatform,
  isMobilePlatform,
  isRunningStandalone,
  type MobilePlatform,
  type Platform,
} from "@/lib/platform";
import { useBeforeInstallPrompt } from "@/hooks/useBeforeInstallPrompt";

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

export default function DownloadClient() {
  const { toast } = useToast();
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [copied, setCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { installEvent, promptInstall } = useBeforeInstallPrompt(platform);

  useEffect(() => {
    setPlatform(detectPlatform());
    setPageUrl(window.location.href.split("#")[0]);
    setStandalone(isRunningStandalone());
  }, []);

  async function handleInstallClick() {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toast.success("Install started — check your home screen when it finishes.");
      setDismissed(true);
    }
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

  const isMobile = isMobilePlatform(platform);
  const showBanner = isMobile && !standalone && !dismissed;

  return (
    <div className={s.body}>
      {showBanner && (
        <MobileBanner
          platform={platform as MobilePlatform}
          canInstall={!!installEvent}
          onInstall={handleInstallClick}
          onApk={handleApkClick}
          onDismiss={() => setDismissed(true)}
        />
      )}

      <Hero
        platform={platform}
        url={pageUrl}
        copied={copied}
        onCopy={handleCopyLink}
      />

      <FeatureStrip />

      <ApkNote />
    </div>
  );
}

function MobileBanner({
  platform,
  canInstall,
  onInstall,
  onApk,
  onDismiss,
}: {
  platform: MobilePlatform;
  canInstall: boolean;
  onInstall: () => void;
  onApk: () => void;
  onDismiss: () => void;
}) {
  const isAndroid = platform !== "ios";
  const title = isAndroid ? "Install nsuOne" : "Add to Home Screen";
  const message = isAndroid
    ? "One tap — adds to your home screen. No Play Store visit required."
    : "Full-screen, with its own icon — just like a native app.";

  return (
    <section className={s.banner} role="region" aria-label="Install nsuOne">
      <span className={s.bannerGlow} aria-hidden="true" />

      <button
        type="button"
        className={s.bannerClose}
        onClick={onDismiss}
        aria-label="Dismiss install banner"
      >
        <X size={16} />
      </button>

      <div className={s.bannerTop}>
        <span className={s.bannerIcon} aria-hidden="true">
          <Smartphone size={22} />
        </span>
        <div className={s.bannerBody}>
          <strong className={s.bannerTitle}>{title}</strong>
          <p className={s.bannerMessage}>{message}</p>
        </div>

        {isAndroid && (
          <div className={s.bannerCtaWrap}>
            {platform === "android-chrome" && canInstall ? (
              <button type="button" onClick={onInstall} className={s.bannerCta}>
                <Download size={16} aria-hidden="true" />
                Install
              </button>
            ) : (
              <a
                href={APK_URL || "#"}
                onClick={onApk}
                download
                className={s.bannerCta}
              >
                <Download size={16} aria-hidden="true" />
                Download
              </a>
            )}
          </div>
        )}
      </div>

      {!isAndroid && (
        <ol className={s.bannerSteps}>
          <li className={s.bannerStep}>
            <span className={s.bannerStepIcon} aria-hidden="true">
              <Share size={12} />
            </span>
            <span>Tap <strong>Share</strong></span>
          </li>
          <li className={s.bannerStepArrow} aria-hidden="true">
            <ChevronRight size={12} />
          </li>
          <li className={s.bannerStep}>
            <span className={s.bannerStepIcon} aria-hidden="true">
              <Plus size={12} />
            </span>
            <span><strong>Add to Home Screen</strong></span>
          </li>
          <li className={s.bannerStepArrow} aria-hidden="true">
            <ChevronRight size={12} />
          </li>
          <li className={s.bannerStep}>
            <span className={s.bannerStepIcon} aria-hidden="true">
              <Check size={12} />
            </span>
            <span>Tap <strong>Add</strong></span>
          </li>
        </ol>
      )}
    </section>
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

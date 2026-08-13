import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANDROID_PACKAGE,
  detectPlatform,
  getInstalledRelatedApp,
  isBannerDismissed,
  isRunningStandalone,
  setBannerDismissed,
} from "../platform";

// Vitest's default environment is Node, so window/navigator/document do not
// exist. We stub them to exercise the client-side branches of platform.ts
// without pulling in jsdom.

function freshStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
}

function stubNavigator(props: Record<string, unknown>) {
  vi.stubGlobal("navigator", { userAgent: "", maxTouchPoints: 0, ...props });
}

beforeEach(() => {
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({ matches: false, media: query }),
    localStorage: freshStorage(),
  });
  vi.stubGlobal("navigator", { userAgent: "", maxTouchPoints: 0 });
  vi.stubGlobal("document", {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("detectPlatform", () => {
  const UA = {
    androidChrome:
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    androidFirefox: "Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0",
    iphone:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    macDesktop:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  it("classifies Android Chrome as android-chrome", () => {
    stubNavigator({ userAgent: UA.androidChrome });
    expect(detectPlatform()).toBe("android-chrome");
  });

  it("classifies Android Firefox as android-other", () => {
    stubNavigator({ userAgent: UA.androidFirefox });
    expect(detectPlatform()).toBe("android-other");
  });

  it("classifies iPhone as ios", () => {
    stubNavigator({ userAgent: UA.iphone });
    expect(detectPlatform()).toBe("ios");
  });

  it("classifies a Mac desktop UA as desktop", () => {
    stubNavigator({ userAgent: UA.macDesktop });
    expect(detectPlatform()).toBe("desktop");
  });
});

describe("isRunningStandalone", () => {
  it("is true when display-mode: standalone matches", () => {
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        matches: query === "(display-mode: standalone)",
      }),
      localStorage: freshStorage(),
    });
    expect(isRunningStandalone()).toBe(true);
  });

  it("is true when iOS navigator.standalone is true", () => {
    stubNavigator({ standalone: true });
    expect(isRunningStandalone()).toBe(true);
  });

  it("is false otherwise", () => {
    expect(isRunningStandalone()).toBe(false);
  });
});

describe("install banner dismissal", () => {
  it("is not dismissed by default", () => {
    expect(isBannerDismissed("1.0.0")).toBe(false);
  });

  it("is dismissed right after dismissing", () => {
    setBannerDismissed("1.0.0");
    expect(isBannerDismissed("1.0.0")).toBe(true);
  });

  it("re-shows when the app version changes", () => {
    setBannerDismissed("1.0.0");
    expect(isBannerDismissed("1.1.0")).toBe(false);
  });

  it("stays dismissed within the 30-day cooldown", () => {
    const now = Date.now();
    vi.useFakeTimers({ now });
    setBannerDismissed("1.0.0");
    vi.setSystemTime(now + 5 * 24 * 60 * 60 * 1000); // 5 days
    expect(isBannerDismissed("1.0.0")).toBe(true);
  });

  it("re-shows after the 30-day cooldown elapses", () => {
    const now = Date.now();
    vi.useFakeTimers({ now });
    setBannerDismissed("1.0.0");
    vi.setSystemTime(now + 31 * 24 * 60 * 60 * 1000); // 31 days
    expect(isBannerDismissed("1.0.0")).toBe(false);
  });
});

describe("getInstalledRelatedApp", () => {
  it("returns false when the API is missing", async () => {
    expect(await getInstalledRelatedApp(ANDROID_PACKAGE)).toBe(false);
  });

  it("returns true when the package is reported installed", async () => {
    stubNavigator({
      getInstalledRelatedApps: async () => [{ platform: "play", id: ANDROID_PACKAGE }],
    });
    expect(await getInstalledRelatedApp(ANDROID_PACKAGE)).toBe(true);
  });

  it("returns false for an unrelated package", async () => {
    stubNavigator({
      getInstalledRelatedApps: async () => [{ platform: "play", id: "com.other.app" }],
    });
    expect(await getInstalledRelatedApp(ANDROID_PACKAGE)).toBe(false);
  });

  it("swallows errors and returns false", async () => {
    stubNavigator({
      getInstalledRelatedApps: async () => {
        throw new Error("boom");
      },
    });
    expect(await getInstalledRelatedApp(ANDROID_PACKAGE)).toBe(false);
  });
});

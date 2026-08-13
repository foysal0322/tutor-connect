import { useEffect, useState } from "react";
import type { BeforeInstallPromptEvent, Platform } from "@/lib/platform";

/**
 * Captures the `beforeinstallprompt` event so the app can surface its own custom
 * install button instead of the browser's default infobar. Only Chromium-based
 * Android browsers fire this event, so the listener is armed only when
 * `platform === "android-chrome"`.
 *
 * Returns:
 *  - `installEvent`: the captured event, or null (drives whether an "Install"
 *    button can be shown).
 *  - `promptInstall`: triggers the native prompt and resolves to the user's
 *    choice ("accepted" | "dismissed"), or null if no event was captured. The
 *    event may only be prompted once, so it is cleared afterwards.
 */
export function useBeforeInstallPrompt(platform: Platform) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (platform !== "android-chrome") return;
    const handler = (e: Event) => {
      e.preventDefault(); // suppress Chrome's default install infobar
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [platform]);

  async function promptInstall(): Promise<"accepted" | "dismissed" | null> {
    if (!installEvent) return null;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    // A beforeinstallprompt event can only be used once.
    setInstallEvent(null);
    return choice.outcome;
  }

  return { installEvent, promptInstall };
}

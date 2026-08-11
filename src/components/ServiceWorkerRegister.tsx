"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (/sw.js) once on the client so the app shell is
 * cached and the site qualifies as an installable PWA. Installability is a hard
 * requirement for the Play Store TWA wrapper (see APK-PLAYSTORE-PLAN.md, Phase 1).
 *
 * Production only: in dev we skip registration to avoid stale-cache confusion
 * while editing. To test the PWA locally, run a production build and serve it
 * over HTTPS (e.g. `next dev --experimental-https` or a deployed preview).
 *
 * This is safe alongside src/hooks/usePushNotifications.ts, which also registers
 * /sw.js: registering the same service worker twice is idempotent.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    };

    // Register after the page has loaded so it never competes with
    // first-paint work.
    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

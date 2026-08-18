"use client";

/**
 * ThemeProvider — opt-in light/dark theme switcher.
 *
 * Phase 1 of ADMIN_DASHBOARD_REDESIGN_PLAN.md.
 *
 * Behavior:
 * - Reads stored theme from localStorage["nsuone.theme"].
 * - If stored value is "dark", sets data-theme="dark" on <html>.
 * - If stored value is "light" (or anything else), leaves the attribute
 *   unset so the :root light tokens apply unchanged.
 * - Persists changes via setTheme().
 *
 * Default theme is light. We deliberately do NOT auto-apply
 * prefers-color-scheme — every existing component was authored against
 * the light palette, so dark mode must remain an explicit user choice
 * until each surface has been audited in later phases.
 *
 * Rendering: returns children untouched. The provider only manages the
 * data-theme attribute and exposes context for the upcoming theme
 * toggle (Phase 3 Topbar).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "nsuone.theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // Read persisted preference on mount.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        setThemeState(stored);
      }
    } catch {
      /* localStorage may be unavailable (private mode); no-op. */
    }
  }, []);

  // Reflect theme onto <html> whenever it changes. (The initial dark value
  // is applied earlier by the blocking script in app/layout.tsx <head>, so
  // there is no flash between paint and hydration.)
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
    } else {
      root.removeAttribute("data-theme");
      root.style.colorScheme = "light";
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore write failures */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Allow components to render outside the provider (e.g., in isolation).
    return {
      theme: "light",
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return ctx;
}

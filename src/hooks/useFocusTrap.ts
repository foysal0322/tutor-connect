'use client';

import { useEffect, RefObject } from 'react';

/**
 * Trap keyboard focus inside the referenced element while `active` is true.
 *
 * - On activation, moves focus into the first focusable element (or the
 *   container itself).
 * - On deactivation, restores focus to the element that had it before the
 *   trap opened. Pass `restoreTo` if you want to restore to a specific
 *   trigger element (the typical case for dropdowns and modals).
 * - Handles Tab / Shift+Tab cycling, plus Escape (caller installs its own
 *   Escape handler — this hook stays focused on the focus contract).
 *
 * Reference implementation already existed in src/app/find-tutor/FindTutorClient.tsx
 * (see FRONTEND_AUDIT.md D4) — this is the extracted, reusable version.
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useFocusTrap(ref, open);
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

export function useFocusTrap<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  opts?: { restoreTo?: HTMLElement | null; initialFocus?: HTMLElement | null },
) {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const target = opts?.initialFocus ?? getFocusable(container)[0] ?? container;
    // Defer focus to next tick so any dropdown/modal CSS transition can apply first.
    const focusTimer = window.setTimeout(() => target.focus(), 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const currentContainer = ref.current;
      if (!currentContainer) return;
      const focusable = getFocusable(currentContainer);
      if (focusable.length === 0) {
        e.preventDefault();
        currentContainer.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === first || !currentContainer.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      // Restore focus to the trigger.
      const restoreTarget = opts?.restoreTo ?? previouslyFocused;
      if (restoreTarget && typeof restoreTarget.focus === 'function') {
        restoreTarget.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

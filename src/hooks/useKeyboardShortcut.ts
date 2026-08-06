"use client";

/**
 * useKeyboardShortcut — register a global keyboard shortcut.
 *
 * Phase 1 of ADMIN_DASHBOARD_REDESIGN_PLAN.md.
 *
 * - Ignores key presses that originate inside text-entry fields
 *   (input, textarea, select, contentEditable) UNLESS allowInInputs
 *   is true. This prevents ⌘K etc. from interfering with typing.
 * - Supports meta/ctrl and shift modifiers.
 * - Stable handler reference is captured per-render via a ref so the
 *   caller does not need to memoize.
 *
 * Usage:
 *   useKeyboardShortcut({ key: "k", meta: true }, () => openPalette());
 */

import { useEffect, useRef } from "react";

export interface ShortcutOptions {
  /** Lowercase letter or special-key name (e.g., "k", "Escape", "/"). */
  key: string;
  /** Require Cmd (mac) / Ctrl (others). */
  meta?: boolean;
  /** Require Shift. */
  shift?: boolean;
  /** Require Alt / Option. */
  alt?: boolean;
  /** Fire even when focus is inside a text-entry field. Default false. */
  allowInInputs?: boolean;
  /** Disable the binding temporarily. Default false. */
  disabled?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return target.isContentEditable;
}

export function useKeyboardShortcut(
  opts: ShortcutOptions,
  handler: (e: KeyboardEvent) => void,
) {
  const handlerRef = useRef(handler);

  // Keep latest handler in the ref without mutating it during render
  // (React 19 / React Compiler rule react-hooks/refs).
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (opts.disabled) return;

    function onKeyDown(e: KeyboardEvent) {
      if (!e.key) return;
      const key = e.key.toLowerCase();
      if (key !== opts.key.toLowerCase()) return;

      const wantsMeta = opts.meta ?? false;
      const hasMeta = e.metaKey || e.ctrlKey;
      if (wantsMeta !== hasMeta) return;

      if ((opts.shift ?? false) !== e.shiftKey) return;
      if ((opts.alt ?? false) !== e.altKey) return;

      if (!opts.allowInInputs && isEditableTarget(e.target)) return;

      e.preventDefault();
      handlerRef.current(e);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    opts.key,
    opts.meta,
    opts.shift,
    opts.alt,
    opts.allowInInputs,
    opts.disabled,
  ]);
}

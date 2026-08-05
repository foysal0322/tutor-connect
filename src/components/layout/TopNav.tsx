"use client";

/**
 * TopNav → re-export of Topbar (Phase 3).
 *
 * Kept as a compatibility shim so any existing imports of `TopNav` continue
 * to resolve. New code should import Topbar directly.
 */

export { default } from "./Topbar";
export { default as Topbar } from "./Topbar";

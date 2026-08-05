/**
 * member-focus — UI-only "focus" concept for the member shell (blueprint §8).
 *
 * The unified-campus model means a single User can both learn and teach.
 * There is no role switcher (the role enum is never flipped), but members
 * still benefit from a soft cue about which workflow they're currently
 * leaning into. This module persists that preference client-side.
 *
 *   "learning" | "teaching"
 *
 * Storage: localStorage. Default: "learning".
 *
 * Writers:
 *   - <DashboardContent> pushes the current tab here whenever the
 *     Learning/Teaching tab changes (via <Tabs onSelect>).
 *
 * Readers:
 *   - <Sidebar> applies a subtle emphasis to the matching nav group
 *     (Learning or Teaching heading).
 *
 * No session, auth, or server-state involvement. Presentation-only.
 */

export type MemberFocus = "learning" | "teaching";

const KEY = "nsuone.member.focus";
const DEFAULT: MemberFocus = "learning";

export function readMemberFocus(): MemberFocus {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "teaching" ? "teaching" : "learning";
  } catch {
    return DEFAULT;
  }
}

export function writeMemberFocus(focus: MemberFocus): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, focus);
    // Notify same-tab listeners (Sidebar) that the value changed.
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: focus }));
  } catch {
    /* localStorage unavailable — non-fatal */
  }
}

export const EVENT_NAME = "nsuone:member-focus-change";

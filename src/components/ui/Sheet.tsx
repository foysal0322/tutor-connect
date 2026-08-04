"use client";

/**
 * Sheet — side-drawer variant of Modal (Phase 1).
 *
 * Used in Phase 8 for detail editors (e.g., /admin/users/<id>) and
 * mobile-friendly affordances where a centered Modal would feel heavy.
 * Mirrors Modal's accessibility contract:
 *
 *   - Portal into document.body
 *   - role="dialog" aria-modal="true"
 *   - Focus trap + restoreFocus
 *   - Escape to close
 *   - Backdrop click closes (unless disableBackdropClose)
 *
 * Side: "left" | "right" | "bottom". Default "right".
 */

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type Side = "left" | "right" | "bottom";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  side?: Side;
  /** When true, clicking the backdrop does NOT close. */
  disableBackdropClose?: boolean;
  /** Width for left/right sheets. Default 32rem. */
  size?: number | string;
  /** Height for bottom sheets. Default 70vh. */
  height?: number | string;
  children: React.ReactNode;
  /** Optional footer slot (actions). */
  footer?: React.ReactNode;
}

export function Sheet({
  open,
  onClose,
  title,
  side = "right",
  disableBackdropClose = false,
  size = "32rem",
  height = "70vh",
  children,
  footer,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useStableId("sheet-title");

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const isVertical = side === "bottom";

  const panelStyle: React.CSSProperties = isVertical
    ? {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: typeof height === "number" ? `${height}vh` : height,
        height: typeof height === "number" ? `${height}vh` : height,
        background: "var(--card-bg)",
        borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        animation: "sheet-slide-up var(--duration-base) var(--ease-entrance)",
      }
    : {
        position: "fixed",
        top: 0,
        bottom: 0,
        [side]: 0,
        width: typeof size === "number" ? `${size}rem` : size,
        maxWidth: "92vw",
        background: "var(--card-bg)",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        animation:
          side === "right"
            ? "sheet-slide-in-right var(--duration-base) var(--ease-entrance)"
            : "sheet-slide-in-left var(--duration-base) var(--ease-entrance)",
      };

  return createPortal(
    <div
      onClick={(e) => {
        if (!disableBackdropClose && e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 10000,
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        style={panelStyle}
      >
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-4) var(--space-5)",
              borderBottom: "1px solid var(--border-color)",
              flexShrink: 0,
            }}
          >
            <h2
              id={titleId}
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                margin: 0,
              }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: "var(--space-1)",
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        )}
        <div
          style={{
            padding: "var(--space-5)",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {children}
        </div>
        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "var(--space-3)",
              padding: "var(--space-4) var(--space-5)",
              borderTop: "1px solid var(--border-color)",
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes sheet-slide-in-right {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes sheet-slide-in-left {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        @keyframes sheet-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}

function useStableId(prefix: string): string {
  const [id] = React.useState(
    () => `${prefix}-${Math.random().toString(36).slice(2, 9)}`,
  );
  return id;
}

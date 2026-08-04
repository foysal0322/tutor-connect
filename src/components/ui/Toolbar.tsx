import React from "react";

/**
 * Toolbar — standard search/filter/actions row for list pages (Phase 1).
 *
 * Layout contract:
 *   [ search field ]  [ filters... ]  ······  [ bulk actions ]
 *
 * Phase 6 will adopt this on every admin list page so that search,
 * filters, and bulk actions share alignment, spacing, and responsive
 * wrap behavior. Today each page hand-rolls its own.
 */

export interface ToolbarProps {
  /** Left slot, typically a search Input. */
  search?: React.ReactNode;
  /** Middle slot, typically Select filters / toggle groups. */
  filters?: React.ReactNode;
  /** Right slot, typically bulk-action buttons. */
  actions?: React.ReactNode;
  className?: string;
  /** Sticky-position the toolbar below the Topbar on scroll. */
  sticky?: boolean;
}

export function Toolbar({
  search,
  filters,
  actions,
  className = "",
  sticky = false,
}: ToolbarProps) {
  return (
    <div
      className={className}
      role="toolbar"
      aria-label="List controls"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-3)",
        padding: "var(--space-3) 0",
        flexWrap: "wrap",
        ...(sticky
          ? {
              position: "sticky",
              top: 48 /* Topbar height — see §14.1 */,
              zIndex: 5,
              background: "var(--bg-color)",
              borderBottom: "1px solid var(--border-color)",
            }
          : null),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          flex: 1,
          minWidth: 200,
          flexWrap: "wrap",
        }}
      >
        {search}
        {filters}
      </div>
      {actions && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            flexShrink: 0,
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

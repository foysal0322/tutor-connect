import React from "react";

/**
 * PageHeader — standard page title + subtitle + actions slot (Phase 1).
 *
 * Every admin page (post-Phase-6 migration) will start with this header
 * so the visual hierarchy is consistent:
 *
 *   Breadcrumb (rendered separately by Topbar)
 *   ────────────────────────────────────────
 *   Page Title                [ primary action ]
 *   Optional subtitle / description
 *
 * Layout is intentionally compact: 24px top padding, 16px bottom.
 */

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned slot for primary actions / buttons. */
  actions?: React.ReactNode;
  /** Optional icon shown to the left of the title. */
  icon?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      className={className}
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "var(--space-4)",
        paddingTop: "var(--space-6)",
        paddingBottom: "var(--space-4)",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-3)",
          minWidth: 0,
          flex: 1,
        }}
      >
        {icon && (
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "var(--radius-md)",
              background: "var(--primary-light)",
              color: "var(--primary)",
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              lineHeight: 1.2,
              color: "var(--text-main)",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
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
    </header>
  );
}

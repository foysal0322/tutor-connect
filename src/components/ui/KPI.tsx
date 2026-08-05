import React from "react";

/**
 * KPI — compact metric tile (Phase 1).
 *
 * Companion to the existing <StatCard>. Where StatCard favours a roomy,
 * marketing-style card with circular icon badge, KPI is optimised for
 * dense dashboards (Linear / Vercel / Stripe executive overview):
 *
 *   ┌─────────────────────────────────┐
 *   │ LABEL              ······  ICON │
 *   │ 42,193                          │
 *   │ ↑ 12% vs last month             │
 *   └─────────────────────────────────┘
 *
 * Variants:
 *   "default"  — flat card surface
 *   "accent"   — left accent bar in the semantic tone
 *   "plain"    — borderless, only the icon tinted
 *
 * Optional `href` wraps the tile in a Next.js <Link> for the click-through
 * pattern used by dashboards across the platform (admin + member).
 */

import Link from "next/link";

type Tone = "primary" | "success" | "danger" | "info" | "accent" | "neutral";
type Variant = "default" | "accent" | "plain";

export interface KPIProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: Tone;
  variant?: Variant;
  hint?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  href?: string;
  onClick?: () => void;
  className?: string;
}

const TONE_COLOR: Record<Tone, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  danger: "var(--danger)",
  info: "var(--info)",
  accent: "var(--accent)",
  neutral: "var(--surface-6)",
};

export function KPI({
  label,
  value,
  icon,
  tone = "primary",
  variant = "default",
  hint,
  trend,
  href,
  onClick,
  className = "",
}: KPIProps) {
  const accentColor = TONE_COLOR[tone];

  const inner = (
    <>
      {variant === "accent" && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            borderRadius: "3px 0 0 3px",
            background: accentColor,
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-2)",
          marginBottom: "var(--space-2)",
        }}
      >
        <span
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: 500,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
        {icon && (
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              color: accentColor,
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: "var(--text-2xl)",
          fontWeight: 700,
          lineHeight: 1.1,
          color: "var(--text-main)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {(trend || hint) && (
        <div
          style={{
            marginTop: "var(--space-1)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
          }}
        >
          {trend && (
            <span
              style={{
                fontWeight: 600,
                color: trend.isPositive
                  ? "var(--success)"
                  : "var(--danger)",
              }}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          )}
          {hint ?? (trend ? trend.label ?? "vs last month" : null)}
        </div>
      )}
    </>
  );

  const sharedStyle: React.CSSProperties = {
    position: "relative",
    display: "block",
    padding: "var(--space-3) var(--space-4)",
    borderRadius: "var(--radius-md)",
    background: "var(--card-bg)",
    boxShadow: variant === "plain" ? "none" : "var(--shadow-sm)",
    border:
      variant === "plain" ? "none" : "1px solid var(--border-color)",
    textDecoration: "none",
    color: "inherit",
    cursor: href || onClick ? "pointer" : "default",
    transition:
      "box-shadow var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
    overflow: "hidden",
  };

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        style={sharedStyle}
        onClick={onClick}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={{
        ...sharedStyle,
        textAlign: "left",
        font: "inherit",
        width: "100%",
      }}
      onClick={onClick}
      disabled={!onClick}
    >
      {inner}
    </button>
  );
}

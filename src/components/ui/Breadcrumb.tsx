"use client";

/**
 * Breadcrumb — accessible hierarchical nav (Phase 1).
 *
 * - Renders a <nav aria-label="Breadcrumb"> wrapper.
 * - Last item is marked aria-current="page".
 * - Separators are decorative (aria-hidden) chevrons.
 *
 * Phase 3 (Topbar) will derive items from the current pathname via a
 * route→title map. For now the component is presentational only.
 */

import React from "react";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

import Link from "next/link";

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Hide the last item's label when it duplicates the PageHeader title. */
  hideLast?: boolean;
  className?: string;
}

export function Breadcrumb({
  items,
  hideLast = false,
  className = "",
}: BreadcrumbProps) {
  if (!items.length) return null;

  const visible = hideLast ? items.slice(0, -1) : items;
  if (!visible.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-1)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
        }}
      >
        {visible.map((item, i) => {
          const isLast = i === visible.length - 1;
          return (
            <li
              key={`${item.label}-${i}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-1)",
              }}
            >
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  style={{
                    color: "var(--text-muted)",
                    textDecoration: "none",
                    borderRadius: "var(--radius-sm)",
                    padding: "2px var(--space-1)",
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast && !hideLast ? "page" : undefined}
                  style={{
                    color: isLast ? "var(--text-main)" : "var(--text-muted)",
                    fontWeight: isLast ? 600 : 400,
                    padding: "2px var(--space-1)",
                  }}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  size={12}
                  aria-hidden="true"
                  style={{ opacity: 0.6 }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

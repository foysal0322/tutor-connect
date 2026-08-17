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
  /**
   * Force a single row that truncates with an ellipsis instead of wrapping.
   * Used inside the fixed-height Topbar where wrapped crumbs would break
   * the bar; the last (current page) crumb stays fully visible and earlier
   * crumbs shrink first.
   */
  singleLine?: boolean;
  /**
   * Two-line layout: ancestor trail on a small muted eyebrow row, current
   * page below it in title weight. The Topbar swaps to this on phones,
   * where a single-row "Dashboard > Tuition Requests" would ellipsize
   * into an unreadable sliver.
   */
  stacked?: boolean;
  className?: string;
}

export function Breadcrumb({
  items,
  hideLast = false,
  singleLine = false,
  stacked = false,
  className = "",
}: BreadcrumbProps) {
  if (!items.length) return null;

  const visible = hideLast ? items.slice(0, -1) : items;
  if (!visible.length) return null;

  if (stacked) {
    const ancestors = visible.slice(0, -1);
    const current = visible[visible.length - 1];
    return (
      <nav aria-label="Breadcrumb" className={className}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "1px",
            minWidth: 0,
            lineHeight: 1.2,
          }}
        >
          {ancestors.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "nowrap",
                gap: "var(--space-1)",
                minWidth: 0,
                overflow: "hidden",
                fontSize: "0.68rem",
                color: "var(--text-muted)",
              }}
            >
              {ancestors.map((item, i) => (
                <React.Fragment key={`${item.label}-${i}`}>
                  {i > 0 && (
                    <ChevronRight
                      size={10}
                      aria-hidden="true"
                      style={{ opacity: 0.6, flexShrink: 0 }}
                    />
                  )}
                  {item.href ? (
                    <Link
                      href={item.href}
                      style={{
                        color: "var(--text-muted)",
                        textDecoration: "none",
                        borderRadius: "var(--radius-sm)",
                        padding: "1px var(--space-1)",
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      style={{
                        padding: "1px var(--space-1)",
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          <span
            aria-current={hideLast ? undefined : "page"}
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--text-main)",
              padding: "1px 0",
            }}
          >
            {current.label}
          </span>
        </div>
      </nav>
    );
  }

  const truncationStyle = singleLine
    ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
    : undefined;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          alignItems: "center",
          flexWrap: singleLine ? "nowrap" : "wrap",
          // Let the ol shrink inside a flex parent (e.g. .topbarLeft) so
          // truncation kicks in instead of overflowing.
          minWidth: 0,
          overflow: singleLine ? "hidden" : undefined,
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
                // Flex items default to min-width:auto, which would floor
                // the crumb at its full label width and defeat truncation.
                minWidth: 0,
                // Keep the current-page crumb intact; ancestors ellipsize.
                flexShrink: singleLine && isLast ? 0 : undefined,
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
                    ...truncationStyle,
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
                    ...truncationStyle,
                  }}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  size={12}
                  aria-hidden="true"
                  style={{ opacity: 0.6, flexShrink: 0 }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

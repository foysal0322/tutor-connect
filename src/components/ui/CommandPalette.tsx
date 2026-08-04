"use client";

/**
 * CommandPalette — Cmd/Ctrl+K palette for navigation + quick actions (Phase 1).
 *
 * Phase 9 will wire this to the nav config + scoped per-page commands.
 * For now the palette is a fully-functional primitive driven entirely
 * by props: parent supplies `items`, `open`, `onClose`, `onSelect`.
 *
 * Accessibility contract:
 *   - role="dialog" aria-modal="true"
 *   - Search input is aria-controls + autocorrect off
 *   - Listbox semantics on the results <ul role="listbox">
 *   - Arrow Up/Down to move, Enter to select, Escape to close
 *   - Focus trapped while open
 *
 * Filtering is naive substring match (case-insensitive) on label +
 * optional `keywords` field — adequate for ~50 items (the admin nav is
 * under 20). Replace with a fuzzy ranker if/when needed.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface CommandItem {
  id: string;
  label: string;
  /** Optional tertiary hint, e.g. "Admin → Users". */
  group?: string;
  keywords?: string;
  icon?: React.ReactNode;
  /** Perform the action. Receives the item. */
  onSelect: (item: CommandItem) => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
}

export function CommandPalette({
  open,
  onClose,
  items,
  placeholder = "Search pages and actions…",
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // useFocusTrap auto-focuses the first focusable element (the search input)
  // when the palette opens. Passing inputRef.current during render would
  // violate react-hooks/refs; let the hook discover the input itself.
  useFocusTrap(panelRef, open);

  // Reset query + selection each time the palette opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  // Escape to close (focus trap also handles Escape; kept for safety).
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = `${it.label} ${it.group ?? ""} ${it.keywords ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  // Keep active index in range when filtered list changes.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Scroll active row into view.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-cmd-index="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open || typeof document === "undefined") return null;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = filtered[active];
      if (sel) {
        sel.onSelect(sel);
        onClose();
      }
    }
  }

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 10001,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "12vh var(--space-4) var(--space-4)",
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          width: "100%",
          maxWidth: "40rem",
          background: "var(--card-bg)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--border-color)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "60vh",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <Search
            size={18}
            aria-hidden="true"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label="Search commands"
            aria-controls="cmd-listbox"
            aria-autocomplete="list"
            aria-activedescendant={
              filtered[active] ? `cmd-${filtered[active].id}` : undefined
            }
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--text-main)",
              fontSize: "var(--text-base)",
              font: "inherit",
            }}
          />
          <kbd
            style={{
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-color)",
              color: "var(--text-muted)",
              background: "var(--surface-1)",
            }}
          >
            Esc
          </kbd>
        </div>

        <ul
          id="cmd-listbox"
          ref={listRef}
          role="listbox"
          aria-label="Commands"
          style={{
            listStyle: "none",
            margin: 0,
            padding: "var(--space-1)",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {filtered.length === 0 && (
            <li
              style={{
                padding: "var(--space-4)",
                color: "var(--text-muted)",
                textAlign: "center",
                fontSize: "var(--text-sm)",
              }}
            >
              No results
            </li>
          )}
          {filtered.map((item, i) => (
            <li
              key={item.id}
              id={`cmd-${item.id}`}
              role="option"
              aria-selected={i === active}
              data-cmd-index={i}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                item.onSelect(item);
                onClose();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                background:
                  i === active ? "var(--primary-light)" : "transparent",
                color: i === active ? "var(--primary)" : "var(--text-main)",
                fontSize: "var(--text-sm)",
              }}
            >
              {item.icon && (
                <span aria-hidden="true" style={{ display: "inline-flex" }}>
                  {item.icon}
                </span>
              )}
              <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
              {item.group && (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.group}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

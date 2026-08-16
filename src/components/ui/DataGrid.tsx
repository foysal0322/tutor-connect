"use client";

/**
 * DataGrid — shared tabular data component (Phase 5 redesign).
 *
 * This is the single table primitive for the platform (admin + member).
 * Every capability beyond the original (search + sort + pagination +
 * empty state) is OPT-IN via optional props so existing call sites
 * (withdrawals, support) render unchanged until migrations adopt the
 * new features.
 *
 * ── Backward-compatible surface (unchanged) ─────────────────────────────
 *   Props:    data, columns, searchable, searchKeys, itemsPerPage,
 *             emptyMessage, emptyState
 *   ColumnDef: header, accessorKey, cell, sortable
 *
 * ── New opt-in capabilities (Phase 5) ───────────────────────────────────
 *   ColumnDef.width          — initial column width
 *   ColumnDef.resizable      — drag handle on the column's right edge
 *   ColumnDef.filterable     — filter chip in the header that opens a menu
 *   ColumnDef.filterOptions  — {label,value}[] for the filter dropdown
 *   ColumnDef.filterFn       — (item, filterValue) => boolean custom matcher
 *   ColumnDef.align          — 'left' | 'right' | 'center'
 *   ColumnDef.id             — stable id (defaults to accessorKey/header)
 *
 *   Props.getRowId           — (item, index) => stable string key
 *   Props.selectable         — render a checkbox column
 *   Props.selectedIds        — controlled selection (string[])
 *   Props.onSelectionChange  — (ids: string[]) => void
 *   Props.rowActions         — (item) => RowAction[] rendered in an overflow ⋯
 *   Props.onRowClick         — (item) => void; row becomes clickable
 *   Props.editingRowId       — id of the row currently being edited inline
 *   Props.renderEditableRow  — (item) => ReactNode replacing the row's cells
 *
 * ── Sort ────────────────────────────────────────────────────────────────
 *   Single-click: replace sort (asc → desc → none).
 *   Shift+click: add to the sort stack (multi-column).
 *
 * ── Memoization ─────────────────────────────────────────────────────────
 *   DataRow is wrapped in React.memo. Sorted/filtered/paginated datasets
 *   are useMemo'd. Consumers SHOULD pass `getRowId` for stable keys when
 *   using selection/edit/actions (otherwise row index is used).
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  MoreHorizontal,
  Filter,
  X,
} from "lucide-react";
import EmptyState from "./EmptyState";
import styles from "./DataGrid.module.css";

// ── Public types ──────────────────────────────────────────────────────────

export interface FilterOption {
  label: string;
  value: string;
}

export interface RowAction<T = any> {
  label: string;
  icon?: React.ReactNode;
  onSelect: (item: T) => void;
  danger?: boolean;
}

export type ColumnDef<T> = {
  // Existing (backward-compat)
  header: string;
  accessorKey?: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  // New (Phase 5)
  id?: string;
  width?: number | string;
  resizable?: boolean;
  filterable?: boolean;
  filterOptions?: FilterOption[];
  filterFn?: (item: T, filterValue: string) => boolean;
  align?: "left" | "right" | "center";
};

type SortDir = "asc" | "desc";
interface SortEntry {
  key: string;
  dir: SortDir;
}

interface DataGridProps<T> {
  // Existing
  data: T[];
  columns: ColumnDef<T>[];
  searchable?: boolean;
  searchKeys?: (keyof T | string)[];
  itemsPerPage?: number;
  emptyMessage?: string;
  emptyState?: {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
  };
  // New (Phase 5)
  getRowId?: (item: T, index: number) => string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  rowActions?: (item: T) => RowAction<T>[];
  onRowClick?: (item: T) => void;
  editingRowId?: string | null;
  renderEditableRow?: (item: T) => React.ReactNode;
  /** Bespoke mobile card (md and below). Falls back to the generic
      label-per-column dump when not provided. */
  renderMobileCard?: (item: T) => React.ReactNode;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getColumnId<T>(col: ColumnDef<T>, index: number): string {
  if (col.id) return col.id;
  if (typeof col.accessorKey === "string") return col.accessorKey;
  return `col-${index}`;
}

function readField<T>(item: T, key: keyof T | string | undefined): unknown {
  if (!key) return undefined;
  return (item as any)[key];
}

function compareValues(a: unknown, b: unknown): number {
  // Treat null/undefined as less-than everything for stable ordering.
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  // Date support: compare ISO strings or Date objects sensibly.
  const as = String(a);
  const bs = String(b);
  if (as < bs) return -1;
  if (as > bs) return 1;
  return 0;
}

// ── Header cell (sort + resize + filter) ─────────────────────────────────

interface HeaderCellProps<T> {
  col: ColumnDef<T>;
  colId: string;
  colIndex: number;
  width: number | string | undefined;
  sortState: SortEntry | undefined;
  filterValue: string | undefined;
  onSort: (key: string, shiftKey: boolean) => void;
  onResize: (colId: string, delta: number) => void;
  onFilter: (colId: string, value: string | undefined) => void;
  "data-col-id"?: string;
}

function HeaderCell<T>({
  col,
  colId,
  colIndex,
  width,
  sortState,
  filterValue,
  onSort,
  onResize,
  onFilter,
  ...rest
}: HeaderCellProps<T>) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [resizing, setResizing] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  // Close filter on outside click.
  useEffect(() => {
    if (!filterOpen) return;
    function onDocClick(e: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [filterOpen]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    setResizing(true);
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startXRef.current;
      startXRef.current = ev.clientX;
      onResize(colId, delta);
    };
    const onUp = () => {
      setResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const ariaSort = col.sortable
    ? sortState
      ? sortState.dir === "asc"
        ? "ascending"
        : "descending"
      : "none"
    : undefined;

  const alignClass =
    col.align === "right"
      ? styles.alignRight
      : col.align === "center"
        ? styles.alignCenter
        : undefined;

  const filterActive = filterValue !== undefined && filterValue !== "";

  return (
    <th
      aria-sort={ariaSort as any}
      style={{ width, position: "relative" }}
      className={alignClass}
      {...rest}
    >
      <div className={styles.thInner}>
        <div className={styles.thContent}>
          {col.sortable && col.accessorKey ? (
            <button
              type="button"
              onClick={(e) => onSort(String(col.accessorKey), e.shiftKey)}
              style={{
                all: "unset",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                cursor: "pointer",
                font: "inherit",
                color: "inherit",
                width: "100%",
              }}
            >
              <span>{col.header}</span>
              {sortState &&
                (sortState.dir === "asc" ? (
                  <ChevronUp size={14} aria-hidden="true" />
                ) : (
                  <ChevronDown size={14} aria-hidden="true" />
                ))}
            </button>
          ) : (
            <span>{col.header}</span>
          )}
        </div>

        {col.filterable && (
          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              type="button"
              className={`${styles.filterTrigger} ${
                filterActive || filterOpen ? styles.filterTriggerActive : ""
              }`}
              onClick={() => setFilterOpen((v) => !v)}
              aria-label={`Filter by ${col.header}`}
              aria-expanded={filterOpen}
            >
              <Filter size={13} aria-hidden="true" />
            </button>
            {filterOpen && (
              <div className={styles.filterMenu} role="listbox">
                <div className={styles.filterHeader}>
                  <span>Filter</span>
                  {filterActive && (
                    <button
                      type="button"
                      className={styles.filterClear}
                      onClick={() => {
                        onFilter(colId, undefined);
                        setFilterOpen(false);
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {(col.filterOptions ?? []).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={filterValue === opt.value}
                    className={`${styles.filterMenuItem} ${
                      filterValue === opt.value ? styles.filterMenuItemActive : ""
                    }`}
                    onClick={() => {
                      onFilter(colId, opt.value);
                      setFilterOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
                {!col.filterOptions?.length && (
                  <div
                    style={{
                      padding: "var(--space-3)",
                      color: "var(--text-muted)",
                      fontSize: "var(--text-xs)",
                      textAlign: "center",
                    }}
                  >
                    No filter options configured
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {col.resizable && (
          <div
            className={`${styles.resizeHandle} ${
              resizing ? styles.resizeHandleActive : ""
            }`}
            onMouseDown={handleResizeMouseDown}
            role="separator"
            aria-orientation="vertical"
            aria-label={`Resize column ${col.header}`}
          />
        )}
      </div>
    </th>
  );
}

// ── Row actions overflow menu ─────────────────────────────────────────────

interface RowActionsCellProps<T> {
  item: T;
  getActions: (item: T) => RowAction<T>[];
}

function RowActionsCell<T>({ item, getActions }: RowActionsCellProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const actions = useMemo(() => getActions(item), [getActions, item]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!actions.length) return null;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className={styles.actionsTrigger}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.actionsMenu} role="menu">
          {actions.map((action, i) => (
            <button
              key={`${action.label}-${i}`}
              type="button"
              role="menuitem"
              className={`${styles.actionItem} ${
                action.danger ? styles.actionItemDanger : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                action.onSelect(item);
              }}
            >
              {action.icon && (
                <span aria-hidden="true" style={{ display: "inline-flex" }}>
                  {action.icon}
                </span>
              )}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Memoized data row ─────────────────────────────────────────────────────

interface DataRowProps<T> {
  item: T;
  columns: ColumnDef<T>[];
  isEditing: boolean;
  renderEditableRow?: (item: T) => React.ReactNode;
  clickable: boolean;
  onRowClick?: (item: T) => void;
  selectable: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  rowId: string;
  hasActions: boolean;
  getRowActions?: (item: T) => RowAction<T>[];
  /** Total column count (data cols + selection + actions) for edit-row colSpan. */
  totalCols: number;
}

function DataRowImpl<T>({
  item,
  columns,
  isEditing,
  renderEditableRow,
  clickable,
  onRowClick,
  selectable,
  isSelected,
  onToggleSelect,
  rowId,
  hasActions,
  getRowActions,
  totalCols,
}: DataRowProps<T>) {
  if (isEditing && renderEditableRow) {
    return (
      <tr className={styles.editingRow} data-row-id={rowId}>
        <td colSpan={totalCols}>{renderEditableRow(item)}</td>
      </tr>
    );
  }

  return (
    <tr
      data-row-id={rowId}
      className={clickable ? styles.clickableRow : undefined}
      onClick={() => onRowClick?.(item)}
    >
      {selectable && (
        <td style={{ width: 40 }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={isSelected}
            onChange={() => onToggleSelect(rowId)}
            aria-label="Select row"
          />
        </td>
      )}
      {columns.map((col, colIndex) => {
        const alignClass =
          col.align === "right"
            ? styles.alignRight
            : col.align === "center"
              ? styles.alignCenter
              : undefined;
        return (
          <td key={colIndex} className={alignClass}>
            {col.cell
              ? col.cell(item)
              : String(readField(item, col.accessorKey) ?? "")}
          </td>
        );
      })}
      {hasActions && getRowActions && (
        <td
          style={{ width: 56, textAlign: "right" }}
          onClick={(e) => e.stopPropagation()}
        >
          <RowActionsCell item={item} getActions={getRowActions} />
        </td>
      )}
    </tr>
  );
}

const DataRow = memo(DataRowImpl) as typeof DataRowImpl;

// ── Main DataGrid ─────────────────────────────────────────────────────────

export default function DataGrid<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchKeys = [],
  itemsPerPage = 10,
  emptyMessage = "No data available.",
  emptyState,
  getRowId,
  selectable = false,
  selectedIds,
  onSelectionChange,
  rowActions,
  onRowClick,
  editingRowId = null,
  renderEditableRow,
  renderMobileCard,
}: DataGridProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortStack, setSortStack] = useState<SortEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    {},
  );
  const [columnFilters, setColumnFilters] = useState<
    Record<string, string | undefined>
  >({});
  // Internal selection state when the consumer doesn't control it.
  const [internalSelected, setInternalSelected] = useState<string[]>([]);

  const resolvedSelected = selectedIds ?? internalSelected;

  const rowIdFn = useCallback(
    (item: T, index: number): string =>
      getRowId ? getRowId(item, index) : String(index),
    [getRowId],
  );

  // ---- Filter --------------------------------------------------------------
  const filteredData = useMemo(() => {
    let out = data;

    // Text search
    if (searchTerm && searchKeys.length > 0) {
      const lower = searchTerm.toLowerCase();
      out = out.filter((item) =>
        searchKeys.some((key) =>
          String(readField(item, key) ?? "")
            .toLowerCase()
            .includes(lower),
        ),
      );
    }

    // Per-column filters
    const activeFilters = Object.entries(columnFilters).filter(
      ([, v]) => v !== undefined && v !== "",
    );
    if (activeFilters.length > 0) {
      out = out.filter((item) => {
        return activeFilters.every(([colId, value]) => {
          const colIndex = columns.findIndex(
            (c, i) => getColumnId(c, i) === colId,
          );
          if (colIndex < 0) return true;
          const col = columns[colIndex];
          if (col.filterFn) return col.filterFn(item, value as string);
          // Default: equality on the accessorKey field.
          return String(readField(item, col.accessorKey) ?? "") === value;
        });
      });
    }

    return out;
  }, [data, searchTerm, searchKeys, columnFilters, columns]);

  // ---- Sort (multi-column) -------------------------------------------------
  const sortedData = useMemo(() => {
    if (sortStack.length === 0) return filteredData;
    const copy = [...filteredData];
    copy.sort((a, b) => {
      for (const entry of sortStack) {
        const av = readField(a, entry.key);
        const bv = readField(b, entry.key);
        const cmp = compareValues(av, bv);
        if (cmp !== 0) return entry.dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return copy;
  }, [filteredData, sortStack]);

  // ---- Paginate ------------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, safePage, itemsPerPage]);

  // ---- Sort handler --------------------------------------------------------
  const handleSort = (key: string, shiftKey: boolean) => {
    setSortStack((prev) => {
      const existing = prev.find((e) => e.key === key);
      if (shiftKey) {
        // Multi-sort: toggle / add / remove within the stack.
        if (!existing) return [...prev, { key, dir: "asc" }];
        if (existing.dir === "asc") {
          return prev.map((e) => (e.key === key ? { key, dir: "desc" } : e));
        }
        // desc → remove from stack
        return prev.filter((e) => e.key !== key);
      }
      // Single sort: replace stack. Cycle asc → desc → none.
      if (!existing) return [{ key, dir: "asc" }];
      if (existing.dir === "asc") return [{ key, dir: "desc" }];
      return [];
    });
    setCurrentPage(1);
  };

  // ---- Resize handler ------------------------------------------------------
  const handleResize = (colId: string, delta: number) => {
    setColumnWidths((prev) => {
      const current = prev[colId] ?? 0;
      // First-resize: read the actual th width from the DOM.
      let base = current;
      if (!base) {
        const th = document.querySelector<HTMLElement>(
          `th[data-col-id="${colId}"]`,
        );
        base = th?.offsetWidth ?? 120;
      }
      return { ...prev, [colId]: Math.max(60, base + delta) };
    });
  };

  // ---- Filter handler ------------------------------------------------------
  const handleFilter = (colId: string, value: string | undefined) => {
    setColumnFilters((prev) => ({ ...prev, [colId]: value }));
    setCurrentPage(1);
  };

  // ---- Selection handlers --------------------------------------------------
  const handleToggleSelect = (id: string) => {
    const next = resolvedSelected.includes(id)
      ? resolvedSelected.filter((x) => x !== id)
      : [...resolvedSelected, id];
    if (onSelectionChange) onSelectionChange(next);
    else setInternalSelected(next);
  };

  const handleSelectAll = () => {
    const pageIds = paginatedData.map((item, i) => rowIdFn(item, i));
    const allSelected = pageIds.every((id) => resolvedSelected.includes(id));
    const next = allSelected
      ? resolvedSelected.filter((id) => !pageIds.includes(id))
      : Array.from(new Set([...resolvedSelected, ...pageIds]));
    if (onSelectionChange) onSelectionChange(next);
    else setInternalSelected(next);
  };

  const clearSelection = () => {
    if (onSelectionChange) onSelectionChange([]);
    else setInternalSelected([]);
  };

  // Reset page when filters shrink the result set below the current page.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const hasActions = !!rowActions;
  const showActionsColumn = selectable || hasActions;
  const totalCols =
    columns.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0);
  const pageIds = paginatedData.map((item, i) => rowIdFn(item, i));
  const allOnPageSelected =
    pageIds.length > 0 &&
    pageIds.every((id) => resolvedSelected.includes(id));

  return (
    <div className="flex-col gap-4">
      {/* Selection bar (only when selectable + has selection) */}
      {selectable && resolvedSelected.length > 0 && (
        <div className={styles.selectionBar}>
          <span>
            <strong>{resolvedSelected.length}</strong> selected
          </span>
          <div className={styles.selectionBarActions}>
            <button
              type="button"
              className={styles.clearSelection}
              onClick={clearSelection}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {searchable && (
        <div className={styles.searchWrap}>
          <div className={styles.searchBox}>
            <Search
              className={styles.searchIcon}
              size={18}
              aria-hidden="true"
            />
            <input
              type="text"
              className={`form-input ${styles.searchInput}`}
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      <div className="data-grid-container">
        <table className="data-grid hidden md:table">
          <thead>
            <tr>
              {selectable && (
                <th
                  style={{ width: 40 }}
                  aria-label="Select all on page"
                >
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={allOnPageSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all on page"
                  />
                </th>
              )}
              {columns.map((col, i) => {
                const colId = getColumnId(col, i);
                const width = columnWidths[colId] ?? col.width;
                const sortEntry = sortStack.find(
                  (e) => e.key === String(col.accessorKey),
                );
                return (
                  <HeaderCell
                    key={i}
                    col={col}
                    colId={colId}
                    colIndex={i}
                    width={width}
                    sortState={sortEntry}
                    filterValue={columnFilters[colId]}
                    onSort={handleSort}
                    onResize={handleResize}
                    onFilter={handleFilter}
                    data-col-id={colId}
                  />
                );
              })}
              {hasActions && <th style={{ width: 56 }} aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, rowIndex) => {
                const rowId = rowIdFn(item, rowIndex);
                const isEditing = editingRowId === rowId;
                return (
                  <DataRow
                    key={rowId}
                    item={item}
                    columns={columns}
                    isEditing={isEditing}
                    renderEditableRow={renderEditableRow}
                    clickable={!!onRowClick}
                    onRowClick={onRowClick}
                    selectable={selectable}
                    isSelected={resolvedSelected.includes(rowId)}
                    onToggleSelect={handleToggleSelect}
                    rowId={rowId}
                    hasActions={hasActions}
                    getRowActions={rowActions}
                    totalCols={totalCols}
                  />
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + (showActionsColumn ? 1 : 0)}>
                  {emptyState ? (
                    <EmptyState
                      title={emptyState.title}
                      description={emptyState.description}
                      icon={
                        emptyState.icon ?? (
                          <Inbox size={32} aria-hidden="true" />
                        )
                      }
                      action={emptyState.action}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted">
                      {emptyMessage}
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col gap-4 p-4">
          {paginatedData.length > 0 ? (
            paginatedData.map((item, rowIndex) => {
              const rowId = rowIdFn(item, rowIndex);
              const isEditing = editingRowId === rowId;
              // Bespoke mobile card replaces the generic card entirely.
              if (!isEditing && renderMobileCard) {
                return <div key={rowId}>{renderMobileCard(item)}</div>;
              }
              return (
                <div
                  key={rowId}
                  className={`card p-4 border border-color rounded-md bg-white shadow-sm flex flex-col gap-2 ${
                    isEditing ? styles.editingRow : ""
                  }`}
                >
                  {selectable && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={resolvedSelected.includes(rowId)}
                        onChange={() => handleToggleSelect(rowId)}
                        aria-label="Select row"
                      />
                      <span className="text-xs font-medium text-muted uppercase">
                        Select
                      </span>
                    </div>
                  )}
                  {isEditing && renderEditableRow ? (
                    <div className="flex flex-col gap-2">
                      {renderEditableRow(item)}
                    </div>
                  ) : renderMobileCard ? (
                    renderMobileCard(item)
                  ) : (
                    columns.map((col, colIndex) => (
                      <div
                        key={colIndex}
                        className="flex justify-between items-start gap-4 border-b border-color pb-2 last:border-0 last:pb-0"
                      >
                        <span className="text-xs font-medium text-muted uppercase">
                          {col.header}
                        </span>
                        <div className="text-sm text-right font-medium">
                          {col.cell
                            ? col.cell(item)
                            : String(readField(item, col.accessorKey) ?? "")}
                        </div>
                      </div>
                    ))
                  )}
                  {!isEditing && hasActions && rowActions && (
                    <div className="flex justify-end pt-2 border-t border-color">
                      <RowActionsCell item={item} getActions={rowActions} />
                    </div>
                  )}
                </div>
              );
            })
          ) : emptyState ? (
            <EmptyState
              title={emptyState.title}
              description={emptyState.description}
              icon={emptyState.icon ?? <Inbox size={32} aria-hidden="true" />}
              action={emptyState.action}
            />
          ) : (
            <div className="text-center py-8 text-muted">{emptyMessage}</div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted">
            Showing {(safePage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(safePage * itemsPerPage, sortedData.length)} of{" "}
            {sortedData.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-secondary !px-2 !py-1"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium px-2">
              Page {safePage} of {totalPages}
            </span>
            <button
              className="btn btn-secondary !px-2 !py-1"
              disabled={safePage === totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

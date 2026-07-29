'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import EmptyState from './EmptyState';

export type ColumnDef<T> = {
  header: string;
  accessorKey?: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
};

type DataGridProps<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  searchable?: boolean;
  searchKeys?: (keyof T | string)[];
  itemsPerPage?: number;
  emptyMessage?: string;
  /**
   * Full custom empty state — takes precedence over emptyMessage.
   * Pass title/description/action to render the shared EmptyState component.
   */
  emptyState?: { title: string; description?: string; icon?: React.ReactNode; action?: React.ReactNode };
};

export default function DataGrid<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchKeys = [],
  itemsPerPage = 10,
  emptyMessage = 'No data available.',
  emptyState,
}: DataGridProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Search
  const filteredData = useMemo(() => {
    if (!searchTerm || searchKeys.length === 0) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(item => {
      return searchKeys.some(key => {
        const val = item[key as keyof T];
        return String(val).toLowerCase().includes(lowerSearch);
      });
    });
  }, [data, searchTerm, searchKeys]);

  // Sort
  const sortedData = useMemo(() => {
    const sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="flex-col gap-4">
      {searchable && (
        <div className="flex justify-end mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              className="form-input pl-10"
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
              {columns.map((col, i) => {
                const sortState =
                  col.sortable && sortConfig?.key === col.accessorKey
                    ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending')
                    : col.sortable ? 'none' : undefined;
                return (
                  <th
                    key={i}
                    aria-sort={sortState as any}
                    className={col.sortable ? 'cursor-pointer select-none' : ''}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => col.accessorKey && handleSort(String(col.accessorKey))}
                        style={{
                          all: 'unset',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          width: '100%',
                          cursor: 'pointer',
                          font: 'inherit',
                          color: 'inherit',
                        }}
                      >
                        <span>{col.header}</span>
                        {col.sortable && sortConfig?.key === col.accessorKey && (
                          sortConfig?.direction === 'asc'
                            ? <ChevronUp size={14} aria-hidden="true" />
                            : <ChevronDown size={14} aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((col, colIndex) => (
                    <td key={colIndex}>
                      {col.cell ? col.cell(item) : String(item[col.accessorKey as keyof T] || '')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  {emptyState ? (
                    <EmptyState
                      title={emptyState.title}
                      description={emptyState.description}
                      icon={emptyState.icon ?? <Inbox size={32} aria-hidden="true" />}
                      action={emptyState.action}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted">{emptyMessage}</div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col gap-4 p-4">
          {paginatedData.length > 0 ? (
            paginatedData.map((item, rowIndex) => (
              <div key={rowIndex} className="card p-4 border border-color rounded-md bg-white shadow-sm flex flex-col gap-2">
                {columns.map((col, colIndex) => (
                  <div key={colIndex} className="flex justify-between items-start gap-4 border-b border-color pb-2 last:border-0 last:pb-0">
                    <span className="text-xs font-medium text-muted uppercase">{col.header}</span>
                    <div className="text-sm text-right font-medium">
                      {col.cell ? col.cell(item) : String(item[col.accessorKey as keyof T] || '')}
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            emptyState ? (
              <EmptyState
                title={emptyState.title}
                description={emptyState.description}
                icon={emptyState.icon ?? <Inbox size={32} aria-hidden="true" />}
                action={emptyState.action}
              />
            ) : (
              <div className="text-center py-8 text-muted">
                {emptyMessage}
              </div>
            )
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-secondary !px-2 !py-1"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn-secondary !px-2 !py-1"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

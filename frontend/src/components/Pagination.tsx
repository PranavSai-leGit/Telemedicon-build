import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PaginationMetadata } from '../types';

interface PaginationProps {
  pagination?: PaginationMetadata | null;
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  loading?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  currentPage,
  pageSize,
  totalRecords,
  totalPages: propTotalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  loading = false,
  className = '',
}) => {
  const effectiveTotalPages =
    pagination?.total_pages ??
    propTotalPages ??
    (totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0);

  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  const hasPrevious = pagination?.has_previous ?? currentPage > 1;
  const hasNext = pagination?.has_next ?? (effectiveTotalPages > 0 && currentPage < effectiveTotalPages);

  // Generate numbered page buttons with truncation ellipsis
  const getPageNumbers = () => {
    if (effectiveTotalPages <= 7) {
      return Array.from({ length: effectiveTotalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(effectiveTotalPages);
    } else if (currentPage >= effectiveTotalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = effectiveTotalPages - 4; i <= effectiveTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('...');
      pages.push(effectiveTotalPages);
    }
    return pages;
  };

  if (totalRecords === 0) {
    return (
      <div className={`flex items-center justify-between py-3 px-4 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50/50 dark:bg-neutral-900/40 rounded-lg border border-neutral-200 dark:border-neutral-800 ${className}`}>
        <span>No records found to display.</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 py-3 px-4 text-xs text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      {/* Records count display */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-neutral-800 dark:text-neutral-200">
          Showing <span className="font-semibold">{startRecord}</span>–<span className="font-semibold">{endRecord}</span> of <span className="font-semibold">{totalRecords}</span> records
        </span>

        {/* Page size dropdown */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-neutral-200 dark:border-neutral-700">
            <span className="text-neutral-500 dark:text-neutral-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={!hasPrevious || loading}
          title="First Page"
          className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-600 dark:text-neutral-400 transition-colors"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevious || loading}
          className="flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-1.5 py-0.5 text-neutral-400">
                ...
              </span>
            ) : (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(Number(p))}
                disabled={loading || p === currentPage}
                className={`min-w-[28px] h-7 px-2 rounded font-medium transition-colors ${
                  p === currentPage
                    ? 'bg-primary-600 text-white font-semibold shadow-xs'
                    : 'border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext || loading}
          className="flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(effectiveTotalPages)}
          disabled={!hasNext || loading}
          title="Last Page"
          className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-600 dark:text-neutral-400 transition-colors"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

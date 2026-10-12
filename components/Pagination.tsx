"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize = 10,
}: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalCount <= pageSize) {
    return (
      <div className="bg-white dark:bg-boxdark border-t border-slate-200/80 dark:border-strokedark px-4 py-3 flex items-center justify-between text-xs text-slate-500 dark:text-bodydark2">
        <div>
          Showing <strong className="text-slate-800 dark:text-white">{totalCount > 0 ? 1 : 0}</strong> to{" "}
          <strong className="text-slate-800 dark:text-white">{totalCount}</strong> of{" "}
          <strong className="text-slate-800 dark:text-white">{totalCount}</strong> entries
        </div>
      </div>
    );
  }

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    return `${pathname}?${params.toString()}`;
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Generate page numbers array (with ellipses if necessary)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push("...");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="bg-white dark:bg-boxdark border-t border-slate-200/80 dark:border-strokedark px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-bodydark2">
      <div>
        Showing <strong className="text-slate-800 dark:text-white">{startItem}</strong> to{" "}
        <strong className="text-slate-800 dark:text-white">{endItem}</strong> of{" "}
        <strong className="text-slate-800 dark:text-white">{totalCount.toLocaleString()}</strong> entries
      </div>

      <div className="flex items-center gap-1.5 font-medium">
        {/* Previous Button */}
        {currentPage > 1 ? (
          <Link
            href={createPageUrl(currentPage - 1)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1 shadow-2xs"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </Link>
        ) : (
          <span className="px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed flex items-center gap-1 select-none">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </span>
        )}

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (typeof p === "string") {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 select-none">
                  ...
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return isCurrent ? (
              <span
                key={p}
                className="w-8 h-8 rounded-lg bg-emerald-700 dark:bg-emerald-600 text-white font-bold flex items-center justify-center border border-emerald-700 dark:border-emerald-600 shadow-2xs text-xs"
              >
                {p}
              </span>
            ) : (
              <Link
                key={p}
                href={createPageUrl(p)}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center transition shadow-2xs text-xs"
              >
                {p}
              </Link>
            );
          })}
        </div>

        {/* Next Button */}
        {currentPage < totalPages ? (
          <Link
            href={createPageUrl(currentPage + 1)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1 shadow-2xs"
            title="Next Page"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span className="px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed flex items-center gap-1 select-none">
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

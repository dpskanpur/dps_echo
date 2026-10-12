"use client";

import React from "react";
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

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    return `${pathname}?${params.toString()}`;
  };

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
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
    <div className="bg-white border-t border-slate-200 px-3 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 select-none">
      <div className="tabular-nums font-mono text-[11px]">
        Showing <span className="font-semibold text-slate-900 dark:text-white">{startItem}</span>–<span className="font-semibold text-slate-900 dark:text-white">{endItem}</span> of{" "}
        <span className="font-semibold text-slate-900 dark:text-white">{totalCount.toLocaleString()}</span> records
      </div>

      <div className="flex items-center gap-1">
        {/* Previous Button */}
        {currentPage > 1 ? (
          <Link
            href={createPageUrl(currentPage - 1)}
            className="h-7 px-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition flex items-center gap-1 text-[11px] font-medium"
            title="Previous Page"
          >
            <ChevronLeft className="w-3 h-3" />
            <span>Prev</span>
          </Link>
        ) : (
          <span className="h-7 px-2 rounded border border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-600 cursor-not-allowed flex items-center gap-1 text-[11px]">
            <ChevronLeft className="w-3 h-3" />
            <span>Prev</span>
          </span>
        )}

        {/* Page Number Buttons */}
        <div className="flex items-center gap-0.5">
          {pageNumbers.map((p, idx) => {
            if (typeof p === "string") {
              return (
                <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-slate-400 text-xs">
                  ...
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return isCurrent ? (
              <span
                key={p}
                className="w-7 h-7 rounded bg-slate-900 text-white font-mono font-medium flex items-center justify-center text-xs dark:bg-slate-100 dark:text-slate-900"
              >
                {p}
              </span>
            ) : (
              <Link
                key={p}
                href={createPageUrl(p)}
                className="w-7 h-7 rounded border border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-700 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-800 font-mono flex items-center justify-center transition text-xs"
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
            className="h-7 px-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition flex items-center gap-1 text-[11px] font-medium"
            title="Next Page"
          >
            <span>Next</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        ) : (
          <span className="h-7 px-2 rounded border border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-600 cursor-not-allowed flex items-center gap-1 text-[11px]">
            <span>Next</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );
}

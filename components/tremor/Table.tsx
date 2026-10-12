import React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-left border-collapse", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "bg-slate-50/95 sticky top-0 z-10 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-900/95 dark:border-slate-800 dark:text-slate-400",
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-slate-100 text-[13px] dark:divide-slate-800", className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("py-2.5 px-3 text-left font-semibold select-none", className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("py-2 px-3 align-middle", className)} {...props}>
      {children}
    </td>
  );
}

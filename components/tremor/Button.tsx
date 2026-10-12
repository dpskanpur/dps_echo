import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "xs" | "sm" | "md";
}

export function Button({
  variant = "secondary",
  size = "sm",
  className,
  children,
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 border border-transparent font-medium shadow-none",
    secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800 dark:hover:bg-slate-800/80 font-medium",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 border border-transparent",
    destructive: "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 font-medium",
  };

  const sizeStyles = {
    xs: "h-7 px-2 text-[11px] rounded",
    sm: "h-8 px-2.5 text-xs rounded-md",
    md: "h-9 px-3 text-xs rounded-md",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

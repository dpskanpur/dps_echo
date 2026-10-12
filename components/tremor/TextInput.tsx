import React from "react";
import { cn } from "@/lib/utils";

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ComponentType<{ className?: string }>;
}

export function TextInput({ icon: Icon, className, ...props }: TextInputProps) {
  return (
    <div className="relative flex items-center w-full">
      {Icon && (
        <span className="absolute left-2.5 text-slate-400 pointer-events-none">
          <Icon className="w-3.5 h-3.5" />
        </span>
      )}
      <input
        className={cn(
          "h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
          Icon ? "pl-8" : "",
          className
        )}
        {...props}
      />
    </div>
  );
}

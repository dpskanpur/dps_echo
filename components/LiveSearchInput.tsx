"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { Search, Loader2, X } from "lucide-react";

export function LiveSearchInput({
  paramName = "q",
  placeholder = "Search...",
  defaultValue = "",
  className = "",
  targetPath,
}: {
  paramName?: string;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  targetPath?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [value, setValue] = useState(defaultValue || searchParams.get(paramName) || "");

  useEffect(() => {
    setValue(searchParams.get(paramName) || "");
  }, [searchParams, paramName]);

  const handleSearch = (term: string) => {
    setValue(term);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1"); // Reset pagination on search change

    if (term.trim()) {
      params.set(paramName, term.trim());
    } else {
      params.delete(paramName);
    }

    const destPath = targetPath || pathname;
    startTransition(() => {
      router.push(`${destPath}?${params.toString()}`);
    });
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 text-xs border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition shadow-xs"
      />
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 absolute right-3 text-emerald-600 animate-spin shrink-0" />
      ) : value ? (
        <button
          type="button"
          onClick={() => handleSearch("")}
          className="absolute right-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/50 transition cursor-pointer shrink-0"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  );
}

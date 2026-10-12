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
      <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full bg-white text-xs border border-slate-200 rounded-md pl-8 pr-7 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition"
      />
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 absolute right-2.5 text-slate-500 animate-spin shrink-0" />
      ) : value ? (
        <button
          type="button"
          onClick={() => handleSearch("")}
          className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition cursor-pointer shrink-0"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  );
}

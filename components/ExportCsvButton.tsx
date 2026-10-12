"use client";

import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/tremor";

export interface ExportCsvButtonProps {
  filename: string;
  data: Record<string, any>[];
  headers?: { key: string; label: string }[];
  className?: string;
}

export function ExportCsvButton({
  filename,
  data,
  headers,
  className,
}: ExportCsvButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    const cols = headers || Object.keys(data[0]).map((k) => ({ key: k, label: k }));
    const headerRow = cols.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
    const rows = data.map((item) =>
      cols
        .map((c) => {
          const val = item[c.key] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const blob = new Blob([[headerRow, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename.endsWith(".csv") ? filename : `${filename}.csv`}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="xs"
      onClick={handleExport}
      className={className}
      title="Export CSV"
    >
      <Download className="w-3 h-3 text-slate-500" />
      <span>Export CSV</span>
    </Button>
  );
}

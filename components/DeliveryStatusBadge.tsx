import React from "react";
import { Check, CheckCheck, XCircle, Clock, MinusCircle } from "lucide-react";

interface DeliveryStatusBadgeProps {
  status: string;
  channel: string;
  error?: string | null;
}

export function DeliveryStatusBadge({ status, channel, error }: DeliveryStatusBadgeProps) {
  if (channel === "SMS") {
    switch (status) {
      case "DELIVERED":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300"
            title="Handset Delivery Confirmed (DELIVRD)"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" /> Delivered
          </span>
        );
      case "SENT":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold bg-slate-100 text-slate-700 border-slate-300"
            title="SMS Dispatched to Gateway (Status 1)"
          >
            <Check className="w-3.5 h-3.5 text-slate-500 stroke-[2.5]" /> Sent
          </span>
        );
      case "FAILED":
      case "UNDELIVERED":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold bg-rose-100 text-rose-800 border-rose-300"
            title={error || "Delivery Failed / Undelivered"}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" /> Failed
          </span>
        );
      case "PENDING":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold bg-amber-100 text-amber-800 border-amber-300"
            title="Queued for dispatch"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Queued
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold bg-slate-100 text-slate-600 border-slate-200"
            title={error || undefined}
          >
            <MinusCircle className="w-3.5 h-3.5 text-slate-400" /> {status}
          </span>
        );
    }
  }

  // Fallback for EMAIL and other channels
  const STYLE_MAP: Record<string, string> = {
    SENT: "bg-emerald-100 text-emerald-800 border-emerald-200",
    DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    FAILED: "bg-rose-100 text-rose-800 border-rose-200",
    SKIPPED: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${
        STYLE_MAP[status] || "bg-slate-100 text-slate-600 border-slate-200"
      }`}
      title={error || undefined}
    >
      {status}
    </span>
  );
}

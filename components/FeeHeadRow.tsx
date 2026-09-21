"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, Trash2, X, Check, Loader2, AlertTriangle } from "lucide-react";
import { updateFeeHead, deleteFeeHead } from "@/lib/fee-structure-actions";

interface FeeHead {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isOptional: boolean;
  isRefundable: boolean;
}

function SubmitButton({ label, busyLabel }: { label: string; busyLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[#0F9D58] text-white hover:bg-emerald-700 disabled:opacity-60 transition"
    >
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
      {pending ? busyLabel : label}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 transition"
    >
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

/**
 * One fee head, with its actions always visible.
 *
 * Edit and delete are icon buttons on the row rather than controls buried
 * inside an expanded panel, and editing is explicit state with a Cancel that
 * discards changes — a <details> element could only be opened and closed, so
 * "Save" with nothing changed was the only way out.
 */
export function FeeHeadRow({ head }: { head: FeeHead }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");

  if (mode === "edit") {
    return (
      <li className="rounded-lg border border-emerald-300 bg-white p-3">
        <form action={updateFeeHead} className="space-y-2.5">
          <input type="hidden" name="feeHeadId" value={head.id} />

          <div className="flex gap-2">
            <input
              type="text"
              name="code"
              defaultValue={head.code}
              required
              aria-label="Fee head code"
              className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
            <input
              type="text"
              name="name"
              defaultValue={head.name}
              required
              aria-label="Fee head name"
              className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>

          <input
            type="text"
            name="description"
            defaultValue={head.description || ""}
            placeholder="Description (optional)"
            aria-label="Description"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <input
                  type="checkbox"
                  name="isOptional"
                  defaultChecked={head.isOptional}
                  className="accent-[#0F9D58]"
                />
                Optional
              </label>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <input
                  type="checkbox"
                  name="isRefundable"
                  defaultChecked={head.isRefundable}
                  className="accent-[#0F9D58]"
                />
                Refundable
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode("view")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
              <SubmitButton label="Save changes" busyLabel="Saving…" />
            </div>
          </div>
        </form>
      </li>
    );
  }

  if (mode === "confirmDelete") {
    return (
      <li className="rounded-lg border border-rose-300 bg-rose-50/60 p-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <p className="text-xs text-rose-900">
              Delete <strong>{head.name}</strong> ({head.code})? This is only possible while the
              head is unused — not on any invoice and not carrying a fee structure amount.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode("view")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
              <form action={deleteFeeHead}>
                <input type="hidden" name="feeHeadId" value={head.id} />
                <DeleteButton />
              </form>
            </div>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300 transition">
      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
        {head.code}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-800 truncate">{head.name}</span>
        {head.description && (
          <span className="block text-[11px] text-slate-400 truncate">{head.description}</span>
        )}
      </span>

      <span className="flex items-center gap-1 shrink-0">
        {head.isOptional && (
          <span className="text-[9px] font-bold uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
            optional
          </span>
        )}
        {head.isRefundable && (
          <span className="text-[9px] font-bold uppercase text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
            refundable
          </span>
        )}
      </span>

      <span className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => setMode("edit")}
          title={`Edit ${head.name}`}
          aria-label={`Edit ${head.name}`}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-800 hover:bg-emerald-50 transition"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setMode("confirmDelete")}
          title={`Delete ${head.name}`}
          aria-label={`Delete ${head.name}`}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </span>
    </li>
  );
}

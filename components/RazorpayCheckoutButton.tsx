"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, AlertTriangle, Receipt } from "lucide-react";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

type Phase = "idle" | "loading" | "open" | "verifying" | "paid" | "pending" | "error";

function loadCheckoutScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function RazorpayCheckoutButton({
  invoiceId,
  payToken,
  amountLabel,
  invoiceNo,
}: {
  invoiceId: string;
  payToken: string;
  amountLabel: string;
  invoiceNo: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [receiptNo, setReceiptNo] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  /**
   * The browser callback is not proof of payment — the signed webhook is.
   * So after checkout closes we poll our own ledger until it reflects the
   * capture, and only then show a receipt number.
   */
  const pollForReconciliation = useCallback(
    async (orderId: string, attempt = 0) => {
      try {
        const res = await fetch(
          `/api/payments/status?orderId=${encodeURIComponent(orderId)}&payToken=${encodeURIComponent(payToken)}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (data?.status === "PAID" && data?.receiptNo) {
          setReceiptNo(data.receiptNo);
          setPhase("paid");
          setTimeout(() => window.location.reload(), 2500);
          return;
        }

        if (data?.status === "FAILED") {
          setPhase("error");
          setMessage(data?.failureReason || "The payment did not go through. No amount was charged.");
          return;
        }

        if (attempt >= 12) {
          // Captured at the gateway but not yet reconciled here.
          setPhase("pending");
          return;
        }

        pollRef.current = setTimeout(() => pollForReconciliation(orderId, attempt + 1), 2500);
      } catch {
        if (attempt >= 12) {
          setPhase("pending");
          return;
        }
        pollRef.current = setTimeout(() => pollForReconciliation(orderId, attempt + 1), 2500);
      }
    },
    [payToken]
  );

  const startPayment = useCallback(async () => {
    setPhase("loading");
    setMessage("");

    const scriptReady = await loadCheckoutScript();
    if (!scriptReady) {
      setPhase("error");
      setMessage("Could not reach the payment gateway. Check your connection and try again.");
      return;
    }

    let order: any;
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, payToken }),
      });
      order = await res.json();

      if (!res.ok || !order?.success) {
        setPhase("error");
        setMessage(order?.error || "Could not start the payment. Please try again.");
        return;
      }
    } catch {
      setPhase("error");
      setMessage("Could not start the payment. Please try again.");
      return;
    }

    const checkout = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "Delhi Public School Kanpur",
      description: `Fee payment — ${order.invoiceNo}`,
      prefill: order.prefill,
      notes: { invoiceNo: order.invoiceNo },
      theme: { color: "#0F9D58" },
      modal: {
        ondismiss: () => {
          setPhase("idle");
          setMessage("Payment window closed. Nothing was charged.");
        },
      },
      handler: () => {
        setPhase("verifying");
        pollForReconciliation(order.orderId);
      },
    });

    checkout.on("payment.failed", (response: any) => {
      setPhase("error");
      setMessage(response?.error?.description || "The payment failed. No amount was charged.");
    });

    setPhase("open");
    checkout.open();
  }, [invoiceId, payToken, pollForReconciliation]);

  if (phase === "paid") {
    return (
      <div className="p-4 bg-emerald-50 border border-emerald-200 flex items-start gap-3">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
        <div className="text-xs text-emerald-950">
          <strong className="block font-bold">Payment received</strong>
          <p className="text-[11px] text-emerald-800 mt-0.5">
            Receipt <span className="font-mono font-bold">{receiptNo}</span> has been generated for{" "}
            {invoiceNo}. A confirmation is on its way to your registered contact.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "pending") {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
        <Receipt className="w-6 h-6 text-amber-600 shrink-0" />
        <div className="text-xs text-amber-950">
          <strong className="block font-bold">Payment received — receipt on its way</strong>
          <p className="text-[11px] text-amber-800 mt-0.5">
            Your bank has confirmed the payment. The receipt is still being posted to the school
            ledger and will reach your registered email and mobile shortly. No further action or
            repeat payment is needed.
          </p>
        </div>
      </div>
    );
  }

  const busy = phase === "loading" || phase === "open" || phase === "verifying";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={startPayment}
        disabled={busy}
        className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 text-xs transition flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {phase === "verifying" ? "Confirming payment…" : "Opening secure gateway…"}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> Pay {amountLabel} via UPI / Card
          </>
        )}
      </button>

      {phase === "verifying" && (
        <p className="text-[11px] text-slate-500 text-center">
          Please keep this page open while we confirm with your bank.
        </p>
      )}

      {message && (
        <div
          className={`p-2.5  border text-[11px] flex items-start gap-2 ${
            phase === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-slate-50 border-slate-300 text-slate-600"
          }`}
        >
          {phase === "error" && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}

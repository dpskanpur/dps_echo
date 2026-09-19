"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for failures in the root layout itself.
 *
 * It must render its own <html> and <body>, because the layout that would
 * normally provide them is the thing that failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 28,
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: 0 }}>
            DPS Echo could not start
          </h1>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 6, lineHeight: 1.6 }}>
            The application failed before the page could be rendered. This usually means a required
            environment variable is missing or the database is unreachable.
          </p>

          {isDev && error?.message && (
            <pre
              style={{
                marginTop: 16,
                padding: 12,
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                borderRadius: 12,
                fontSize: 11,
                color: "#881337",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {error.message}
            </pre>
          )}

          <button
            onClick={reset}
            style={{
              marginTop: 20,
              width: "100%",
              background: "#0F9D58",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              padding: "10px 16px",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}

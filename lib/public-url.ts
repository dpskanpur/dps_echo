/**
 * Builds absolute URLs using the address the browser actually used.
 *
 * Behind Cloud Run (or any proxy) `request.url` carries the container's
 * internal bind address — 0.0.0.0:8080 — so redirects built from it send
 * users to a host that does not exist outside the container.
 *
 * Order of preference:
 *   1. NEXTAUTH_URL / NEXT_PUBLIC_APP_URL — explicit and therefore correct
 *   2. x-forwarded-host / x-forwarded-proto set by the proxy
 *   3. request.url, for plain local development
 */
export function publicBaseUrl(request: Request): string {
  const configured = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const headers = request.headers;
  const forwardedHost = headers.get("x-forwarded-host") || headers.get("host");

  if (forwardedHost && !forwardedHost.startsWith("0.0.0.0")) {
    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(forwardedHost);
    const proto = headers.get("x-forwarded-proto") || (isLocal ? "http" : "https");
    return `${proto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

/** Absolute URL for `path` on the public origin. */
export function publicUrl(path: string, request: Request): URL {
  return new URL(path, publicBaseUrl(request));
}

/**
 * Runs once when the server process starts (Next.js instrumentation hook).
 *
 * Node 17 changed DNS result ordering from "ipv4first" to "verbatim", so
 * getaddrinfo now returns AAAA records ahead of A records. On a network with
 * advertised but non-functional IPv6, that surfaces as an intermittent
 * ENOTFOUND for hosts that resolve perfectly well over IPv4 — which is why
 * curl succeeds while the Node server fails on the same machine.
 *
 * This is process-wide configuration set once at boot, not a fallback in the
 * request path. It restores the pre-Node-17 behaviour and nothing else.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const dns = await import("node:dns");
    dns.setDefaultResultOrder("ipv4first");

    // Surface a missing session signing key at boot, so a misconfigured
    // revision fails to start instead of failing on the first sign-in.
    const { resolveSessionSecret } = await import("@/lib/session-cookie");
    resolveSessionSecret();
  }
}

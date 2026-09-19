import { NextResponse } from "next/server";
import dns from "dns";
import { resilientFetch } from "@/lib/resilient-fetch";

export const dynamic = "force-dynamic";

/**
 * Reports what the *server process* can actually resolve and reach.
 *
 * The shell resolving a hostname says nothing about the Node process serving
 * requests — different container, different resolver, or a proxy the shell
 * does not have. This endpoint answers that directly.
 *
 * Development only: it is refused outright in production.
 */

const HOSTS = ["oauth2.googleapis.com", "www.googleapis.com", "google.com", "example.com"];

async function probe(hostname: string) {
  const result: Record<string, unknown> = { hostname };

  // dns.lookup -> getaddrinfo (what fetch uses)
  try {
    const looked = await dns.promises.lookup(hostname, { all: true });
    result.lookup = looked.map((a) => `${a.address} (IPv${a.family})`);
  } catch (err: any) {
    result.lookup = `FAILED: ${err?.code || ""} ${err?.message || err}`.trim();
  }

  // dns.resolve4 -> c-ares, queries the configured nameservers directly
  try {
    result.resolve4 = await dns.promises.resolve4(hostname);
  } catch (err: any) {
    result.resolve4 = `FAILED: ${err?.code || ""} ${err?.message || err}`.trim();
  }

  return result;
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  const probes = [];
  for (const host of HOSTS) {
    probes.push(await probe(host));
  }

  let httpsReachable: string;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
    });
    httpsReachable = `OK — HTTP ${res.status} (400 is the expected reply to an empty POST)`;
  } catch (err: any) {
    httpsReachable = `FAILED: ${err?.cause?.message || err?.message || err}`;
  }

  // The path sign-in actually uses: plain fetch, then the system resolver,
  // then public DNS. This is what must work, not the line above.
  let resilientReachable: string;
  try {
    const res = await resilientFetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      timeoutMs: 12000,
    });
    resilientReachable = `OK — HTTP ${res.status} via resilient path`;
  } catch (err: any) {
    resilientReachable = `FAILED: ${err?.message || err}`;
  }

  return NextResponse.json(
    {
      process: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        // 'linux' here on a Mac means the dev server is inside a container,
        // which would explain a resolver that differs from your shell.
        cwd: process.cwd(),
      },
      proxyEnv: {
        HTTP_PROXY: process.env.HTTP_PROXY || process.env.http_proxy || null,
        HTTPS_PROXY: process.env.HTTPS_PROXY || process.env.https_proxy || null,
        ALL_PROXY: process.env.ALL_PROXY || process.env.all_proxy || null,
        NO_PROXY: process.env.NO_PROXY || process.env.no_proxy || null,
        NODE_OPTIONS: process.env.NODE_OPTIONS || null,
      },
      dnsServers: dns.getServers(),
      probes,
      httpsReachable,
      resilientReachable,
    },
    { status: 200 }
  );
}

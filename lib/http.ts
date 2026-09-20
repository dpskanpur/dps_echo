import dns from "node:dns";

// Ensure Node defaults to IPv4 first to prevent AAAA IPv6 resolution timeouts/failures
if (typeof dns.setDefaultResultOrder === "function") {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {}
}

export interface HttpInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface HttpResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<any>;
}

function describe(err: any): string {
  const code = err?.cause?.code || err?.code;
  const message = err?.cause?.message || err?.message || "unknown error";
  return code ? `${message} (${code})` : message;
}

export async function httpRequest(url: string, init: HttpInit = {}): Promise<HttpResponse> {
  const timeoutMs = init.timeoutMs ?? 15000;
  let lastError: any;
  const targetUrl = new URL(url);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let requestUrl = url;
      const headers = { ...(init.headers || {}) };

      // On second attempt, if first attempt failed with a network/DNS error, try IPv4 resolution
      if (attempt > 0 && lastError) {
        try {
          const addresses = await dns.promises.resolve4(targetUrl.hostname);
          if (addresses && addresses.length > 0) {
            requestUrl = url.replace(targetUrl.hostname, addresses[0]);
            headers["Host"] = targetUrl.hostname;
          }
        } catch {}
      }

      const res = await fetch(requestUrl, {
        method: init.method || "GET",
        headers,
        body: init.body,
        signal: AbortSignal.timeout(timeoutMs),
      });

      const body = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        text: async () => body,
        json: async () => {
          try {
            return JSON.parse(body || "{}");
          } catch {
            return {};
          }
        },
      };
    } catch (err) {
      lastError = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 300));
    }
  }

  throw new Error(`Request to ${targetUrl.hostname} failed: ${describe(lastError)}`);
}

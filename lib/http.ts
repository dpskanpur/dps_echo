/**
 * Outbound HTTP for third-party APIs (Google OAuth, Razorpay, notification
 * providers).
 *
 * Plain fetch with a bounded timeout and one retry for a transient blip.
 * That is all. If the host cannot resolve a name, that is a fault in the
 * environment and the request should fail loudly rather than be worked
 * around in application code.
 */

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

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: init.method || "GET",
        headers: init.headers,
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
      if (attempt === 0) await new Promise((r) => setTimeout(r, 300));
    }
  }

  throw new Error(`Request to ${new URL(url).hostname} failed: ${describe(lastError)}`);
}

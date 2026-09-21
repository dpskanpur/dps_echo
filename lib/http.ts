import dns from "node:dns";
import https from "node:https";
import http from "node:http";
import type { LookupFunction } from "node:net";

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

// Dedicated public DNS resolver (Google 8.8.8.8 & Cloudflare 1.1.1.1) to bypass macOS mDNSResponder glitches
const publicResolver = new dns.Resolver();
try {
  publicResolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {}

const customLookup: LookupFunction = (hostname, _options, callback) => {
  // Tier 1: Standard system IPv4 lookup
  dns.lookup(hostname, { family: 4 }, (err, address, family) => {
    if (!err && address) {
      return callback(null, address, family || 4);
    }
    // Tier 2: Direct A-record resolution via system resolver
    dns.resolve4(hostname, (err2, addrs) => {
      if (!err2 && addrs && addrs.length > 0) {
        return callback(null, addrs[0], 4);
      }
      // Tier 3: Direct UDP query to Public DNS (8.8.8.8 / 1.1.1.1) bypassing macOS local cache
      publicResolver.resolve4(hostname, (err3, addrs2) => {
        if (!err3 && addrs2 && addrs2.length > 0) {
          return callback(null, addrs2[0], 4);
        }
        callback(err || err2 || err3 || new Error(`DNS resolution failed for ${hostname}`), "", 4);
      });
    });
  });
};

function nodeHttpRequest(urlStr: string, init: HttpInit): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const isHttps = parsedUrl.protocol === "https:";
    const transport = isHttps ? https : http;

    const reqOptions: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: init.method || "GET",
      headers: init.headers || {},
      lookup: customLookup,
      timeout: init.timeoutMs || 15000,
      servername: parsedUrl.hostname, // TLS SNI preservation
    };

    const req = transport.request(reqOptions, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          ok: (res.statusCode || 500) >= 200 && (res.statusCode || 500) < 300,
          status: res.statusCode || 500,
          text: async () => data,
          json: async () => {
            try {
              return JSON.parse(data || "{}");
            } catch {
              return {};
            }
          },
        });
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy(new Error("Request timed out"));
    });

    if (init.body) {
      req.write(init.body);
    }
    req.end();
  });
}

export async function httpRequest(url: string, init: HttpInit = {}): Promise<HttpResponse> {
  const timeoutMs = init.timeoutMs ?? 15000;
  let lastError: any;
  const targetUrl = new URL(url);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt === 0) {
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
      }

      // Retry attempt 2 & 3: use nodeHttpRequest with 3-tier IPv4 custom lookup & TLS SNI
      return await nodeHttpRequest(url, { ...init, timeoutMs });
    } catch (err) {
      lastError = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 300));
    }
  }

  throw new Error(`Request to ${targetUrl.hostname} failed: ${describe(lastError)}`);
}

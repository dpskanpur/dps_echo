import dns from "dns";
import https from "https";

/**
 * HTTP that does not depend on the machine's DNS being healthy.
 *
 * Node's fetch resolves names via getaddrinfo. On this network that
 * intermittently returns ENOTFOUND for hosts that resolve fine a moment
 * later, which made Google sign-in fail at random.
 *
 * So: try fetch; if it failed because of DNS, resolve the name ourselves
 * (local resolver, then public DNS) and make the request over https.
 *
 * The request is always made BY HOSTNAME, so TLS and certificate checks
 * are unchanged — only the address lookup is substituted.
 */

const PUBLIC_DNS = (process.env.PUBLIC_DNS_SERVERS || "8.8.8.8,1.1.1.1")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isDnsFailure(err: any): boolean {
  const text = `${err?.code || ""} ${err?.message || ""} ${err?.cause?.code || ""} ${err?.cause?.message || ""}`;
  return /ENOTFOUND|EAI_AGAIN|EAI_NODATA|ESERVFAIL|getaddrinfo/i.test(text);
}

/** getaddrinfo, then the local resolver directly, then public DNS. */
const lookup = (hostname: string, options: any, callback: any): void => {
  const done = (address: string) =>
    options?.all ? callback(null, [{ address, family: 4 }]) : callback(null, address, 4);

  dns.lookup(hostname, { family: 4 }, (err, address) => {
    if (!err && address) return done(address);

    dns.resolve4(hostname, (err2, local) => {
      if (!err2 && local?.length) return done(local[0]);

      const resolver = new dns.promises.Resolver({ timeout: 3000, tries: 2 });
      resolver.setServers(PUBLIC_DNS);
      resolver
        .resolve4(hostname)
        .then((pub) => (pub?.length ? done(pub[0]) : callback(err2 || err)))
        .catch(() => callback(err2 || err));
    });
  });
};

export interface ResilientResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<any>;
}

export interface ResilientInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

function wrap(status: number, body: string): ResilientResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
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

function viaHttps(url: URL, init: ResilientInit): Promise<ResilientResponse> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname, // by name, so TLS/SNI stay correct
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: init.method || "GET",
        headers: init.headers,
        lookup: lookup as any,
        timeout: init.timeoutMs || 15000,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve(wrap(res.statusCode || 500, body)));
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    if (init.body) req.write(init.body);
    req.end();
  });
}

export async function resilientFetch(
  urlStr: string,
  init: ResilientInit = {}
): Promise<ResilientResponse> {
  try {
    const res = await fetch(urlStr, {
      method: init.method || "GET",
      headers: init.headers,
      body: init.body,
      signal: AbortSignal.timeout(init.timeoutMs || 15000),
    });
    return wrap(res.status, await res.text());
  } catch (err: any) {
    if (!isDnsFailure(err)) {
      throw new Error(
        `Could not reach ${new URL(urlStr).hostname}: ${err?.cause?.message || err?.message}`
      );
    }
    console.warn(`[dns] resolving ${new URL(urlStr).hostname} directly`);
    return viaHttps(new URL(urlStr), init);
  }
}

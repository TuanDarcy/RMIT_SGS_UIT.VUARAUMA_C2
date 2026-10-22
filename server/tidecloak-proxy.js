import { createServer, request as createUpstreamRequest } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const listenHost = process.env.TIDECLOAK_PROXY_HOST || "127.0.0.1";
const listenPort = Number(process.env.TIDECLOAK_PROXY_PORT || 8080);
const upstreamHost = process.env.TIDECLOAK_UPSTREAM_HOST || "127.0.0.1";
const upstreamPort = Number(process.env.TIDECLOAK_UPSTREAM_PORT || 8081);
const relayPath = resolve("public/tide_dpop_auth.html");

function isRelayRequest(url = "") {
  const pathname = new URL(url, "http://localhost").pathname;
  return pathname.startsWith("/tide_dpop/") && pathname.endsWith("/tide_dpop_auth.html");
}

export async function createTidecloakProxy() {
  const relay = await readFile(relayPath);

  return createServer((request, response) => {
    if ((request.method === "GET" || request.method === "HEAD") && isRelayRequest(request.url)) {
      response.writeHead(200, {
        "Allow-CSP-From": "*",
        "Cache-Control": "no-store",
        "Content-Length": relay.length,
        "Content-Security-Policy": "default-src 'self'; script-src 'unsafe-inline'",
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : relay);
      return;
    }

    const upstreamRequest = request.pipe(
      createUpstreamRequest(
        {
          host: upstreamHost,
          port: upstreamPort,
          method: request.method,
          path: request.url,
          headers: request.headers,
        },
        (upstreamResponse) => {
          response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
          upstreamResponse.pipe(response);
        },
      ),
    );

    upstreamRequest.on("error", (error) => {
      if (!response.headersSent) {
        response.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      }
      response.end(JSON.stringify({ error: "TideCloak upstream unavailable", detail: error.message }));
    });
  });
}

if (process.env.NODE_ENV !== "test") {
  const proxy = await createTidecloakProxy();
  proxy.listen(listenPort, listenHost, () => {
    console.log(`TideCloak proxy listening on http://${listenHost}:${listenPort} -> http://${upstreamHost}:${upstreamPort}`);
  });
}

/*
  health_txroot_compat_v1.cjs
  Goal: /health/txroot and /health/txroot2 must never 500.
  Strategy: intercept at http.Server.prototype.emit('request') and proxy to /health/txroot3.
*/
const http = require("http");

const VOID_HEALTH_TXROOT_COMPAT_V1_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_HEALTH_TXROOT_COMPAT_V1_EMPTY_CATCH_VISIBILITY_V1";
function recordVoidHealthTxrootCompatV1EmptyCatchVisibilityV1(site, err) {
  try {
    const g = globalThis;
    const key = "__void_health_txroot_compat_v1_empty_catch_visibility_v1";
    const bucket = Array.isArray(g[key]) ? g[key] : [];
    bucket.push({ marker: VOID_HEALTH_TXROOT_COMPAT_V1_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
    while (bucket.length > 50) bucket.shift();
    g[key] = bucket;
  } catch (_visibilityRecordErr) {
    /* VOID_HEALTH_TXROOT_COMPAT_V1_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
  }
}

(function install() {
  try {
    if (globalThis.__void_health_txroot_compat_v1__) return;
    globalThis.__void_health_txroot_compat_v1__ = true;

    const origEmit = http.Server.prototype.emit;

    http.Server.prototype.emit = function patchedEmit(ev, ...args) {
      try {
        if (ev === "request") {
          const req = args[0];
          const res = args[1];
          const url = req && req.url ? String(req.url) : "";

          // only intercept the legacy health endpoints
          if (url.startsWith("/health/txroot2") || url.startsWith("/health/txroot?") || url === "/health/txroot") {
            // map both -> /health/txroot3 (preserve query string)
            let u;
            try { u = new URL(url, "http://127.0.0.1"); } catch { u = null; }

            const path = u ? ("/health/txroot3" + (u.search || "")) : "/health/txroot3";
            const port = Number(process.env.HTTP_PORT || 4100);

            const h = {
              "accept": req.headers && req.headers.accept ? req.headers.accept : "*/*",
              "user-agent": "void-health-compat-v1",
            };

            const preq = http.request(
              { hostname: "127.0.0.1", port, method: "GET", path, headers: h },
              (pres) => {
                try {
                  res.statusCode = pres.statusCode || 200;
                  // forward only safe headers
                  const ct = pres.headers && pres.headers["content-type"];
                  if (ct) res.setHeader("content-type", ct);
                  res.setHeader("x-void-health-compat", "txroot3-proxy");
                  pres.pipe(res);
                } catch (e) {
                  try {
                    res.statusCode = 503;
                    res.setHeader("content-type", "text/plain");
                    res.end("txroot compat proxy: response error\n");
                  } catch (responseFallbackErr) { recordVoidHealthTxrootCompatV1EmptyCatchVisibilityV1("VOID_HEALTH_TXROOT_COMPAT_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_RESPONSE_ERROR_FALLBACK", responseFallbackErr); }
                }
              }
            );

            preq.on("error", () => {
              try {
                res.statusCode = 503;
                res.setHeader("content-type", "text/plain");
                res.end("txroot compat proxy: upstream error\n");
              } catch (upstreamFallbackErr) { recordVoidHealthTxrootCompatV1EmptyCatchVisibilityV1("VOID_HEALTH_TXROOT_COMPAT_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_UPSTREAM_ERROR_FALLBACK", upstreamFallbackErr); }
            });

            preq.end();
            return true; // handled
          }
        }
      } catch (requestInterceptErr) { recordVoidHealthTxrootCompatV1EmptyCatchVisibilityV1("VOID_HEALTH_TXROOT_COMPAT_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_REQUEST_INTERCEPT", requestInterceptErr); }
      return origEmit.call(this, ev, ...args);
    };

    try { console.error("[health_txroot_compat_v1] installed (txroot/txroot2 -> txroot3 proxy)"); } catch (installedLogErr) { recordVoidHealthTxrootCompatV1EmptyCatchVisibilityV1("VOID_HEALTH_TXROOT_COMPAT_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_INSTALLED_LOG", installedLogErr); }
  } catch (installErr) { recordVoidHealthTxrootCompatV1EmptyCatchVisibilityV1("VOID_HEALTH_TXROOT_COMPAT_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_INSTALL", installErr); }
})();

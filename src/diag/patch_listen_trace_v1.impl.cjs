/**
 * patch_listen_trace_v1.cjs
 * Safe preload stub: optionally logs listen() calls; otherwise no-op.
 * Goal: prevent NODE_OPTIONS=--require ... from crashing on MODULE_NOT_FOUND.
 */
(function () {
  const VOID_LISTEN_TRACE_V1_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_LISTEN_TRACE_V1_EMPTY_CATCH_VISIBILITY_V1";
  function recordVoidListenTraceV1EmptyCatchVisibilityV1(site, err) {
    try {
      const g = globalThis;
      const key = "__void_listen_trace_v1_empty_catch_visibility_v1";
      const bucket = Array.isArray(g[key]) ? g[key] : [];
      bucket.push({ marker: VOID_LISTEN_TRACE_V1_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
      while (bucket.length > 50) bucket.shift();
      g[key] = bucket;
    } catch (_visibilityRecordErr) {
      /* VOID_LISTEN_TRACE_V1_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
    }
  }
  try {
    const net = require("net");
    const http = require("http");

    // net.Server.prototype.listen
    const nsp = net.Server && net.Server.prototype;
    if (nsp && typeof nsp.listen === "function" && !nsp.listen.__void_listen_trace_v1) {
      const orig = nsp.listen;
      function tracedListen(...args) {
        try {
          const msg = args.map(a => {
            if (typeof a === "function") return "[fn]";
            if (a && typeof a === "object") return JSON.stringify(a);
            return String(a);
          }).join(" ");
          console.error("[listen.trace.v1] net.listen", msg);
        } catch (netLogErr) { recordVoidListenTraceV1EmptyCatchVisibilityV1("VOID_LISTEN_TRACE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_NET_LISTEN_LOG", netLogErr); }
        return orig.apply(this, args);
      }
      tracedListen.__void_listen_trace_v1 = true;
      nsp.listen = tracedListen;
    }

    // http.Server.prototype.listen
    const hsp = http.Server && http.Server.prototype;
    if (hsp && typeof hsp.listen === "function" && !hsp.listen.__void_listen_trace_v1) {
      const orig = hsp.listen;
      function tracedListen(...args) {
        try {
          const msg = args.map(a => {
            if (typeof a === "function") return "[fn]";
            if (a && typeof a === "object") return JSON.stringify(a);
            return String(a);
          }).join(" ");
          console.error("[listen.trace.v1] http.listen", msg);
        } catch (httpLogErr) { recordVoidListenTraceV1EmptyCatchVisibilityV1("VOID_LISTEN_TRACE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_HTTP_LISTEN_LOG", httpLogErr); }
        return orig.apply(this, args);
      }
      tracedListen.__void_listen_trace_v1 = true;
      hsp.listen = tracedListen;
    }

    try { console.error("[listen.trace.v1] installed"); } catch (installedLogErr) { recordVoidListenTraceV1EmptyCatchVisibilityV1("VOID_LISTEN_TRACE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_INSTALLED_LOG", installedLogErr); }
  } catch (e) {
    try { console.error("[listen.trace.v1] FAILED:", (e && e.stack) ? e.stack : e); } catch (failedLogErr) { recordVoidListenTraceV1EmptyCatchVisibilityV1("VOID_LISTEN_TRACE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_FAILED_LOG", failedLogErr); }
  }
})();

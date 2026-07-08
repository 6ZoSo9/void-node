/* eslint-disable */
(function () {
  const tag = `[listen-trace.v2 pid=${process.pid}]`;
  const VOID_LISTEN_TRACE_V2_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_LISTEN_TRACE_V2_EMPTY_CATCH_VISIBILITY_V1";
  function recordVoidListenTraceV2EmptyCatchVisibilityV1(site, err) {
    try {
      const g = globalThis;
      const key = "__void_listen_trace_v2_empty_catch_visibility_v1";
      const bucket = Array.isArray(g[key]) ? g[key] : [];
      bucket.push({ marker: VOID_LISTEN_TRACE_V2_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
      while (bucket.length > 50) bucket.shift();
      g[key] = bucket;
    } catch (_visibilityRecordErr) {
      /* VOID_LISTEN_TRACE_V2_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
    }
  }
  const log = (...a) => { try { console.error(tag, ...a); } catch (logErr) { recordVoidListenTraceV2EmptyCatchVisibilityV1("VOID_LISTEN_TRACE_V2_EMPTY_CATCH_VISIBILITY_V1_SITE_LOG_WRITE", logErr); } };

  try {
    const net = require("net");
    const http = require("http");

    let seen = 0;

    function onceHook(obj, name) {
      if (!obj || typeof obj[name] !== "function") return;
      const orig = obj[name];
      if (orig.__void_listen_trace_v2) return;

      function wrapped() {
        seen++;
        const args = Array.prototype.slice.call(arguments);
        let host = null;
        let port = null;
        for (const a of args) {
          if (typeof a === "number") { port = a; break; }
          if (typeof a === "string" && !host && a.includes(".")) host = a;
        }
        log(`${name} called`, { port, host, args0: args[0] });
        try { log("stack", (new Error("listen-trace")).stack); } catch (stackErr) { recordVoidListenTraceV2EmptyCatchVisibilityV1("VOID_LISTEN_TRACE_V2_EMPTY_CATCH_VISIBILITY_V1_SITE_STACK_LOG", stackErr); }
        return orig.apply(this, arguments);
      }
      try { Object.defineProperty(wrapped, "__void_listen_trace_v2", { value: 1 }); } catch (defineErr) { recordVoidListenTraceV2EmptyCatchVisibilityV1("VOID_LISTEN_TRACE_V2_EMPTY_CATCH_VISIBILITY_V1_SITE_DEFINE_WRAPPED_MARKER", defineErr); }
      obj[name] = wrapped;
      log(`hooked ${name}`);
    }

    onceHook(net.Server.prototype, "listen");
    onceHook(http.Server.prototype, "listen");

    // After 2s, attempt a bind+close probe to show whether 4100 is free.
    setTimeout(() => {
      const host = process.env.HTTP_HOST || "127.0.0.1";
      const port = Number(process.env.HTTP_PORT || 4100);
      const s = net.createServer(() => {});
      s.once("error", (e) => {
        log("port-probe error", { host, port, code: e && e.code, msg: String(e) });
      });
      s.listen({ host, port }, () => {
        log("port-probe OK (port is free + bind works)", { host, port });
        try { s.close(); } catch (closeErr) { recordVoidListenTraceV2EmptyCatchVisibilityV1("VOID_LISTEN_TRACE_V2_EMPTY_CATCH_VISIBILITY_V1_SITE_PORT_PROBE_CLOSE", closeErr); }
      });
    }, 2000);

    // After 6s, if no listen seen, scream once.
    setTimeout(() => {
      if (!seen) log("NO listen() observed after 6s (node never attempted to bind)");
    }, 6000);

    log("installed");
  } catch (e) {
    log("install failed", (e && e.stack) ? e.stack : e);
  }
})();

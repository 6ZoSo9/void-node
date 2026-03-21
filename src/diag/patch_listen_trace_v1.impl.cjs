/**
 * patch_listen_trace_v1.cjs
 * Safe preload stub: optionally logs listen() calls; otherwise no-op.
 * Goal: prevent NODE_OPTIONS=--require ... from crashing on MODULE_NOT_FOUND.
 */
(function () {
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
        } catch {}
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
        } catch {}
        return orig.apply(this, args);
      }
      tracedListen.__void_listen_trace_v1 = true;
      hsp.listen = tracedListen;
    }

    try { console.error("[listen.trace.v1] installed"); } catch {}
  } catch (e) {
    try { console.error("[listen.trace.v1] FAILED:", (e && e.stack) ? e.stack : e); } catch {}
  }
})();

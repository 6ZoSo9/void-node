"use strict";

/*
  Logs whenever net.Server.listen is called.
  This answers: "do we ever bind 4100/4700 at all?"
*/

let logged = 0;
function log(msg) {
  try { console.error(msg); } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_LISTEN_TRACE_V1_JS_1_1_VISIBLE", __void_diag_pack4_err); }
}

function shortStack() {
  const e = new Error("listen-trace");
  const s = (e.stack || "").split("\n").slice(2, 8).join(" | ");
  return s.replace(/\s+/g, " ").trim();
}

try {
  const net = require("net");
  const orig = net.Server.prototype.listen;
  if (!net.Server.prototype.__void_listen_trace_v1) {
    net.Server.prototype.listen = function(...args) {
      logged++;
      const a0 = args && args.length ? args[0] : undefined;
      const port =
        (typeof a0 === "number" ? a0 :
         a0 && typeof a0 === "object" && typeof a0.port === "number" ? a0.port :
         undefined);
      log(`[listen-trace.v1] listen() called (count=${logged}) port=${port ?? "?"} args0=${typeof a0} stack=${shortStack()}`);
      return orig.apply(this, args);
    };
    Object.defineProperty(net.Server.prototype, "__void_listen_trace_v1", { value: true, enumerable: false });
    log("[listen-trace.v1] installed");
  }
} catch (e) {
  log("[listen-trace.v1] install failed: " + (e && (e.stack || e.message || String(e))));
}

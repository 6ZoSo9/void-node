const http = require("http");
const https = require("https");

function wrap(mod, name){
  const orig = mod.request;
  mod.request = function(...args){
    try {
      const s = String(args[0]?.href || args[0]?.url || args[0] || "");
      if (process.env.VOID_HTTP_TAP_HEADTRIO === "1") {
        if (s.includes("/head.txt") || s.includes("/blocks/latest/number2") || s.includes("/blocks/latest/number")) {
          const now = Date.now();
          const g = globalThis;
          g.__void_http_tap_hits = (g.__void_http_tap_hits||0) + 1;
          const last = g.__void_http_tap_last||0;
          if ((now - last) > 2000) {
            g.__void_http_tap_last = now;
            const st = (new Error("http.tap.headtrio")).stack || "";
            const st8 = st.split("\n").slice(0,9).join("\n");
            console.error("[http.tap.headtrio]", "hits="+g.__void_http_tap_hits, s, st8);
          }
        }
      }
    } catch (e) {
      if (!globalThis.__void_ops_headtrio_http_tap_runtime_seen) {
        globalThis.__void_ops_headtrio_http_tap_runtime_seen = true;
        console.error("[http.tap.headtrio] VOID_OPS_HEADTRIO_HTTP_TAP_RUNTIME_VISIBLE", e && e.message ? e.message : e);
      }
    }
    return orig.apply(this, args);
  };
}
wrap(http, "http");
wrap(https, "https");

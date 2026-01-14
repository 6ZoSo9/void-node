/* datanet_receipts_real_v1.cjs (v1.7)
   Logs DataNet MVP publish+fetch receipts to DATANET_RECEIPTS_FILE as JSONL.
   Hook: http.Server.prototype.emit("request") so it works even if not handled by Express.
   Safety: never throws; tight path filter; avoids double-hook per response.
*/
(function(){
  const fs = require("fs");
  const http = require("http");

  function nowMs(){ return Date.now(); }
  function safeStr(x){ try { return (x===undefined||x===null) ? "" : String(x); } catch { return ""; } }

  function getFile(){
    try { return safeStr(process.env.DATANET_RECEIPTS_FILE || "").trim(); } catch { return ""; }
  }

  function appendLine(obj){
    const file = getFile();
    if (!file) return;
    try { fs.appendFile(file, JSON.stringify(obj) + "\n", () => {}); } catch {}
  }

  function parseUrl(req){
    try {
      const host = safeStr((req && req.headers && (req.headers.host || req.headers.Host)) || "127.0.0.1").trim();
      return new URL(safeStr(req && req.url) || "/", "http://" + host);
    } catch { return null; }
  }

  function getWho(req, u){
    try {
      const h = req && req.headers ? (req.headers["x-void-who"] || req.headers["x-VOID-who"] || req.headers["x-void-WHO"]) : "";
      const q = u ? (u.searchParams.get("who") || u.searchParams.get("WHO")) : "";
      const pick = h || q || "";
      return safeStr(pick).trim();
    } catch { return ""; }
  }

  function classify(u){
    try {
      if (!u) return null;
      const path = u.pathname || "";
      if (!path.startsWith("/datanet/v1/")) return null;

      if (path === "/datanet/v1/publish") return { op:"datanet_mvp_publish", id:"", url:path };
      if (path.startsWith("/datanet/v1/fetch/")) {
        const id = safeStr(path.split("/").pop()).trim();
        return { op:"datanet_mvp_fetch", id, url:path };
      }
      return null;
    } catch { return null; }
  }

  try {
    const proto = http.Server && http.Server.prototype;
    if (!proto || proto.__void_dn_receipts_emit_v17) return;
    const origEmit = proto.emit;
    if (typeof origEmit !== "function") return;

    proto.__void_dn_receipts_emit_v17 = true;

    proto.emit = function(ev){
      try {
        if (ev === "request") {
          const req = arguments[1];
          const res = arguments[2];
          if (req && res && !res.__void_dn_receipts_v17_hooked) {
            const u = parseUrl(req);
            const cls = classify(u);
            if (cls) {
              res.__void_dn_receipts_v17_hooked = true;

              const who = getWho(req, u);
              const method = safeStr(req && req.method).trim();
              const t0 = nowMs();

              res.once("finish", function(){
                try {
                  const status = Number(res && res.statusCode) || 0;
                  const ok = (status >= 200 && status < 400) ? 1 : 0;

                  let bytes = 0;
                  try {
                    const cl = (typeof res.getHeader === "function") ? res.getHeader("content-length") : null;
                    const n = Number(cl);
                    if (Number.isFinite(n) && n >= 0) bytes = n;
                  } catch {}

                  appendLine({
                    ts_ms: nowMs(),
                    ts: Math.floor(nowMs()/1000),
                    ok,
                    who,
                    op: cls.op,
                    id: cls.id,
                    bytes,
                    wc: ok ? 1 : 0,
                    status,
                    ms: nowMs() - t0,
                    method,
                    url: cls.url
                  });
                } catch {}
              });
            }
          }
        }
      } catch {}
      return origEmit.apply(this, arguments);
    };

    try { console.error("[datanet.receipts.real.v1.7] http request hook active"); } catch {}
  } catch {}
})();

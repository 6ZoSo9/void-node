"use strict";
/*
  datanet_http_fetch_receipts_logger_v1.cjs
  Purpose: log INCOMING HTTP GET /datanet/v1/fetch/:id into datanet receipts JSONL.
  Safety:
    - mounts once
    - gentle retry to find Express app
    - appendFile async only (no sync IO in request path)
*/

const fs = require("fs");
const path = require("path");

(function install(){
  const G = globalThis;
  if (G.__void_datanet_http_fetch_receipts_logger_v1) return;
  G.__void_datanet_http_fetch_receipts_logger_v1 = true;

  function receiptsFile() {
    const dataDir = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "";
    return (
      process.env.VOID_DATANET_RECEIPTS_FILE ||
      process.env.DATANET_RECEIPTS_FILE ||
      (dataDir ? path.join(dataDir, "datanet", "receipts", "datanet.jsonl") : "")
    );
  }

  function ensureDir(file) {
    try { if (file) fs.mkdirSync(path.dirname(file), { recursive: true }); } catch {}
  }

  function parseWho(req) {
    try {
      const q = req && req.query ? req.query : null;
      if (q && typeof q.who === "string" && q.who.length) return q.who;
    } catch {}
    try {
      const h = req && req.headers ? req.headers : null;
      const v = h && (h["x-void-who"] || h["x-who"]);
      if (typeof v === "string" && v.length) return v;
    } catch {}
    return "";
  }

  function matchFetch(req) {
    try {
      const p = (req && (req.path || (req._parsedUrl && req._parsedUrl.pathname))) || "";
      if (typeof p !== "string") return null;
      // expected: /datanet/v1/fetch/<hex>
      const m = p.match(/^\/datanet\/v1\/fetch\/([0-9a-f]{16,64})\b/i);
      return m ? m[1] : null;
    } catch {}
    return null;
  }

  function appendLine(obj) {
    const file = receiptsFile();
    if (!file) return;
    ensureDir(file);
    const line = JSON.stringify(obj) + "\n";
    fs.appendFile(file, line, () => {});
  }

  function mount(app) {
    if (!app || typeof app.use !== "function") return false;
    if (G.__void_datanet_http_fetch_receipts_logger_v1_mounted) return true;
    G.__void_datanet_http_fetch_receipts_logger_v1_mounted = true;

    app.use(function datanetHttpFetchReceiptsLogger(req, res, next){
      const t0 = Date.now();
      const id = (req && req.method === "GET") ? matchFetch(req) : null;
      if (!id) return next();

      const who = parseWho(req) || "";
      const url = (req && (req.originalUrl || req.url)) || "";
      res.on("finish", function(){
        try {
          const ms = Date.now() - t0;
          const status = res.statusCode || 0;
          let bytes = 0;
          try {
            const h = res.getHeader ? res.getHeader("content-length") : null;
            const n = typeof h === "string" ? parseInt(h, 10) : (typeof h === "number" ? h : 0);
            if (Number.isFinite(n) && n > 0) bytes = n;
          } catch {}
          appendLine({
            ts_ms: Date.now(),
            ts: Math.floor(Date.now()/1000),
            ok: status >= 200 && status < 400 ? 1 : 0,
            who,
            op: "datanet_http_fetch",
            id,
            bytes,
            wc: 0,
            status,
            ms,
            method: "GET",
            url: String(url),
            reason2: ""
          });
        } catch {}
      });

      next();
    });

    try { console.error("[datanet_http_fetch_receipts_logger_v1] mounted"); } catch {}
    return true;
  }

  // Gentle retry to find the Express app exported by index.ts: (globalThis as any).__void_http_app = app
  let tries = 0;
  (function retry(){
    tries++;
    const app = G.__void_http_app;
    if (mount(app)) return;
    if (tries >= 40) {
      try { console.error("[datanet_http_fetch_receipts_logger_v1] WARN: no __void_http_app after retries"); } catch {}
      return;
    }
    setTimeout(retry, 250);
  })();

})();

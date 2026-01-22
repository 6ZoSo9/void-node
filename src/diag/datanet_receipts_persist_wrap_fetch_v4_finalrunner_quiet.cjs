/*
  datanet_receipts_persist_wrap_fetch_v4_finalrunner_quiet.cjs
  - runs ONLY in the final tsx runner process (filters out the parent "tsx" launcher process)
  - requires existing receipts persist preload
  - mounts fetch-only receipts logger
  - quiet: no "waiting/gave up" spam; logs only on successful mount (once)
*/

const fs = require("fs");
const path = require("path");

function nowMs(){ try { return Date.now(); } catch { return 0; } }

function isFinalTsxRunner() {
  try {
    const argv = (process && process.execArgv) ? process.execArgv : [];
    // The real runner created by tsx includes loader/preflight in execArgv.
    for (const a of argv) {
      const s = String(a || "");
      if (s.includes("tsx/dist/loader.mjs")) return true;
      if (s.includes("tsx/dist/preflight.cjs")) return true;
    }
  } catch {}
  return false;
}

function getReceiptsFile() {
  try {
    const env = process.env.DATANET_RECEIPTS_FILE;
    if (env && typeof env === "string" && env.length > 0) return env;
  } catch {}
  return "";
}

function appendLine(file, obj) {
  try {
    if (!file) return false;
    fs.appendFile(file, JSON.stringify(obj) + "\n", () => {});
    return true;
  } catch {
    return false;
  }
}

function tryRequireExisting() {
  try {
    require(path.join(process.env.HOME || "", "dev/void-node/src/diag/datanet_receipts_persist_v1.cjs"));
  } catch {}
}

function parseId(req) {
  try {
    const u = (req.originalUrl || req.url || "").toString();
    const m = u.match(/\/datanet\/v1\/fetch\/([0-9a-f]{16,64})/i);
    if (m && m[1]) return m[1];
  } catch {}
  try {
    const q = req.query || {};
    if (q && typeof q.id === "string" && q.id.length) return q.id;
  } catch {}
  return "";
}

function parseWho(req) {
  try {
    const q = req.query || {};
    if (q && typeof q.who === "string" && q.who.length) return q.who;
  } catch {}
  try {
    const u = (req.originalUrl || req.url || "").toString();
    const m = u.match(/[?&]who=([^&]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
  } catch {}
  return "";
}

function mountFetchLogger(app) {
  const G = globalThis;

  if (!app || typeof app.use !== "function") return false;

  // hard global gate: never mount twice (in THIS process)
  if (G.__void_datanet_fetch_receipts_wrap_v4_mounted) return true;
  G.__void_datanet_fetch_receipts_wrap_v4_mounted = true;

  const fileAtMount = getReceiptsFile();
  try { console.error("[wrap_fetch_v4] mounted fetch receipts logger (file=" + (fileAtMount || "<empty>") + ")"); } catch {}

  app.use((req, res, next) => {
    try {
      const url = (req.originalUrl || req.url || "").toString();
      if (!url.startsWith("/datanet/v1/fetch")) return next();

      const who = parseWho(req);
      if (!who) return next();

      const id = parseId(req);
      const t0 = nowMs();

      res.on("finish", () => {
        try {
          const file = getReceiptsFile();
          if (!file) return;

          const status = res.statusCode || 0;
          const ok = status >= 200 && status < 400 ? 1 : 0;

          let bytes = 0;
          try {
            const h = res.getHeader && res.getHeader("content-length");
            if (h) bytes = parseInt(String(h), 10) || 0;
          } catch {}

          appendLine(file, {
            ts_ms: nowMs(),
            ts: Math.floor(nowMs() / 1000),
            ok,
            who,
            op: "datanet_mvp_fetch",
            id: id || "",
            bytes,
            wc: 1,
            status,
            ms: Math.max(0, nowMs() - t0),
            method: (req.method || "").toString(),
            url,
            reason2: ""
          });
        } catch {}
      });

      return next();
    } catch {
      return next();
    }
  });

  return true;
}

function waitMountQuiet() {
  const G = globalThis;

  // avoid duplicate timers in the same process
  if (G.__void_datanet_fetch_receipts_wrap_v4_started) return;
  G.__void_datanet_fetch_receipts_wrap_v4_started = true;

  const maxMs = 60000;
  const stepMs = 125;
  const tStart = nowMs();

  // mount immediately if already present
  try {
    const app0 = G.__void_http_app;
    if (app0) { mountFetchLogger(app0); return; }
  } catch {}

  const iv = setInterval(() => {
    let app = null;
    try { app = G.__void_http_app; } catch {}

    if (app) {
      try { clearInterval(iv); } catch {}
      mountFetchLogger(app);
      return;
    }

    if ((nowMs() - tStart) >= maxMs) {
      try { clearInterval(iv); } catch {}
      // quiet give-up: no log spam
      return;
    }
  }, stepMs);
}

(function main(){
  // Only run in the real runner. Parent "tsx" launcher process will do nothing.
  if (!isFinalTsxRunner()) return;
  tryRequireExisting();
  waitMountQuiet();
})();

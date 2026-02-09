/* datanet_fetch_receipt_mw_v1.cjs
   Brute-force: on GET /datanet/v1/fetch(/:id)?who=... append a receipts JSONL line.
   Never throws. Minimal overhead. */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { URL } = require("url");

function now() {
  const ts_ms = Date.now();
  return { ts_ms, ts: Math.floor(ts_ms / 1000) };
}

function receiptsFile() {
  // Prefer explicit env, then DATA_DIR, then repo default data_a
  const explicit = process.env.VOID_DATANET_RECEIPTS_FILE;
  if (explicit && typeof explicit === "string") return explicit;

  const dataDir = process.env.DATA_DIR || path.join(os.homedir(), "dev/void-node/data_a");
  return path.join(dataDir, "datanet/receipts/datanet.jsonl");
}

function safeAppend(line) {
  try {
    const rf = receiptsFile();
    fs.mkdirSync(path.dirname(rf), { recursive: true });
    fs.appendFileSync(rf, line + "\n", "utf8");
  } catch (_) {}
}

function parseIdFromPath(p) {
  try {
    // match last hex segment 16..64 chars
    const m = String(p || "").match(/\/([0-9a-f]{16,64})$/i);
    return m ? m[1] : "";
  } catch (_) { return ""; }
}

function install(app) {
  if (!app || typeof app.use !== "function") return false;
  if (globalThis.__void_datanet_fetch_receipt_mw_v1) return true;
  globalThis.__void_datanet_fetch_receipt_mw_v1 = true;

  app.use((req, res, next) => {
    try {
      if (!req || !res) return next();
      if (req.method !== "GET") return next();

      // req.originalUrl includes query
      const ou = req.originalUrl || req.url || "";
      if (!String(ou).startsWith("/datanet/v1/fetch")) return next();

      const host = "http://127.0.0.1";
      const u = new URL(String(ou), host);
      const who = u.searchParams.get("who") || "";
      if (!who) return next();

      const id = parseIdFromPath(u.pathname);
      const start = now();

      res.on("finish", () => {
        const end = now();
        safeAppend(JSON.stringify({
          ts_ms: end.ts_ms,
          ts: end.ts,
          ok: (res.statusCode >= 200 && res.statusCode < 400) ? 1 : 0,
          op: "datanet_fetch_http_mw_v1",
          who,
          id,
          status: res.statusCode,
          path: u.pathname,
          dur_ms: Math.max(0, end.ts_ms - start.ts_ms),
        }));
      });
    } catch (_) {}
    next();
  });

  try { console.error("[datanet_fetch_receipt_mw_v1] mounted"); } catch(_) {}
  return true;
}

(function boot() {
  let tries = 0;
  const maxTries = 400; // 400 * 25ms = 10s
  const t = setInterval(() => {
    tries++;
    const app = globalThis.__void_http_app;
    if (install(app)) { clearInterval(t); return; }
    if (tries >= maxTries) { clearInterval(t); return; }
  }, 25);
})();

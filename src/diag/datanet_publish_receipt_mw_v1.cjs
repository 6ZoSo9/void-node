/* datanet_publish_receipt_mw_v1.cjs (front-stack fix)
   Problem: if MW is mounted after routes, route may end response without next() => MW never runs.
   Fix: mount MW then move its layer to the *front* of app._router.stack.
   Also logs on ANY status (incl 400).
*/
const url = require("url");
const fs = require("fs");
const path = require("path");

function nowMs(){ return Date.now(); }
function jline(obj){ try { return JSON.stringify(obj) + "\n"; } catch { return ""; } }

function getApp(){
  const g = globalThis || {};
  return g.__void_http_app || g.app || null;
}

function receiptsFile(){
  // this file is <repo>/src/diag/... => repo is ../../
  const repo = path.resolve(__dirname, "..", "..");
  const dd = process.env.DATA_DIR || "data_a";
  const base = path.isAbsolute(dd) ? dd : path.join(repo, dd);
  return path.join(base, "datanet", "receipts", "datanet.jsonl");
}

function append(obj){
  try {
    const file = receiptsFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, jline(obj), { encoding: "utf8" });
  } catch {}
}

function install(app){
  if (!app || app.__datanet_publish_receipt_mw_v1_installed) return false;
  app.__datanet_publish_receipt_mw_v1_installed = true;

  const mw = (req, res, next) => {
    try {
      if (req.method !== "POST") return next();
      const u = url.parse(req.originalUrl || req.url || "", true);
      const pathname = (u && u.pathname) || "";
      if (pathname !== "/datanet/v1/publish") return next();

      const who =
        (u.query && (u.query.who || u.query.WHO)) ||
        req.headers["x-void-who"] ||
        req.headers["x-who"] ||
        req.headers["who"] ||
        null;

      const t0 = nowMs();
      const origEnd = res.end;

      res.end = function(chunk, encoding, cb){
        try {
          const dur = nowMs() - t0;
          const status = res.statusCode || 0;

          let id = null;
          try {
            if (chunk) {
              const s = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
              const j = JSON.parse(s);
              id = (j && (j.id || j.publish_id || j.dataId || j.datasetId)) || null;
            }
          } catch {}

          append({
            ts_ms: nowMs(),
            ts: Math.floor(nowMs()/1000),
            ok: (status >= 200 && status < 400) ? 1 : 0,
            op: "datanet_publish_http_mw_v1",
            who,
            id,
            status,
            path: pathname,
            dur_ms: dur
          });
        } catch {}
        return origEnd.call(this, chunk, encoding, cb);
      };

      return next();
    } catch {
      return next();
    }
  };

  // mount, then move to front of stack
  const beforeLen = (app._router && Array.isArray(app._router.stack)) ? app._router.stack.length : -1;
  app.use(mw);
  try {
    const r = app._router;
    if (r && Array.isArray(r.stack) && r.stack.length > 0) {
      const layer = r.stack.pop();   // our just-added layer
      r.stack.unshift(layer);        // put it at the front
    }
  } catch {}

  const afterLen = (app._router && Array.isArray(app._router.stack)) ? app._router.stack.length : -1;
  try { console.error(`[datanet_publish_receipt_mw_v1] mounted (front) stack_len ${beforeLen} -> ${afterLen}`); } catch {}
  return true;
}

(async () => {
  const maxMs = 90_000;
  const step = 100;
  const t0 = nowMs();
  while (nowMs() - t0 < maxMs) {
    const app = getApp();
    if (app) { install(app); return; }
    await new Promise(r => setTimeout(r, step));
  }
  try { console.error("[datanet_publish_receipt_mw_v1] WARN: no __void_http_app after 90s; not mounted"); } catch {}
})();

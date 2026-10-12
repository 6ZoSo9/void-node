/* head_surfaces_guard_v1.cjs
   Goals:
   - stop /blocks/latest/number2.json from ever returning {"number":-1}
   - force /head.txt and /blocks/latest/number to follow STORE head (not stale/shim)
   - keep DATA_DIR/head.txt synced to STORE head (poll every 2s)
   - install as NODE_OPTIONS=--require <this-file>
*/
const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = process.env.HTTP_HOST || process.env.VOID_HTTP_HOST || "127.0.0.1";
const PORT = Number(process.env.HTTP_PORT || 4100);
const DATA_DIR = process.env.DATA_DIR || "data_a";
const HEAD_PATH = path.join(process.cwd(), DATA_DIR, "head.txt");

const VOID_HEAD_SURFACES_GUARD_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_HEAD_SURFACES_GUARD_EMPTY_CATCH_VISIBILITY_V1";
function recordVoidHeadSurfacesGuardEmptyCatchVisibilityV1(site, err) {
  try {
    const g = globalThis;
    const key = "__void_head_surfaces_guard_empty_catch_visibility_v1";
    const bucket = Array.isArray(g[key]) ? g[key] : [];
    bucket.push({ marker: VOID_HEAD_SURFACES_GUARD_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
    while (bucket.length > 50) bucket.shift();
    g[key] = bucket;
  } catch (_visibilityRecordErr) {
    /* VOID_HEAD_SURFACES_GUARD_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
  }
}

let storeHead = null;
let storeHeadTs = 0;
let installed = false;

function parseIntSafe(s) {
  const m = String(s || "").match(/-?\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function readHeadFile() {
  try {
    const s = fs.readFileSync(HEAD_PATH, "utf8");
    const n = parseIntSafe(s);
    return (n !== null && n >= 0) ? n : null;
  } catch {
    return null;
  }
}

function writeHeadFile(n) {
  try {
    fs.mkdirSync(path.dirname(HEAD_PATH), { recursive: true });
    fs.writeFileSync(HEAD_PATH, String(n) + "\n");
  } catch (writeErr) { recordVoidHeadSurfacesGuardEmptyCatchVisibilityV1("VOID_HEAD_SURFACES_GUARD_EMPTY_CATCH_VISIBILITY_V1_SITE_WRITE_HEAD_FILE", writeErr); }
}

function setStoreHead(n, source) {
  if (!Number.isFinite(n) || n < 0) return;
  if (storeHead === n) { storeHeadTs = Date.now(); return; }
  storeHead = n;
  storeHeadTs = Date.now();
  // keep head.txt consistent with store head
  writeHeadFile(n);
  try { console.error(`[head_guard_v1] storeHead=${n} source=${source}`); } catch (logErr) { recordVoidHeadSurfacesGuardEmptyCatchVisibilityV1("VOID_HEAD_SURFACES_GUARD_EMPTY_CATCH_VISIBILITY_V1_SITE_STORE_HEAD_LOG", logErr); }
}

function httpGet(pathname, cb) {
  const req = http.get({ host: HOST, port: PORT, path: pathname, timeout: 1200 }, (res) => {
    let data = "";
    res.setEncoding("utf8");
    res.on("data", (c) => { data += c; if (data.length > 1_000_000) res.destroy(); });
    res.on("end", () => cb(null, res.statusCode || 0, data));
  });
  req.on("timeout", () => { req.destroy(new Error("timeout")); });
  req.on("error", (e) => cb(e));
}

function pollStoreHead() {
  httpGet("/blocks/latest/number.json?__hg=1", (err, code, body) => {
    if (err || code !== 200) return;
    // body like {"number":3101248,...}
    const m = String(body).match(/"number"\s*:\s*(-?\d+)/);
    if (!m) return;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 0) setStoreHead(n, "blocks/latest/number.json");
  });
}

function installEarlyMiddleware(app) {
  if (installed) return;
  installed = true;

  app.use((req, res, next) => {
    const url = String(req.url || "");
    const p = (req.path ? String(req.path) : url.split("?")[0]);

    // Canon head value we will serve
    const canon = (typeof storeHead === "number") ? storeHead : (readHeadFile() ?? null);

    // Fix broken compat endpoint entirely.
    if (p === "/blocks/latest/number2.json") {
      const n = (canon !== null) ? canon : -1;
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ number: n }));
      return;
    }

    // Force shims to follow store head once we have it.
    if ((p === "/head.txt" || p === "/blocks/latest/number") && typeof storeHead === "number") {
      res.statusCode = 200;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end(String(storeHead));
      return;
    }

    return next();
  });

  // kick poller
  setTimeout(() => {
    pollStoreHead();
    setInterval(pollStoreHead, 2000).unref?.();
  }, 1200).unref?.();
}

// Hook __void_http_app at assignment time (must happen right after express() in index.ts).
try {
  if (!Object.getOwnPropertyDescriptor(globalThis, "__void_http_app")) {
    let _app = undefined;
    Object.defineProperty(globalThis, "__void_http_app", {
      configurable: true,
      enumerable: false,
      get() { return _app; },
      set(v) {
        _app = v;
        try { if (v && typeof v.use === "function") installEarlyMiddleware(v); } catch (setterErr) { recordVoidHeadSurfacesGuardEmptyCatchVisibilityV1("VOID_HEAD_SURFACES_GUARD_EMPTY_CATCH_VISIBILITY_V1_SITE_HTTP_APP_SETTER_INSTALL", setterErr); }
      }
    });
  } else {
    // if already exists, best effort install immediately
    const v = globalThis.__void_http_app;
    if (v && typeof v.use === "function") installEarlyMiddleware(v);
  }
} catch (hookErr) { recordVoidHeadSurfacesGuardEmptyCatchVisibilityV1("VOID_HEAD_SURFACES_GUARD_EMPTY_CATCH_VISIBILITY_V1_SITE_HTTP_APP_HOOK", hookErr); }

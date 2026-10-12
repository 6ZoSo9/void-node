const fs = require("fs");
const path = require("path");

let cacheN = -1, cacheTs = 0;

function headFile() {
  const dd = process.env.DATA_DIR || "data_a";
  const dir = path.isAbsolute(dd) ? dd : path.resolve(process.cwd(), dd);
  return path.join(dir, "head.txt");
}
function readHead() {
  const now = Date.now();
  if (now - cacheTs < 200) return cacheN;
  cacheTs = now;
  try {
    const s = fs.readFileSync(headFile(), "utf8").trim();
    const n = parseInt(s, 10);
    cacheN = Number.isFinite(n) ? n : -1;
  } catch { cacheN = -1; }
  return cacheN;
}

function install() {
  const app = (globalThis && (globalThis.__void_http_app || globalThis.__void_app)) || null;
  if (!app) return false;
  if (app.__void_latest_number2_fix_v2) return true;
  app.__void_latest_number2_fix_v2 = true;

  const jsonMW = (req, res, next) => {
    try {
      if (req.method !== "GET") return next();
      const n = readHead();
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ number: n }));
    } catch (e) { try { next(e); } catch { next(); } }
  };

  const txtMW = (req, res, next) => {
    try {
      if (req.method !== "GET") return next();
      const n = readHead();
      res.statusCode = 200;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end(String(n) + "\n");
    } catch (e) { try { next(e); } catch { next(); } }
  };

  // JSON + text aliases (some code hits number2 without .json)
  app.use("/blocks/latest/number2.json", jsonMW);
  app.use("/blocks/latest/number2", txtMW);
  app.use("/blocks/latest/number2.txt", txtMW);

  // move our three handlers to the front so they win
  try {
    const s = app._router && Array.isArray(app._router.stack) ? app._router.stack : null;
    if (s) {
      const moved = [];
      for (let i = s.length - 1; i >= 0; i--) {
        const h = s[i] && s[i].handle;
        if (h === jsonMW || h === txtMW) moved.push(s.splice(i, 1)[0]);
      }
      while (moved.length) s.unshift(moved.pop());
    }
  } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_PATCH_LATEST_NUMBER2_FIX_V2_CJS_2_1_VISIBLE", __void_diag_pack5_err); }

  try { console.error("[number2-fix.v2] installed"); } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_PATCH_LATEST_NUMBER2_FIX_V2_CJS_2_2_VISIBLE", __void_diag_pack5_err); }
  return true;
}

let tries = 0;
const t = setInterval(() => {
  tries++;
  if (install() || tries >= 120) clearInterval(t);
}, 250);

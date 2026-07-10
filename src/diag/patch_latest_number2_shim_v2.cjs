'use strict';

const fs = require('fs');
const path = require('path');

const G = globalThis;
if (G.__void_latest_number2_shim_v2_installed) return;
G.__void_latest_number2_shim_v2_installed = true;

function readHeadNumber() {
  try {
    const dataDir = process.env.DATA_DIR || 'data_a';
    const p = path.join(process.cwd(), dataDir, 'head.txt');
    const s = String(fs.readFileSync(p, 'utf8')).trim();
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : -1;
  } catch {
    return -1;
  }
}

function install(app) {
  if (!app || typeof app.use !== 'function') return false;
  if (app.__void_number2_shim_v2) return true;
  app.__void_number2_shim_v2 = true;

  const mw = (req, res, next) => {
    try {
      // fast exact-match, ignore query string
      const p = req && (req.path || (req.url ? String(req.url).split('?')[0] : '')) || '';
      if (p === '/blocks/latest/number2.json') {
        const n = readHeadNumber();
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ number: n }));
        return;
      }
    } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_PATCH_LATEST_NUMBER2_SHIM_V2_CJS_1_1_VISIBLE", __void_diag_pack5_err); }
    return next();
  };

  try {
    app.use(mw);
    // move the layer we just added to the FRONT so it wins over any existing broken handler
    if (app._router && Array.isArray(app._router.stack) && app._router.stack.length > 0) {
      const layer = app._router.stack.pop();
      app._router.stack.unshift(layer);
    }
  } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_PATCH_LATEST_NUMBER2_SHIM_V2_CJS_1_2_VISIBLE", __void_diag_pack5_err); }

  try {
    const dataDir = process.env.DATA_DIR || 'data_a';
    const p = path.join(process.cwd(), dataDir, 'head.txt');
    console.error(`[number2-shim.v2] installed headFile=${p}`);
  } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_PATCH_LATEST_NUMBER2_SHIM_V2_CJS_1_3_VISIBLE", __void_diag_pack5_err); }
  return true;
}

// wait for the global app hook (your index.ts sets globalThis.__void_http_app = app)
let tries = 0;
const iv = setInterval(() => {
  tries++;
  const app = G.__void_http_app;
  if (install(app)) { clearInterval(iv); return; }
  if (tries >= 200) { clearInterval(iv); return; } // ~20s
}, 100);

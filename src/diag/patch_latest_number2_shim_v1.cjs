"use strict";

/*
  patch_latest_number2_shim_v1:
  - mounts /blocks/latest/number2.json AFTER app exists
  - returns a sane number based on /head.txt (fast, local, and already reliable in your stack)
  - does NOT delete/replace existing routes; it just ensures number2 works.
*/
const http = require("http");
const https = require("https");

function httpGetText(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https:") ? https : http;
    const req = mod.request(url, { method: "GET" }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode || 0, text: data }));
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      try { req.destroy(new Error("timeout")); } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_PATCH_LATEST_NUMBER2_SHIM_V1_CJS_1_1_VISIBLE", __void_diag_pack5_err); }
    });
    req.end();
  });
}

function mountOnce(app) {
  const G = globalThis;
  if (G.__void_patch_latest_number2_shim_v1_mounted) return true;
  G.__void_patch_latest_number2_shim_v1_mounted = true;

  try {
    app.get("/blocks/latest/number2.json", async (req, res) => {
      try {
        // Prefer whatever is already “correct” if it stops being -1 later.
        // But if it’s -1, override with head.txt.
        const headUrl = `http://127.0.0.1:${process.env.HTTP_PORT || 4100}/head.txt`;
        const r = await httpGetText(headUrl, 800);
        const n = parseInt(String(r.text || "").trim(), 10);
        const ok = Number.isFinite(n) && n >= 0;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.statusCode = 200;
        res.end(JSON.stringify({ number: ok ? n : -1 }));
      } catch (e) {
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.statusCode = 200;
        res.end(JSON.stringify({ number: -1 }));
      }
    });

    try { console.error("[patch_latest_number2_shim_v1] mounted /blocks/latest/number2.json"); } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_PATCH_LATEST_NUMBER2_SHIM_V1_CJS_1_2_VISIBLE", __void_diag_pack5_err); }
  } catch (e) {
    return false;
  }
  return true;
}

(function main() {
  const G = globalThis;
  if (G.__void_patch_latest_number2_shim_v1) return;
  G.__void_patch_latest_number2_shim_v1 = true;

  let tries = 0;
  const maxTries = 60; // ~30s
  const timer = setInterval(() => {
    tries++;
    const app = G.__void_http_app;
    if (app) {
      if (mountOnce(app)) {
        clearInterval(timer);
      }
      return;
    }
    if (tries >= maxTries) {
      clearInterval(timer);
      try { console.error("[patch_latest_number2_shim_v1] app not found; giving up"); } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_PATCH_LATEST_NUMBER2_SHIM_V1_CJS_1_3_VISIBLE", __void_diag_pack5_err); }
    }
  }, 500);
})();

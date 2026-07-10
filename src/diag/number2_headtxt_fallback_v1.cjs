/**
 * number2_headtxt_fallback_v1.cjs
 * If /blocks/latest/number2.json would return {"number":-1}, replace with head.txt value.
 * Scope: ONLY that one endpoint. No loops. No logging spam.
 */
const fs = require("fs");
const path = require("path");

function safeReadHeadTxt() {
  try {
    // best-effort: infer data dir from common envs
    const dataDir =
      process.env.DATA_DIR ||
      process.env.VOID_DATA_DIR ||
      process.env.VOID_NODE_DATA_DIR ||
      "data";
    const p = path.join(process.cwd(), dataDir, "head.txt");
    const s = fs.readFileSync(p, "utf8").trim();
    const n = Number(s);
    if (Number.isFinite(n) && n >= 0) return n;
  } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_NUMBER2_HEADTXT_FALLBACK_V1_CJS_1_1_VISIBLE", __void_diag_pack5_err); }
  return null;
}

function install() {
  try {
    const app = globalThis.__void_http_app;
    if (!app || app.__number2_headtxt_fallback_v1_installed) return;
    app.__number2_headtxt_fallback_v1_installed = true;

    // Express middleware: intercept ONLY the number2 route, patch JSON body if needed.
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path !== "/blocks/latest/number2.json") return next();

      const origJson = res.json.bind(res);
      res.json = (body) => {
        try {
          if (body && typeof body === "object" && body.number === -1) {
            const h = safeReadHeadTxt();
            if (h !== null) {
              return origJson({ ...body, number: h, __hardfix: "number2_headtxt_fallback_v1" });
            }
          }
        } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_NUMBER2_HEADTXT_FALLBACK_V1_CJS_1_2_VISIBLE", __void_diag_pack5_err); }
        return origJson(body);
      };

      return next();
    });
  } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_NUMBER2_HEADTXT_FALLBACK_V1_CJS_1_3_VISIBLE", __void_diag_pack5_err); }
}

install();

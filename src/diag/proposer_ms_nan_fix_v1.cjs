/* proposer_ms_nan_fix_v1.cjs
   Fix: proposer exporter emits "void_proposer_auto_ms NaN" when disabled/unknown.
   That NaN propagates into status2/truth2 as null.
   Strategy: install *early* middleware via __void_http_app setter hook and rewrite NaN->0
   for /metrics/void/proposer.v3b.prom responses only.
*/
(function () {
  const G = globalThis;
  if (G.__void_proposer_ms_nan_fix_v1) return;
  G.__void_proposer_ms_nan_fix_v1 = true;

  function install(app) {
    if (!app || app.__void_proposer_ms_nan_fix_installed) return;
    app.__void_proposer_ms_nan_fix_installed = true;

    try {
      app.use(function (req, res, next) {
        try {
          const u = (req && (req.originalUrl || req.url)) || "";
          if (!u.startsWith("/metrics/void/proposer.v3b.prom")) return next();

          const _end = res.end;
          const _write = res.write;
          const chunks = [];

          res.write = function (chunk, enc, cb) {
            try {
              if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc));
              if (typeof cb === "function") cb();
              return true;
            } catch (e) {
              return _write.call(this, chunk, enc, cb);
            }
          };

          res.end = function (chunk, enc, cb) {
            try {
              if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc));
              const body0 = Buffer.concat(chunks).toString("utf8");
              const body = body0.replace(/^(void_proposer_auto_ms(?:_v2)?) NaN$/gm, "$1 0");
              try { res.setHeader("content-length", Buffer.byteLength(body)); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PROPOSER_MS_NAN_FIX_V1_CJS_1_1_VISIBLE", __void_diag_pack2_err); }
              return _end.call(this, body, "utf8", cb);
            } catch (e) {
              return _end.call(this, chunk, enc, cb);
            }
          };

          return next();
        } catch (e) {
          return next();
        }
      });

      try { console.error("[proposer_ms_nan_fix_v1] installed"); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PROPOSER_MS_NAN_FIX_V1_CJS_1_2_VISIBLE", __void_diag_pack2_err); }
    } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PROPOSER_MS_NAN_FIX_V1_CJS_1_3_VISIBLE", __void_diag_pack2_err); }
  }

  // If already set, install now.
  try {
    if (G.__void_http_app) return install(G.__void_http_app);
  } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PROPOSER_MS_NAN_FIX_V1_CJS_1_4_VISIBLE", __void_diag_pack2_err); }

  // Otherwise, intercept the assignment that index.ts does right after `const app = express();`
  try {
    Object.defineProperty(G, "__void_http_app", {
      configurable: true,
      enumerable: false,
      get() { return G.__void_http_app_value; },
      set(v) {
        G.__void_http_app_value = v;
        try { install(v); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PROPOSER_MS_NAN_FIX_V1_CJS_1_5_VISIBLE", __void_diag_pack2_err); }
        // Convert into a normal value prop so the rest of the codebase sees it normally.
        try { Object.defineProperty(G, "__void_http_app", { value: v, writable: true, configurable: true }); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PROPOSER_MS_NAN_FIX_V1_CJS_1_6_VISIBLE", __void_diag_pack2_err); }
      }
    });
  } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PROPOSER_MS_NAN_FIX_V1_CJS_1_7_VISIBLE", __void_diag_pack2_err); }
})();

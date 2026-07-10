/* patch_force_listen_v1.cjs
   Goal: if app exists but nobody called app.listen(), force it (once) on HTTP_PORT/HTTP_HOST.
   Safe: no-op if already listening or if listen throws EADDRINUSE.
*/
(function () {
  const TAG = "[force-listen.v1]";
  try { console.log(`${TAG} installed pid=${process.pid}`); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V1_CJS_1_1_VISIBLE", __void_diag_pack2_err); }

  let armed = true;
  const startedAt = Date.now();
  const maxMs = 15_000;
  const tickMs = 200;

  function getApp() {
    try {
      const g = globalThis;
      // canonical hook we keep in index.ts
      if (g && (g).__void_http_app && typeof (g).__void_http_app.listen === "function") return (g).__void_http_app;
      // some shims used older names in the past
      if (g && (g).__VOID_HTTP_APP && typeof (g).__VOID_HTTP_APP.listen === "function") return (g).__VOID_HTTP_APP;
    } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V1_CJS_1_2_VISIBLE", __void_diag_pack2_err); }
    return null;
  }

  function tryListen(app) {
    const port = Number(process.env.HTTP_PORT || 4100);
    const host = String(process.env.HTTP_HOST || "127.0.0.1");
    if (!Number.isFinite(port) || port <= 0) return;

    // prevent double-fire
    if (app.__void_force_listen_v1_done) return;
    app.__void_force_listen_v1_done = true;

    try { console.log(`${TAG} attempting app.listen(${host}:${port})`); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V1_CJS_1_3_VISIBLE", __void_diag_pack2_err); }
    try {
      const srv = app.listen(port, host, () => {
        try { console.log(`${TAG} LISTENING ${host}:${port}`); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V1_CJS_1_4_VISIBLE", __void_diag_pack2_err); }
      });
      // keep a handle for later inspection
      try { globalThis.__void_force_listen_v1_server = srv; } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V1_CJS_1_5_VISIBLE", __void_diag_pack2_err); }
    } catch (e) {
      const msg = String(e && (e.code || e.message || e) || e);
      if (String(e && e.code || "").includes("EADDRINUSE") || msg.includes("EADDRINUSE")) {
        try { console.log(`${TAG} already in use (EADDRINUSE) -> ok`); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V1_CJS_1_6_VISIBLE", __void_diag_pack2_err); }
        return;
      }
      try { console.log(`${TAG} listen threw: ${msg}`); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V1_CJS_1_7_VISIBLE", __void_diag_pack2_err); }
    }
  }

  function loop() {
    if (!armed) return;
    const up = Date.now() - startedAt;
    if (up > maxMs) {
      armed = false;
      try { console.log(`${TAG} giving up after ${maxMs}ms (app not found or listen not needed)`); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V1_CJS_1_8_VISIBLE", __void_diag_pack2_err); }
      return;
    }
    const app = getApp();
    if (app) {
      tryListen(app);
      // even if listen throws, stop looping (we marked done on app)
      armed = false;
      return;
    }
    setTimeout(loop, tickMs);
  }

  setTimeout(loop, tickMs);
})();

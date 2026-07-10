/* eslint-disable */
(function () {
  const tag = `[eventloop.heartbeat.v1 pid=${process.pid}]`;
  const log = (...a) => { try { console.error(tag, ...a); } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_PATCH_EVENTLOOP_HEARTBEAT_V1_CJS_1_1_VISIBLE", __void_diag_pack5_err); } };

  try {
    log("installed", { now: Date.now() });

    let i = 0;
    const iv = setInterval(() => {
      i++;
      log("tick", i, { now: Date.now() });
      if (i >= 10) {
        clearInterval(iv);
        log("done");
      }
    }, 1000);

    setTimeout(() => log("timeout-2s", { now: Date.now() }), 2000);
    setTimeout(() => log("timeout-6s", { now: Date.now() }), 6000);
  } catch (e) {
    log("install failed", (e && e.stack) ? e.stack : e);
  }
})();

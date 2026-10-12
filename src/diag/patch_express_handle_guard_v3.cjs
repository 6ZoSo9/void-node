/* eslint-disable */
(function () {
  const tag = `[express-handle-guard.v3 pid=${process.pid}]`;
  const log = (...a) => { try { console.error(tag, ...a); } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_EXPRESS_HANDLE_GUARD_V3_CJS_1_1_VISIBLE", __void_diag_pack4_err); } };

  try {
    const express = require("express");
    const appProto = express.application;

    if (!appProto || typeof appProto.handle !== "function") {
      log("no express.application.handle found; skip");
      return;
    }

    const orig = appProto.handle;
    if (orig.__void_handle_guard_v3) {
      log("already installed");
      return;
    }

    function guarded(req, res, next) {
      if (!req || !res) {
        log("dropped app.handle missing req/res");
        return;
      }
      return orig.call(this, req, res, next);
    }
    try { Object.defineProperty(guarded, "__void_handle_guard_v3", { value: 1 }); } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_EXPRESS_HANDLE_GUARD_V3_CJS_1_2_VISIBLE", __void_diag_pack4_err); }
    appProto.handle = guarded;

    log("installed");
  } catch (e) {
    log("install failed", (e && e.stack) ? e.stack : e);
  }
})();

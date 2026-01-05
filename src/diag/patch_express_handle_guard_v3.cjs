/* eslint-disable */
(function () {
  const tag = `[express-handle-guard.v3 pid=${process.pid}]`;
  const log = (...a) => { try { console.error(tag, ...a); } catch (_) {} };

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
    try { Object.defineProperty(guarded, "__void_handle_guard_v3", { value: 1 }); } catch (_) {}
    appProto.handle = guarded;

    log("installed");
  } catch (e) {
    log("install failed", (e && e.stack) ? e.stack : e);
  }
})();

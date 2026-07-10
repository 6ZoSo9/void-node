"use strict";

/*
  Goal: prevent Express from reaching finalhandler with res=undefined.
  Some “self-probe” / internal call paths end up doing app.handle(undefined, undefined, ...).
  That triggers finalhandler -> headersSent(res) where res is undefined -> crash spam.

  This guard is intentionally tiny:
  - patches Express application prototype handle()
  - if req/res missing, it logs once per process and returns (no throw)
*/

let logged = false;
function logOnce(msg) {
  if (logged) return;
  logged = true;
  try { console.error(msg); } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_EXPRESS_HANDLE_GUARD_V2_JS_1_1_VISIBLE", __void_diag_pack4_err); }
}

try {
  // require express early so we can patch the shared prototype
  const express = require("express");
  const tmp = express(); // ephemeral app; used only to locate prototype
  const proto = Object.getPrototypeOf(tmp);

  if (!proto || typeof proto.handle !== "function") {
    logOnce("[express-handle-guard.v2] could not locate app prototype handle(); skipping");
  } else if (proto.__void_handle_guard_v2) {
    // already patched
  } else {
    const orig = proto.handle;
    proto.handle = function(req, res, next) {
      if (!req || !res) {
        logOnce("[express-handle-guard.v2] dropped app.handle() call with missing req/res");
        return;
      }
      return orig.call(this, req, res, next);
    };
    Object.defineProperty(proto, "__void_handle_guard_v2", { value: true, enumerable: false });
    logOnce("[express-handle-guard.v2] installed");
  }
} catch (e) {
  try { console.error("[express-handle-guard.v2] install failed:", e && (e.stack || e.message || String(e))); } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_EXPRESS_HANDLE_GUARD_V2_JS_1_2_VISIBLE", __void_diag_pack4_err); }
}

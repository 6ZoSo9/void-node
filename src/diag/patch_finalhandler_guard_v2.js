/* patch_finalhandler_guard_v2.js
   Goal: prevent finalhandler from ever throwing if called with missing req/res
   (we've seen: TypeError reading 'headersSent' inside finalhandler).
*/
"use strict";

(function () {
  function log(...a) {
    try { console.error("[finalhandler.guard.v2]", ...a); } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_FINALHANDLER_GUARD_V2_JS_1_1_VISIBLE", __void_diag_pack4_err); }
  }

  function wrapFinalhandler(orig) {
    if (typeof orig !== "function") return orig;
    if (orig.__void_finalhandler_guard_v2) return orig;

    function guardedFinalhandler(req, res, options) {
      if (!req || !res) {
        // Return a no-op error handler; never throw.
        return function noopFinalhandler(/*err*/) {};
      }
      let fn;
      try {
        fn = orig(req, res, options);
      } catch (e) {
        log("orig threw during setup; swallowing", e && (e.stack || e.message) || e);
        return function noopFinalhandler(/*err*/) {};
      }
      if (typeof fn !== "function") return function noopFinalhandler(/*err*/) {};

      return function guardedFn(err) {
        try {
          return fn(err);
        } catch (e) {
          // swallow; do not crash the process
          log("swallowed throw", e && (e.stack || e.message) || e);
          return;
        }
      };
    }

    Object.defineProperty(guardedFinalhandler, "__void_finalhandler_guard_v2", { value: 1 });
    return guardedFinalhandler;
  }

  try {
    const Module = require("module");
    const origLoad = Module._load;

    if (!Module.__void_finalhandler_guard_v2_installed) {
      Module._load = function (request, parent, isMain) {
        const exp = origLoad.apply(this, arguments);
        if (request === "finalhandler") {
          try { return wrapFinalhandler(exp); } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_FINALHANDLER_GUARD_V2_JS_1_2_VISIBLE", __void_diag_pack4_err); }
        }
        return exp;
      };
      Object.defineProperty(Module, "__void_finalhandler_guard_v2_installed", { value: 1 });
      log("installed Module._load hook");
    }

    // Patch cache immediately if finalhandler already loaded
    try {
      const r = require.resolve("finalhandler");
      if (require.cache && require.cache[r] && require.cache[r].exports) {
        require.cache[r].exports = wrapFinalhandler(require.cache[r].exports);
        log("patched require.cache export", r);
      }
    } catch (e) {
      // ignore
    }

    // Force-load once so future requires see wrapped export
    try { require("finalhandler"); } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_FINALHANDLER_GUARD_V2_JS_1_3_VISIBLE", __void_diag_pack4_err); }
    log("loaded");
  } catch (e) {
    log("failed to install", e && (e.stack || e.message) || e);
  }
})();

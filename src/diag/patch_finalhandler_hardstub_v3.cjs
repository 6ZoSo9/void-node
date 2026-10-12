'use strict';

/*
  patch_finalhandler_hardstub_v3.cjs

  Goal: prevent process crash if Express/finalhandler ever gets invoked with
  missing/invalid req/res during boot/edge cases. This wrapper is intentionally
  conservative: if req/res missing, return a no-op handler.
*/

(function install() {
  try {
    const resolved = require.resolve('finalhandler');
    const orig = require(resolved);

    if (typeof orig !== 'function') {
      try { console.error('[finalhandler.hardstub.v3] finalhandler export is not a function; skipping'); } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_CJS_1_1_VISIBLE", __void_diag_pack1_err); }
      return;
    }

    function wrappedFinalhandler(req, res, opts) {
      if (!req || !res) {
        const noop = function noopFinalhandler() {};
        noop.__void_finalhandler_noop = 1;
        return noop;
      }
      try {
        return orig(req, res, opts);
      } catch (e) {
        try { console.error('[finalhandler.hardstub.v3] orig threw:', e && (e.stack || e)); } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_CJS_1_2_VISIBLE", __void_diag_pack1_err); }
        const noop = function noopFinalhandlerErr() {};
        noop.__void_finalhandler_noop = 1;
        return noop;
      }
    }

    // copy enumerable props (best-effort)
    try {
      for (const k of Object.keys(orig)) {
        try { wrappedFinalhandler[k] = orig[k]; } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_CJS_1_3_VISIBLE", __void_diag_pack1_err); }
      }
    } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_CJS_1_4_VISIBLE", __void_diag_pack1_err); }

    // swap export in require cache (best-effort)
    try {
      const ent = require.cache[resolved];
      if (ent) ent.exports = wrappedFinalhandler;
    } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_CJS_1_5_VISIBLE", __void_diag_pack1_err); }

    try { console.error('[finalhandler.hardstub.v3] installed'); } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_CJS_1_6_VISIBLE", __void_diag_pack1_err); }
  } catch (e) {
    try { console.error('[finalhandler.hardstub.v3] skip:', e && (e.stack || e)); } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_CJS_1_7_VISIBLE", __void_diag_pack1_err); }
  }
})();

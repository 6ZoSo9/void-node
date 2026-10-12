"use strict";

/*
  HARDSTUB finalhandler so res==undefined can never crash the process.
  We:
    - intercept Module._load for 'finalhandler'
    - if finalhandler already cached, patch its export in-place
  Wrapper behavior:
    - if res missing -> returns noop handler
    - else delegates to original finalhandler(req,res,opts)
*/

const Module = require("module");
const path = require("path");

function safeNoop() { return function noopFinalhandler(/*err*/) {}; }

function wrapFinalhandler(orig) {
  if (typeof orig !== "function") return orig;
  if (orig.__void_finalhandler_guard_v3) return orig;

  function guardedFinalhandler(req, res, options) {
    if (!res) return safeNoop();
    return orig(req, res, options);
  }
  Object.defineProperty(guardedFinalhandler, "__void_finalhandler_guard_v3", { value: true, enumerable: false });

  // preserve any enumerable props
  try {
    for (const k of Object.keys(orig)) guardedFinalhandler[k] = orig[k];
  } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_JS_1_1_VISIBLE", __void_diag_pack1_err); }
  return guardedFinalhandler;
}

function tryPatchCacheByResolved(resolved) {
  try {
    const m = require.cache[resolved];
    if (m && m.exports) m.exports = wrapFinalhandler(m.exports);
  } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_JS_1_2_VISIBLE", __void_diag_pack1_err); }
}

let installed = false;
let logged = false;
function logOnce(msg) {
  if (logged) return;
  logged = true;
  try { console.error(msg); } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_JS_1_3_VISIBLE", __void_diag_pack1_err); }
}

try {
  const origLoad = Module._load;

  function isFinalhandlerRequest(req) {
    if (req === "finalhandler") return true;
    // catch odd forms like 'finalhandler/index.js'
    return typeof req === "string" && (req === "finalhandler/index.js" || req.endsWith("/finalhandler") || req.endsWith("/finalhandler/index.js"));
  }

  if (!Module.__void_finalhandler_load_guard_v3) {
    Module._load = function(request, parent, isMain) {
      if (isFinalhandlerRequest(request)) {
        // resolve real module first
        let resolved = null;
        try { resolved = Module._resolveFilename("finalhandler", parent, isMain); } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_JS_1_4_VISIBLE", __void_diag_pack1_err); }
        // if already in cache, patch immediately
        if (resolved) tryPatchCacheByResolved(resolved);

        // load original using origLoad (not our wrapper) then wrap
        const orig = origLoad.apply(this, [request === "finalhandler" ? "finalhandler" : request, parent, isMain]);
        const wrapped = wrapFinalhandler(orig);
        if (resolved) {
          try {
            const m = require.cache[resolved];
            if (m) m.exports = wrapped;
          } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_JS_1_5_VISIBLE", __void_diag_pack1_err); }
        }
        if (!installed) {
          installed = true;
          logOnce("[finalhandler.hardstub.v3] installed");
        }
        return wrapped;
      }
      return origLoad.apply(this, [request, parent, isMain]);
    };
    Object.defineProperty(Module, "__void_finalhandler_load_guard_v3", { value: true, enumerable: false });
  }

  // best-effort patch if finalhandler was loaded before we installed _load hook
  try {
    const resolvedNow = Module._resolveFilename("finalhandler", module);
    tryPatchCacheByResolved(resolvedNow);
  } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_JS_1_6_VISIBLE", __void_diag_pack1_err); }

} catch (e) {
  try { console.error("[finalhandler.hardstub.v3] install failed:", e && (e.stack || e.message || String(e))); } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_FINALHANDLER_HARDSTUB_V3_JS_1_7_VISIBLE", __void_diag_pack1_err); }
}

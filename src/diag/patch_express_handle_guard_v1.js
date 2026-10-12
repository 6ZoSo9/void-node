'use strict';

/*
  VOID guard: some diag/self-probe code can accidentally call the Express app with missing req/res.
  Express -> finalhandler then throws: Cannot read properties of undefined (reading 'headersSent').
  This patch:
    - wraps express/lib/application.handle to no-op when req/res missing
    - wraps finalhandler export to no-op when req/res missing
    - installs a Module._load hook so it applies even if modules are loaded later
*/

(function () {
  const Module = require('module');

  function patchExpressApplication(app) {
    try {
      if (!app || typeof app.handle !== 'function') return;
      if (app.handle.__void_guard_v1) return;

      const orig = app.handle;
      function guardedHandle(req, res, out) {
        if (!req || !res) {
          if (typeof out === 'function') return out();
          return;
        }
        return orig.call(this, req, res, out);
      }
      guardedHandle.__void_guard_v1 = true;
      app.handle = guardedHandle;
    } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_HANDLE_GUARD_V1_JS_1_1_VISIBLE", __void_diag_pack1_err); }
  }

  function patchFinalhandlerExport(fh, moduleId) {
    try {
      if (typeof fh !== 'function') return fh;
      if (fh.__void_guard_v1) return fh;

      function wrappedFinalhandler(req, res, opts) {
        if (!req || !res) return function noop() {};
        try {
          return fh(req, res, opts);
        } catch (e) {
          const msg = String((e && e.message) || e || '');
          if (msg.includes('headersSent')) return function noop() {};
          throw e;
        }
      }
      // preserve enumerable props (rare but safe)
      for (const k of Object.keys(fh)) {
        try { wrappedFinalhandler[k] = fh[k]; } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_HANDLE_GUARD_V1_JS_1_2_VISIBLE", __void_diag_pack1_err); }
      }
      wrappedFinalhandler.__void_guard_v1 = true;

      // if possible, replace cache export so future requires get wrapped fn
      try {
        if (moduleId && require.cache[moduleId]) require.cache[moduleId].exports = wrappedFinalhandler;
      } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_HANDLE_GUARD_V1_JS_1_3_VISIBLE", __void_diag_pack1_err); }

      return wrappedFinalhandler;
    } catch (_) {
      return fh;
    }
  }

  function tryPatchAlreadyLoaded() {
    // express/lib/application
    try {
      const id = require.resolve('express/lib/application');
      if (require.cache[id] && require.cache[id].exports) patchExpressApplication(require.cache[id].exports);
    } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_HANDLE_GUARD_V1_JS_1_4_VISIBLE", __void_diag_pack1_err); }

    // finalhandler
    try {
      const id = require.resolve('finalhandler');
      if (require.cache[id] && require.cache[id].exports) {
        const wrapped = patchFinalhandlerExport(require.cache[id].exports, id);
        try { require.cache[id].exports = wrapped; } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_HANDLE_GUARD_V1_JS_1_5_VISIBLE", __void_diag_pack1_err); }
      }
    } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_HANDLE_GUARD_V1_JS_1_6_VISIBLE", __void_diag_pack1_err); }
  }

  // hook future loads
  const origLoad = Module._load;
  if (!origLoad.__void_hook_guard_v1) {
    Module._load = function (request, parent, isMain) {
      const exp = origLoad.apply(this, arguments);
      try {
        if (request === 'express/lib/application') patchExpressApplication(exp);
      } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_HANDLE_GUARD_V1_JS_1_7_VISIBLE", __void_diag_pack1_err); }
      try {
        if (request === 'finalhandler') return patchFinalhandlerExport(exp);
      } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_HANDLE_GUARD_V1_JS_1_8_VISIBLE", __void_diag_pack1_err); }
      return exp;
    };
    Module._load.__void_hook_guard_v1 = true;
  }

  tryPatchAlreadyLoaded();

  try {
    // optional breadcrumb (won't crash if console unavailable)
    console.error('[void-guard] patch_express_handle_guard_v1 installed');
  } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_HANDLE_GUARD_V1_JS_1_9_VISIBLE", __void_diag_pack1_err); }
})();

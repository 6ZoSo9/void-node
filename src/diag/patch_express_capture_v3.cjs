/* patch_express_capture_v3.cjs
 * Goal: ensure globalThis.__void_http_app is set regardless of how express is imported (CJS fn or ESM namespace w/ .default).
 */
'use strict';

try {
  const Module = require('module');
  const path = require('path');

  const G = globalThis;
  if (G.__void_express_capture_v3_installed) {
    try { console.error('[express-capture.v3] already installed; skipping'); } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_CAPTURE_V3_CJS_1_1_VISIBLE", __void_diag_pack1_err); }
    return;
  }
  G.__void_express_capture_v3_installed = true;

  function wrapExpressFn(fn, label) {
    if (typeof fn !== 'function') return fn;
    if (fn.__void_wrapped_express_capture_v3) return fn;

    function wrappedExpress(...args) {
      const app = fn(...args);
      try {
        G.__void_http_app = app;
        console.error('[express-capture.v3] captured app', {
          pid: process.pid,
          via: label,
          appType: typeof app,
          hasHandle: !!(app && app.handle),
          keys: app && typeof app === 'function' ? [] : (app ? Object.keys(app).slice(0, 12) : []),
        });
      } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_CAPTURE_V3_CJS_1_2_VISIBLE", __void_diag_pack1_err); }
      return app;
    }

    // best-effort property copy
    try {
      Object.defineProperty(wrappedExpress, '__void_wrapped_express_capture_v3', { value: true });
      for (const k of Object.keys(fn)) {
        try { wrappedExpress[k] = fn[k]; } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_CAPTURE_V3_CJS_1_3_VISIBLE", __void_diag_pack1_err); }
      }
      // make default point to callable in both shapes
      try { wrappedExpress.default = wrappedExpress; } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_CAPTURE_V3_CJS_1_4_VISIBLE", __void_diag_pack1_err); }
    } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_CAPTURE_V3_CJS_1_5_VISIBLE", __void_diag_pack1_err); }

    return wrappedExpress;
  }

  const origLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    const exp = origLoad.apply(this, arguments);

    // We only care about the canonical 'express' request.
    if (request === 'express') {
      try {
        const resolved = Module._resolveFilename(request, parent, isMain);
        console.error('[express-capture.v3] loaded', { pid: process.pid, request, resolved });
      } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_CAPTURE_V3_CJS_1_6_VISIBLE", __void_diag_pack1_err); }

      // Shape A: CJS export is a function.
      if (typeof exp === 'function') {
        const wrapped = wrapExpressFn(exp, 'cjs-export-fn');
        // keep .default aligned
        try { wrapped.default = wrapped; } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_CAPTURE_V3_CJS_1_7_VISIBLE", __void_diag_pack1_err); }
        return wrapped;
      }

      // Shape B: namespace object w/ default function.
      if (exp && typeof exp === 'object' && typeof exp.default === 'function') {
        exp.default = wrapExpressFn(exp.default, 'namespace.default');
        // also try to make the namespace callable if code does weird things
        try { exp.__void_wrapped_express_capture_v3 = true; } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_CAPTURE_V3_CJS_1_8_VISIBLE", __void_diag_pack1_err); }
        return exp;
      }

      // Unknown shape: just pass through
      return exp;
    }

    return exp;
  };

  try {
    const resolved0 = require.resolve('express');
    console.error('[express-capture.v3] installed', { pid: process.pid, expressPath: path.resolve(resolved0) });
  } catch {
    console.error('[express-capture.v3] installed', { pid: process.pid, expressPath: 'resolve_failed' });
  }
} catch (e) {
  try { console.error('[express-capture.v3] FAILED', e && (e.stack || e.message || String(e))); } catch (__void_diag_pack1_err) { __voidSrcDiagPack1Visible("VOID_SRC_DIAG_EXPRESS_FINALHANDLER_PACK1_PATCH_EXPRESS_CAPTURE_V3_CJS_1_9_VISIBLE", __void_diag_pack1_err); }
}

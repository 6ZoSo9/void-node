"use strict";

/*
 * patch_express_capture_v1.cjs
 * Intercepts require('express') and wraps the exported function so that when
 * express() is called, we capture the returned app into globalThis.__void_http_app.
 *
 * This works even if index.ts lost/moved the (globalThis as any).__void_http_app = app hook.
 */

const Module = require("module");
const origLoad = Module._load;

function log(...a){ try{ console.error("[express-capture.v1]", ...a); }catch{} }

function wrapExpress(mod) {
  try {
    const fn = (typeof mod === "function") ? mod : (mod && typeof mod.default === "function" ? mod.default : null);
    if (!fn) return mod;

    if (fn.__void_wrapped_express_capture_v1) return mod;

    function wrappedExpress(...args) {
      const app = fn(...args);
      try {
        const G = globalThis;
        if (G && !G.__void_http_app) G.__void_http_app = app;
        if (G) G.__void_http_app__captured_by = "express-capture.v1";
      } catch {}
      return app;
    }

    // mark + copy props
    try { wrappedExpress.__void_wrapped_express_capture_v1 = true; } catch {}
    try { Object.assign(wrappedExpress, fn); } catch {}
    try { wrappedExpress.default = wrappedExpress; } catch {}

    // If module was function, return function. If module was object, preserve object shape.
    if (typeof mod === "function") return wrappedExpress;
    try {
      const out = Object.assign({}, mod);
      out.default = wrappedExpress;
      return out;
    } catch {
      return { default: wrappedExpress };
    }
  } catch {
    return mod;
  }
}

Module._load = function(request, parent, isMain) {
  const mod = origLoad.apply(this, arguments);
  if (request === "express") return wrapExpress(mod);
  return mod;
};

log("installed pid=" + process.pid);

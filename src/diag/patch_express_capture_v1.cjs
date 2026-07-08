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

const VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1";
function recordVoidExpressCaptureV1EmptyCatchVisibilityV1(site, err) {
  try {
    const g = globalThis;
    const key = "__void_express_capture_v1_empty_catch_visibility_v1";
    const bucket = Array.isArray(g[key]) ? g[key] : [];
    bucket.push({ marker: VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
    while (bucket.length > 50) bucket.shift();
    g[key] = bucket;
  } catch (_visibilityRecordErr) {
    /* VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
  }
}

function log(...a){ try{ console.error("[express-capture.v1]", ...a); }catch(logErr){ recordVoidExpressCaptureV1EmptyCatchVisibilityV1("VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_LOG_WRITE", logErr); } }

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
      } catch (captureErr) { recordVoidExpressCaptureV1EmptyCatchVisibilityV1("VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_CAPTURE_APP", captureErr); }
      return app;
    }

    // mark + copy props
    try { wrappedExpress.__void_wrapped_express_capture_v1 = true; } catch (markerErr) { recordVoidExpressCaptureV1EmptyCatchVisibilityV1("VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_WRAPPED_MARKER", markerErr); }
    try { Object.assign(wrappedExpress, fn); } catch (assignErr) { recordVoidExpressCaptureV1EmptyCatchVisibilityV1("VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_ASSIGN_PROPS", assignErr); }
    try { wrappedExpress.default = wrappedExpress; } catch (defaultErr) { recordVoidExpressCaptureV1EmptyCatchVisibilityV1("VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_DEFAULT_EXPORT", defaultErr); }

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

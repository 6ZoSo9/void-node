/* patch_express_capture_v2.cjs
   Goal: capture express() return value even if index.ts hook never runs.
   Strategy: require('express') early, wrap exports, update require.cache export so future imports see wrapper.
*/
(function(){
  const G = globalThis;
  if (G.__void_express_capture_v2_installed) return;
  G.__void_express_capture_v2_installed = true;

  const VOID_EXPRESS_CAPTURE_V2_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_EXPRESS_CAPTURE_V2_EMPTY_CATCH_VISIBILITY_V1";
  function recordVoidExpressCaptureV2EmptyCatchVisibilityV1(site, err) {
    try {
      const g = globalThis;
      const key = "__void_express_capture_v2_empty_catch_visibility_v1";
      const bucket = Array.isArray(g[key]) ? g[key] : [];
      bucket.push({ marker: VOID_EXPRESS_CAPTURE_V2_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
      while (bucket.length > 50) bucket.shift();
      g[key] = bucket;
    } catch (_visibilityRecordErr) {
      /* VOID_EXPRESS_CAPTURE_V2_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
    }
  }

  function log(...a){ try{ console.error("[express-capture.v2]", ...a); }catch(logErr){ recordVoidExpressCaptureV2EmptyCatchVisibilityV1("VOID_EXPRESS_CAPTURE_V2_EMPTY_CATCH_VISIBILITY_V1_SITE_LOG_WRITE", logErr); } }

  try{
    const path = require.resolve("express");
    const orig = require("express");
    if (typeof orig !== "function") {
      log("WARN: express export not function; typeof=", typeof orig);
      return;
    }

    function wrappedExpress(...args){
      const app = orig(...args);
      try{
        G.__void_http_app = app;
        log("captured app", { pid: process.pid, hasGet: !!(app && app.get), hasHandle: !!(app && app.handle) });
      }catch(e){
        log("capture error", String(e && e.message || e));
      }
      return app;
    }

    // preserve properties commonly used off express fn
    try{
      Object.defineProperties(wrappedExpress, Object.getOwnPropertyDescriptors(orig));
    }catch(copyDescriptorErr){ recordVoidExpressCaptureV2EmptyCatchVisibilityV1("VOID_EXPRESS_CAPTURE_V2_EMPTY_CATCH_VISIBILITY_V1_SITE_COPY_DESCRIPTORS", copyDescriptorErr); }
    try{
      wrappedExpress.Router = orig.Router;
      wrappedExpress.json = orig.json;
      wrappedExpress.urlencoded = orig.urlencoded;
      wrappedExpress.static = orig.static;
    }catch(copyCommonPropsErr){ recordVoidExpressCaptureV2EmptyCatchVisibilityV1("VOID_EXPRESS_CAPTURE_V2_EMPTY_CATCH_VISIBILITY_V1_SITE_COPY_COMMON_PROPS", copyCommonPropsErr); }

    // override cache export so later imports get wrapper
    try{
      if (require.cache && require.cache[path]) require.cache[path].exports = wrappedExpress;
    }catch(cacheExportErr){ recordVoidExpressCaptureV2EmptyCatchVisibilityV1("VOID_EXPRESS_CAPTURE_V2_EMPTY_CATCH_VISIBILITY_V1_SITE_CACHE_EXPORT", cacheExportErr); }

    log("installed", { pid: process.pid, expressPath: path });
  } catch (e) {
    log("FATAL", String(e && e.stack || e));
  }
})();

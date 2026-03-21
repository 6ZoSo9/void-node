/* patch_express_capture_v2.cjs
   Goal: capture express() return value even if index.ts hook never runs.
   Strategy: require('express') early, wrap exports, update require.cache export so future imports see wrapper.
*/
(function(){
  const G = globalThis;
  if (G.__void_express_capture_v2_installed) return;
  G.__void_express_capture_v2_installed = true;

  function log(...a){ try{ console.error("[express-capture.v2]", ...a); }catch{} }

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
    }catch{}
    try{
      wrappedExpress.Router = orig.Router;
      wrappedExpress.json = orig.json;
      wrappedExpress.urlencoded = orig.urlencoded;
      wrappedExpress.static = orig.static;
    }catch{}

    // override cache export so later imports get wrapper
    try{
      if (require.cache && require.cache[path]) require.cache[path].exports = wrappedExpress;
    }catch{}

    log("installed", { pid: process.pid, expressPath: path });
  } catch (e) {
    log("FATAL", String(e && e.stack || e));
  }
})();

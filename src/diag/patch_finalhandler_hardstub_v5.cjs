/* eslint-disable */
(function () {
  const tag = `[finalhandler.hardstub.v5 pid=${process.pid}]`;
  const VOID_FINALHANDLER_HARDSTUB_V5_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_FINALHANDLER_HARDSTUB_V5_EMPTY_CATCH_VISIBILITY_V1";
  function recordVoidFinalhandlerHardstubV5EmptyCatchVisibilityV1(site, err) {
    try {
      const g = globalThis;
      const key = "__void_finalhandler_hardstub_v5_empty_catch_visibility_v1";
      const bucket = Array.isArray(g[key]) ? g[key] : [];
      bucket.push({ marker: VOID_FINALHANDLER_HARDSTUB_V5_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
      while (bucket.length > 50) bucket.shift();
      g[key] = bucket;
    } catch (_visibilityRecordErr) {
      /* VOID_FINALHANDLER_HARDSTUB_V5_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
    }
  }
  const log = (...a) => { try { console.error(tag, ...a); } catch (logErr) { recordVoidFinalhandlerHardstubV5EmptyCatchVisibilityV1("VOID_FINALHANDLER_HARDSTUB_V5_EMPTY_CATCH_VISIBILITY_V1_SITE_LOG_WRITE", logErr); } };

  try {
    const Module = require("module");

    function wrapFinalhandler(orig) {
      if (typeof orig !== "function") return orig;
      if (orig.__void_hardstub_v5) return orig;

      function guarded(req, res, opts) {
        if (!res || typeof res !== "object") res = {};
        if (typeof res.headersSent !== "boolean") res.headersSent = false;

        if (typeof res.getHeader !== "function") res.getHeader = function () { return undefined; };
        if (typeof res.setHeader !== "function") res.setHeader = function () {};
        if (typeof res.removeHeader !== "function") res.removeHeader = function () {};
        if (typeof res.write !== "function") res.write = function () { return true; };
        if (typeof res.end !== "function") res.end = function () {};
        if (typeof res.writeHead !== "function") res.writeHead = function () {};
        if (typeof res.on !== "function") res.on = function () { return res; };
        if (typeof res.statusCode !== "number") res.statusCode = 500;

        let done;
        try {
          done = orig(req, res, opts);
        } catch (e) {
          log("orig(req,res,opts) threw -> swallow", (e && e.stack) ? e.stack : e);
          return function () {};
        }

        if (typeof done !== "function") return function () {};
        return function (err) {
          try { return done(err); }
          catch (e) {
            log("done(err) threw -> swallow", (e && e.stack) ? e.stack : e);
            return;
          }
        };
      }

      try { Object.defineProperty(guarded, "__void_hardstub_v5", { value: 1 }); } catch (guardedDefineErr) { recordVoidFinalhandlerHardstubV5EmptyCatchVisibilityV1("VOID_FINALHANDLER_HARDSTUB_V5_EMPTY_CATCH_VISIBILITY_V1_SITE_GUARDED_MARKER_DEFINE", guardedDefineErr); }
      return guarded;
    }

    const searchPaths = [
      process.cwd(),
      __dirname,
      require("path").resolve(process.cwd(), "node_modules"),
      require("path").resolve(__dirname, "..", "..", "node_modules"),
      require("path").resolve(process.env.HOME || "", "dev", "void-node"),
      require("path").resolve(process.env.HOME || "", "dev", "void-node", "node_modules"),
    ].filter(Boolean);

    let resolved = null;
    try {
      resolved = require.resolve("finalhandler", { paths: searchPaths });
      const loaded = require(resolved);
      const wrapped = wrapFinalhandler(loaded);
      if (require.cache && require.cache[resolved]) require.cache[resolved].exports = wrapped;
      log("installed (resolve)", resolved);
    } catch (e) {
      log("resolve/load failed (hook still armed)", (e && e.stack) ? e.stack : e);
    }

    const origLoad = Module._load;
    if (!origLoad.__void_fh_hook_v5) {
      Module._load = function (request, parent, isMain) {
        const exp = origLoad.apply(this, arguments);
        if (request === "finalhandler") {
          try {
            const wrapped = wrapFinalhandler(exp);
            try {
              const r = Module._resolveFilename(request, parent, isMain);
              if (require.cache && require.cache[r]) require.cache[r].exports = wrapped;
              log("wrapped via Module._load", r);
            } catch (_) {
              log("wrapped via Module._load (no resolve)");
            }
            return wrapped;
          } catch (e) {
            log("wrap failed", (e && e.stack) ? e.stack : e);
            return exp;
          }
        }
        return exp;
      };
      try { Object.defineProperty(Module._load, "__void_fh_hook_v5", { value: 1 }); } catch (hookDefineErr) { recordVoidFinalhandlerHardstubV5EmptyCatchVisibilityV1("VOID_FINALHANDLER_HARDSTUB_V5_EMPTY_CATCH_VISIBILITY_V1_SITE_MODULE_LOAD_HOOK_DEFINE", hookDefineErr); }
      log("Module._load hook armed");
    } else {
      log("Module._load hook already armed");
    }
  } catch (e) {
    try { console.error(tag, "FATAL install error", (e && e.stack) ? e.stack : e); } catch (fatalLogErr) { recordVoidFinalhandlerHardstubV5EmptyCatchVisibilityV1("VOID_FINALHANDLER_HARDSTUB_V5_EMPTY_CATCH_VISIBILITY_V1_SITE_FATAL_INSTALL_LOG", fatalLogErr); }
  }
})();

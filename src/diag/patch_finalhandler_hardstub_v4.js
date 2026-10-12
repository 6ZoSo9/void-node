/* eslint-disable */
(function () {
  try {
    const tag = `[finalhandler.hardstub.v4 pid=${process.pid}]`;
    const log = (...a) => { try { console.error(tag, ...a); } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_FINALHANDLER_HARDSTUB_V4_JS_1_1_VISIBLE", __void_diag_pack4_err); } };

    const path = require("path");
    const Module = require("module");

    function wrapFinalhandler(orig) {
      if (typeof orig !== "function") return orig;
      if ((orig && orig.__void_hardstub_v4) || (orig && orig.__void_hardstub_v3)) return orig;

      function guarded(req, res, opts) {
        // If res is missing or unusable, manufacture a dummy res so finalhandler never explodes.
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
          try {
            return done(err);
          } catch (e) {
            log("done(err) threw -> swallow", (e && e.stack) ? e.stack : e);
            return;
          }
        };
      }

      try { Object.defineProperty(guarded, "__void_hardstub_v4", { value: 1 }); } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_FINALHANDLER_HARDSTUB_V4_JS_1_2_VISIBLE", __void_diag_pack4_err); }
      return guarded;
    }

    // 1) Force-resolve + load finalhandler NOW, then overwrite cache exports.
    let resolved = null;
    try {
      resolved = require.resolve("finalhandler");
      const loaded = require(resolved);
      const wrapped = wrapFinalhandler(loaded);
      if (require.cache && require.cache[resolved]) {
        require.cache[resolved].exports = wrapped;
      }
      log("installed (resolve)", resolved);
    } catch (e) {
      log("resolve/load failed (will still try Module._load hook)", (e && e.stack) ? e.stack : e);
    }

    // 2) Also hook Module._load so any later loads are wrapped.
    const origLoad = Module._load;
    if (!origLoad.__void_fh_hook_v4) {
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
      try { Object.defineProperty(Module._load, "__void_fh_hook_v4", { value: 1 }); } catch (__void_diag_pack4_err) { __voidSrcDiagPack4Visible("VOID_SRC_DIAG_HTTP_GUARD_PACK4_PATCH_FINALHANDLER_HARDSTUB_V4_JS_1_3_VISIBLE", __void_diag_pack4_err); }
      log("Module._load hook armed");
    } else {
      log("Module._load hook already armed");
    }
  } catch (_) {
    // absolute no-throw
  }
})();

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
      try { console.error('[finalhandler.hardstub.v3] finalhandler export is not a function; skipping'); } catch {}
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
        try { console.error('[finalhandler.hardstub.v3] orig threw:', e && (e.stack || e)); } catch {}
        const noop = function noopFinalhandlerErr() {};
        noop.__void_finalhandler_noop = 1;
        return noop;
      }
    }

    // copy enumerable props (best-effort)
    try {
      for (const k of Object.keys(orig)) {
        try { wrappedFinalhandler[k] = orig[k]; } catch {}
      }
    } catch {}

    // swap export in require cache (best-effort)
    try {
      const ent = require.cache[resolved];
      if (ent) ent.exports = wrappedFinalhandler;
    } catch {}

    try { console.error('[finalhandler.hardstub.v3] installed'); } catch {}
  } catch (e) {
    try { console.error('[finalhandler.hardstub.v3] skip:', e && (e.stack || e)); } catch {}
  }
})();

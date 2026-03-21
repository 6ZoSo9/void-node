/**
 * patch_express_handle_guard_v2.cjs
 * Safe preload stub: does nothing unless Express is present.
 * Goal: prevent systemd NODE_OPTIONS=--require ... from crashing on MODULE_NOT_FOUND.
 */
(function () {
  try {
    // If express isn't installed/loaded, do nothing.
    let express;
    try { express = require("express"); } catch { express = null; }
    if (!express || !express.application) {
      try { console.error("[express.handle.guard.v2] installed (noop: express not present)"); } catch {}
      return;
    }

    const appProto = express.application;
    const origHandle = appProto.handle;
    if (typeof origHandle !== "function") {
      try { console.error("[express.handle.guard.v2] installed (noop: app.handle not a function)"); } catch {}
      return;
    }

    if (origHandle.__void_guarded_v2) {
      try { console.error("[express.handle.guard.v2] already active"); } catch {}
      return;
    }

    function guardedHandle(req, res, next) {
      // Hard guard: if req/res missing, skip to next safely.
      if (!req || !res) {
        try { return typeof next === "function" ? next() : undefined; } catch { return; }
      }
      try {
        return origHandle.call(this, req, res, next);
      } catch (e) {
        try { console.error("[express.handle.guard.v2] caught:", (e && e.stack) ? e.stack : e); } catch {}
        try { return typeof next === "function" ? next(e) : undefined; } catch {}
      }
    }
    guardedHandle.__void_guarded_v2 = true;
    appProto.handle = guardedHandle;

    try { console.error("[express.handle.guard.v2] installed"); } catch {}
  } catch (e) {
    try { console.error("[express.handle.guard.v2] FAILED:", (e && e.stack) ? e.stack : e); } catch {}
  }
})();

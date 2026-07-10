/* agent_receipt_require_who_v1.cjs
   Enforce: who must be present (non-empty string) for agent receipts.
   Approach: wait until routes mount, then wrap POST handlers for:
     - /agent/v0/receipt/new
     - /agent/v0/receipt/:id
   This avoids middleware ordering issues (we inspect req.body after JSON parsing).
*/
function getApp() {
  return globalThis && globalThis.__void_http_app;
}

function isNonEmptyString(x) {
  return typeof x === "string" && x.trim().length > 0;
}

function wrapPostHandlers(app, path) {
  const r = app && app._router;
  const stack = r && r.stack;
  if (!Array.isArray(stack)) return 0;

  let wrapped = 0;

  for (const layer of stack) {
    const route = layer && layer.route;
    if (!route) continue;
    if (route.path !== path) continue;

    // express stores methods in route.methods
    const methods = route.methods || {};
    if (!methods.post) continue;

    // route.stack contains handler layers
    const rs = route.stack || [];
    for (const rl of rs) {
      const h = rl && rl.handle;
      if (typeof h !== "function") continue;

      if (h.__void_require_who_wrapped_v1) continue;

      rl.handle = function requireWhoWrapper(req, res, next) {
        try {
          const who = req && req.body && req.body.who;
          if (!isNonEmptyString(who)) {
            // consistent error shape with your other guards
            res.status(400).json({ ok: false, error: "missing_who" });
            return;
          }
        } catch (_) {
          try { res.status(400).json({ ok: false, error: "missing_who" }); } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_AGENT_RECEIPT_REQUIRE_WHO_V1_CJS_1_1_VISIBLE", __void_diag_pack3_err); }
          return;
        }
        return h(req, res, next);
      };

      rl.handle.__void_require_who_wrapped_v1 = true;
      wrapped++;
    }
  }

  return wrapped;
}

(function boot() {
  const G = globalThis;
  if (G.__void_agent_receipt_require_who_v1) return;
  G.__void_agent_receipt_require_who_v1 = true;

  let tries = 0;
  const t = setInterval(() => {
    tries++;

    const app = getApp();
    if (!app) return;

    const w1 = wrapPostHandlers(app, "/agent/v0/receipt/new");
    const w2 = wrapPostHandlers(app, "/agent/v0/receipt/:id");

    // stop once we've wrapped at least one handler for each path (or after enough tries)
    if ((w1 > 0 && w2 > 0) || tries > 2000) {
      try { console.error(`[agent_receipt_require_who_v1] wrapped new=${w1} id=${w2} tries=${tries}`); } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_AGENT_RECEIPT_REQUIRE_WHO_V1_CJS_1_2_VISIBLE", __void_diag_pack3_err); }
      clearInterval(t);
    }
  }, 5);
})();

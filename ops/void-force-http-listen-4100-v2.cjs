/* eslint-disable */
(function () {
  const TAG = "[http4100.force.v2]";
  const host = (process.env.HTTP_HOST && String(process.env.HTTP_HOST)) || "127.0.0.1";
  const port = (() => {
    const v = (process.env.HTTP_PORT && String(process.env.HTTP_PORT)) || "4100";
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 4100;
  })();

  function log(...a) {
    try { console.error(TAG, ...a); } catch (_) { process.stderr.write(TAG + " VOID_OPS_FORCE_HTTP_LISTEN_V2_LOG_VISIBLE " + String(_ && (_.stack || _.message) ? (_.stack || _.message) : _) + "\n"); }
  }

  log("loaded", { host, port, pid: process.pid });

  const g = globalThis;
  const SYM_FORCED = "__void_http_forced_v2__";
  const SYM_SRV = "__void_http_forced_server_v2__";

  if (g[SYM_FORCED]) {
    log("already armed; skipping duplicate");
    return;
  }
  g[SYM_FORCED] = { armedAt: Date.now() };

  // If code *does* call listen itself, we still want to know.
  function wrapListen(app) {
    if (!app || typeof app.listen !== "function") return;
    if (app.__void_listen_wrapped_v2) return;
    const orig = app.listen.bind(app);
    app.listen = function (...args) {
      log("app.listen called by code", { args0: args[0], args1: args[1] });
      try {
        const srv = orig(...args);
        try {
          srv.on("error", (e) => log("server error (code-listen)", String(e && (e.stack || e))));
          srv.on("listening", () => log("server listening (code-listen)", srv.address && srv.address()));
        } catch (_) { log("VOID_OPS_FORCE_HTTP_LISTEN_V2_CODE_LISTEN_EVENTS_VISIBLE", String(_ && (_.stack || _.message) ? (_.stack || _.message) : _)); }
        return srv;
      } catch (e) {
        log("app.listen threw (code-listen)", String(e && (e.stack || e)));
        throw e;
      }
    };
    app.__void_listen_wrapped_v2 = 1;
  }

  const start = Date.now();
  const maxWaitMs = 20000;
  const pollMs = 200;

  const t = setInterval(() => {
    const elapsed = Date.now() - start;

    const app = g.__void_http_app;
    if (app) wrapListen(app);

    // If we already forced a server, stop polling.
    if (g[SYM_SRV] && g[SYM_SRV].listening) {
      clearInterval(t);
      return;
    }

    if (!app) {
      if (elapsed > maxWaitMs) {
        clearInterval(t);
        log("gave up: __void_http_app never appeared", { elapsedMs: elapsed });
      }
      return;
    }

    // Try to force bind after a short grace period.
    if (elapsed < 1500) return;

    try {
      log("FORCING listen now", { host, port, elapsedMs: elapsed });
      const srv = app.listen(port, host, () => {
        log("FORCED listening callback", { address: (srv && srv.address && srv.address()) || null });
      });
      g[SYM_SRV] = srv;
      try {
        srv.on("error", (e) => log("server error (forced)", String(e && (e.stack || e))));
        srv.on("listening", () => log("server listening (forced)", srv.address && srv.address()));
      } catch (_) { log("VOID_OPS_FORCE_HTTP_LISTEN_V2_FORCED_EVENTS_VISIBLE", String(_ && (_.stack || _.message) ? (_.stack || _.message) : _)); }
      clearInterval(t);
      return;
    } catch (e) {
      clearInterval(t);
      log("FORCE listen threw", String(e && (e.stack || e)));
      return;
    }
  }, pollMs);

  try { t.unref && t.unref(); } catch (_) { log("VOID_OPS_FORCE_HTTP_LISTEN_V2_TIMER_UNREF_VISIBLE", String(_ && (_.stack || _.message) ? (_.stack || _.message) : _)); }
})();

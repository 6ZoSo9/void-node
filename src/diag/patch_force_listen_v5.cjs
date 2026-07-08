/* force-listen.v5 (LOUD) — polls for globalThis.__void_http_app and binds an http server.
   Goal: never fail silently. */
(() => {
  try {
    const G = globalThis;
    if (G.__void_force_listen_v5_installed) return;
    G.__void_force_listen_v5_installed = true;

    const pid = process.pid;
    const host = (process.env.VOID_FORCE_LISTEN_HOST || "127.0.0.1");
    const port = Number(process.env.HTTP_PORT || 4100);
    const VOID_FORCE_LISTEN_V5_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_FORCE_LISTEN_V5_EMPTY_CATCH_VISIBILITY_V1";
    function recordVoidForceListenV5EmptyCatchVisibilityV1(site, err) {
      try {
        const g = globalThis;
        const key = "__void_force_listen_v5_empty_catch_visibility_v1";
        const bucket = Array.isArray(g[key]) ? g[key] : [];
        bucket.push({ marker: VOID_FORCE_LISTEN_V5_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
        while (bucket.length > 50) bucket.shift();
        g[key] = bucket;
      } catch (_visibilityRecordErr) {
        /* VOID_FORCE_LISTEN_V5_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
      }
    }

    const log = (...a) => { try { console.error("[force-listen.v5]", ...a); } catch (logErr) { recordVoidForceListenV5EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V5_EMPTY_CATCH_VISIBILITY_V1_SITE_LOG_WRITE", logErr); } };
    log("installed", { pid, host, port });

    const http = require("http");

    let started = false;
    let tries = 0;
    const maxTries = Number(process.env.VOID_FORCE_LISTEN_TRIES || 240); // 240*250ms = 60s
    const intervalMs = Number(process.env.VOID_FORCE_LISTEN_INTERVAL_MS || 250);

    function getApp() {
      try {
        const a = G.__void_http_app;
        return a;
      } catch { return undefined; }
    }

    function makeHandler(app) {
      return function handler(req, res) {
        try {
          if (typeof app === "function") return app(req, res);
          if (app && typeof app.handle === "function") return app.handle(req, res);
          res.statusCode = 500;
          res.setHeader("content-type", "text/plain");
          res.end("force-listen.v5: no express handler\n");
        } catch (e) {
          log("handler error", String(e && e.stack || e));
          try {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain");
            res.end("force-listen.v5: handler threw\n");
          } catch (handlerResponseErr) { recordVoidForceListenV5EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V5_EMPTY_CATCH_VISIBILITY_V1_SITE_HANDLER_ERROR_RESPONSE", handlerResponseErr); }
        }
      };
    }

    function bindNow(app) {
      if (started) return;
      started = true;

      log("attempting bind", {
        pid, host, port,
        appType: typeof app,
        hasHandle: !!(app && typeof app.handle === "function"),
        hasGet: !!(app && typeof app.get === "function"),
      });

      const srv = http.createServer(makeHandler(app));
      G.__void_http_server_forced_v5 = srv;

      srv.on("error", (err) => {
        log("SERVER ERROR", {
          name: err && err.name,
          code: err && err.code,
          errno: err && err.errno,
          syscall: err && err.syscall,
          address: err && err.address,
          port: err && err.port,
          message: String(err && err.message || err),
          stack: String(err && err.stack || ""),
        });
      });

      try {
        srv.listen({ host, port }, () => {
          let addr = null;
          try { addr = srv.address(); } catch (addressErr) { recordVoidForceListenV5EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V5_EMPTY_CATCH_VISIBILITY_V1_SITE_SERVER_ADDRESS", addressErr); }
          log("LISTENING", { pid, addr });
        });
      } catch (e) {
        log("listen() THREW", String(e && e.stack || e));
      }
    }

    const t = setInterval(() => {
      tries++;
      const app = getApp();

      if (app && (typeof app === "function" || typeof app.handle === "function")) {
        clearInterval(t);
        bindNow(app);
        return;
      }

      if (tries % 8 === 0) {
        log("poll", {
          tries, maxTries,
          hasApp: !!app,
          appType: typeof app,
          hasHandle: !!(app && typeof app.handle === "function"),
          hasGet: !!(app && typeof app.get === "function"),
        });
      }

      if (tries >= maxTries) {
        clearInterval(t);
        log("TIMEOUT waiting for __void_http_app", { tries, maxTries });
      }
    }, intervalMs);

  } catch (e) {
    try { console.error("[force-listen.v5] FATAL install error", String(e && e.stack || e)); } catch (fatalLogErr) { recordVoidForceListenV5EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V5_EMPTY_CATCH_VISIBILITY_V1_SITE_FATAL_INSTALL_LOG", fatalLogErr); }
  }
})();

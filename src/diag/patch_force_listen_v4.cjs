/* patch_force_listen_v4.cjs
   Goal: If VOID Node never calls app.listen(), force-bind an HTTP server once the Express app exists.
   Strategy: poll for globalThis.__void_http_app; create http server; listen; log success/error; avoid double-bind.
*/
(() => {
  const G = globalThis;
  if (G.__void_force_listen_v4_installed) return;
  G.__void_force_listen_v4_installed = true;

  const pid = (typeof process !== "undefined" && process && process.pid) ? process.pid : -1;

  function now() { return Date.now(); }
  function log(...a) { try { console.error("[force-listen.v4]", ...a); } catch {} }

  function getPort() {
    const p = (process && process.env && (process.env.HTTP_PORT || process.env.PORT)) ? String(process.env.HTTP_PORT || process.env.PORT) : "";
    const n = Number(p || "4100");
    return Number.isFinite(n) && n > 0 ? n : 4100;
  }

  function getHost() {
    const h = (process && process.env && process.env.HTTP_HOST) ? String(process.env.HTTP_HOST) : "";
    return (h && h.trim()) ? h.trim() : "127.0.0.1";
  }

  function tryBind(reason) {
    if (G.__void_force_listen_v4_bound) return true;

    const app = G.__void_http_app;
    if (!app) return false;
    if (typeof app !== "function" && typeof app.handle !== "function") {
      log("app present but not handler-ish; type=", typeof app);
      return false;
    }

    // already has a live server? then don't fight it
    const prev = G.__void_http_server;
    if (prev && typeof prev.listening === "boolean" && prev.listening) {
      G.__void_force_listen_v4_bound = true;
      log("detected existing __void_http_server listening; noop");
      return true;
    }

    const port = getPort();
    const host = getHost();

    let http;
    try { http = require("http"); } catch (e) { log("require(http) failed", e && (e.stack || e)); return false; }

    try {
      const handler = (typeof app === "function") ? app : (req, res) => app.handle(req, res);
      const server = http.createServer(handler);

      server.on("error", (err) => {
        log("listen error", { port, host, reason, code: err && err.code, message: err && err.message });
      });

      server.listen(port, host, () => {
        try {
          G.__void_http_server = server;
          G.__void_force_listen_v4_bound = true;
          log("FORCED listen OK", { pid, host, port, reason });
        } catch {}
      });

      return true;
    } catch (e) {
      log("bind threw", e && (e.stack || e));
      return false;
    }
  }

  // also wrap app.listen if it exists (diagnostic)
  function tryWrapListen() {
    const app = G.__void_http_app;
    if (!app || typeof app.listen !== "function") return;
    if (app.__void_listen_wrapped_v4) return;
    try {
      const orig = app.listen.bind(app);
      app.listen = function(...args) {
        try { log("app.listen called", { pid, args0: args && args[0] }); } catch {}
        return orig(...args);
      };
      app.__void_listen_wrapped_v4 = true;
    } catch {}
  }

  log("installed", { pid, port: getPort(), host: getHost() });

  const started = now();
  const intervalMs = 100;
  const timeoutMs = 30000;

  const t = setInterval(() => {
    tryWrapListen();
    const ok = tryBind("poll");
    if (ok && G.__void_force_listen_v4_bound) { clearInterval(t); return; }
    if (now() - started > timeoutMs) {
      clearInterval(t);
      log("timeout waiting for __void_http_app", { pid, waitedMs: now() - started, seen: !!G.__void_http_app });
    }
  }, intervalMs);
})();

/* patch_force_listen_v6.cjs
   Goal: bind a host-visible listener even if app.listen never runs.
   Uses http.createServer(app) once __void_http_app exists; logs everything; writes /tmp status json.
*/
(function(){
  const G = globalThis;
  if (G.__void_force_listen_v6_installed) return;
  G.__void_force_listen_v6_installed = true;

  const fs = require("fs");
  const http = require("http");

  const VOID_FORCE_LISTEN_V6_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_FORCE_LISTEN_V6_EMPTY_CATCH_VISIBILITY_V1";
  function recordVoidForceListenV6EmptyCatchVisibilityV1(site, err) {
    try {
      const g = globalThis;
      const key = "__void_force_listen_v6_empty_catch_visibility_v1";
      const bucket = Array.isArray(g[key]) ? g[key] : [];
      bucket.push({ marker: VOID_FORCE_LISTEN_V6_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
      while (bucket.length > 50) bucket.shift();
      g[key] = bucket;
    } catch (_visibilityRecordErr) {
      /* VOID_FORCE_LISTEN_V6_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
    }
  }

  function log(...a){ try{ console.error("[force-listen.v6]", ...a); }catch(logErr){ recordVoidForceListenV6EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V6_EMPTY_CATCH_VISIBILITY_V1_SITE_LOG_WRITE", logErr); } }
  function writeStatus(obj){
    try{
      const p = `/tmp/void-force-listen-v6.${process.pid}.json`;
      fs.writeFileSync(p, JSON.stringify({ ts: Date.now(), pid: process.pid, ...obj }, null, 2));
      log("status->", p);
    }catch(e){
      log("status write error", String(e && e.message || e));
    }
  }

  const port = Number(process.env.HTTP_PORT || 4100);
  const host = (process.env.HTTP_HOST || "127.0.0.1");

  log("installed", { pid: process.pid, host, port });

  let started = false;
  let tries = 0;
  const maxTries = 480; // ~120s at 250ms

  const t = setInterval(() => {
    tries++;

    const app = G.__void_http_app;
    const ok = !!(app && (typeof app === "function" || typeof app.handle === "function" || typeof app.get === "function"));
    if (!ok) {
      if (tries % 20 === 0) log("poll", { tries, haveApp: !!app, type: typeof app });
      if (tries >= maxTries) {
        clearInterval(t);
        log("TIMEOUT waiting for __void_http_app", { tries, maxTries });
        writeStatus({ ok: false, stage: "timeout_wait_app", tries, maxTries });
      }
      return;
    }

    if (started) return;
    started = true;
    clearInterval(t);

    let handler = app;
    if (typeof app !== "function" && typeof app.handle === "function") handler = app.handle.bind(app);

    log("got app -> creating server", { tries, handlerType: typeof handler });

    const server = http.createServer((req, res) => {
      try{
        if (typeof handler === "function") return handler(req, res);
      } catch (e) {
        try{
          res.statusCode = 500;
          res.setHeader("content-type", "text/plain");
          res.end("handler_error\n");
        }catch(handlerResponseErr){ recordVoidForceListenV6EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V6_EMPTY_CATCH_VISIBILITY_V1_SITE_HANDLER_ERROR_RESPONSE", handlerResponseErr); }
        log("handler threw", String(e && e.stack || e));
        return;
      }
      try{
        res.statusCode = 200;
        res.setHeader("content-type", "text/plain");
        res.end("ok_nohandler\n");
      }catch(noHandlerResponseErr){ recordVoidForceListenV6EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V6_EMPTY_CATCH_VISIBILITY_V1_SITE_NO_HANDLER_RESPONSE", noHandlerResponseErr); }
    });

    server.on("error", (e) => {
      log("SERVER_ERROR", String(e && e.stack || e));
      writeStatus({ ok: false, stage: "server_error", error: String(e && e.message || e), code: e && e.code });
    });

    server.on("listening", () => {
      try{
        const addr = server.address();
        log("LISTENING", addr);
        writeStatus({ ok: true, stage: "listening", address: addr });
      }catch(e){
        log("listening but address() failed", String(e && e.message || e));
        writeStatus({ ok: true, stage: "listening_noaddr" });
      }
    });

    try{
      server.listen(port, host);
      log("listen() called", { host, port });
      writeStatus({ ok: true, stage: "listen_called", host, port });
    }catch(e){
      log("listen() THROW", String(e && e.stack || e));
      writeStatus({ ok: false, stage: "listen_throw", error: String(e && e.message || e) });
    }

    // keep refs so GC can’t drop it
    try{
      G.__void_force_listen_v6_server = server;
      G.__void_force_listen_v6_hostport = { host, port };
    }catch(globalStoreErr){ recordVoidForceListenV6EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V6_EMPTY_CATCH_VISIBILITY_V1_SITE_GLOBAL_SERVER_STORE", globalStoreErr); }
  }, 250);
})();

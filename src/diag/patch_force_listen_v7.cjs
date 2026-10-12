'use strict';
/*
 * patch_force_listen_v7.cjs
 * Smart rescue:
 * - Probe http://127.0.0.1:${PORT}/health; if OK -> do nothing.
 * - If __void_http_app appears but port is already bound -> stop (no EADDRINUSE spam).
 * - Only tries to bind if health is NOT OK and port isn't already bound.
 */
try {
  const http = require('http');
  const net = require('net');

  const G = globalThis;

  const VOID_FORCE_LISTEN_V7_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_FORCE_LISTEN_V7_EMPTY_CATCH_VISIBILITY_V1";
  function recordVoidForceListenV7EmptyCatchVisibilityV1(site, err) {
    try {
      const g = globalThis;
      const key = "__void_force_listen_v7_empty_catch_visibility_v1";
      const bucket = Array.isArray(g[key]) ? g[key] : [];
      bucket.push({ marker: VOID_FORCE_LISTEN_V7_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
      while (bucket.length > 50) bucket.shift();
      g[key] = bucket;
    } catch (_visibilityRecordErr) {
      /* VOID_FORCE_LISTEN_V7_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
    }
  }
  if (G.__void_force_listen_v7_installed) {
    try { console.error('[force-listen.v7] already installed; skipping'); } catch (alreadyInstalledLogErr) { recordVoidForceListenV7EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V7_EMPTY_CATCH_VISIBILITY_V1_SITE_ALREADY_INSTALLED_LOG", alreadyInstalledLogErr); }
    return;
  }
  G.__void_force_listen_v7_installed = true;

  const host = process.env.HTTP_HOST || '127.0.0.1';
  const port = Number(process.env.HTTP_PORT || 4100);
  const STATUS = `/tmp/void-force-listen-v7.${process.pid}.json`;

  function writeStatus(obj) {
    try {
      require('fs').writeFileSync(STATUS, JSON.stringify({ ts: Date.now(), pid: process.pid, host, port, ...obj }, null, 2));
      console.error('[force-listen.v7] status->', STATUS);
    } catch (writeStatusErr) { recordVoidForceListenV7EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V7_EMPTY_CATCH_VISIBILITY_V1_SITE_WRITE_STATUS", writeStatusErr); }
  }

  function probeHealth(timeoutMs = 600) {
    return new Promise((resolve) => {
      const req = http.get(
        { host, port, path: '/health', timeout: timeoutMs },
        (res) => {
          // Any 2xx/3xx means "server is up enough"
          const ok = res && typeof res.statusCode === 'number' && res.statusCode >= 200 && res.statusCode < 400;
          res.resume();
          resolve(ok);
        }
      );
      req.on('timeout', () => { try { req.destroy(); } catch (reqDestroyErr) { recordVoidForceListenV7EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V7_EMPTY_CATCH_VISIBILITY_V1_SITE_REQ_DESTROY", reqDestroyErr); } resolve(false); });
      req.on('error', () => resolve(false));
    });
  }

  function probePort(timeoutMs = 400) {
    return new Promise((resolve) => {
      const s = net.createConnection({ host, port });
      const t = setTimeout(() => { try { s.destroy(); } catch (socketTimeoutDestroyErr) { recordVoidForceListenV7EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V7_EMPTY_CATCH_VISIBILITY_V1_SITE_SOCKET_TIMEOUT_DESTROY", socketTimeoutDestroyErr); } resolve(false); }, timeoutMs);
      s.once('connect', () => { clearTimeout(t); try { s.destroy(); } catch (socketConnectDestroyErr) { recordVoidForceListenV7EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V7_EMPTY_CATCH_VISIBILITY_V1_SITE_SOCKET_CONNECT_DESTROY", socketConnectDestroyErr); } resolve(true); });
      s.once('error', () => { clearTimeout(t); resolve(false); });
    });
  }

  let stopped = false;
  let occupiedMode = false;

  async function stop(reason, extra) {
    if (stopped) return;
    stopped = true;
    writeStatus({ ok: true, reason, ...extra });
    try { console.error('[force-listen.v7] STOP', { reason, ...extra }); } catch (stopLogErr) { recordVoidForceListenV7EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V7_EMPTY_CATCH_VISIBILITY_V1_SITE_STOP_LOG", stopLogErr); }
  }

  async function tick(tries, maxTries) {
    if (stopped) return;

    // If health is already up, we’re done.
    const healthy = await probeHealth();
    if (healthy) return stop('health_ok');

    // If port is already bound, don't try to bind; just watch for health for a bit then stop.
    const portOpen = await probePort();
    if (portOpen && !occupiedMode) {
      occupiedMode = true;
      console.error('[force-listen.v7] port already open; entering watch mode');
      // watch for health for up to 30s then stop either way (no spam)
      const start = Date.now();
      const iv = setInterval(async () => {
        if (stopped) return clearInterval(iv);
        const ok = await probeHealth();
        if (ok) { clearInterval(iv); return stop('health_ok_after_port_open'); }
        if (Date.now() - start > 30000) { clearInterval(iv); return stop('port_open_but_health_no', { warn: true }); }
      }, 1000);
      return;
    }

    // Otherwise, only attempt rescue bind once we actually have an app.
    const app = G.__void_http_app;
    const haveApp = !!app && (typeof app === 'function' || typeof app.handle === 'function');
    if (!haveApp) {
      if (tries % 20 === 0) console.error('[force-listen.v7] poll', { tries, haveApp: false, type: typeof app });
      if (tries >= maxTries) return stop('timeout_waiting_for_app', { warn: true, tries, maxTries });
      return;
    }

    // Re-check health right before attempting bind.
    if (await probeHealth()) return stop('health_ok_before_bind');

    console.error('[force-listen.v7] got app -> creating server', { tries, handlerType: typeof app });
    const handler = (typeof app === 'function') ? app : app.handle.bind(app);
    const server = http.createServer(handler);

    server.once('listening', () => {
      console.error('[force-listen.v7] LISTENING', { host, port });
      stop('bound_ok');
    });

    server.once('error', (e) => {
      const msg = e && (e.code || e.message || String(e));
      console.error('[force-listen.v7] SERVER_ERROR', msg);
      // EADDRINUSE means someone (usually the real server) already bound it -> stop, don’t spam.
      if (e && e.code === 'EADDRINUSE') return stop('addr_in_use', { warn: false });
      stop('server_error', { warn: true, error: msg });
    });

    try {
      console.error('[force-listen.v7] listen() called', { host, port });
      server.listen(port, host);
    } catch (e) {
      console.error('[force-listen.v7] listen() throw', e && (e.stack || e.message || String(e)));
      stop('listen_throw', { warn: true });
    }
  }

  console.error('[force-listen.v7] installed', { pid: process.pid, host, port });
  // Kick fast, then back off slightly.
  let tries = 0;
  const maxTries = 480;
  const iv = setInterval(() => {
    tries++;
    tick(tries, maxTries).catch(() => {});
    if (tries >= maxTries && !stopped) stop('timeout_global', { warn: true, tries, maxTries });
    if (stopped) clearInterval(iv);
  }, 250);
} catch (e) {
  try { console.error('[force-listen.v7] FAILED', e && (e.stack || e.message || String(e))); } catch (failedLogErr) { recordVoidForceListenV7EmptyCatchVisibilityV1("VOID_FORCE_LISTEN_V7_EMPTY_CATCH_VISIBILITY_V1_SITE_FAILED_LOG", failedLogErr); }
}

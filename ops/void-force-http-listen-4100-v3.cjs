/**
 * void-force-http-listen-4100-v3.cjs
 * Goal: if VOID's express app exists at globalThis.__void_http_app but nothing is listening,
 * start http.createServer(app).listen(HTTP_PORT, HTTP_HOST).
 *
 * This does NOT call app() directly (avoids finalhandler req/res undefined path).
 */
(() => {
  const tag = '[force-listen.v3]';
  const http = require('http');
  const net = require('net');

  const host = (process.env.HTTP_HOST && String(process.env.HTTP_HOST).trim()) || '127.0.0.1';
  const port = (() => {
    const n = parseInt(String(process.env.HTTP_PORT || '4100'), 10);
    return Number.isFinite(n) && n > 0 ? n : 4100;
  })();

  let started = false;
  let attempts = 0;

  function isPortOpen(cb) {
    const s = net.createConnection({ host, port });
    let done = false;
    const finish = (open) => { if (done) return; done = true; try { s.destroy(); } catch (e) { console.error('[force-http-listen:v3] VOID_OPS_FORCE_HTTP_LISTEN_V3_SOCKET_DESTROY_VISIBLE', e && e.message ? e.message : e); } cb(open); };
    s.once('connect', () => finish(true));
    s.once('error', () => finish(false));
    s.setTimeout(200, () => finish(false));
  }

  function tryStart() {
    attempts++;

    const app = globalThis.__void_http_app;
    if (!app) {
      if (attempts === 25 || attempts === 100) {
        console.error(tag, 'waiting for globalThis.__void_http_app (missing so far), attempts=', attempts);
      }
      return;
    }

    if (started) return;

    isPortOpen((open) => {
      if (open) {
        started = true;
        console.error(tag, 'port already listening', host + ':' + port, '(leaving it alone)');
        return;
      }

      try {
        const srv = http.createServer(app);
        srv.on('error', (e) => {
          const msg = e && e.message ? String(e.message) : String(e);
          console.error(tag, 'listen error:', msg);
        });
        srv.listen(port, host, () => {
          started = true;
          console.error(tag, 'LISTENING OK', host + ':' + port);
        });
        console.error(tag, 'listen() invoked', host + ':' + port);
      } catch (e) {
        const msg = e && e.message ? String(e.message) : String(e);
        console.error(tag, 'FAILED to start server:', msg);
      }
    });
  }

  console.error(tag, 'installed; target=', host + ':' + port);

  // fast poll early, then slow
  const fast = setInterval(tryStart, 100);
  setTimeout(() => {
    clearInterval(fast);
    setInterval(tryStart, 1000);
  }, 15000);

  // first attempt immediately
  tryStart();
})();

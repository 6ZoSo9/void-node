'use strict';

const net = require('net');

const PORT = Number(process.env.HTTP_PORT || 4100);
const HOST = '127.0.0.1';

function probePort(port, host, timeoutMs = 250) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host });
    let done = false;

    const finish = (ok) => {
      if (done) return;
      done = true;
      try { s.destroy(); } catch (e) { console.error('[force-http-listen] VOID_OPS_FORCE_HTTP_LISTEN_V1_SOCKET_DESTROY_VISIBLE', e && e.message ? e.message : e); }
      resolve(ok);
    };

    s.setTimeout(timeoutMs, () => finish(false));
    s.on('connect', () => finish(true));
    s.on('error', () => finish(false));
  });
}

async function tryForceListenOnce() {
  try {
    // already listening? bail
    const up = await probePort(PORT, HOST, 250);
    if (up) return;

    const app = globalThis.__void_http_app;
    if (!app || typeof app.listen !== 'function') return;

    if (globalThis.__void_force_http_listen_started) return;
    globalThis.__void_force_http_listen_started = true;

    const srv = app.listen(PORT, HOST, () => {
      // one-line log only
      try { console.error(`[force-http-listen] bound ${HOST}:${PORT}`); } catch (logErr) { process.stderr.write('[force-http-listen] VOID_OPS_FORCE_HTTP_LISTEN_V1_BOUND_LOG_VISIBLE '+String(logErr && logErr.message ? logErr.message : logErr)+'\n'); }
    });

    globalThis.__void_force_http_server = srv;
  } catch (e) {
    try { console.error('[force-http-listen] error:', (e && e.message) ? e.message : e); } catch (logErr) { process.stderr.write('[force-http-listen] VOID_OPS_FORCE_HTTP_LISTEN_V1_ERROR_LOG_VISIBLE '+String(logErr && logErr.message ? logErr.message : logErr)+'\n'); }
  }
}

let tries = 0;
const MAX_TRIES = 120; // ~60s at 500ms
const iv = setInterval(async () => {
  tries++;
  await tryForceListenOnce();

  // stop when either listening or we gave up
  const up = await probePort(PORT, HOST, 150);
  if (up || tries >= MAX_TRIES) {
    clearInterval(iv);
    if (!up) {
      try { console.error(`[force-http-listen] gave_up after ${tries} tries (still not listening)`); } catch (logErr) { process.stderr.write('[force-http-listen] VOID_OPS_FORCE_HTTP_LISTEN_V1_GAVE_UP_LOG_VISIBLE '+String(logErr && logErr.message ? logErr.message : logErr)+'\n'); }
    }
  }
}, 500);

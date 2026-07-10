'use strict';

const http = require('http');

function getJsonOnce(path, cb) {
  const port = Number(process.env.HTTP_PORT || 4100);
  const req = http.request(
    { host: '127.0.0.1', port, path, method: 'GET', timeout: 1500 },
    (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { buf += c; if (buf.length > 256 * 1024) { try { req.destroy(); } catch (e) { console.warn('[compat-routes:v1] VOID_OPS_COMPAT_ROUTES_DESTROY_OVERFLOW_VISIBLE', e && e.message ? e.message : e); } } });
      res.on('end', () => {
        try {
          const j = JSON.parse(buf || '{}');
          cb(null, j, res.statusCode || 0);
        } catch (e) {
          cb(e, null, res.statusCode || 0);
        }
      });
    }
  );
  req.on('error', (e) => cb(e, null, 0));
  req.on('timeout', () => { try { req.destroy(new Error('timeout')); } catch (e) { console.warn('[compat-routes:v1] VOID_OPS_COMPAT_ROUTES_TIMEOUT_DESTROY_VISIBLE', e && e.message ? e.message : e); } });
  req.end();
}

function attach(app) {
  if (!app || typeof app.get !== 'function') return false;
  if (app.__void_compat_attached_v1) return true;
  app.__void_compat_attached_v1 = true;

  // 1) /pending/status2 -> 200 JSON (compat) by mirroring /pending/status
  app.get('/pending/status2', (req, res) => {
    getJsonOnce('/pending/status', (err, j) => {
      if (err) return res.status(200).json({ ok: true, compat: true, note: 'fallback', mpSize: 0, pLen: 0, ptLen: 0, err: String(err) });
      if (j && typeof j === 'object') j.compat = true;
      return res.status(200).json(j || { ok: true, compat: true });
    });
  });

  // 2) /mempool/size -> 200 JSON {ok,size}
  app.get('/mempool/size', (req, res) => {
    getJsonOnce('/mempool', (err, j) => {
      const size = (j && typeof j.size === 'number') ? j.size : 0;
      return res.status(200).json({ ok: true, size, compat: true, err: err ? String(err) : "" });
    });
  });

  // 3) /mempool/size.truth.json -> same as /mempool/size (kept for old scripts)
  app.get('/mempool/size.truth.json', (req, res) => {
    getJsonOnce('/mempool', (err, j) => {
      const size = (j && typeof j.size === 'number') ? j.size : 0;
      return res.status(200).json({ ok: true, size, compat: true, err: err ? String(err) : "" });
    });
  });

  console.log('[compat-routes:v1] attached: /pending/status2, /mempool/size, /mempool/size.truth.json');
  return true;
}

function waitForApp() {
  const g = globalThis;
  const start = Date.now();
  const maxMs = 30_000;

  const tick = () => {
    try {
      const app = g.__void_http_app;
      if (attach(app)) return;
    } catch (e) {
      if (!globalThis.__void_ops_compat_routes_attach_seen) {
        globalThis.__void_ops_compat_routes_attach_seen = true;
        console.warn('[compat-routes:v1] VOID_OPS_COMPAT_ROUTES_ATTACH_VISIBLE', e && e.message ? e.message : e);
      }
    }
    if (Date.now() - start > maxMs) {
      console.log('[compat-routes:v1] gave up waiting for __void_http_app (30s)');
      return;
    }
    setTimeout(tick, 100);
  };

  setTimeout(tick, 0);
}

waitForApp();

/* afterapp_txroot_legacy_alias_v1.cjs
   Goal: stop /health/txroot and /health/txroot2 from 500'ing by proxying
   to the known-good /health/txroot3 (and ?format=prom).
   Designed to be low-risk and reversible.
*/
'use strict';

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function waitForApp(timeoutMs){
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const app = globalThis && globalThis.__void_http_app;
    if (app && typeof app.get === 'function') return app;
    await sleep(50);
  }
  return null;
}

function httpGetLocal(path, timeoutMs){
  return new Promise((resolve, reject) => {
    const http = require('http');
    const opts = {
      hostname: '127.0.0.1',
      port: Number(process.env.HTTP_PORT || 4100),
      path,
      method: 'GET',
      timeout: timeoutMs,
      headers: { 'Connection': 'close' },
    };
    const req = http.request(opts, (res) => {
      let bufs = [];
      res.on('data', (c) => bufs.push(c));
      res.on('end', () => {
        const body = Buffer.concat(bufs);
        resolve({ statusCode: res.statusCode || 0, headers: res.headers || {}, body });
      });
    });
    req.on('timeout', () => { try { req.destroy(new Error('timeout')); } catch {} });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const app = await waitForApp(8000);
  if (!app) {
    try { console.error('[txroot-legacy-alias] no __void_http_app; not installing'); } catch {}
    return;
  }

  // tiny 1s cache so if "ready" hits often we don't spam loopback
  let cacheTs = 0;
  let cacheKey = '';
  let cacheVal = null;

  async function proxyToTxroot3(req, res){
    try {
      const q = (req && req.originalUrl && req.originalUrl.includes('?')) ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
      const target = '/health/txroot3' + q;

      const now = Date.now();
      const key = target;
      if (cacheVal && cacheKey === key && (now - cacheTs) < 1000) {
        res.status(cacheVal.statusCode || 200);
        if (cacheVal.headers && cacheVal.headers['content-type']) {
          res.set('content-type', cacheVal.headers['content-type']);
        }
        return res.send(cacheVal.body);
      }

      const r = await httpGetLocal(target, 1200);
      cacheVal = r;
      cacheKey = key;
      cacheTs = now;

      res.status(r.statusCode || 200);
      if (r.headers && r.headers['content-type']) res.set('content-type', r.headers['content-type']);
      return res.send(r.body);
    } catch (e) {
      res.status(503).json({ ok:false, err:String(e && e.message || e) });
    }
  }

  // Mount legacy endpoints
  app.get('/health/txroot', proxyToTxroot3);
  app.get('/health/txroot2', proxyToTxroot3);

  try { console.error('[txroot-legacy-alias] installed: /health/txroot + /health/txroot2 -> txroot3'); } catch {}
})();

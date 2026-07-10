'use strict';

/*
  patch_proposer_truthproxy_v2 (keeps filename v1.cjs to avoid touching ExecStart)
   - /__void/metrics/proposer.truth3.json:
       derives enabled/ms by parsing /metrics/void/proposer.v3b.prom (fallback auto4 if present)
   - /metrics/void/proposer.v3c.prom:
       proxies v3b if present else auto4
*/

const BASE = process.env.VOID_HTTP_BASE || 'http://localhost:4100';

function once(fn) {
  let done = false;
  return (...args) => { if (done) return; done = true; try { fn(...args); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_PROPOSER_TRUTHPROXY_V1_CJS_1_1_VISIBLE", __void_diag_pack2_err); } };
}

async function getText(url) {
  const r = await fetch(url, { headers: { 'accept': '*/*' } });
  const body = await r.text();
  return { status: r.status, body };
}

function parseProm(body) {
  const out = { enabled: null, ms: null, rawEnabled: null, rawMs: null };
  if (!body || typeof body !== 'string') return out;

  for (const line of body.split('\n')) {
    if (line.startsWith('void_proposer_auto_enabled ')) {
      const v = line.slice('void_proposer_auto_enabled '.length).trim();
      out.rawEnabled = v;
      const n = Number(v);
      out.enabled = Number.isFinite(n) ? n : null;
    }
    if (line.startsWith('void_proposer_auto_ms ')) {
      const v = line.slice('void_proposer_auto_ms '.length).trim();
      out.rawMs = v;
      const n = Number(v);
      out.ms = Number.isFinite(n) ? n : null;
    }
  }
  return out;
}

function mount(app) {
  app.get('/__void/metrics/proposer.truth3.json', async (req, res) => {
    try {
      let r = await getText(`${BASE}/metrics/void/proposer.v3b.prom`);
      let src = '/metrics/void/proposer.v3b.prom';
      if (r.status === 404) {
        r = await getText(`${BASE}/metrics/void/proposer.auto4.prom`);
        src = '/metrics/void/proposer.auto4.prom';
      }

      const parsed = parseProm(r.body || '');
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        enabled: parsed.enabled,
        ms: parsed.ms,
        lastChangeMs: null,
        _truth3: {
          derivedFrom: src,
          base: BASE,
          upstreamStatus: r.status,
          rawEnabled: parsed.rawEnabled,
          rawMs: parsed.rawMs,
          ts: Date.now()
        }
      }));
    } catch (e) {
      res.status(500);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: String(e && e.message || e), ts: Date.now() }));
    }
  });

  app.get('/metrics/void/proposer.v3c.prom', async (req, res) => {
    try {
      let r = await getText(`${BASE}/metrics/void/proposer.v3b.prom`);
      if (r.status === 404) r = await getText(`${BASE}/metrics/void/proposer.auto4.prom`);
      res.status(r.status || 200);
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.end(r.body || '');
    } catch (e) {
      res.status(500);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`# ERR proposer.v3c proxy failed: ${String(e && e.message || e)}\n`);
    }
  });
}

const tryMount = once((app) => {
  mount(app);
  console.log('[truthproxy_v2] mounted truth3 + v3c on app');
});

let tries = 0;
const t = setInterval(() => {
  tries++;
  const app = globalThis && globalThis.__void_http_app;
  if (app && typeof app.get === 'function') {
    clearInterval(t);
    tryMount(app);
  }
  if (tries >= 300) clearInterval(t);
}, 100);

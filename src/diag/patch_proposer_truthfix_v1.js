'use strict';

const http = require('http');
const https = require('https');

function getEnvSubset() {
  const keys = [
    'HTTP_PORT',
    'PROPOSER_AUTO','PROPOSER_AUTO_ENABLED','PROPOSER_TICK_MS',
    'VOID_PROPOSER_AUTO','VOID_PROPOSER_AUTO_ENABLED','VOID_PROPOSER_AUTO_MS','VOID_PROPOSER_TICK_MS','VOID_PROPOSER_MS',
    'VOID_HTTP_SAFE','VOID_HTTP_SAFE_ALLOW','VOID_HTTP_SAFE_ALLOW_EXTRA',
    'HTTP_SAFE_ALLOW','HTTP_SAFE_ALLOW_EXTRA',
    'VOID_SAFEBOOT'
  ];
  const out = {};
  for (const k of keys) if (process.env[k] != null) out[k] = String(process.env[k]);
  return out;
}

function fetchText(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = (u.protocol === 'https:') ? https : http;
    const req = lib.request({
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'accept': '*/*', 'user-agent': 'void-proposer-truthfix-v1' }
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers || {}, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { try { req.destroy(new Error('timeout')); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_PROPOSER_TRUTHFIX_V1_JS_1_1_VISIBLE", __void_diag_pack2_err); } });
    req.end();
  });
}

function parseProm2(body) {
  // returns { enabled?:number, ms?:number }
  const out = {};
  const m1 = body.match(/^void_proposer_auto_enabled(?:_v2)?\s+([0-9.]+)\s*$/m);
  const m2 = body.match(/^void_proposer_auto_ms(?:_v2)?\s+([0-9.]+)\s*$/m);
  if (m1) out.enabled = Number(m1[1]);
  if (m2) out.ms = Number(m2[1]);
  return out;
}

function envBool(v) {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return 1;
  if (s === '0' || s === 'false' || s === 'no' || s === 'off') return 0;
  return null;
}

async function computeTruth() {
  const port = String(process.env.HTTP_PORT || '4100');
  const base = `http://127.0.0.1:${port}`;

  const env = getEnvSubset();

  // canonical: truth.json (it already contains source reasoning)
  let truthJson = null, truthJsonErr = null;
  try {
    const r = await fetchText(`${base}/__void/metrics/proposer.truth.json`, 800);
    if (r.status === 200) truthJson = JSON.parse(r.body);
    else truthJsonErr = `http_${r.status}`;
  } catch (e) {
    truthJsonErr = String(e && e.message ? e.message : e);
  }

  // legacy/other: truth2.json
  let truth2Json = null, truth2Err = null;
  try {
    const r = await fetchText(`${base}/__void/metrics/proposer.truth2.json`, 800);
    if (r.status === 200) truth2Json = JSON.parse(r.body);
    else truth2Err = `http_${r.status}`;
  } catch (e) {
    truth2Err = String(e && e.message ? e.message : e);
  }

  // exporter v3b
  let v3bProm = null, v3bErr = null;
  try {
    const r = await fetchText(`${base}/metrics/void/proposer.v3b.prom`, 800);
    if (r.status === 200) v3bProm = parseProm2(r.body);
    else v3bErr = `http_${r.status}`;
  } catch (e) {
    v3bErr = String(e && e.message ? e.message : e);
  }

  // compute "truth" numbers
  let enabled = null, ms = null, from = null;

  if (truthJson && truthJson.truth && typeof truthJson.truth.enabled === 'number') {
    enabled = truthJson.truth.enabled;
    ms = (truthJson.truth.ms == null) ? null : truthJson.truth.ms;
    from = 'truth.json';
  } else if (truth2Json && typeof truth2Json.enabled === 'number') {
    enabled = truth2Json.enabled;
    ms = (truth2Json.ms == null) ? null : truth2Json.ms;
    from = 'truth2.json';
  } else {
    const e1 = envBool(process.env.PROPOSER_AUTO);
    const e2 = envBool(process.env.VOID_PROPOSER_AUTO);
    const e3 = envBool(process.env.PROPOSER_AUTO_ENABLED);
    const e4 = envBool(process.env.VOID_PROPOSER_AUTO_ENABLED);
    enabled = (e1 ?? e2 ?? e3 ?? e4);
    const m1 = process.env.PROPOSER_TICK_MS ? Number(process.env.PROPOSER_TICK_MS) : null;
    const m2 = process.env.VOID_PROPOSER_TICK_MS ? Number(process.env.VOID_PROPOSER_TICK_MS) : null;
    ms = (m1 ?? m2);
    from = 'env';
  }

  const nowMs = Date.now();
  return {
    nowMs,
    pid: process.pid,
    port,
    env,
    truthJson,
    truthJsonErr,
    truth2Json,
    truth2Err,
    v3bProm,
    v3bErr,
    computed: { enabled, ms, from }
  };
}

function mount(app) {
  if (!app || typeof app.get !== 'function') return false;
  if (globalThis.__void_proposer_truthfix_v1_installed) return true;

  globalThis.__void_proposer_truthfix_v1_installed = true;

  app.get('/__void/metrics/proposer.truth3.json', async (_req, res) => {
    try {
      const x = await computeTruth();
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, ...x }));
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: false, err: String(e && e.message ? e.message : e) }));
    }
  });

  app.get('/metrics/void/proposer.v3c.prom', async (_req, res) => {
    try {
      const x = await computeTruth();
      const t = x.computed || {};
      const truthEnabled = (typeof t.enabled === 'number') ? t.enabled : NaN;
      const truthMs = (typeof t.ms === 'number') ? t.ms : NaN;

      const v3bEnabled = (x.v3bProm && typeof x.v3bProm.enabled === 'number') ? x.v3bProm.enabled : NaN;
      const v3bMs = (x.v3bProm && typeof x.v3bProm.ms === 'number') ? x.v3bProm.ms : NaN;

      const mismatch = (Number.isFinite(truthEnabled) && Number.isFinite(v3bEnabled) && truthEnabled !== v3bEnabled) ? 1 : 0;

      let body = '';
      body += '# HELP void_proposer_truth_enabled Canonical proposer enabled (truth.json preferred)\n';
      body += '# TYPE void_proposer_truth_enabled gauge\n';
      body += `void_proposer_truth_enabled ${truthEnabled}\n`;
      body += '# HELP void_proposer_truth_ms Canonical proposer tick ms (truth.json preferred)\n';
      body += '# TYPE void_proposer_truth_ms gauge\n';
      body += `void_proposer_truth_ms ${truthMs}\n`;

      body += '# HELP void_proposer_v3b_enabled_exported Exporter v3b enabled (what Prom currently scrapes)\n';
      body += '# TYPE void_proposer_v3b_enabled_exported gauge\n';
      body += `void_proposer_v3b_enabled_exported ${v3bEnabled}\n`;
      body += '# HELP void_proposer_v3b_ms_exported Exporter v3b tick ms (what Prom currently scrapes)\n';
      body += '# TYPE void_proposer_v3b_ms_exported gauge\n';
      body += `void_proposer_v3b_ms_exported ${v3bMs}\n`;

      body += '# HELP void_proposer_truth_mismatch 1 if truth_enabled != v3b_enabled\n';
      body += '# TYPE void_proposer_truth_mismatch gauge\n';
      body += `void_proposer_truth_mismatch ${mismatch}\n`;

      body += '# HELP void_proposer_truthfix_now_ms Wallclock now (ms)\n';
      body += '# TYPE void_proposer_truthfix_now_ms gauge\n';
      body += `void_proposer_truthfix_now_ms ${x.nowMs}\n`;

      body += '# HELP void_proposer_truth_source 1 if computed from given source label (truth.json/truth2.json/env)\n';
      body += '# TYPE void_proposer_truth_source gauge\n';
      body += `void_proposer_truth_source{source="${String(t.from || 'unknown').replace(/"/g,'')}"} 1\n`;

      res.setHeader('content-type', 'text/plain; version=0.0.4');
      res.end(body);
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain; version=0.0.4');
      res.end(`# ERROR void-proposer-truthfix-v1 ${String(e && e.message ? e.message : e)}\n`);
    }
  });

  return true;
}

(function boot() {
  const start = Date.now();
  const maxMs = 30000;
  const iv = setInterval(() => {
    try {
      const app = globalThis.__void_http_app;
      if (mount(app)) { clearInterval(iv); return; }
      if (Date.now() - start > maxMs) { clearInterval(iv); return; }
    } catch {
      if (Date.now() - start > maxMs) { clearInterval(iv); return; }
    }
  }, 200);
})();

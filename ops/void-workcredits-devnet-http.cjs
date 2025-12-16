'use strict';

// __WC_HELPER_SCHEMA_V2_STABLE_DASH_V1__
// Canonicalize helper JSON:
// - schemaVersion=2
// - poolState always exists (object)
// - pool always forced to object (if old code sets it to a string address)
// - preserve any string pool address as poolAddress
function __wcNormalizeDashboardV2(o) {
  try {
    if (!o || typeof o !== 'object') return o;
    if (o.schemaVersion == null) o.schemaVersion = 2;

    const poolState = (o.poolState && typeof o.poolState === 'object') ? o.poolState : {};
    o.poolState = poolState;

    const poolVal = o.pool;
    const poolObj = (poolVal && typeof poolVal === 'object') ? poolVal : {};

    if (typeof poolVal === 'string' && poolVal) {
      if (o.poolAddress == null) o.poolAddress = poolVal;
      if (poolObj.address == null) poolObj.address = poolVal;
    }
    if (poolObj.address == null && poolState.address != null) poolObj.address = poolState.address;

    if (!poolState.reserves || typeof poolState.reserves !== 'object') poolState.reserves = {};
    if (!poolState.price || typeof poolState.price !== 'object') poolState.price = {};

    const pRes = (poolObj.reserves && typeof poolObj.reserves === 'object') ? poolObj.reserves : {};
    const pPrice = (poolObj.price && typeof poolObj.price === 'object') ? poolObj.price : {};

    for (const k of Object.keys(pRes)) {
      if (poolState.reserves[k] == null) poolState.reserves[k] = pRes[k];
    }
    for (const k of Object.keys(pPrice)) {
      if (poolState.price[k] == null) poolState.price[k] = pPrice[k];
    }

    if (!poolObj.reserves || typeof poolObj.reserves !== 'object') poolObj.reserves = {};
    if (!poolObj.price || typeof poolObj.price !== 'object') poolObj.price = {};

    for (const k of Object.keys(poolState.reserves)) {
      if (poolObj.reserves[k] == null) poolObj.reserves[k] = poolState.reserves[k];
    }
    for (const k of Object.keys(poolState.price)) {
      if (poolObj.price[k] == null) poolObj.price[k] = poolState.price[k];
    }

    o.pool = poolObj;
    return o;
  } catch (e) {
    return o;
  }
}

// __WC_HELPER_SCHEMA_V2_MAYBE_NORM_V1__
function __wcMaybeNormalizeV2(obj) {
  try {
    if (!obj) return obj;

    // If someone passed a JSON string to sendJson(), parse it.
    if (typeof obj === 'string') {
      const t = obj.trim();
      if (t.startsWith('{') || t.startsWith('[')) {
        try { obj = JSON.parse(t); } catch (e) { return obj; }
      } else {
        return obj;
      }
    }

    if (!obj || typeof obj !== 'object') return obj;

    // Only normalize dashboard-ish responses.
    const looksDashboard =
      ('poolState' in obj) ||
      ('balances' in obj) ||
      ('account' in obj) ||
      (typeof obj.pool === 'string' && (('balances' in obj) || ('account' in obj)));

    if (!looksDashboard) return obj;

    return __wcNormalizeDashboardV2(obj);
  } catch (e) {
    return obj;
  }
}

const http = require('http');
const url = require('url');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');

const ROOT = process.env.ROOT || process.cwd();
const PORT = Number(process.env.WC_HTTP_PORT || '4312');

function log(...args) {
  console.log('[workcredits-http]', ...args);
}

function runScript(scriptRelPath, args, cb) {
  const scriptPath = path.join(ROOT, scriptRelPath);
  execFile(scriptPath, args, { env: process.env }, (err, stdout, stderr) => {
    if (err) {
      log('error running', scriptRelPath, err.message);
      if (stderr) {
        log('stderr:', String(stderr).slice(0, 400));
      }
      cb(err);
      return;
    }
    cb(null, stdout);
  });
}

function sendJson(res, status, obj) {


  // __WC_HELPER_SCHEMA_V2_SENDJSON_WRAP_V2__ (sendJson)

  try { obj = __wcMaybeNormalizeV2(obj); } catch (e) {}

  // __WC_HELPER_SCHEMA_V2_SENDJSON_WRAP_V1__

  try { status = __wcNormalizeDashboardV2(status); } catch (e) {}

  const body = JSON.stringify(obj, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, status, text) {
  const body = String(text);
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendHtml(res, status, html) {
  const body = String(html);
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}


// === [workcredits devnet] dashboard interceptor v2 ===
function __wc_sendJson(res, status, obj) {
  // __WC_HELPER_SCHEMA_V2_SENDJSON_WRAP_V2__ (__wc_sendJson)
  try { obj = __wcMaybeNormalizeV2(obj); } catch (e) {}

  const body = JSON.stringify(obj, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function __wc_readJson(absOrRelPath) {
  try {
    const pth = absOrRelPath.startsWith('/') ? absOrRelPath : path.join(ROOT, absOrRelPath);
    return JSON.parse(fs.readFileSync(pth, 'utf8'));
  } catch (e) {
    return {};
  }
}

function __wc_hexToBI(hex) {
  if (!hex || hex === '0x') return 0n;
  try { return BigInt(hex); } catch (e) { return 0n; }
}

function __wc_pad64(h) { return String(h || '').padStart(64, '0'); }
function __wc_addrTo32(addr) { return __wc_pad64(String(addr).slice(2).toLowerCase()); }

function __wc_fmtUnits(v, dec) {
  dec = Number(dec || 0);
  if (dec <= 0) return v.toString();
  const base = 10n ** BigInt(dec);
  const whole = v / base;
  const frac = v % base;
  const frac6 = frac.toString().padStart(dec, '0').slice(0, 6);
  return `${whole.toString()}.${frac6}`;
}

function __wc_ratio6(num, den) {
  if (!den || den === 0n) return "0";
  const scaled = (num * 1000000n) / den;
  const whole = scaled / 1000000n;
  const frac = (scaled % 1000000n).toString().padStart(6, '0');
  return `${whole.toString()}.${frac}`;
}

function __wc_rpcRequest(rpcUrl, payload, cb) {
  try {
    const u = url.parse(rpcUrl);
    const isHttps = (u.protocol || '') === 'https:';
    const mod = isHttps ? https : http;

    const data = Buffer.from(JSON.stringify(payload));
    const opts = {
      method: 'POST',
      hostname: u.hostname || '127.0.0.1',
      port: u.port ? Number(u.port) : (isHttps ? 443 : 80),
      path: u.path || '/',
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(data.length) },
    };

    const req = mod.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let j = null;
        try { j = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) {}
        cb(null, j);
      });
    });
    req.on('error', (e) => cb(e));
    req.write(data);
    req.end();
  } catch (e) { cb(e); }
}

function __wc_rpcCall(rpcUrl, method, params, cb) {
  __wc_rpcRequest(rpcUrl, { jsonrpc: '2.0', id: 1, method, params: params || [] }, (err, j) => {
    if (err) return cb(err);
    if (!j) return cb(new Error('bad_rpc_json'));
    if (j.error) return cb(new Error(String(j.error.message || 'rpc_error')));
    cb(null, j.result);
  });
}

function __wc_ethCall(rpcUrl, to, data, cb) {
  __wc_rpcCall(rpcUrl, 'eth_call', [{ to, data }, 'latest'], cb);
}

const __WC_SEL_BAL = '70a08231'; // balanceOf(address)
const __WC_SEL_DEC = '313ce567'; // decimals()

function __wc_getDecimals(rpcUrl, token, cb) {
  __wc_ethCall(rpcUrl, token, '0x' + __WC_SEL_DEC, (err, out) => {
    if (err) return cb(null, 18);
    const n = Number(__wc_hexToBI(out));
    if (!Number.isFinite(n) || n <= 0) return cb(null, 18);
    cb(null, n);
  });
}

function __wc_balanceOf(rpcUrl, token, who, cb) {
  const data = '0x' + __WC_SEL_BAL + __wc_addrTo32(who);
  __wc_ethCall(rpcUrl, token, data, (err, out) => {
    if (err) return cb(err);
    cb(null, __wc_hexToBI(out));
  });
}

function __wc_loadAddrs() {
  const CFG_PATH = process.env.WC_DEVNET_CFG || 'config/void-workcredits-devnet.live.json';
  const DOC_PATH = process.env.WC_DEVNET_DOC || 'docs/VOID-DEVNET-PROTOCOL-STATE.json';
  const cfg = __wc_readJson(CFG_PATH);
  const doc = __wc_readJson(DOC_PATH);
  return {
    cfg_path: path.join(ROOT, CFG_PATH),
    doc_path: path.join(ROOT, DOC_PATH),
    voidToken: cfg.voidToken || doc.voidToken || null,
    wcToken: cfg.workCreditsToken || doc.workCreditsToken || null,
    pool: cfg.workCreditsPoolV1 || doc.workCreditsPoolV1 || null,
    relayer: cfg.workCreditsRelayerV1 || doc.workCreditsRelayerV1 || null,
  };
}

function __wc_serveDashboard(addr, res) {
  const RPC = String(process.env.RPC || 'http://127.0.0.1:8545');
  const addrs = __wc_loadAddrs();

  const out = {
    ok: true,
    addr,
    chainId: null,
    voidToken: addrs.voidToken,
    wcToken: addrs.wcToken,
    pool: addrs.pool,
    relayer: addrs.relayer,
    balances: null,
    poolState: null,
    quote: null,
  };

  __wc_rpcCall(RPC, 'eth_chainId', [], (e0, cidHex) => {
    if (!e0 && cidHex) {
      try { out.chainId = parseInt(String(cidHex), 16); } catch (e) {}
    }

    const vt = addrs.voidToken, wt = addrs.wcToken, pl = addrs.pool;
    if (!vt || !wt || !pl) {
      return __wc_sendJson(res, 200, out);
    }

    __wc_getDecimals(RPC, vt, (e1, vdec) => {
      __wc_getDecimals(RPC, wt, (e2, wdec) => {
        __wc_balanceOf(RPC, vt, addr, (e3, bVoid) => {
          if (e3) return __wc_sendJson(res, 500, { ok:false, err:'balance_void_failed', msg:String(e3.message||e3) });
          __wc_balanceOf(RPC, wt, addr, (e4, bWc) => {
            if (e4) return __wc_sendJson(res, 500, { ok:false, err:'balance_wc_failed', msg:String(e4.message||e4) });

            out.balances = {
              void_raw: bVoid.toString(),
              wc_raw: bWc.toString(),
              void: __wc_fmtUnits(bVoid, vdec),
              wc: __wc_fmtUnits(bWc, wdec),
              void_decimals: vdec,
              wc_decimals: wdec,
            };

            __wc_balanceOf(RPC, vt, pl, (e5, rVoid) => {
              if (e5) return __wc_sendJson(res, 500, { ok:false, err:'reserve_void_failed', msg:String(e5.message||e5) });
              __wc_balanceOf(RPC, wt, pl, (e6, rWc) => {
                if (e6) return __wc_sendJson(res, 500, { ok:false, err:'reserve_wc_failed', msg:String(e6.message||e6) });

                out.poolState = {
                  up: 1,
                  pool: { address: pl },
                  tokens: {
                    void: { address: vt, decimals: vdec },
                    wc: { address: wt, decimals: wdec },
                  },
                  reserves: {
                    void_raw: rVoid.toString(),
                    wc_raw: rWc.toString(),
                    void: __wc_fmtUnits(rVoid, vdec),
                    wc: __wc_fmtUnits(rWc, wdec),
                  },
                  price: {
                    wc_per_void: __wc_ratio6(rWc, rVoid),
                    void_per_wc: __wc_ratio6(rVoid, rWc),
                  },
                  meta: {
                    rpc_url: RPC,
                    cfg_file: addrs.cfg_path,
                    state_file: addrs.doc_path,
                    ts: Math.floor(Date.now()/1000),
                  },
                };

                return __wc_sendJson(res, 200, out);
              });
            });
          });
        });
      });
    });
  });
}
// === [end workcredits devnet] dashboard interceptor v2 ===


function renderHtmlUi() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>VOID WorkCredits Devnet Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #05060a;
      --panel: #101320;
      --panel-alt: #151826;
      --accent: #7f5af0;
      --accent-soft: rgba(127, 90, 240, 0.18);
      --danger: #ff6b6b;
      --text: #e5e7f0;
      --muted: #98a0c0;
      --border: #22263a;
      --mono: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: radial-gradient(circle at top, #15192b 0, #05060a 55%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: stretch;
      justify-content: center;
    }
    .shell {
      max-width: 1120px;
      width: 100%;
      padding: 24px 16px 32px;
    }
    .card {
      background: linear-gradient(145deg, rgba(16,19,32,0.96), rgba(10,12,22,0.98));
      border-radius: 18px;
      padding: 20px 20px 18px;
      border: 1px solid rgba(127, 90, 240, 0.15);
      box-shadow:
        0 18px 45px rgba(0, 0, 0, 0.8),
        0 0 0 1px rgba(5, 6, 10, 0.8);
      backdrop-filter: blur(18px);
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      margin-bottom: 12px;
    }
    .title-block h1 {
      font-size: 20px;
      font-weight: 650;
      letter-spacing: 0.03em;
      margin: 0 0 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(127, 90, 240, 0.18);
      color: var(--accent);
      border: 1px solid rgba(127, 90, 240, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }
    .subtitle {
      margin: 0;
      font-size: 12px;
      color: var(--muted);
    }
    .status-dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: #19c37d;
      box-shadow: 0 0 12px rgba(25, 195, 125, 0.85);
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }
    .status-row span.key {
      color: var(--muted);
    }
    .status-row span.value {
      color: #19c37d;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.15fr 0.95fr;
      gap: 14px;
      margin-top: 12px;
    }
    @media (max-width: 860px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
    .panel {
      background: radial-gradient(circle at top left, rgba(127,90,240,0.16), rgba(8,10,18,0.96));
      border-radius: 14px;
      padding: 12px 12px 10px;
      border: 1px solid rgba(34, 38, 58, 0.95);
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .panel-title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .badge {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid rgba(152,160,192,0.45);
      color: var(--muted);
      opacity: 0.9;
    }
    .field-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .field-row label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }
    .field-row input {
      flex: 1;
      padding: 6px 8px;
      border-radius: 999px;
      border: 1px solid rgba(60, 66, 100, 0.95);
      background: radial-gradient(circle at top left, rgba(17,24,39,0.85), rgba(5,6,10,0.98));
      color: var(--text);
      font-family: var(--mono);
      font-size: 11px;
      outline: none;
    }
    .field-row input:focus {
      border-color: rgba(127, 90, 240, 0.85);
      box-shadow: 0 0 0 1px rgba(127, 90, 240, 0.6);
    }
    .btn {
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid rgba(127,90,240,0.9);
      background: radial-gradient(circle at top left, var(--accent), #5034af);
      color: #f7f7ff;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      cursor: pointer;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .btn-secondary {
      border-color: rgba(60, 66, 100, 0.9);
      background: radial-gradient(circle at top left, #161824, #090a12);
      color: var(--muted);
    }
    .btn-secondary span.dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: #19c37d;
    }
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 8px;
    }
    .metric {
      background: radial-gradient(circle at top left, rgba(11,15,29,0.96), rgba(6,7,13,0.97));
      border-radius: 11px;
      padding: 7px 8px 6px;
      border: 1px solid rgba(36, 40, 72, 0.9);
    }
    .metric-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      margin-bottom: 3px;
    }
    .metric-value {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }
    .metric-sub {
      font-size: 10px;
      color: var(--muted);
      margin-top: 1px;
    }
    .section-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--muted);
      margin: 6px 0 4px;
    }
    .mono {
      font-family: var(--mono);
    }
    .json-box {
      margin-top: 6px;
      background: radial-gradient(circle at top left, rgba(10,12,20,0.96), rgba(6,7,12,0.98));
      border-radius: 10px;
      padding: 8px 10px;
      border: 1px solid rgba(34, 38, 58, 0.95);
      max-height: 260px;
      overflow: auto;
      font-family: var(--mono);
      font-size: 11px;
      line-height: 1.4;
      color: #c9d1ff;
      white-space: pre;
    }
    .footer {
      margin-top: 8px;
      font-size: 10px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .footer span.key {
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: var(--muted);
    }
    .footer span.val {
      color: var(--text);
      font-family: var(--mono);
    }
    .error {
      color: var(--danger);
      font-size: 11px;
      margin-top: 4px;
      min-height: 14px;
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="card">
      <div class="header-row">
        <div class="title-block">
          <h1>
            VOID / Obelisk
            <span class="pill">
              <span class="status-dot"></span>
              <span>devnet · workcredits</span>
            </span>
          </h1>
          <p class="subtitle">Live WC/VOID pool + account balances from helper on <span class="mono">:4312</span>.</p>
        </div>
        <div class="status-row">
          <span class="key">helper</span>
          <span class="value" id="helper-status">connected</span>
        </div>
      </div>

      <div class="panel" style="margin-bottom: 10px;">
        <div class="panel-header">
          <div class="panel-title">Account</div>
          <div class="badge">devnet · wc dashboard</div>
        </div>
        <div class="field-row">
          <label for="addr-input">Address</label>
          <input
            id="addr-input"
            type="text"
            spellcheck="false"
            autocomplete="off"
            value="0x1111111111111111111111111111111111111111"
          />
          <button class="btn" id="load-btn" type="button">
            <span>Load</span>
          </button>
        </div>
        <div class="error" id="error-line"></div>
      </div>

      <div class="grid">
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">Pool &amp; Price</div>
            <div class="badge">wc / void amm</div>
          </div>

          <div class="metrics-row">
            <div class="metric">
              <div class="metric-label">Price · WC per 1 VOID</div>
              <div class="metric-value" id="wc-per-void">–</div>
              <div class="metric-sub">wc / void</div>
            </div>
            <div class="metric">
              <div class="metric-label">Price · VOID per 1 WC</div>
              <div class="metric-value" id="void-per-wc">–</div>
              <div class="metric-sub">void / wc</div>
            </div>
            <div class="metric">
              <div class="metric-label">Health</div>
              <div class="metric-value" id="pool-health">–</div>
              <div class="metric-sub">up / health_5m</div>
            </div>
          </div>

          <div class="section-label">Pool reserves</div>
          <div class="metrics-row">
            <div class="metric">
              <div class="metric-label">VOID reserve</div>
              <div class="metric-value" id="pool-void">–</div>
              <div class="metric-sub mono">decimals: 18</div>
            </div>
            <div class="metric">
              <div class="metric-label">WC reserve</div>
              <div class="metric-value" id="pool-wc">–</div>
              <div class="metric-sub mono">decimals: 18</div>
            </div>
            <div class="metric">
              <div class="metric-label">Pool address</div>
              <div class="metric-value mono" id="pool-address" style="font-size: 10px;">–</div>
              <div class="metric-sub mono" id="pool-rpc" style="font-size: 10px;">rpc: –</div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">Account Balances</div>
            <div class="badge">wallet preview</div>
          </div>

          <div class="metrics-row">
            <div class="metric">
              <div class="metric-label">VOID</div>
              <div class="metric-value" id="acc-void">–</div>
              <div class="metric-sub mono" id="acc-void-raw">raw: –</div>
            </div>
            <div class="metric">
              <div class="metric-label">WorkCredits</div>
              <div class="metric-value" id="acc-wc">–</div>
              <div class="metric-sub mono" id="acc-wc-raw">raw: –</div>
            </div>
            <div class="metric">
              <div class="metric-label">LP Tokens</div>
              <div class="metric-value" id="acc-lp">–</div>
              <div class="metric-sub mono" id="acc-lp-raw">raw: –</div>
            </div>
          </div>

          <div class="metrics-row">
            <div class="metric">
              <div class="metric-label">Pending WC earnings</div>
              <div class="metric-value" id="pending-wc">–</div>
              <div class="metric-sub mono" id="pending-wc-raw">raw: –</div>
            </div>
            <div class="metric">
              <div class="metric-label">Chain</div>
              <div class="metric-value" id="chain-name">–</div>
              <div class="metric-sub mono">devnet helper</div>
            </div>
            <div class="metric">
              <div class="metric-label">Address</div>
              <div class="metric-value mono" id="acc-address" style="font-size: 10px;">–</div>
              <div class="metric-sub mono">target wallet</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-label" style="margin-top: 10px;">Raw dashboard JSON</div>
      <div class="json-box" id="json-box">{}</div>

      <div class="footer">
        <div><span class="key">endpoint</span> · <span class="val">/workcredits/devnet/dashboard/&lt;address&gt;.json</span></div>
        <div><span class="key">ui</span> · <span class="val">/workcredits/devnet/ui</span></div>
      </div>
    </div>
  </div>

  <script>
    const addrInput = document.getElementById('addr-input');
    const loadBtn = document.getElementById('load-btn');
    const errorLine = document.getElementById('error-line');
    const jsonBox = document.getElementById('json-box');

    const el = (id) => document.getElementById(id);

    function setError(msg) {
      errorLine.textContent = msg || '';
    }

    function setText(id, value) {
      const node = el(id);
      if (!node) return;
      node.textContent = value;
    }

    function formatNum(x) {
      if (x === null || x === undefined || Number.isNaN(Number(x))) return '0';
      const n = Number(x);
      if (!Number.isFinite(n)) return String(x);
      if (Math.abs(n) >= 1_000_000_000) return n.toExponential(2);
      if (Math.abs(n) >= 10_000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
      if (Math.abs(n) >= 1) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
      return n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 });
    }

    async function loadDashboard() {
      setError('');
      const addrRaw = (addrInput.value || '').trim();
      if (!/^0x[0-9a-fA-F]{40}$/.test(addrRaw)) {
        setError('Enter a valid 0x-prefixed EVM address (40 hex chars).');
        return;
      }

      loadBtn.disabled = true;
      loadBtn.textContent = 'Loading…';

      try {
        const resp = await fetch('/workcredits/devnet/dashboard/' + addrRaw + '.json', {
          cache: 'no-store'
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error('HTTP ' + resp.status + ': ' + text.slice(0, 200));
        }
        const data = await resp.json();
        jsonBox.textContent = JSON.stringify(data, null, 2);
        // __WC_UI_POOLSTATE_PARSE_V4__
        // Always read pool/price/reserves/meta from poolState (data.pool is a string address).
        const poolState = (data.poolState && typeof data.poolState === 'object') ? data.poolState : {};
        const pool = poolState;
        const reserves = (poolState.reserves && typeof poolState.reserves === 'object') ? poolState.reserves : {};
        const price = (poolState.price && typeof poolState.price === 'object') ? poolState.price : {};
        const account = data.account || {};
        const balances = (data.balances && typeof data.balances === 'object') ? data.balances : (account.balances || {});
        const earnings = account.earnings || {};
        const meta = (poolState.meta && typeof poolState.meta === 'object') ? poolState.meta : (account.meta || {});
        const chain = data.chain || account.chain || 'devnet';

        setText('chain-name', chain);
        setText('acc-address', data.address || account.address || addrRaw);

        setText('wc-per-void', price.wc_per_void != null ? formatNum(price.wc_per_void) : '0');
        setText('void-per-wc', price.void_per_wc != null ? formatNum(price.void_per_wc) : '0');
        const up = pool.up === 1 || pool.up === '1' || pool.up === true;
        const h5 = pool.health_5m === 1 || pool.health_5m === '1' || pool.health_5m === true;
        setText('pool-health', up && h5 ? 'healthy' : 'check gauges');

        setText('pool-void', reserves.void != null ? formatNum(reserves.void) : '0');
        setText('pool-wc', reserves.wc != null ? formatNum(reserves.wc) : '0');
        setText('pool-address', pool.pool && pool.pool.address ? pool.pool.address : (pool.address || '–'));
        setText('pool-rpc', (meta && meta.rpc_url) ? ('rpc: ' + meta.rpc_url) : 'rpc: –');

        setText('acc-void', balances.void != null ? formatNum(balances.void) : '0');
        setText('acc-void-raw', 'raw: ' + (balances.void_raw ?? '0'));
        setText('acc-wc', balances.wc != null ? formatNum(balances.wc) : '0');
        setText('acc-wc-raw', 'raw: ' + (balances.wc_raw ?? '0'));
        setText('acc-lp', balances.lp != null ? formatNum(balances.lp) : '0');
        setText('acc-lp-raw', 'raw: ' + (balances.lp_raw ?? '0'));

        setText('pending-wc', earnings.pending_wc != null ? formatNum(earnings.pending_wc) : '0');
        setText('pending-wc-raw', 'raw: ' + (earnings.pending_wc_raw ?? '0'));

      } catch (err) {
        console.error('loadDashboard error', err);
        setError('Failed to load dashboard: ' + (err.message || String(err)));
      } finally {
        loadBtn.disabled = false;
        loadBtn.textContent = 'Load';
      }
    }

    loadBtn.addEventListener('click', loadDashboard);
    addrInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        loadDashboard();
      }
    });

    // auto-load once on page open
    window.addEventListener('load', () => {
      if (addrInput.value && addrInput.value.length === 42) {
        loadDashboard();
      }
    });
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {

  // [workcredits devnet] intercept legacy + v2 dashboard routes
  try {
    const __u = url.parse(req.url || '/', true);
    const __p = __u.pathname || '/';
    const __m = /^\/workcredits\/devnet\/dashboard(?:_v2)?\/(0x[0-9a-fA-F]{40})\.json$/.exec(__p);
    if (__m) {
      return __wc_serveDashboard(__m[1], res);
    }
  } catch (e) {}

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';

  // HTML UI
  if (req.method === 'GET' && (pathname === '/' || pathname === '/workcredits/devnet/ui')) {
    log('GET', pathname, '-> ui');
    const html = renderHtmlUi();
    sendHtml(res, 200, html);
    return;
  }

  // Pool JSON
  if (req.method === 'GET' && pathname === '/workcredits/devnet/pool.json') {
    log('GET', pathname, '-> pool script');
    runScript('ops/void-workcredits-devnet-pool-json.sh', [], (err, stdout) => {
      if (err) {
        sendJson(res, 500, { error: 'pool script failed' });
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(stdout);
    });
    return;
  }

  // Account JSON
  const accountMatch = pathname.match(/^\/workcredits\/devnet\/account\/(0x[0-9a-fA-F]{40})\.json$/);
  if (req.method === 'GET' && accountMatch) {
    const addr = accountMatch[1];
    log('GET', pathname, '-> account script for addr', addr);
    runScript('ops/void-workcredits-devnet-account-json.sh', [addr], (err, stdout) => {
      if (err) {
        sendJson(res, 500, { error: 'account script failed', address: addr });
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(stdout);
    });
    return;
  }

  // Dashboard JSON (pool + account)
  const dashMatch = pathname.match(/^\/workcredits\/devnet\/dashboard\/(0x[0-9a-fA-F]{40})\.json$/);
  if (req.method === 'GET' && dashMatch) {
    const addr = dashMatch[1];
    log('GET', pathname, '-> dashboard (pool + account) for addr', addr);

    runScript('ops/void-workcredits-devnet-pool-json.sh', [], (errPool, poolOut) => {
      if (errPool) {
        sendJson(res, 500, { error: 'pool script failed for dashboard', address: addr });
        return;
      }
      let pool;
      try {
        pool = JSON.parse(poolOut);
      } catch (e) {
        sendJson(res, 500, { error: 'failed to parse pool JSON', details: String(e) });
        return;
      }

      runScript('ops/void-workcredits-devnet-account-json.sh', [addr], (errAcc, accOut) => {
        if (errAcc) {
          sendJson(res, 500, { error: 'account script failed for dashboard', address: addr });
          return;
        }
        let account;
        try {
          account = JSON.parse(accOut);
        } catch (e) {
          sendJson(res, 500, { error: 'failed to parse account JSON', details: String(e) });
          return;
        }

        const body = {
          chain: pool.chain || account.chain || 'devnet',
          address: addr,
          pool,
          account,
        };
        sendJson(res, 200, body);
      });
    });
    return;
  }

  // Fallback
  log('GET', pathname, '-> 404');
  sendText(res, 404, 'Not found');
});

server.listen(PORT, () => {
  log('ROOT=' + ROOT);
  log('PORT=' + PORT);
  log('listening on http://127.0.0.1:' + PORT);
});

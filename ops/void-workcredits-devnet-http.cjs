'use strict';

const http = require('http');
const url = require('url');
const { execFile } = require('child_process');
const path = require('path');

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

        const pool = data.pool || {};
        const reserves = pool.reserves || {};
        const price = pool.price || {};
        const account = data.account || {};
        const balances = account.balances || {};
        const earnings = account.earnings || {};
        const meta = account.meta || {};
        const chain = data.chain || pool.chain || account.chain || 'devnet';

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
        setText('pool-rpc', pool.pool && pool.pool.rpcUrl ? 'rpc: ' + pool.pool.rpcUrl : 'rpc: –');

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

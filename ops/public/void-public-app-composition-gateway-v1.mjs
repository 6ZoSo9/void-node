#!/usr/bin/env node
// VOID Public App Composition Gateway v1
// GET/HEAD-only composition layer:
//   existing public earn gateway -> existing public proof and earning routes
//   loopback node -> public app assets and sanitized network truth
// Account-scoped Wallet/Earn adapters remain private and are never proxied.

import http from "node:http";

const HOST = process.env.VOID_COMPOSITION_HOST || "127.0.0.1";
const PORT = Number(process.env.VOID_COMPOSITION_PORT || "8082");
const PUBLIC_UPSTREAM = (process.env.VOID_PUBLIC_GATEWAY_UPSTREAM || "http://127.0.0.1:8080").replace(/\/+$/, "");
const NODE_UPSTREAM = (process.env.VOID_NODE_UPSTREAM || "http://127.0.0.1:4100").replace(/\/+$/, "");
const EXPECTED_PEERS = Math.max(0, Number(process.env.VOID_PUBLIC_EXPECTED_PEERS || "2"));
const NODE_LABEL = process.env.VOID_PUBLIC_NODE_LABEL || "Alienware public seed";
const NETWORK_NAME = process.env.VOID_PUBLIC_NETWORK_NAME || "Mainnet-0";
const TXROOT_QUARANTINED = process.env.VOID_TXROOT_QUARANTINED === "1";
const REQUEST_TIMEOUT_MS = Math.max(500, Number(process.env.VOID_COMPOSITION_FETCH_TIMEOUT_MS || "5000"));
const MAX_PROXY_BODY_BYTES = Math.max(
  1024,
  Number(process.env.VOID_COMPOSITION_MAX_BODY_BYTES || String(4 * 1024 * 1024))
);

const MARKER = "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1";
const HOME_MARKER = "VOID_UI_WAVE2_HOME_READONLY_V1";

const blockedPrefixes = [
  "/rpc",
  "/admin",
  "/operator",
  "/validator/admin",
  "/debug",
  "/.env",
  "/keys",
  "/wallet",
  "/secrets",
  "/dev",
  "/upgrade",
  "/__void/dev",
  "/__void/agent",
  "/__void/metrics",
  "/__void/ui/wave3",
  "/__void/ui/wave4",
  "/wc",
  "/jobs",
  "/receipts",
];

const publicModeScript = String.raw`(() => {
  'use strict';
  window.__VOID_PUBLIC_APP_MODE__ = true;

  try {
    sessionStorage.removeItem('void.ui.wave3.wallet.account.v1');
    sessionStorage.removeItem('void.ui.wave4.earn.account.v1');
  } catch {}

  const setText = (selector, value) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  };

  const setChip = (selector, label) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.className = 'status-chip status-chip--info';
      node.textContent = label;
    });
  };

  const notice = (root, text) => {
    if (!root || root.querySelector('[data-public-session-boundary]')) return;
    const box = document.createElement('div');
    box.dataset.publicSessionBoundary = 'true';
    box.setAttribute('role', 'status');
    box.style.cssText =
      'margin:12px 0;padding:12px 14px;border:1px solid rgba(76,229,223,.35);' +
      'border-radius:10px;background:rgba(76,229,223,.08);line-height:1.45;';
    box.innerHTML =
      '<strong>Public-safe mode</strong><br><span>' +
      text.replace(/[&<>]/g, (value) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[value])) +
      '</span>';
    root.prepend(box);
  };

  const apply = () => {
    const walletForm = document.querySelector('[data-wallet-account-form]');
    if (walletForm) {
      walletForm.querySelectorAll('input, button').forEach((node) => {
        node.disabled = true;
        node.setAttribute('aria-disabled', 'true');
      });
      notice(
        walletForm.closest('[data-wallet-view]') || walletForm.parentElement,
        'Account-specific wallet identity and Work Credit balances remain available only through a local VOID node or an authorized participant session.'
      );
      setChip('[data-wallet-state-chip]', 'Local session required');
      setText('[data-wallet-message]', 'Public visitors cannot enumerate participant accounts or wallet records.');
    }

    const earnForm = document.querySelector('[data-earn-account-form]');
    if (earnForm) {
      earnForm.querySelectorAll('input, button').forEach((node) => {
        node.disabled = true;
        node.setAttribute('aria-disabled', 'true');
      });
      notice(
        earnForm.closest('[data-earn-view]') || earnForm.parentElement,
        'Account-specific earning history, jobs, receipts, and Work Credit accounting remain available only through a local VOID node or an authorized participant session.'
      );
      setChip('[data-earn-state-chip]', 'Local session required');
      setText('[data-earn-message]', 'Public visitors receive network truth without participant-account enumeration.');
    }

    document.querySelectorAll('button, a, span').forEach((node) => {
      const text = (node.textContent || '').trim();
      if (text === 'Select in Wallet') node.textContent = 'Local session required';
      if (text === 'No account') node.textContent = 'Public-safe';
    });
  };

  document.addEventListener('submit', (event) => {
    if (!window.__VOID_PUBLIC_APP_MODE__) return;
    if (event.target?.matches?.('[data-wallet-account-form], [data-earn-account-form]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      apply();
    }
  }, true);

  const observer = new MutationObserver(apply);
  const start = () => {
    apply();
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();`;

const publicNodeCompatScript = String.raw`(() => {
  'use strict';

  const replaceExact = (before, after) => {
    document.querySelectorAll('body *').forEach((node) => {
      if (node.children.length === 0 && (node.textContent || '').trim() === before) {
        node.textContent = after;
      }
    });
  };

  const setChip = (key, tone, label) => {
    document.querySelectorAll('[data-route-chip="' + key + '"]').forEach((node) => {
      node.className = 'status-chip status-chip--' + tone;
      node.textContent = label;
    });
  };

  const run = async () => {
    try {
      const response = await fetch('/__void/public-app/network.json', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const snapshot = await response.json();
      if (!snapshot || snapshot.marker !== 'VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1') {
        throw new Error('unexpected marker');
      }

      const ready = snapshot.ready === true;
      const head = Number.isFinite(Number(snapshot.chain_head))
        ? Number(snapshot.chain_head).toLocaleString('en-US')
        : 'Unavailable';
      const peers = Number.isFinite(Number(snapshot.peer_count))
        ? Number(snapshot.peer_count)
        : 0;

      setChip('ready', ready ? 'positive' : 'warning', ready ? 'Ready' : 'Degraded');
      setChip('head', head === 'Unavailable' ? 'warning' : 'positive', head === 'Unavailable' ? 'Unavailable' : 'Block ' + head);
      setChip('peers', peers > 0 ? 'positive' : 'warning', peers + ' peer' + (peers === 1 ? '' : 's'));
      setChip('route_index', 'positive', 'Available');

      replaceExact('Loading public status…', ready ? 'Public status ready' : 'Public status degraded');
      replaceExact('Loading readiness…', ready ? 'Ready' : 'Degraded');
      replaceExact('Loading sanitized public status', 'Live sanitized public status');
      replaceExact(
        'No cached or invented telemetry is shown while the adapter is unavailable.',
        'Fresh bounded telemetry is supplied by the public composition gateway.'
      );
      replaceExact('Loading mesh', peers + ' connected peer' + (peers === 1 ? '' : 's'));
      replaceExact('Waiting for explicit per-node runtime evidence.', 'Public seed reports block ' + head + '.');
      replaceExact('No node coverage published yet.', 'One public seed is currently observed.');
      replaceExact('Alignment unknown', 'Public seed snapshot');
      replaceExact('Waiting for nodes', snapshot.node?.label || 'Public seed');
      replaceExact('Selected node Unknown', 'Selected node ' + (snapshot.node?.label || 'Public seed'));
      replaceExact('Not published', head === 'Unavailable' ? 'Unavailable' : 'Block ' + head);
      replaceExact('Loading public proofs', 'Public proof routes available');
      replaceExact('Waiting for sanitized snapshot', 'Sanitized public-seed snapshot loaded');
      replaceExact('Loading public status', ready ? 'Status ready' : 'Status degraded');

      document.documentElement.dataset.voidPublicComposition = 'ready';
    } catch (error) {
      setChip('ready', 'warning', 'Unavailable');
      setChip('head', 'warning', 'Unavailable');
      setChip('peers', 'warning', 'Unavailable');
      document.documentElement.dataset.voidPublicComposition = 'error';
      console.warn('[void-public-composition]', error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();`;

function isBlocked(pathname) {
  return blockedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

function copyHeaders(response) {
  const headers = {};
  for (const [key, value] of response.headers.entries()) {
    const lower = key.toLowerCase();
    if (
      [
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
        "content-length",
      ].includes(lower)
    ) {
      continue;
    }
    headers[key] = value;
  }
  headers["x-void-public-app-composition"] = "v1";
  return headers;
}

function send(res, status, headers, body, method = "GET") {
  const value = Buffer.isBuffer(body) ? body : Buffer.from(String(body ?? ""));
  const finalHeaders = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-void-public-app-composition": "v1",
    ...headers,
  };
  if (method !== "HEAD") finalHeaders["content-length"] = String(value.length);
  res.writeHead(status, finalHeaders);
  if (method === "HEAD") return res.end();
  res.end(value);
}

function sendJson(res, status, value, method = "GET") {
  send(
    res,
    status,
    { "content-type": "application/json; charset=utf-8" },
    JSON.stringify(value, null, 2) + "\n",
    method
  );
}

async function fetchWithLimit(url, method = "GET") {
  const response = await fetch(url, {
    method,
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (method === "HEAD") return { response, body: Buffer.alloc(0) };
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > MAX_PROXY_BODY_BYTES) {
    throw new Error(`upstream body exceeds ${MAX_PROXY_BODY_BYTES} bytes`);
  }
  return { response, body };
}

async function fetchJson(pathname) {
  try {
    const { response, body } = await fetchWithLimit(`${NODE_UPSTREAM}${pathname}`, "GET");
    let json = null;
    try {
      json = JSON.parse(body.toString("utf8"));
    } catch {}
    return { status: response.status, json, body };
  } catch (error) {
    return {
      status: 0,
      json: null,
      body: Buffer.alloc(0),
      error: String(error?.message || error),
    };
  }
}

function extractHead(value) {
  if (Number.isFinite(Number(value))) return Number(value);
  if (!value || typeof value !== "object") return null;
  for (const key of ["number", "head", "height", "latest", "block", "chain_head"]) {
    if (Number.isFinite(Number(value[key]))) return Number(value[key]);
  }
  return null;
}

function extractPeerCount(value) {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== "object") return 0;
  if (Array.isArray(value.connected)) return value.connected.length;
  if (Array.isArray(value.peers)) return value.peers.length;
  if (Number.isFinite(Number(value.count))) return Number(value.count);
  if (Number.isFinite(Number(value.peer_count))) return Number(value.peer_count);
  if (Number.isFinite(Number(value.peers))) return Number(value.peers);
  return 0;
}

let snapshotCache = { at: 0, value: null };

async function buildSnapshot() {
  const now = Date.now();
  if (snapshotCache.value && now - snapshotCache.at < 1500) return snapshotCache.value;

  const [readyResult, headResult, peersResult, versionResult] = await Promise.all([
    fetchJson("/__void/ready.json"),
    fetchJson("/blocks/latest/number2.json"),
    fetchJson("/p2p/peers"),
    fetchJson("/version"),
  ]);

  const readyBody =
    readyResult.json && typeof readyResult.json === "object" ? readyResult.json : {};
  const head =
    extractHead(headResult.json) ??
    extractHead(readyBody.head) ??
    extractHead(readyBody.lastmile_seen);
  const peerCount = extractPeerCount(peersResult.json);
  const reasons = Array.isArray(readyBody.reasons)
    ? readyBody.reasons.map((item) => String(item)).slice(0, 16)
    : [];
  const reportedReady = readyBody.ready === true;
  const gap = Number.isFinite(Number(readyBody.gap)) ? Number(readyBody.gap) : null;
  const txrootLive = Number.isFinite(Number(readyBody.txroot_live))
    ? Number(readyBody.txroot_live)
    : null;
  const operationalReady =
    reportedReady && gap === 0 && txrootLive === 1 && reasons.length === 0;
  const versionBody =
    versionResult.json && typeof versionResult.json === "object"
      ? versionResult.json
      : {};

  const snapshot = {
    ok: true,
    marker: MARKER,
    generated_at: new Date().toISOString(),
    read_only: true,
    public_safe: true,
    network_name: NETWORK_NAME,
    node: {
      label: NODE_LABEL,
      role: "public-seed",
      public: true,
    },
    ready: operationalReady,
    operational_ready: operationalReady,
    reported_ready: reportedReady,
    chain_head: head,
    head,
    gap,
    txroot_live: txrootLive,
    txroot_quarantined: TXROOT_QUARANTINED && txrootLive !== 1,
    reasons,
    peer_count: peerCount,
    expected_peer_count: EXPECTED_PEERS,
    version: {
      available: versionResult.status === 200,
      version:
        typeof versionBody.version === "string" ? versionBody.version : null,
      protocol_version: Number.isFinite(Number(versionBody.protocol_version))
        ? Number(versionBody.protocol_version)
        : null,
      channel:
        typeof versionBody.channel === "string" ? versionBody.channel : null,
      git_commit:
        typeof versionBody.git_commit === "string"
          ? versionBody.git_commit
          : null,
    },
    nodes: [
      {
        label: NODE_LABEL,
        role: "public-seed",
        head,
        peer_count: peerCount,
        ready: operationalReady,
        reported_ready: reportedReady,
        gap,
        txroot_live: txrootLive,
        txroot_quarantined: TXROOT_QUARANTINED && txrootLive !== 1,
        reasons,
      },
    ],
    sources: {
      readiness: {
        status: readyResult.status,
        available: readyResult.status === 200,
      },
      head: {
        status: headResult.status,
        available: headResult.status === 200,
      },
      peers: {
        status: peersResult.status,
        available: peersResult.status === 200,
      },
      version: {
        status: versionResult.status,
        available: versionResult.status === 200,
      },
    },
    boundaries: {
      account_enumeration: false,
      wallet_records: false,
      work_credit_balances: false,
      job_history: false,
      receipt_history: false,
      peer_ids: false,
      peer_addresses: false,
      mutation: false,
      money_movement: false,
      validator_mutation: false,
      operator_mutation: false,
    },
  };

  snapshotCache = { at: now, value: snapshot };
  return snapshot;
}

function toHomeSnapshot(snapshot) {
  return {
    ok: true,
    marker: HOME_MARKER,
    generated_at: snapshot.generated_at,
    read_only: true,
    public_safe: true,
    network_name: snapshot.network_name,
    node: snapshot.node,
    account: {
      selected: false,
      id: null,
      label: "Public-safe view",
    },
    balances: {
      available: false,
      void_display: "—",
      spendable_wc_display: "—",
      production_wc_display: "—",
      reason: "Account-scoped balances are not public.",
    },
    network: {
      health: snapshot.ready ? "healthy" : "degraded",
      ready: snapshot.ready,
      reported_ready: snapshot.reported_ready,
      chain_head: snapshot.chain_head,
      gap: snapshot.gap,
      txroot_live: snapshot.txroot_live,
      txroot_quarantined: snapshot.txroot_quarantined,
      reasons: snapshot.reasons,
      peer_count: snapshot.peer_count,
      expected_peer_count: snapshot.expected_peer_count,
    },
    sources: {
      health: snapshot.sources.readiness,
      readiness: snapshot.sources.readiness,
      head: snapshot.sources.head,
      peers: snapshot.sources.peers,
    },
    boundaries: snapshot.boundaries,
  };
}

function injectBefore(html, needle, addition) {
  const index = html.toLowerCase().lastIndexOf(needle.toLowerCase());
  if (index < 0) return html + addition;
  return html.slice(0, index) + addition + html.slice(index);
}

async function proxy(
  req,
  res,
  upstream,
  { injectApp = false, injectPublicNode = false } = {}
) {
  const target = `${upstream}${req.url || "/"}`;
  const { response, body } = await fetchWithLimit(target, req.method);
  const headers = copyHeaders(response);
  let output = body;

  if (req.method !== "HEAD") {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      let html = body.toString("utf8");
      if (injectApp) {
        html = injectBefore(
          html,
          "</head>",
          '\n<script>window.__VOID_PUBLIC_APP_MODE__=true;</script>\n' +
            '<script src="/__void/public-app/public-mode.js"></script>\n'
        );
      }
      if (injectPublicNode) {
        html = injectBefore(
          html,
          "</body>",
          '\n<script src="/__void/public-app/public-node-compat.js" defer></script>\n'
        );
      }
      output = Buffer.from(html);
      headers["content-security-policy"] =
        "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
        "connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
    }
  }

  send(res, response.status, headers, output, req.method);
}

const server = http.createServer(async (req, res) => {
  try {
    const method = String(req.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      return send(
        res,
        405,
        {
          "content-type": "text/plain; charset=utf-8",
          allow: "GET, HEAD",
        },
        "method_not_allowed\n",
        method
      );
    }

    const url = new URL(req.url || "/", "http://composition.local");
    const pathname = url.pathname;

    if (isBlocked(pathname)) {
      return send(
        res,
        404,
        { "content-type": "text/plain; charset=utf-8" },
        "not_public\n",
        method
      );
    }

    if (pathname === "/__void/public-app/status.json") {
      return sendJson(
        res,
        200,
        {
          ok: true,
          marker: MARKER,
          mode: "public_safe_composition",
          host: HOST,
          port: PORT,
          public_upstream_private: true,
          node_upstream_private: true,
          methods: ["GET", "HEAD"],
          app_public: true,
          account_views_public: false,
          mutation: false,
        },
        method
      );
    }

    if (pathname === "/__void/public-app/mode.json") {
      return sendJson(
        res,
        200,
        {
          ok: true,
          marker: MARKER,
          public_mode: true,
          account_views_public: false,
          local_or_authorized_session_required: true,
          read_only: true,
        },
        method
      );
    }

    if (pathname === "/__void/public-app/public-mode.js") {
      return send(
        res,
        200,
        { "content-type": "text/javascript; charset=utf-8" },
        publicModeScript + "\n",
        method
      );
    }

    if (pathname === "/__void/public-app/public-node-compat.js") {
      return send(
        res,
        200,
        { "content-type": "text/javascript; charset=utf-8" },
        publicNodeCompatScript + "\n",
        method
      );
    }

    if (
      pathname === "/__void/public-app/network.json" ||
      pathname === "/public-node/local-multibox-status-v1.json" ||
      pathname === "/__void/diag/local-multibox-runtime-route-v1.json" ||
      pathname === "/public-node/smoke-pack-v1.json"
    ) {
      const snapshot = await buildSnapshot();
      return sendJson(res, 200, snapshot, method);
    }

    if (pathname === "/__void/ui/wave2/home.json") {
      const snapshot = await buildSnapshot();
      return sendJson(res, 200, toHomeSnapshot(snapshot), method);
    }

    if (pathname === "/version") {
      const snapshot = await buildSnapshot();
      return sendJson(
        res,
        200,
        {
          ok: snapshot.version.available,
          version: snapshot.version.version,
          protocol_version: snapshot.version.protocol_version,
          channel: snapshot.version.channel,
          git_commit: snapshot.version.git_commit,
          public_safe: true,
        },
        method
      );
    }

    if (pathname === "/blocks/latest/number2.json") {
      const snapshot = await buildSnapshot();
      if (!Number.isFinite(Number(snapshot.chain_head))) {
        return sendJson(
          res,
          503,
          { ok: false, error: "head_unavailable" },
          method
        );
      }
      return sendJson(
        res,
        200,
        { number: Number(snapshot.chain_head) },
        method
      );
    }

    if (pathname === "/p2p/peers") {
      const snapshot = await buildSnapshot();
      const connected = Array.from(
        { length: Math.max(0, snapshot.peer_count) },
        () => ({ state: "connected" })
      );
      return sendJson(
        res,
        200,
        {
          ok: true,
          connected,
          knownAddrs: [],
          count: snapshot.peer_count,
          sanitized: true,
          peer_ids: false,
          peer_addresses: false,
        },
        method
      );
    }

    if (
      pathname === "/app" ||
      pathname === "/app/" ||
      pathname.startsWith("/app/")
    ) {
      return await proxy(req, res, NODE_UPSTREAM, {
        injectApp: pathname === "/app" || pathname === "/app/",
      });
    }

    return await proxy(req, res, PUBLIC_UPSTREAM, {
      injectPublicNode:
        pathname === "/public-node" || pathname === "/public-node/",
    });
  } catch (error) {
    return sendJson(
      res,
      502,
      {
        ok: false,
        marker: MARKER,
        error: "composition_upstream_error",
        detail: String(error?.message || error),
      },
      req.method || "GET"
    );
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    `${MARKER} host=${HOST} port=${PORT} ` +
      `public_upstream=${PUBLIC_UPSTREAM} node_upstream=${NODE_UPSTREAM}`
  );
});

#!/usr/bin/env node
// VOID Public App Composition Gateway v1
// Public-safe composition layer:
//   existing public earn gateway -> bounded no-node earning contract
//   loopback node -> public app assets and sanitized network truth
//   /participant -> static no-node handoff, never the local operator dashboard
// Account-scoped Wallet/Earn adapters and arbitrary mutations remain private.

import http from "node:http";

const HOST = process.env.VOID_COMPOSITION_HOST || "127.0.0.1";
const PORT = Number(process.env.VOID_COMPOSITION_PORT || "8082");
const PUBLIC_UPSTREAM = (process.env.VOID_PUBLIC_GATEWAY_UPSTREAM || "http://127.0.0.1:8080").replace(/\/+$/, "");
const NODE_UPSTREAM = (process.env.VOID_NODE_UPSTREAM || "http://127.0.0.1:4100").replace(/\/+$/, "");
const PUBLIC_NODE_WELL_KNOWN_PATHS = new Set([
  "/.well-known/void-agent-discovery.json",
  "/.well-known/void-agent-discovery.schema.json",
  "/.well-known/void-network-authenticity.json",
  "/.well-known/void-network-authenticity.schema.json",
]);
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
const RUNTIME_TRUTH_MARKER = "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1";
const PUBLIC_PARTICIPANT_MARKER =
  "VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_V1";
const PUBLIC_EARN_HEALTH_PATH = "/health";
const PUBLIC_EARN_GATEWAY_STATUS_PATH =
  "/__void/public-earn-gateway-v1/status.json";
const PUBLIC_EARN_STATUS_PATH =
  "/wc/public-earning-pilot-v1/status";
const PUBLIC_EARN_CLAIM_PATH =
  "/wc/public-earning-pilot-v1/claim-ticket";
const PUBLIC_EARN_SUBMIT_PATH =
  "/wc/public-earning-pilot-v1/submit-result";
const PUBLIC_EARN_CLIENT_PATH =
  "/download/void-public-earn-no-node-client-v1.mjs";
const PUBLIC_PARTICIPANT_STATUS_PATH =
  "/__void/public-participant/status.json";
const PUBLIC_EARN_CLAIM_MAX_BODY_BYTES = 64 * 1024;
const PUBLIC_EARN_SUBMIT_MAX_BODY_BYTES = 512 * 1024;
const PUBLIC_EARN_MUTATION_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.VOID_PUBLIC_EARN_MUTATION_TIMEOUT_MS || "60000"),
);
const PUBLIC_DATANET_FETCH_RE =
  /^\/datanet\/v1\/fetch\/[A-Za-z0-9._:-]{1,180}$/;
const PUBLIC_DATANET_WHO_RE = /^[A-Za-z0-9._:-]{1,128}$/;

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
  } catch (error) {
    window.__VOID_PUBLIC_APP_STORAGE_CLEAR_ERROR__ = true;
    console.warn(
      '[void-public-app] account context storage clear failed',
      String(error?.message || error),
    );
  }

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
      const runtimeStatus = String(
        snapshot.status || (ready ? 'ready' : 'degraded')
      );
      const restrictedReady = runtimeStatus === 'restricted_ready';
      const unavailable = runtimeStatus === 'unavailable';
      const head = Number.isFinite(Number(snapshot.chain_head))
        ? Number(snapshot.chain_head).toLocaleString('en-US')
        : 'Unavailable';
      const peers = Number.isFinite(Number(snapshot.peer_count))
        ? Number(snapshot.peer_count)
        : 0;

      const readyTone = ready ? 'positive' : restrictedReady ? 'info' : 'warning';
      const readyLabel = ready
        ? 'Ready'
        : restrictedReady
          ? 'Synchronized'
          : unavailable
            ? 'Unavailable'
            : 'Degraded';

      setChip('ready', readyTone, readyLabel);
      setChip('head', head === 'Unavailable' ? 'warning' : 'positive', head === 'Unavailable' ? 'Unavailable' : 'Block ' + head);
      setChip('peers', peers > 0 ? 'positive' : 'warning', peers + ' peer' + (peers === 1 ? '' : 's'));
      setChip('route_index', 'positive', 'Available');

      const publicStatusText = ready
        ? 'Public status ready'
        : restrictedReady
          ? 'Public status synchronized · txroot safety quarantine active'
          : unavailable
            ? 'Public status unavailable'
            : 'Public status degraded';
      const readinessText = ready
        ? 'Ready'
        : restrictedReady
          ? 'Synchronized · quarantined'
          : unavailable
            ? 'Unavailable'
            : 'Degraded';
      const compactStatusText = ready
        ? 'Status ready'
        : restrictedReady
          ? 'Status synchronized · quarantined'
          : unavailable
            ? 'Status unavailable'
            : 'Status degraded';

      replaceExact('Loading public status…', publicStatusText);
      replaceExact('Loading readiness…', readinessText);
      replaceExact('Loading sanitized public status', 'Live sanitized public status');
      replaceExact(
        'No cached or invented telemetry is shown while the adapter is unavailable.',
        restrictedReady
          ? 'Chain and peer mesh are synchronized while txroot persistence remains intentionally quarantined.'
          : 'Fresh bounded telemetry is supplied by the public composition gateway.'
      );
      replaceExact('Loading mesh', peers + ' connected peer' + (peers === 1 ? '' : 's'));
      replaceExact('Waiting for explicit per-node runtime evidence.', 'Public seed reports block ' + head + '.');
      replaceExact('No node coverage published yet.', 'One public seed is currently observed.');
      replaceExact('Alignment unknown', restrictedReady ? 'Synchronized under safety quarantine' : 'Public seed snapshot');
      replaceExact('Waiting for nodes', snapshot.node?.label || 'Public seed');
      replaceExact('Selected node Unknown', 'Selected node ' + (snapshot.node?.label || 'Public seed'));
      replaceExact('Not published', head === 'Unavailable' ? 'Unavailable' : 'Block ' + head);
      replaceExact('Loading public proofs', 'Public proof routes available');
      replaceExact('Waiting for sanitized snapshot', 'Sanitized public-seed snapshot loaded');
      replaceExact('Loading public status', compactStatusText);

      document.documentElement.dataset.voidPublicComposition = 'ready';
      document.documentElement.dataset.voidPublicRuntimeStatus = runtimeStatus;
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

const publicParticipantHtml = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>VOID Public Earn</title>
  <style>
    :root{color-scheme:dark;background:#070a0f;color:#edf7ff;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#102335 0,#070a0f 52%);min-height:100vh}
    main{max-width:920px;margin:0 auto;padding:38px 20px 70px}
    .eyebrow{letter-spacing:.16em;text-transform:uppercase;color:#69e4dc;font-size:.75rem;font-weight:800}
    h1{font-size:clamp(2.1rem,6vw,4.7rem);line-height:.96;margin:.5rem 0 1rem}
    h2{margin-top:0}.lead{font-size:1.08rem;line-height:1.65;color:#c9d8e5;max-width:760px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin:26px 0}
    .card{border:1px solid rgba(105,228,220,.28);background:rgba(8,17,25,.84);border-radius:16px;padding:20px;box-shadow:0 18px 55px rgba(0,0,0,.22)}
    code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#03070b;border:1px solid #213443;padding:14px;border-radius:12px;color:#d8f8f5}
    a.button{display:inline-flex;align-items:center;justify-content:center;padding:11px 15px;border-radius:10px;text-decoration:none;font-weight:800;background:#69e4dc;color:#041014;margin:4px 8px 4px 0}
    a.secondary{background:transparent;color:#bfeeea;border:1px solid #35635f}
    ul,ol{line-height:1.65;color:#c9d8e5}.boundary{border-left:4px solid #f6c453;padding-left:14px;color:#f7e3ae}
    footer{margin-top:32px;color:#8296a7;font-size:.9rem}
  </style>
</head>
<body>
<main>
  <div class="eyebrow">Mainnet-0 · Public Earn</div>
  <h1>Earn Work Credits without running a VOID node.</h1>
  <p class="lead">Use the one-shot no-node client. It creates a private local executor identity, claims one server-selected task, verifies the selected dataset, submits one signed result bundle, and checks the capability-bound canonical +3 WC acceptance response.</p>

  <div class="grid">
    <section class="card">
      <h2>1. Check availability</h2>
      <p>Read the sanitized participant status. It contains the trusted coordinator node ID and whether bounded work is currently claimable.</p>
      <a class="button secondary" href="${PUBLIC_PARTICIPANT_STATUS_PATH}">Open status JSON</a>
    </section>
    <section class="card">
      <h2>2. Download one file</h2>
      <p>This is not a node, wallet, miner, validator, or background daemon. Node.js is required to run the single client file.</p>
      <a class="button" href="${PUBLIC_EARN_CLIENT_PATH}">Download no-node client</a>
    </section>
  </div>

  <section class="card">
    <h2>3. Run one bounded job</h2>
    <pre>node void-public-earn-no-node-client-v1.mjs status \
  --account YOUR_ACCOUNT \
  --coordinator-base PUBLIC_HTTPS_BASE \
  --coordinator-node-id COORDINATOR_NODE_ID

node void-public-earn-no-node-client-v1.mjs run \
  --account YOUR_ACCOUNT \
  --coordinator-base PUBLIC_HTTPS_BASE \
  --coordinator-node-id COORDINATOR_NODE_ID</pre>
    <p>The account is a participant accounting identifier, not a wallet address. Work, dataset, input hash, fixed award, and expiry remain coordinator-selected.</p>
  </section>

  <section class="card boundary">
    <h2>Public boundary</h2>
    <ul>
      <li>No participant account directory or arbitrary balance lookup.</li>
      <li>No browser wallet, wallet send, WC→VOID swap, Buy VOID fulfillment, staking, or validator submit.</li>
      <li>No generic job submission or participant-selected award.</li>
      <li>The local operator dashboard is not served through this route.</li>
    </ul>
  </section>

  <p>
    <a class="button secondary" href="/public-node/">Network status</a>
    <a class="button secondary" href="/app/">Read-only app</a>
    <a class="button secondary" href="/docs/public/void-public-earn-no-node-client-v1.md">Client guide</a>
  </p>
  <footer>${PUBLIC_PARTICIPANT_MARKER}</footer>
</main>
</body>
</html>`;


function publicDataNetReadAllowed(url) {
  if (!PUBLIC_DATANET_FETCH_RE.test(url.pathname)) return false;
  if (!url.search) return true;
  const keys = Array.from(url.searchParams.keys());
  if (keys.some((key) => key !== "who")) return false;
  const values = url.searchParams.getAll("who");
  return (
    values.length <= 1 &&
    (values.length === 0 || PUBLIC_DATANET_WHO_RE.test(values[0] || ""))
  );
}

function publicEarnReadAllowed(url) {
  if (
    url.pathname === PUBLIC_EARN_HEALTH_PATH ||
    url.pathname === PUBLIC_EARN_GATEWAY_STATUS_PATH ||
    url.pathname === PUBLIC_EARN_CLIENT_PATH
  ) {
    return !url.search;
  }
  if (url.pathname === PUBLIC_EARN_STATUS_PATH) return !url.search;
  return publicDataNetReadAllowed(url);
}

async function fetchPublicJson(pathname) {
  try {
    const { response, body } = await fetchWithLimit(
      `${PUBLIC_UPSTREAM}${pathname}`,
      "GET"
    );
    let json = null;
    let jsonParseError = null;
    try {
      json = JSON.parse(body.toString("utf8"));
    } catch (error) {
      jsonParseError = String(error?.message || error);
    }
    return { status: response.status, json, jsonParseError };
  } catch (error) {
    return {
      status: 0,
      json: null,
      error: String(error?.message || error),
    };
  }
}

async function buildPublicParticipantStatus() {
  const [health, gateway, pilot] = await Promise.all([
    fetchPublicJson(PUBLIC_EARN_HEALTH_PATH),
    fetchPublicJson(PUBLIC_EARN_GATEWAY_STATUS_PATH),
    fetchPublicJson(PUBLIC_EARN_STATUS_PATH),
  ]);

  const healthBody =
    health.json && typeof health.json === "object" ? health.json : {};
  const gatewayBody =
    gateway.json && typeof gateway.json === "object" ? gateway.json : {};
  const pilotBody =
    pilot.json && typeof pilot.json === "object" ? pilot.json : {};
  const publicClaim =
    pilotBody.public_claim && typeof pilotBody.public_claim === "object"
      ? pilotBody.public_claim
      : {};

  const coordinatorNodeId =
    typeof healthBody.nodeId === "string" &&
    /^[0-9a-f]{32}$/.test(healthBody.nodeId)
      ? healthBody.nodeId
      : null;
  const fixedAward = Number(pilotBody.fixed_award_wc);
  const available =
    health.status === 200 &&
    gateway.status === 200 &&
    pilot.status === 200 &&
    healthBody.ok === true &&
    gatewayBody.ok === true &&
    gatewayBody.enabled === true &&
    pilotBody.ok === true &&
    pilotBody.coordinator_enabled === true &&
    pilotBody.executor_enabled === false &&
    fixedAward === 3 &&
    publicClaim.enabled === true &&
    publicClaim.available === true &&
    publicClaim.server_selected_work === true &&
    publicClaim.proof_of_executor_key_possession_required === true &&
    publicClaim.transport_mode === "outbound_bundle" &&
    publicClaim.participant_selected_dataset === false &&
    publicClaim.participant_selected_input_hash === false &&
    publicClaim.participant_selected_award === false &&
    coordinatorNodeId !== null;

  return {
    ok: true,
    marker: PUBLIC_PARTICIPANT_MARKER,
    generated_at: new Date().toISOString(),
    available,
    status: available ? "available" : "hold",
    no_node_required: true,
    background_service_started: false,
    coordinator_node_id: coordinatorNodeId,
    task_class:
      typeof pilotBody.task_class === "string"
        ? pilotBody.task_class
        : "datanet_fetch_verify",
    fixed_award_wc: fixedAward === 3 ? 3 : null,
    accounting_proof: "capability_bound_submission_response_v1",
    routes: {
      participant: "/participant",
      health: PUBLIC_EARN_HEALTH_PATH,
      gateway_status: PUBLIC_EARN_GATEWAY_STATUS_PATH,
      earning_status: PUBLIC_EARN_STATUS_PATH,
      claim_ticket: PUBLIC_EARN_CLAIM_PATH,
      submit_result: PUBLIC_EARN_SUBMIT_PATH,
      client_download: PUBLIC_EARN_CLIENT_PATH,
    },
    methods: {
      health: ["GET", "HEAD"],
      gateway_status: ["GET", "HEAD"],
      earning_status: ["GET", "HEAD"],
      claim_ticket: ["POST"],
      submit_result: ["POST"],
      client_download: ["GET", "HEAD"],
    },
    sources: {
      health: { status: health.status, available: health.status === 200 },
      gateway: { status: gateway.status, available: gateway.status === 200 },
      pilot: { status: pilot.status, available: pilot.status === 200 },
    },
    boundaries: {
      account_directory: false,
      arbitrary_balance_lookup: false,
      browser_account_state: false,
      local_operator_dashboard: false,
      generic_job_submit: false,
      participant_selected_work: false,
      participant_selected_award: false,
      wallet: false,
      money_movement: false,
      validator_mutation: false,
      operator_mutation: false,
    },
  };
}

function readBoundedRequestBody(req, maximum) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"] || 0);
    if (Number.isFinite(declared) && declared > maximum) {
      req.resume();
      reject(new Error("request_body_too_large"));
      return;
    }

    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maximum) {
        reject(new Error("request_body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function validatedCapability(value) {
  if (typeof value !== "string") return null;
  const match =
    /^Bearer (wcep1\.([0-9a-f]{32})\.[A-Za-z0-9_-]{43})$/.exec(
      value.trim()
    );
  if (!match) return null;
  return { header: `Bearer ${match[1]}`, ticketId: match[2] };
}

async function proxyPublicEarnMutation(req, res, url) {
  if (url.search) {
    return send(
      res,
      400,
      { "content-type": "text/plain; charset=utf-8" },
      "post_query_not_allowed\n",
      "POST"
    );
  }

  const claim = url.pathname === PUBLIC_EARN_CLAIM_PATH;
  const submit = url.pathname === PUBLIC_EARN_SUBMIT_PATH;
  if (!claim && !submit) {
    return send(
      res,
      405,
      {
        "content-type": "text/plain; charset=utf-8",
        allow: "GET, HEAD",
      },
      "method_not_allowed\n",
      "POST"
    );
  }

  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    return sendJson(
      res,
      415,
      { ok: false, error: "application_json_required" },
      "POST"
    );
  }

  let capability = null;
  if (claim && req.headers.authorization) {
    return sendJson(
      res,
      400,
      { ok: false, error: "claim_authorization_header_not_allowed" },
      "POST"
    );
  }
  if (submit) {
    capability = validatedCapability(req.headers.authorization);
    if (!capability) {
      return sendJson(
        res,
        401,
        { ok: false, error: "earning_capability_authorization_required" },
        "POST"
      );
    }
  }

  const maximum = claim
    ? PUBLIC_EARN_CLAIM_MAX_BODY_BYTES
    : PUBLIC_EARN_SUBMIT_MAX_BODY_BYTES;

  let body;
  try {
    body = await readBoundedRequestBody(req, maximum);
  } catch (error) {
    if (String(error?.message || "") === "request_body_too_large") {
      return sendJson(
        res,
        413,
        { ok: false, error: "request_body_too_large" },
        "POST"
      );
    }
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch (error) {
    return sendJson(
      res,
      400,
      { ok: false, error: "invalid_json" },
      "POST"
    );
  }

  if (submit) {
    const bodyTicketId = String(parsed?.envelope?.ticket_id || "");
    if (bodyTicketId !== capability.ticketId) {
      return sendJson(
        res,
        401,
        { ok: false, error: "earning_capability_ticket_mismatch" },
        "POST"
      );
    }
  }

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "content-length": String(body.length),
    "user-agent": "void-public-participant-handoff-v1",
  };
  if (submit) headers.authorization = capability.header;

  const response = await fetch(`${PUBLIC_UPSTREAM}${url.pathname}`, {
    method: "POST",
    headers,
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(PUBLIC_EARN_MUTATION_TIMEOUT_MS),
  });
  const responseBody = Buffer.from(await response.arrayBuffer());
  if (responseBody.length > MAX_PROXY_BODY_BYTES) {
    throw new Error(`upstream body exceeds ${MAX_PROXY_BODY_BYTES} bytes`);
  }

  const responseHeaders = copyHeaders(response);
  delete responseHeaders["set-cookie"];
  delete responseHeaders.location;
  responseHeaders["cache-control"] = "no-store";
  return send(
    res,
    response.status,
    responseHeaders,
    responseBody,
    "POST"
  );
}

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
    let jsonParseError = null;
    try {
      json = JSON.parse(body.toString("utf8"));
    } catch (error) {
      jsonParseError = String(error?.message || error);
    }
    return { status: response.status, json, body, jsonParseError };
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
  const publicServiceAvailable =
    readyResult.status === 200 &&
    headResult.status === 200 &&
    peersResult.status === 200 &&
    versionResult.status === 200;
  const chainSynchronized =
    reportedReady && gap === 0 && Number.isFinite(Number(head));
  const meshConnected = Number.isFinite(Number(peerCount)) && peerCount > 0;
  const meshAligned =
    Number.isFinite(Number(peerCount)) && peerCount >= EXPECTED_PEERS;
  const txrootQuarantineActive =
    TXROOT_QUARANTINED && txrootLive !== 1;
  const quarantineReasonOnly =
    reasons.length > 0 &&
    reasons.every((reason) => reason === "txroot_live!=1");
  const restrictedReady =
    !operationalReady &&
    publicServiceAvailable &&
    chainSynchronized &&
    meshConnected &&
    meshAligned &&
    txrootQuarantineActive &&
    quarantineReasonOnly;
  const runtimeStatus = operationalReady
    ? "ready"
    : restrictedReady
      ? "restricted_ready"
      : publicServiceAvailable
        ? "degraded"
        : "unavailable";
  const runtimeStatusLabel = operationalReady
    ? "Ready"
    : restrictedReady
      ? "Synchronized under txroot safety quarantine"
      : runtimeStatus === "unavailable"
        ? "Unavailable"
        : "Degraded";
  const runtimeStatusDetail = operationalReady
    ? "Strict readiness checks are green."
    : restrictedReady
      ? "Chain head and expected peer mesh are synchronized; txroot persistence remains intentionally quarantined."
      : runtimeStatus === "unavailable"
        ? "One or more required public telemetry sources are unavailable."
        : "Public telemetry is available, but strict or restricted-ready conditions are not satisfied.";
  const versionBody =
    versionResult.json && typeof versionResult.json === "object"
      ? versionResult.json
      : {};

  const snapshot = {
    ok: true,
    marker: MARKER,
    runtime_truth_marker: RUNTIME_TRUTH_MARKER,
    generated_at: new Date().toISOString(),
    read_only: true,
    public_safe: true,
    status: runtimeStatus,
    status_label: runtimeStatusLabel,
    status_detail: runtimeStatusDetail,
    strict_ready: operationalReady,
    restricted_ready: restrictedReady,
    public_service_available: publicServiceAvailable,
    chain_synchronized: chainSynchronized,
    mesh_connected: meshConnected,
    mesh_aligned: meshAligned,
    security_mode: txrootQuarantineActive ? "txroot_quarantine" : "normal",
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
    txroot_quarantined: txrootQuarantineActive,
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
        strict_ready: operationalReady,
        restricted_ready: restrictedReady,
        status: runtimeStatus,
        status_label: runtimeStatusLabel,
        reported_ready: reportedReady,
        gap,
        txroot_live: txrootLive,
        txroot_quarantined: txrootQuarantineActive,
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
      health:
        snapshot.status === "ready"
          ? "healthy"
          : snapshot.status === "restricted_ready"
            ? "restricted"
            : snapshot.status,
      status: snapshot.status,
      status_label: snapshot.status_label,
      status_detail: snapshot.status_detail,
      ready: snapshot.ready,
      strict_ready: snapshot.strict_ready,
      restricted_ready: snapshot.restricted_ready,
      public_service_available: snapshot.public_service_available,
      chain_synchronized: snapshot.chain_synchronized,
      mesh_connected: snapshot.mesh_connected,
      mesh_aligned: snapshot.mesh_aligned,
      security_mode: snapshot.security_mode,
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
    const url = new URL(req.url || "/", "http://composition.local");
    const pathname = url.pathname;

    if (method === "POST") {
      if (
        pathname === PUBLIC_EARN_CLAIM_PATH ||
        pathname === PUBLIC_EARN_SUBMIT_PATH
      ) {
        return await proxyPublicEarnMutation(req, res, url);
      }
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

    if (pathname === "/participant" || pathname === "/participant/") {
      if (url.search) {
        return sendJson(
          res,
          400,
          { ok: false, error: "participant_query_not_allowed" },
          method
        );
      }
      return send(
        res,
        200,
        {
          "content-type": "text/html; charset=utf-8",
          "content-security-policy":
            "default-src 'self'; style-src 'unsafe-inline'; " +
            "img-src 'self' data:; object-src 'none'; base-uri 'self'; " +
            "frame-ancestors 'none'; form-action 'none'",
        },
        publicParticipantHtml,
        method
      );
    }

    if (pathname === PUBLIC_PARTICIPANT_STATUS_PATH) {
      if (url.search) {
        return sendJson(
          res,
          400,
          { ok: false, error: "participant_status_query_not_allowed" },
          method
        );
      }
      return sendJson(
        res,
        200,
        await buildPublicParticipantStatus(),
        method
      );
    }

    if (publicEarnReadAllowed(url)) {
      return await proxy(req, res, PUBLIC_UPSTREAM);
    }

    if (PUBLIC_NODE_WELL_KNOWN_PATHS.has(pathname)) {
      if (url.search) {
        return sendJson(
          res,
          400,
          { ok: false, error: "well_known_query_not_allowed" },
          method
        );
      }
      return await proxy(req, res, NODE_UPSTREAM);
    }

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
          runtime_truth_marker: RUNTIME_TRUTH_MARKER,
          mode: "public_safe_composition",
          host: HOST,
          port: PORT,
          public_upstream_private: true,
          node_upstream_private: true,
          methods: ["GET", "HEAD", "POST(exact public earn routes only)"],
          app_public: true,
          participant_handoff_public: true,
          account_views_public: false,
          mutation: false,
          generic_mutation: false,
          bounded_public_earn_claim_submit: true,
          money_movement: false,
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
          runtime_truth_marker: RUNTIME_TRUTH_MARKER,
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

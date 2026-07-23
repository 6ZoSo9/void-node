#!/usr/bin/env node
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";

const COMPOSITION_MARKER = "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1";
const RUNTIME_TRUTH_MARKER = "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1";
const repo = process.cwd();
const gatewayPath = path.join(
  repo,
  "ops/public/void-public-app-composition-gateway-v1.mjs",
);

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value) + "\n";
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

const nodeServer = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://node.local");

  if (url.pathname === "/__void/ready.json") {
    return sendJson(res, 200, {
      ready: true,
      head: 1856587,
      lastmile_seen: 1856587,
      gap: 0,
      txroot_live: 0,
      reasons: ["txroot_live!=1"],
    });
  }

  if (url.pathname === "/blocks/latest/number2.json") {
    return sendJson(res, 200, { number: 1856587 });
  }

  if (url.pathname === "/p2p/peers") {
    return sendJson(res, 200, {
      connected: [
        { id: "private-peer-one", addr: "100.1.1.1:4700" },
        { id: "private-peer-two", addr: "100.1.1.2:4701" },
      ],
    });
  }

  if (url.pathname === "/version") {
    return sendJson(res, 200, {
      version: "0.1.0",
      protocol_version: 1,
      channel: "stable",
      git_commit: "runtime-truth-test",
    });
  }

  return sendJson(res, 404, { ok: false });
});

const publicServer = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://public.local");

  if (url.pathname === "/public-node/" || url.pathname === "/public-node") {
    const body = `<!doctype html><html><body>
      <span>Loading public status…</span>
      <span>Loading readiness…</span>
      <span>Loading public status</span>
      <span>Loading sanitized public status</span>
      <p>No cached or invented telemetry is shown while the adapter is unavailable.</p>
      <span>Loading mesh</span>
      <span>Waiting for explicit per-node runtime evidence.</span>
      <span>No node coverage published yet.</span>
      <span>Alignment unknown</span>
      <span>Waiting for nodes</span>
      <span>Selected node Unknown</span>
      <span>Not published</span>
      <span>Loading public proofs</span>
      <span>Waiting for sanitized snapshot</span>
      <span data-route-chip="ready">Checking</span>
      <span data-route-chip="head">Checking</span>
      <span data-route-chip="peers">Checking</span>
      <span data-route-chip="route_index">Checking</span>
    </body></html>`;
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(body);
  }

  if (url.pathname === "/__void/ready.json") {
    return sendJson(res, 200, { ready: true });
  }

  return sendJson(res, 404, { ok: false });
});

function leaf(text = "") {
  return {
    children: [],
    textContent: text,
    className: "",
  };
}

function buildFakeDocument() {
  const chips = {
    ready: [leaf("Checking")],
    head: [leaf("Checking")],
    peers: [leaf("Checking")],
    route_index: [leaf("Checking")],
  };

  const leaves = [
    leaf("Loading public status…"),
    leaf("Loading readiness…"),
    leaf("Loading public status"),
    leaf("Loading sanitized public status"),
    leaf("No cached or invented telemetry is shown while the adapter is unavailable."),
    leaf("Loading mesh"),
    leaf("Waiting for explicit per-node runtime evidence."),
    leaf("No node coverage published yet."),
    leaf("Alignment unknown"),
    leaf("Waiting for nodes"),
    leaf("Selected node Unknown"),
    leaf("Not published"),
    leaf("Loading public proofs"),
    leaf("Waiting for sanitized snapshot"),
    ...Object.values(chips).flat(),
  ];

  const documentElement = { dataset: {} };

  const document = {
    readyState: "complete",
    documentElement,
    querySelectorAll(selector) {
      if (selector === "body *") return leaves;
      const match = selector.match(/^\[data-route-chip="([^"]+)"\]$/);
      if (match) return chips[match[1]] || [];
      return [];
    },
    addEventListener() {
      throw new Error("DOMContentLoaded listener should not be used when readyState=complete");
    },
  };

  return { document, documentElement, chips, leaves };
}

async function waitFor(predicate, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`timeout waiting for ${label}`);
}

let child;
try {
  const nodePort = await listen(nodeServer);
  const publicPort = await listen(publicServer);

  const portProbe = http.createServer();
  const compositionPort = await listen(portProbe);
  await new Promise((resolve) => portProbe.close(resolve));

  child = spawn(process.execPath, [gatewayPath], {
    cwd: repo,
    env: {
      ...process.env,
      VOID_COMPOSITION_HOST: "127.0.0.1",
      VOID_COMPOSITION_PORT: String(compositionPort),
      VOID_PUBLIC_GATEWAY_UPSTREAM: `http://127.0.0.1:${publicPort}`,
      VOID_NODE_UPSTREAM: `http://127.0.0.1:${nodePort}`,
      VOID_PUBLIC_EXPECTED_PEERS: "2",
      VOID_PUBLIC_NODE_LABEL: "Alienware",
      VOID_TXROOT_QUARANTINED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let lastStartupError = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const base = `http://127.0.0.1:${compositionPort}`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${base}/__void/public-app/status.json`);
      if (response.status === 200) break;
    } catch (error) {
      lastStartupError = String(error?.message || error);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
    if (attempt === 99) {
      throw new Error(
        `gateway did not start\nlast_startup_error=${lastStartupError}\nstdout=${stdout}\nstderr=${stderr}`,
      );
    }
  }

  const snapshotResponse = await fetch(
    `${base}/__void/public-app/network.json`,
  );
  assert.equal(snapshotResponse.status, 200);
  const snapshotText = await snapshotResponse.text();
  const snapshot = JSON.parse(snapshotText);

  assert.equal(snapshot.marker, COMPOSITION_MARKER);
  assert.equal(snapshot.runtime_truth_marker, RUNTIME_TRUTH_MARKER);
  assert.equal(snapshot.ready, false);
  assert.equal(snapshot.strict_ready, false);
  assert.equal(snapshot.operational_ready, false);
  assert.equal(snapshot.restricted_ready, true);
  assert.equal(snapshot.status, "restricted_ready");
  assert.equal(
    snapshot.status_label,
    "Synchronized under txroot safety quarantine",
  );
  assert.equal(snapshot.public_service_available, true);
  assert.equal(snapshot.chain_synchronized, true);
  assert.equal(snapshot.mesh_connected, true);
  assert.equal(snapshot.mesh_aligned, true);
  assert.equal(snapshot.security_mode, "txroot_quarantine");
  assert.equal(snapshot.txroot_quarantined, true);
  assert.equal(snapshot.chain_head, 1856587);
  assert.equal(snapshot.peer_count, 2);
  assert.equal(snapshotText.includes("private-peer-one"), false);
  assert.equal(snapshotText.includes("100.1.1.1:4700"), false);

  const homeResponse = await fetch(`${base}/__void/ui/wave2/home.json`);
  assert.equal(homeResponse.status, 200);
  const home = await homeResponse.json();
  assert.equal(home.network.health, "restricted");
  assert.equal(home.network.status, "restricted_ready");
  assert.equal(home.network.strict_ready, false);
  assert.equal(home.network.restricted_ready, true);
  assert.equal(home.network.chain_synchronized, true);
  assert.equal(home.network.mesh_aligned, true);
  assert.equal(home.network.security_mode, "txroot_quarantine");

  const scriptResponse = await fetch(
    `${base}/__void/public-app/public-node-compat.js`,
  );
  assert.equal(scriptResponse.status, 200);
  const script = await scriptResponse.text();
  assert.equal(
    script.includes("/__void/public-app/network.json"),
    true,
  );
  for (const forbidden of [
    "/__void/ui/wave3/wallet.json",
    "/__void/ui/wave4/earn.json",
    "/wc/balance",
    "/jobs",
    "/receipts",
    "/rpc",
    "/upgrade/apply",
  ]) {
    assert.equal(script.includes(forbidden), false, forbidden);
  }

  const { document, documentElement, chips, leaves } = buildFakeDocument();
  const requests = [];
  const warnings = [];

  const sandbox = {
    document,
    AbortSignal: {
      timeout() {
        return {};
      },
    },
    fetch: async (url, options) => {
      requests.push({
        url: String(url),
        method: String(options?.method || "GET"),
        credentials: String(options?.credentials || ""),
      });
      return {
        ok: true,
        status: 200,
        async json() {
          return snapshot;
        },
      };
    },
    console: {
      warn(...args) {
        warnings.push(args.map(String).join(" "));
      },
    },
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(script, sandbox, {
    filename: "public-node-compat.js",
  });

  await waitFor(
    () => documentElement.dataset.voidPublicRuntimeStatus === "restricted_ready",
    "browser compatibility script",
  );

  assert.deepEqual(requests, [
    {
      url: "/__void/public-app/network.json",
      method: "GET",
      credentials: "same-origin",
    },
  ]);
  assert.equal(warnings.length, 0);
  assert.equal(chips.ready[0].textContent, "Synchronized");
  assert.equal(
    chips.ready[0].className,
    "status-chip status-chip--info",
  );
  assert.equal(chips.head[0].textContent, "Block 1,856,587");
  assert.equal(chips.peers[0].textContent, "2 peers");
  assert.equal(chips.route_index[0].textContent, "Available");
  assert.equal(documentElement.dataset.voidPublicComposition, "ready");
  assert.equal(
    documentElement.dataset.voidPublicRuntimeStatus,
    "restricted_ready",
  );

  const renderedTexts = leaves.map((node) => node.textContent);
  assert.equal(
    renderedTexts.includes(
      "Public status synchronized · txroot safety quarantine active",
    ),
    true,
  );
  assert.equal(
    renderedTexts.includes("Synchronized · quarantined"),
    true,
  );
  assert.equal(
    renderedTexts.includes(
      "Chain and peer mesh are synchronized while txroot persistence remains intentionally quarantined.",
    ),
    true,
  );
  assert.equal(
    renderedTexts.includes("Synchronized under safety quarantine"),
    true,
  );

  console.log("runtime_status=restricted_ready");
  console.log("strict_ready=false");
  console.log("chain_synchronized=true");
  console.log("mesh_aligned=true");
  console.log("txroot_quarantine=explicit");
  console.log("browser_fetches=sanitized_network_only");
  console.log("account_private_routes_requested=0");
  console.log("peer_ids_addresses_exposed=0");
  console.log("VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1_BROWSER_CONTRACT_GREEN");
} finally {
  if (child && child.exitCode === null) child.kill("SIGTERM");
  await Promise.all([
    new Promise((resolve) => nodeServer.close(resolve)),
    new Promise((resolve) => publicServer.close(resolve)),
  ]);
}

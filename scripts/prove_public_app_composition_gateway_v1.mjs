#!/usr/bin/env node
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";

const MARKER = "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1";
const repo = process.cwd();
const gatewayPath = path.join(
  repo,
  "ops/public/void-public-app-composition-gateway-v1.mjs"
);

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

function json(res, status, value) {
  const body = JSON.stringify(value) + "\n";
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}


function provePublicModeMutationStability(source) {
  assert.match(
    source,
    /VOID_PUBLIC_APP_PUBLIC_MODE_MUTATION_STABILITY_V1/,
  );

  let observerInstance = null;
  let mutationDeliveries = 0;
  let activeView = "home";

  const makeNode = (initialText = "") => {
    let text = String(initialText);
    let className = "";
    return {
      dataset: {},
      style: { cssText: "" },
      parentElement: null,
      disabled: false,
      get textContent() {
        return text;
      },
      set textContent(value) {
        text = String(value);
        notifyMutation();
      },
      get className() {
        return className;
      },
      set className(value) {
        className = String(value);
      },
      innerHTML: "",
      setAttribute(name, value) {
        if (name === "aria-disabled") {
          this.ariaDisabled = String(value);
        }
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      closest() {
        return null;
      },
      prepend() {},
    };
  };

  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.observing = false;
      observerInstance = this;
    }
    observe() {
      this.observing = true;
    }
    disconnect() {
      this.observing = false;
    }
  }

  const notifyMutation = () => {
    if (!observerInstance?.observing) return;
    mutationDeliveries += 1;
    assert.ok(
      mutationDeliveries <= 8,
      "public-mode observer failed to settle",
    );
    observerInstance.callback([]);
  };

  const walletBoundaryRoot = makeNode();
  let walletBoundary = null;
  walletBoundaryRoot.querySelector = (selector) =>
    selector === "[data-public-session-boundary]" ? walletBoundary : null;
  walletBoundaryRoot.prepend = (node) => {
    walletBoundary = node;
    notifyMutation();
  };

  const walletInput = makeNode();
  const walletButton = makeNode();
  const walletForm = makeNode();
  walletForm.parentElement = walletBoundaryRoot;
  walletForm.querySelectorAll = (selector) =>
    selector === "input, button" ? [walletInput, walletButton] : [];
  walletForm.closest = () => null;
  const walletChip = makeNode("No account loaded");
  const walletMessage = makeNode("Enter an account ID.");

  const earnBoundaryRoot = makeNode();
  let earnBoundary = null;
  earnBoundaryRoot.querySelector = (selector) =>
    selector === "[data-public-session-boundary]" ? earnBoundary : null;
  earnBoundaryRoot.prepend = (node) => {
    earnBoundary = node;
    notifyMutation();
  };

  const earnInput = makeNode();
  const earnButton = makeNode();
  const earnForm = makeNode();
  earnForm.parentElement = earnBoundaryRoot;
  earnForm.querySelectorAll = (selector) =>
    selector === "input, button" ? [earnInput, earnButton] : [];
  earnForm.closest = () => null;
  const earnChip = makeNode("No account loaded");
  const earnMessage = makeNode("Enter an account ID.");

  const shellAccountHint = makeNode("Select in Wallet");
  const shellAccountLabel = makeNode("No account");

  const document = {
    readyState: "complete",
    body: makeNode(),
    documentElement: { dataset: {} },
    addEventListener() {},
    createElement() {
      return makeNode();
    },
    querySelector(selector) {
      if (
        selector === "[data-wallet-account-form]"
        && activeView === "wallet"
      ) {
        return walletForm;
      }
      if (
        selector === "[data-earn-account-form]"
        && activeView === "earn"
      ) {
        return earnForm;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-wallet-state-chip]") {
        return activeView === "wallet" ? [walletChip] : [];
      }
      if (selector === "[data-wallet-message]") {
        return activeView === "wallet" ? [walletMessage] : [];
      }
      if (selector === "[data-earn-state-chip]") {
        return activeView === "earn" ? [earnChip] : [];
      }
      if (selector === "[data-earn-message]") {
        return activeView === "earn" ? [earnMessage] : [];
      }
      if (selector === "button, a, span") {
        return [shellAccountHint, shellAccountLabel];
      }
      return [];
    },
  };

  const sandbox = {
    window: {},
    document,
    sessionStorage: { removeItem() {} },
    MutationObserver: FakeMutationObserver,
    console: { warn() {} },
    String,
  };

  vm.runInNewContext(source, sandbox, {
    timeout: 250,
    filename: "void-public-app-public-mode.js",
  });

  assert.equal(observerInstance?.observing, true);

  activeView = "wallet";
  const beforeWallet = mutationDeliveries;
  notifyMutation();
  assert.equal(
    mutationDeliveries,
    beforeWallet + 1,
    "Wallet mutation must settle in one observer delivery",
  );
  assert.equal(walletInput.disabled, true);
  assert.equal(walletButton.disabled, true);
  assert.equal(walletChip.textContent, "Local session required");
  assert.equal(
    walletMessage.textContent,
    "Public visitors cannot enumerate participant accounts or wallet records.",
  );
  assert.ok(walletBoundary);

  activeView = "earn";
  const beforeEarn = mutationDeliveries;
  notifyMutation();
  assert.equal(
    mutationDeliveries,
    beforeEarn + 1,
    "Earn mutation must settle in one observer delivery",
  );
  assert.equal(earnInput.disabled, true);
  assert.equal(earnButton.disabled, true);
  assert.equal(earnChip.textContent, "Local session required");
  assert.equal(
    earnMessage.textContent,
    "Public visitors receive network truth without participant-account enumeration.",
  );
  assert.ok(earnBoundary);

  const beforeRepeat = mutationDeliveries;
  notifyMutation();
  assert.equal(
    mutationDeliveries,
    beforeRepeat + 1,
    "repeat public-mode application must remain bounded",
  );

  return {
    mutationDeliveries,
    walletStable: true,
    earnStable: true,
  };
}

const secretPeerId = "secret-node-id-should-never-be-public";
const secretPeerAddr = "100.99.88.77:4700";
const secretWallet = "0x1111111111111111111111111111111111111111";

const nodeServer = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://node.local");
  if (req.method !== "GET" && req.method !== "HEAD") {
    return json(res, 405, { ok: false });
  }

  if (url.pathname === "/__void/ready.json") {
    return json(res, 200, {
      ready: true,
      head: 1856587,
      lastmile_seen: 1856587,
      gap: 0,
      txroot_live: 0,
      reasons: ["txroot_live!=1"],
    });
  }

  if (url.pathname === "/blocks/latest/number2.json") {
    return json(res, 200, { number: 1856587 });
  }

  if (url.pathname === "/p2p/peers") {
    return json(res, 200, {
      ok: true,
      connected: [
        { id: secretPeerId, addr: secretPeerAddr },
        { id: "second-secret-id", addr: "100.1.2.3:4701" },
      ],
      knownAddrs: [secretPeerAddr],
    });
  }

  if (url.pathname === "/version") {
    return json(res, 200, {
      ok: true,
      version: "0.1.0",
      protocol_version: 1,
      channel: "stable",
      git_commit: "abcdef123456",
      manifest_path: "/home/zoso/private/manifest.json",
      package_json_sha256: "deadbeef",
    });
  }

  if (url.pathname === "/app" || url.pathname === "/app/") {
    const body = `<!doctype html><html><head><title>VOID App</title></head><body>
      <main id="app-main">
        <section data-wallet-view><form data-wallet-account-form>
          <input data-wallet-account-input><button data-wallet-load>Load</button>
          <span data-wallet-state-chip>No account loaded</span>
          <p data-wallet-message>Enter account.</p>
        </form></section>
        <section data-earn-view><form data-earn-account-form>
          <input data-earn-account-input><button data-earn-load>Load</button>
          <span data-earn-state-chip>No account loaded</span>
          <p data-earn-message>Enter account.</p>
        </form></section>
      </main>
      <script type="module" src="/app/assets/js/app.js"></script>
    </body></html>`;
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(body);
  }

  if (url.pathname === "/app/assets/js/app.js") {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
    return res.end("console.log('mock app');\n");
  }

  if (url.pathname === "/__void/ui/wave3/wallet.json") {
    return json(res, 200, {
      ok: true,
      account: url.searchParams.get("account"),
      wallet: secretWallet,
    });
  }

  if (url.pathname === "/__void/ui/wave4/earn.json") {
    return json(res, 200, {
      ok: true,
      account: url.searchParams.get("account"),
      earned: 999,
      jobs: ["secret-job"],
    });
  }

  return json(res, 404, { ok: false, error: "node_not_found" });
});

const publicServer = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://public.local");
  if (req.method !== "GET" && req.method !== "HEAD") {
    return json(res, 405, { ok: false });
  }

  if (url.pathname === "/public-node" || url.pathname === "/public-node/") {
    const body = `<!doctype html><html><head><title>Public Node</title></head><body>
      <span>Loading public status…</span>
      <span data-route-chip="ready">Checking</span>
      <span data-route-chip="head">Checking</span>
      <span data-route-chip="peers">Checking</span>
      <span data-route-chip="route_index">Checking</span>
      <p>Loading sanitized public status</p>
      <p>No cached or invented telemetry is shown while the adapter is unavailable.</p>
    </body></html>`;
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(body);
  }

  if (url.pathname === "/public-node/route-index.json") {
    return json(res, 200, { ok: true, routes: ["/public-node/"] });
  }

  if (url.pathname === "/__void/ready.json") {
    return json(res, 200, { ready: true });
  }

  if (url.pathname === "/participant") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end("<html><body>participant public gateway</body></html>");
  }

  if (url.pathname === "/__void/public-earn/status.json") {
    return json(res, 200, { ok: true, public_earn_gateway: true });
  }

  return json(res, 404, { ok: false, error: "public_not_found" });
});

let child;
try {
  const nodePort = await listen(nodeServer);
  const publicPort = await listen(publicServer);

  const probeServer = http.createServer();
  const compositionPort = await listen(probeServer);
  await new Promise((resolve) => probeServer.close(resolve));

  child = spawn(process.execPath, [gatewayPath], {
    cwd: repo,
    env: {
      ...process.env,
      VOID_COMPOSITION_HOST: "127.0.0.1",
      VOID_COMPOSITION_PORT: String(compositionPort),
      VOID_PUBLIC_GATEWAY_UPSTREAM: `http://127.0.0.1:${publicPort}`,
      VOID_NODE_UPSTREAM: `http://127.0.0.1:${nodePort}`,
      VOID_PUBLIC_EXPECTED_PEERS: "2",
      VOID_PUBLIC_NODE_LABEL: "Alienware public seed",
      VOID_TXROOT_QUARANTINED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let lastStartupError = "";
  child.stdout.on("data", (chunk) => (stdout += chunk));
  child.stderr.on("data", (chunk) => (stderr += chunk));

  const base = `http://127.0.0.1:${compositionPort}`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${base}/__void/public-app/status.json`);
      if (response.status === 200) break;
    } catch (error) {
      lastStartupError = String(error?.message || error);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (attempt === 99) {
      throw new Error(
        `composition gateway did not start\nlast_startup_error=${lastStartupError}\nstdout=${stdout}\nstderr=${stderr}`,
      );
    }
  }

  const get = async (pathname, options = {}) => {
    const response = await fetch(`${base}${pathname}`, options);
    const text = await response.text();
    return { response, text };
  };

  {
    const { response, text } = await get("/__void/public-app/status.json");
    assert.equal(response.status, 200);
    const body = JSON.parse(text);
    assert.equal(body.marker, MARKER);
    assert.equal(body.account_views_public, false);
    assert.equal(body.mutation, false);
  }

  {
    const { response, text } = await get("/__void/public-app/network.json");
    assert.equal(response.status, 200);
    const body = JSON.parse(text);
    assert.equal(body.marker, MARKER);
    assert.equal(body.chain_head, 1856587);
    assert.equal(body.peer_count, 2);
    assert.equal(body.reported_ready, true);
    assert.equal(body.ready, false);
    assert.equal(body.txroot_quarantined, true);
    assert.equal(body.boundaries.account_enumeration, false);
    assert.equal(body.boundaries.peer_ids, false);
    assert.equal(text.includes(secretPeerId), false);
    assert.equal(text.includes(secretPeerAddr), false);
    assert.equal(text.includes(secretWallet), false);
  }

  {
    const { response, text } = await get("/__void/ui/wave2/home.json");
    assert.equal(response.status, 200);
    const body = JSON.parse(text);
    assert.equal(body.marker, "VOID_UI_WAVE2_HOME_READONLY_V1");
    assert.equal(body.account.selected, false);
    assert.equal(body.balances.available, false);
    assert.equal(body.network.chain_head, 1856587);
    assert.equal(body.network.peer_count, 2);
    assert.equal(text.includes(secretWallet), false);
  }

  {
    const { response, text } = await get("/version");
    assert.equal(response.status, 200);
    const body = JSON.parse(text);
    assert.equal(body.version, "0.1.0");
    assert.equal(body.git_commit, "abcdef123456");
    assert.equal("manifest_path" in body, false);
    assert.equal("package_json_sha256" in body, false);
  }

  {
    const { response, text } = await get("/blocks/latest/number2.json");
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(text), { number: 1856587 });
  }

  {
    const { response, text } = await get("/p2p/peers");
    assert.equal(response.status, 200);
    const body = JSON.parse(text);
    assert.equal(body.connected.length, 2);
    assert.equal(body.knownAddrs.length, 0);
    assert.equal(body.peer_ids, false);
    assert.equal(body.peer_addresses, false);
    assert.equal(text.includes(secretPeerId), false);
    assert.equal(text.includes(secretPeerAddr), false);
  }

  {
    const { response, text } = await get("/app/");
    assert.equal(response.status, 200);
    assert.equal(text.includes("window.__VOID_PUBLIC_APP_MODE__=true"), true);
    assert.equal(text.includes("/__void/public-app/public-mode.js"), true);
  }

  {
    const { response, text } = await get("/app/assets/js/app.js");
    assert.equal(response.status, 200);
    assert.equal(text.includes("mock app"), true);
  }

  {
    const { response, text } = await get("/__void/public-app/public-mode.js");
    assert.equal(response.status, 200);
    assert.equal(text.includes("Local session required"), true);
    assert.equal(text.includes("/__void/ui/wave3/wallet.json"), false);
    assert.equal(text.includes("/__void/ui/wave4/earn.json"), false);
    const stability = provePublicModeMutationStability(text);
    assert.equal(stability.walletStable, true);
    assert.equal(stability.earnStable, true);
  }

  {
    const { response, text } = await get("/public-node/");
    assert.equal(response.status, 200);
    assert.equal(text.includes("/__void/public-app/public-node-compat.js"), true);
  }

  {
    const { response, text } = await get("/participant");
    assert.equal(response.status, 200);
    assert.equal(
      text.includes("VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_V1"),
      true,
    );
    assert.equal(
      text.includes("Earn Work Credits without running a VOID node"),
      true,
    );
    assert.equal(text.includes("participant public gateway"), false);
    assert.equal(text.includes(">zoso<"), false);
    assert.equal(text.includes("/__void/admin/"), false);
    assert.equal(
      text.includes("validator-registration/submit-live"),
      false,
    );
  }

  {
    const { response, text } = await get("/__void/public-earn/status.json");
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(text).public_earn_gateway, true);
  }

  for (const pathname of [
    "/public-node/local-multibox-status-v1.json",
    "/__void/diag/local-multibox-runtime-route-v1.json",
    "/public-node/smoke-pack-v1.json",
  ]) {
    const { response, text } = await get(pathname);
    assert.equal(response.status, 200, pathname);
    assert.equal(JSON.parse(text).marker, MARKER, pathname);
  }

  for (const pathname of [
    "/__void/ui/wave3/wallet.json?account=zoso",
    "/__void/ui/wave4/earn.json?account=zoso",
    "/wc/balance?account=zoso",
    "/jobs",
    "/receipts",
    "/rpc",
    "/admin",
    "/upgrade/apply",
  ]) {
    const { response, text } = await get(pathname);
    assert.equal(response.status, 404, pathname);
    assert.equal(text.trim(), "not_public", pathname);
    assert.equal(text.includes(secretWallet), false, pathname);
  }

  {
    const { response } = await get("/participant", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    });
    assert.equal(response.status, 405);
  }

  {
    const response = await fetch(`${base}/__void/public-app/network.json`, {
      method: "HEAD",
    });
    assert.equal(response.status, 200);
    assert.equal((await response.text()).length, 0);
  }

  console.log("VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1_STATIC_GREEN");
  console.log("public_app_assets=green");
  console.log("public_mode_wallet_earn_mutation_stability=green");
  console.log("sanitized_network_snapshot=green");
  console.log("public_node_compatibility=green");
  console.log("public_earn_fallback=preserved");
  console.log("account_enumeration=refused");
  console.log("private_mutation_routes=refused");
  console.log("peer_ids_addresses=redacted");
  console.log("VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1_FULL_GREEN");
} finally {
  if (child && child.exitCode === null) child.kill("SIGTERM");
  await Promise.all([
    new Promise((resolve) => nodeServer.close(resolve)),
    new Promise((resolve) => publicServer.close(resolve)),
  ]);
}

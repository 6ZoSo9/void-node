#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import vm from "node:vm";

const repo = process.cwd();
const adapterPath = path.join(repo, "ops/public/public-seed-adapter-v1.mjs");
const compositionPath = path.join(
  repo,
  "ops/public/void-public-app-composition-gateway-v1.mjs",
);
const clientPath = path.join(
  repo,
  "tools/void_public_earn_no_node_client_v1.mjs",
);

function sendJson(res, status, body) {
  const value = JSON.stringify(body) + "\n";
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(value),
  });
  res.end(value);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

async function freePort() {
  const probe = http.createServer();
  const port = await listen(probe);
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function waitFor(url) {
  let lastError = "";
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status > 0) return;
    } catch (error) {
      lastError = String(error?.message || error);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`server did not start: ${url}: ${lastError}`);
}

function spawnNode(file, env) {
  const child = spawn(process.execPath, [file], {
    cwd: repo,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  return { child, output: () => ({ stdout, stderr }) };
}

function closeChild(entry) {
  if (entry?.child && entry.child.exitCode === null) {
    entry.child.kill("SIGTERM");
  }
}

const sourceClient = fs.readFileSync(clientPath, "utf8");
const sourceAdapter = fs.readFileSync(adapterPath, "utf8");
const sourceComposition = fs.readFileSync(compositionPath, "utf8");

assert.equal(sourceClient.includes("/wc/redeemable"), false);
assert.equal(sourceClient.includes("context.balance"), false);
assert.equal(
  sourceClient.includes("capability_bound_submission_response_v1"),
  true,
);
assert.equal(
  sourceAdapter.includes("/download/void-public-earn-no-node-client-v1.mjs"),
  true,
);
assert.equal(
  sourceComposition.includes("VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_V1"),
  true,
);
assert.equal(
  sourceComposition.includes("VOID_PUBLIC_PARTICIPANT_HANDOFF_HELPER_V1"),
  true,
);
assert.equal(sourceComposition.includes("PUBLIC_HTTPS_BASE"), false);
assert.equal(sourceComposition.includes("COORDINATOR_NODE_ID"), false);

const coordinatorNodeId = "c".repeat(32);
const dataset = Buffer.from(
  "VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_WALL_V1_DATASET\n",
  "utf8",
);
const datasetHash = crypto.createHash("sha256").update(dataset).digest("hex");
const ticketId = "a".repeat(32);
const capability = `wcep1.${ticketId}.${"B".repeat(43)}`;

let claimPosts = 0;
let submitPosts = 0;
let balanceRequests = 0;
let statusAccountQueries = 0;

const coordinator = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://coordinator.local");

  // VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_DATANET_COORDINATOR_FIXTURE_V1
  if (url.pathname === "/datanet/v1/fetch/ds_no_node_public_v1") {
      res.writeHead(200, {
        "content-type": "application/octet-stream",
        "content-length": dataset.length,
      });
      return res.end(dataset);
    }


  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, {
      ok: true,
      nodeId: coordinatorNodeId,
      head: 1856587,
    });
  }

  if (
    req.method === "GET" &&
    url.pathname === "/wc/public-earning-pilot-v1/status"
  ) {
    if (url.searchParams.has("account")) statusAccountQueries += 1;
    return sendJson(res, 200, {
      ok: true,
      marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
      coordinator_enabled: true,
      executor_enabled: false,
      task_class: "datanet_fetch_verify",
      fixed_award_wc: 3,
      public_claim: {
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        enabled: true,
        available: true,
        server_selected_work: true,
        proof_of_executor_key_possession_required: true,
        transport_mode: "outbound_bundle",
        fixed_award_wc: 3,
        participant_selected_dataset: false,
        participant_selected_input_hash: false,
        participant_selected_award: false,
        money_movement: false,
        work_available: true,
      },
    });
  }

  if (req.method === "GET" && url.pathname === "/wc/redeemable") {
    balanceRequests += 1;
    return sendJson(res, 500, {
      ok: false,
      error: "balance_route_must_not_be_used",
    });
  }

  if (
    req.method === "POST" &&
    url.pathname === "/wc/public-earning-pilot-v1/claim-ticket"
  ) {
    claimPosts += 1;
    const payload = JSON.parse(await readBody(req));
    const account = String(payload?.claim?.account || "");
    const executorNodeId = String(payload?.claim?.executor_node_id || "");
    return sendJson(res, 201, {
      ok: true,
      marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
      claim_request_verified: true,
      executor_key_possession_verified: true,
      server_selected_work: true,
      capability_token_returned_once: true,
      capability_token: capability,
      ticket: {
        marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
        version: 1,
        ticket_id: ticketId,
        account,
        task_class: "datanet_fetch_verify",
        executor_node_id: executorNodeId,
        executor_http_base: "",
        transport_mode: "outbound_bundle",
        dataset_id: "ds_no_node_public_v1",
        expected_input_hash: datasetHash,
        token_sha256: crypto
          .createHash("sha256")
          .update(capability)
          .digest("hex"),
        nonce: "b".repeat(32),
        issued_at_ms: Date.now(),
        expires_at_ms: Date.now() + 300_000,
        max_uses: 1,
        status: "issued",
        fixed_award_wc: 3,
      },
      fixed_award_wc: 3,
      participant_selected_dataset: false,
      participant_selected_input_hash: false,
      participant_selected_award: false,
      money_movement: false,
    });
  }

  if (
    req.method === "POST" &&
    url.pathname === "/wc/public-earning-pilot-v1/submit-result"
  ) {
    submitPosts += 1;
    assert.equal(req.headers.authorization, `Bearer ${capability}`);
    const payload = JSON.parse(await readBody(req));
    const envelope = payload.envelope;
    return sendJson(res, 200, {
      ok: true,
      marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
      remote_executor: true,
      executor_node_id: envelope.executor_node_id,
      transport_mode: "outbound_bundle",
      coordinator_inbound_fetch: false,
      participant_outbound_bundle: true,
      signature_verified: true,
      remote_health_verified: true,
      remote_job_verified: true,
      remote_receipt_verified: true,
      capability_consumed: true,
      ticket_id: envelope.ticket_id,
      account: envelope.account,
      dataset_id: envelope.dataset_id,
      wc: {
        before: 0,
        after: 3,
        delta: 3,
        fixed_award_wc: 3,
        canonical_redeemable: true,
      },
      acceptance: {
        credited: true,
        duplicate: false,
      },
      participant_selected_award: false,
      money_movement: false,
    });
  }

  return sendJson(res, 404, { ok: false, error: "not_found" });
});

const nodeServer = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://node.local");

  if (url.pathname === "/participant") {
    const body =
      '<html><body><div id="heroAccount">zoso</div>' +
      '<button id="participantCreateAccountBtn">New</button>' +
      '<a href="/__void/admin/datanet-summary">Admin</a>' +
      '<script>fetch("/__void/participant/validator-registration/submit-live")</script>' +
      "</body></html>";
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(body);
  }

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
      connected: [{ id: "secret-1" }, { id: "secret-2" }],
    });
  }

  if (url.pathname === "/version") {
    return sendJson(res, 200, {
      version: "0.1.0",
      protocol_version: 1,
      channel: "stable",
      git_commit: "proof",
    });
  }

    return sendJson(res, 404, { ok: false, error: "not_found" });
});

let adapter;
let composition;
try {
  const coordinatorPort = await listen(coordinator);
  const nodePort = await listen(nodeServer);
  const adapterPort = await freePort();
  const compositionPort = await freePort();

  adapter = spawnNode(adapterPath, {
    VOID_ADAPTER_HOST: "127.0.0.1",
    VOID_ADAPTER_PORT: String(adapterPort),
    VOID_SEED_UPSTREAM: `http://127.0.0.1:${nodePort}`,
    VOID_EARN_COORDINATOR_UPSTREAM: `http://127.0.0.1:${coordinatorPort}`,
    VOID_EARN_NO_NODE_CLIENT_FILE: clientPath,
  });
  const adapterBase = `http://127.0.0.1:${adapterPort}`;
  await waitFor(`${adapterBase}/health`);

  const adapterStatus = await fetch(
    `${adapterBase}/wc/public-earning-pilot-v1/status`,
  );
  assert.equal(adapterStatus.status, 200);
  const adapterStatusBody = await adapterStatus.json();
  assert.equal(
    adapterStatusBody.public_claim.dataset_url_template,
    "/datanet/v1/fetch/{dataset_id}",
  );

  assert.equal(
    (
      await fetch(
        `${adapterBase}/wc/public-earning-pilot-v1/status?account=someone`,
      )
    ).status,
    400,
  );
  assert.equal(
    (await fetch(`${adapterBase}/wc/redeemable?account=someone`)).status,
    404,
  );

  const adapterClient = await fetch(
    `${adapterBase}/download/void-public-earn-no-node-client-v1.mjs`,
  );
  assert.equal(adapterClient.status, 200);
  assert.equal(await adapterClient.text(), sourceClient);

  composition = spawnNode(compositionPath, {
    VOID_COMPOSITION_HOST: "127.0.0.1",
    VOID_COMPOSITION_PORT: String(compositionPort),
    VOID_PUBLIC_GATEWAY_UPSTREAM: adapterBase,
    VOID_NODE_UPSTREAM: `http://127.0.0.1:${nodePort}`,
    VOID_PUBLIC_EXPECTED_PEERS: "2",
    VOID_TXROOT_QUARANTINED: "1",
  });
  const base = `http://127.0.0.1:${compositionPort}`;
  await waitFor(`${base}/__void/public-app/status.json`);

  const participantResponse = await fetch(`${base}/participant`);
  assert.equal(participantResponse.status, 200);
  const participantCsp = participantResponse.headers.get("content-security-policy") || "";
  assert.match(participantCsp, /script-src 'self'/);
  assert.match(participantCsp, /connect-src 'self'/);
  const participant = await participantResponse.text();
  for (const forbidden of [
    ">zoso<",
    "participantCreateAccountBtn",
    "/__void/admin/",
    "validator-registration/submit-live",
    "wcRunnerToggleInput",
    'action="/wc-proof-demo/generate"',
    "localStorage.setItem",
    "PUBLIC_HTTPS_BASE",
    "COORDINATOR_NODE_ID",
  ]) {
    assert.equal(participant.includes(forbidden), false, forbidden);
  }
  for (const required of [
    "VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_V1",
    "Earn Work Credits without running a VOID node",
    "/download/void-public-earn-no-node-client-v1.mjs",
    "/__void/public-participant/status.json",
    "/__void/public-participant/handoff-v1.js",
    "YOUR_ACCOUNT",
    "No participant account directory or arbitrary balance lookup",
  ]) {
    assert.equal(participant.includes(required), true, required);
  }

  const handoffScriptResponse = await fetch(
    `${base}/__void/public-participant/handoff-v1.js`,
  );
  assert.equal(handoffScriptResponse.status, 200);
  assert.equal(
    handoffScriptResponse.headers.get("x-void-marker"),
    "VOID_PUBLIC_PARTICIPANT_HANDOFF_HELPER_V1",
  );
  const handoffScript = await handoffScriptResponse.text();
  for (const required of [
    "VOID_PUBLIC_PARTICIPANT_HANDOFF_HELPER_V1",
    "window.location.origin",
    "/__void/public-participant/status.json",
    "getReader",
    "MAX_STATUS_BYTES",
    "credentials: 'omit'",
    "redirect: 'error'",
    "referrerPolicy: 'no-referrer'",
    "coordinator_node_id",
    "--coordinator-base",
    "--coordinator-node-id",
    "YOUR_ACCOUNT",
    "textContent",
    "isPrivateHttpHost",
  ]) {
    assert.equal(handoffScript.includes(required), true, required);
  }
  for (const forbidden of [
    "PUBLIC_HTTPS_BASE",
    "COORDINATOR_NODE_ID",
    "innerHTML",
    "localStorage",
    "sessionStorage",
  ]) {
    assert.equal(handoffScript.includes(forbidden), false, forbidden);
  }
  assert.equal(
    (
      await fetch(
        `${base}/__void/public-participant/handoff-v1.js?unexpected=1`,
      )
    ).status,
    400,
  );

  const publicStatusResponse = await fetch(
    `${base}/__void/public-participant/status.json`,
  );
  assert.equal(publicStatusResponse.status, 200);
  const publicStatus = await publicStatusResponse.json();
  assert.equal(
    publicStatus.marker,
    "VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_V1",
  );
  assert.equal(publicStatus.available, true);
  assert.equal(publicStatus.coordinator_node_id, coordinatorNodeId);
  assert.equal(
    publicStatus.accounting_proof,
    "capability_bound_submission_response_v1",
  );
  assert.equal(publicStatus.boundaries.account_directory, false);
  assert.equal(publicStatus.boundaries.arbitrary_balance_lookup, false);

  async function executeHandoffOrigin(origin, snapshot = publicStatus) {
    const nodes = new Map([
      ["participantHandoffStatus", { textContent: "" }],
      ["participantStatusCommand", { textContent: "" }],
      ["participantRunCommand", { textContent: "" }],
    ]);
    const datasetState = {};
    let fetchCount = 0;
    let lastFetch = null;
    const context = {
      window: { location: { origin } },
      document: {
        getElementById: (id) => nodes.get(id) || null,
        documentElement: { dataset: datasetState },
      },
      URL,
      TextDecoder,
      AbortController,
      setTimeout,
      clearTimeout,
      fetch: async (resource, options) => {
        fetchCount += 1;
        lastFetch = { resource: String(resource), options };
        return new Response(JSON.stringify(snapshot), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      },
    };

    vm.runInNewContext(handoffScript, context, { timeout: 1000 });
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (datasetState.voidParticipantHandoff) break;
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    assert.ok(
      datasetState.voidParticipantHandoff,
      `handoff did not reach terminal state for ${origin}`,
    );
    return {
      fetchCount,
      lastFetch,
      state: datasetState.voidParticipantHandoff,
      statusText: nodes.get("participantHandoffStatus").textContent,
      statusCommand: nodes.get("participantStatusCommand").textContent,
      runCommand: nodes.get("participantRunCommand").textContent,
    };
  }

  const acceptedOrigins = [
    "https://public.example",
    "https://public.example:8443",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
    "http://127.0.0.2:8082",
    "http://[::1]:8082",
    "http://10.2.3.4:8082",
    "http://172.16.0.1:8082",
    "http://172.31.255.254:8082",
    "http://192.168.1.2:8082",
    "http://100.64.0.1:8082",
    "http://100.127.255.254:8082",
    "http://worker.ts.net:8082",
  ];
  for (const origin of acceptedOrigins) {
    const result = await executeHandoffOrigin(origin);
    assert.equal(result.fetchCount, 1, origin);
    assert.equal(result.lastFetch.resource, "/__void/public-participant/status.json");
    assert.equal(result.lastFetch.options.method, "GET");
    assert.equal(result.lastFetch.options.credentials, "omit");
    assert.equal(result.lastFetch.options.redirect, "error");
    assert.equal(result.lastFetch.options.referrerPolicy, "no-referrer");
    assert.equal(result.state, "available", origin);
    assert.match(result.statusCommand, new RegExp(`--coordinator-base '${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`));
    assert.match(result.runCommand, new RegExp(`--coordinator-base '${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`));
    assert.match(result.statusCommand, new RegExp(`--coordinator-node-id ${coordinatorNodeId}`));
    assert.match(result.runCommand, new RegExp(`--coordinator-node-id ${coordinatorNodeId}`));
  }

  const rejectedOrigins = [
    "http://public.example",
    "http://8.8.8.8:8082",
    "http://172.32.0.1:8082",
    "http://100.63.255.255:8082",
    "http://100.128.0.1:8082",
    "ftp://public.example",
    "not-an-origin",
    "http://user:pass@localhost:8082",
  ];
  for (const origin of rejectedOrigins) {
    const result = await executeHandoffOrigin(origin);
    assert.equal(result.fetchCount, 0, origin);
    assert.equal(result.state, "hold", origin);
    assert.match(result.statusText, /^HOLD — /);
    assert.equal(result.statusCommand, "HOLD: coordinator identity not verified.");
    assert.equal(result.runCommand, "HOLD: coordinator identity not verified.");
  }

  assert.equal(
    (await fetch(`${base}/wc/public-earning-pilot-v1/status`)).status,
    200,
  );
  assert.equal(
    (
      await fetch(
        `${base}/wc/public-earning-pilot-v1/status?account=someone`,
      )
    ).status,
    404,
  );
  assert.equal(
    (await fetch(`${base}/wc/redeemable?account=someone`)).status,
    404,
  );
  assert.equal(
    (
      await fetch(
        `${base}/download/void-public-earn-no-node-client-v1.mjs`,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await fetch(`${base}/datanet/v1/fetch/ds_no_node_public_v1`)
    ).status,
    200,
  );

  const keyPair = crypto.generateKeyPairSync("ed25519");
  const publicPEM = keyPair.publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const executorNodeId = crypto
    .createHash("sha256")
    .update(publicPEM)
    .digest("hex")
    .slice(0, 32);
  const claim = {
    domain: "void:mainnet-0:wc-public-ticket-claim-v1",
    marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
    version: 1,
    account: "proof-user",
    executor_node_id: executorNodeId,
    executor_pubkey: publicPEM,
    claim_nonce: "d".repeat(32),
    claim_ts_ms: Date.now(),
  };
  const claimPayload = {
    claim,
    signature: {
      alg: "ed25519",
      key_id: executorNodeId,
      sig: "e".repeat(128),
    },
  };

  const claimResponse = await fetch(
    `${base}/wc/public-earning-pilot-v1/claim-ticket`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(claimPayload),
    },
  );
  assert.equal(claimResponse.status, 201);

  const submitResponse = await fetch(
    `${base}/wc/public-earning-pilot-v1/submit-result`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${capability}`,
      },
      body: JSON.stringify({
        envelope: { ticket_id: ticketId },
        signature: {},
        proof_bundle: {},
      }),
    },
  );
  assert.equal(submitResponse.status, 200);

  assert.equal(
    (
      await fetch(`${base}/participant`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    ).status,
    405,
  );

  const stateDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-no-node-public-handoff-proof-"),
  );
  try {
    const client = spawn(
      process.execPath,
      [
        clientPath,
        "run",
        "--account",
        "outside-user-no-node-public-v1",
        "--coordinator-base",
        base,
        "--coordinator-node-id",
        coordinatorNodeId,
        "--state-dir",
        stateDir,
      ],
      {
        cwd: repo,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    client.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    client.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const [code] = await once(client, "exit");
    assert.equal(code, 0, stderr);
    assert.match(
      stdout,
      /VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_EARNED_3_WC_EXACT_GREEN/,
    );
    assert.match(stdout, /wc_before=0/);
    assert.match(stdout, /wc_after=3/);
    assert.match(stdout, /wc_delta=3/);
    assert.match(
      stdout,
      /accounting_proof=capability_bound_submission_response_v1/,
    );
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }

  assert.equal(balanceRequests, 0);
  assert.equal(statusAccountQueries, 0);
  assert.equal(claimPosts >= 2, true);
  assert.equal(submitPosts >= 2, true);

  console.log("public_participant_local_dashboard_exposed=false");
  console.log("public_participant_embedded_account_names=0");
  console.log("public_participant_admin_controls=0");
  console.log("public_participant_validator_submit_controls=0");
  console.log("public_balance_lookup_exposed=false");
  console.log("client_balance_requests=0");
  console.log("client_status_account_queries=0");
  console.log("participant_unresolved_origin_placeholders=0");
  console.log("participant_handoff_helper=same_origin_bounded_status");
  console.log("participant_origin_policy_matrix=green");
  console.log("participant_public_http_status_fetches=0");
  console.log("participant_copy_ready_handoff=green");
  console.log("claim_route=bounded_post");
  console.log("submit_route=capability_bound_post");
  console.log("canonical_accounting=submit_response");
  console.log("no_node_earned_3_wc=green");
  console.log(
    "VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_WALL_V1_PROOF_GREEN",
  );
} finally {
  closeChild(composition);
  closeChild(adapter);
  await Promise.all([
    new Promise((resolve) => coordinator.close(resolve)),
    new Promise((resolve) => nodeServer.close(resolve)),
  ]);
}

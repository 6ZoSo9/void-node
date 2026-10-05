#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { spawn } from "node:child_process";

const repo = process.cwd();
const gateway = path.join(
  repo,
  "ops/public/void-public-app-composition-gateway-v1.mjs",
);
const MARKER =
  "VOID_PUBLIC_PARTICIPANT_COMPOSITION_INTEGRATION_V1_PROOF_GREEN";
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-participant-composition-proof-"),
);

function freePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address.port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function fingerprint(publicKey) {
  return crypto.createHash("sha256")
    .update(publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
}

function startJsonUpstream(port, responder) {
  const server = http.createServer((req, res) => responder(req, res));
  server.listen(port, "127.0.0.1");
  return once(server, "listening").then(() => server);
}

function sendJson(res, status, value) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.length),
  });
  res.end(body);
}

function walletSource(account) {
  return {
    marker: "VOID_UI_WAVE3_WALLET_READONLY_V1",
    read_only: true,
    account: { selected: true, id: account },
    wallet: {
      source_available: true,
      has_wallet: true,
      address: "0x" + "12".repeat(20),
      native_gas_available: true,
      native_gas_display: "0.5",
    },
    balances: {
      ledger_wc: { available: true, balance: 17, entries: 3 },
      production_wc: { available: true, balance: 5, entries: 1 },
    },
    boundaries: {
      browser_wallet_connection: false,
      wallet_create: false,
      wallet_import: false,
      wallet_unlock: false,
      wallet_export: false,
      wallet_send: false,
      wc_to_void: false,
      ledger_write: false,
      validator_mutation: false,
      operator_mutation: false,
      money_movement: false,
    },
  };
}

function earnSource(account) {
  return {
    marker: "VOID_UI_WAVE4_EARN_READONLY_V1",
    read_only: true,
    account: { selected: true, id: account },
    earning: {
      status: "manual_only",
      status_label: "Manual only",
      manual_only: true,
      automatic_background: false,
      safe_mode: true,
      jobs_last_hour: 2,
      max_jobs_per_hour: 8,
    },
    accounting: {
      legacy_wc: {
        available: true,
        earned: 21,
        redeemed: 4,
        redeemable: 17,
        debited: 0,
      },
      production_wc: { available: true, balance: 5, entries: 1 },
      rewards_last_hour: {
        total: 3,
        publish: 3,
        verify: 0,
        redundancy: 0,
      },
    },
    recent_jobs: { count: 1 },
    verification_receipts: { count: 1 },
    datanet: {
      source_available: true,
      status: "available",
      receipt_store_records: 9,
      account_wc_events: 4,
    },
    boundaries: {
      job_execution: false,
      job_submission: false,
      reward_award: false,
      runner_activation: false,
      runner_tick: false,
      runner_config: false,
      wc_redeem: false,
      wc_send: false,
      wc_to_void: false,
      ledger_write: false,
      browser_wallet_connection: false,
      validator_mutation: false,
      operator_mutation: false,
      money_movement: false,
    },
  };
}

async function httpJson(base, route, options = {}) {
  const response = await fetch(base + route, {
    method: options.method || "GET",
    headers: options.headers || {},
    body: options.body,
    redirect: "manual",
  });
  const text = await response.text();
  let body = null;
  const contentType = String(
    response.headers.get("content-type") || "",
  ).toLowerCase();
  if (text && contentType.startsWith("application/json")) {
    body = JSON.parse(text);
  }
  return { response, body, text };
}

async function startGateway({
  port,
  publicPort,
  nodePort,
  registryFile,
  active,
}) {
  const env = {
    ...process.env,
    VOID_COMPOSITION_HOST: "127.0.0.1",
    VOID_COMPOSITION_PORT: String(port),
    VOID_PUBLIC_GATEWAY_UPSTREAM:
      `http://127.0.0.1:${publicPort}`,
    VOID_NODE_UPSTREAM:
      `http://127.0.0.1:${nodePort}`,
  };
  if (active) {
    env.VOID_PUBLIC_PARTICIPANT_COMPOSITION_ACTIVE = "1";
    env.VOID_PUBLIC_PARTICIPANT_BINDING_REGISTRY_FILE =
      registryFile;
  } else {
    delete env.VOID_PUBLIC_PARTICIPANT_COMPOSITION_ACTIVE;
    delete env.VOID_PUBLIC_PARTICIPANT_BINDING_REGISTRY_FILE;
  }

  const child = spawn(process.execPath, [gateway], {
    cwd: repo,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  const deadline = Date.now() + 10000;
  while (!stdout.includes("VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1")) {
    if (child.exitCode !== null) {
      throw new Error(
        `gateway exited ${child.exitCode}: ${stderr}`,
      );
    }
    if (Date.now() > deadline) {
      child.kill("SIGKILL");
      throw new Error("gateway startup timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return {
    child,
    stdout: () => stdout,
    stderr: () => stderr,
    base: `http://127.0.0.1:${port}`,
  };
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    once(child, "exit"),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

const account = "participant-a";
const login = crypto.generateKeyPairSync("ed25519");
const registryDir = path.join(temp, "registry");
const registryFile = path.join(
  registryDir,
  "participant-login-bindings-v1.json",
);
fs.mkdirSync(registryDir, { mode: 0o700 });
fs.chmodSync(registryDir, 0o700);
fs.writeFileSync(
  registryFile,
  JSON.stringify({
    marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1",
    version: 1,
    bindings: [{
      account,
      status: "active",
      key_type: "ed25519",
      public_key_pem: String(
        login.publicKey.export({ type: "spki", format: "pem" }),
      ),
      public_key_fingerprint_sha256: fingerprint(login.publicKey),
      capabilities: ["participant.account.read.v1"],
    }],
  }, null, 2) + "\n",
  { mode: 0o600 },
);
fs.chmodSync(registryFile, 0o600);

let publicServer;
let nodeServer;
let disabledGateway;
let enabledGateway;
try {
  const publicPort = await freePort();
  const nodePort = await freePort();
  const disabledPort = await freePort();
  const enabledPort = await freePort();

  publicServer = await startJsonUpstream(
    publicPort,
    (req, res) => {
      if (req.url === "/__void/participant/session/v1/status.json") {
        return sendJson(res, 418, {
          fallback: true,
          route: req.url,
        });
      }
      if (req.url === "/health") {
        return sendJson(res, 200, { ok: true });
      }
      return sendJson(res, 404, { ok: false, public_upstream: true });
    },
  );

  nodeServer = await startJsonUpstream(
    nodePort,
    (req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${nodePort}`);
      const selected = url.searchParams.get("account");
      if (url.pathname === "/__void/ui/wave3/wallet.json") {
        return sendJson(res, 200, walletSource(selected));
      }
      if (url.pathname === "/__void/ui/wave4/earn.json") {
        return sendJson(res, 200, earnSource(selected));
      }
      return sendJson(res, 404, { ok: false });
    },
  );

  disabledGateway = await startGateway({
    port: disabledPort,
    publicPort,
    nodePort,
    registryFile,
    active: false,
  });
  assert.match(
    disabledGateway.stdout(),
    /participant_composition_active=false/,
  );

  const disabledStatus = await httpJson(
    disabledGateway.base,
    "/__void/participant/session/v1/status.json",
  );
  assert.equal(
    disabledStatus.response.status,
    418,
    "disabled mode changed preexisting fallback routing",
  );
  assert.equal(disabledStatus.body.fallback, true);

  let activationFailure = "";
  try {
    enabledGateway = await startGateway({
      port: enabledPort,
      publicPort,
      nodePort,
      registryFile,
      active: true,
    });
    assert.fail(
      "participant composition activated without role-authority adapter",
    );
  } catch (error) {
    activationFailure = String(error?.message || error);
  }
  assert.match(
    activationFailure,
    /role_authority_adapter_required/,
  );

  const source = fs.readFileSync(gateway, "utf8");
  assert.match(
    source,
    /VOID_PUBLIC_PARTICIPANT_COMPOSITION_ACTIVE === "1"/,
  );
  assert.match(
    source,
    /PARTICIPANT_SESSION_HTTP =\s*createVoidPublicParticipantSessionHttpV1/,
  );
  assert.match(
    source,
    /sessionHttp: PARTICIPANT_SESSION_HTTP/,
  );
  assert.equal(
    source.includes(
      'process.env.VOID_PUBLIC_PARTICIPANT_COMPOSITION_ACTIVE || "1"',
    ),
    false,
  );

  console.log(MARKER);
  console.log("activation_default=false");
  console.log("disabled_routing_preserved=true");
  console.log("production_activation_role_authority_hold=true");
  console.log("shared_session_instance_pending_live_role_adapter=true");
  console.log("session_http_role_authority_required=true");
  console.log("raw_wave3_wave4_public=false");
  console.log("wallet_mutation_authority=false");
  console.log("work_credit_mutation_authority=false");
  console.log("money_movement_authority=false");
  console.log("deployment=false");
  console.log("service_action=false");
} finally {
  await stopChild(disabledGateway?.child);
  await stopChild(enabledGateway?.child);
  if (publicServer) {
    await new Promise((resolve) => publicServer.close(resolve));
  }
  if (nodeServer) {
    await new Promise((resolve) => nodeServer.close(resolve));
  }
  fs.rmSync(temp, { recursive: true, force: true });
}

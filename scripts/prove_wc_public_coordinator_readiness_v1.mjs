#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const TOOL = resolve(ROOT, "tools/wc-public-coordinator-readiness-v1.mjs");

function run(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [TOOL, ...args], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "", stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (x) => { stdout += x; });
    child.stderr.on("data", (x) => { stderr += x; });
    child.on("error", rejectRun);
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

function gatewaySafety(mode) {
  const safety = {
    public_ticket_issue: true,
    public_signed_ticket_claim: true,
    public_operator_ticket_issue: false,
    claim_executor_key_possession_required: true,
    claim_server_selected_work: true,
    generic_job_submit: false,
    participant_selected_award: mode === "unsafe" ? true : false,
    wallet_send: false,
    wc_to_void_swap: false,
    buy_void_fulfillment: false,
    validator_mutation: false,
    operator_routes_exposed: false,
    arbitrary_balance_lookup: false,
    submission_response_canonical_accounting: true,
  };
  if (mode === "missing_boundary") {
    delete safety.submission_response_canonical_accounting;
  }
  return safety;
}

function gateway(mode) {
  return {
    marker: "VOID_PUBLIC_EARN_GATEWAY_V1",
    fixed_award_wc: mode === "wrong_types" ? "3" : 3,
    routes: {
      claim_ticket: "/wc/public-earning-pilot-v1/claim-ticket",
      submit_result: "/wc/public-earning-pilot-v1/submit-result",
    },
    methods: { claim_ticket: ["POST"], submit_result: ["POST"] },
    safety: gatewaySafety(mode),
    ...(mode === "missing_boundary"
      ? { metadata: { submission_response_canonical_accounting: true } }
      : {}),
  };
}

function pilot(mode) {
  const value = {
    marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
    coordinator_enabled: mode !== "disabled",
    executor_enabled: false,
    fixed_award_wc: 3,
    routes: { submit_result: "/wc/public-earning-pilot-v1/submit-result" },
    caps: {
      account_total: 0,
      account_limit: 1,
      global_limit: 10,
      global_active: 0,
      global_consumed: 2,
    },
    capability: {
      account_bound: true,
      executor_node_bound: true,
      outbound_only_supported: true,
      dataset_bound: true,
      input_hash_bound: true,
      expiring: true,
      single_use: true,
      token_stored_as_sha256_only: true,
      ed25519_executor_signature_required: true,
      public_claim_executor_key_possession_required: true,
      public_claim_replay_protected: true,
    },
    public_claim: {
      marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
      enabled: true,
      available: true,
      server_selected_work: true,
      proof_of_executor_key_possession_required: true,
      participant_selected_dataset: false,
      participant_selected_input_hash: false,
      participant_selected_award: false,
      money_movement: false,
      one_active_ticket_per_account: true,
      ticket_ttl_ms: 900_000,
      cooldown_ms: 900_000,
      max_claims_per_account_24h: 24,
      max_claims_per_executor_24h: 24,
      global_active_cap: 10,
      global_claims_per_24h: 500,
    },
  };

  if (mode === "wrong_types") {
    value.fixed_award_wc = "3";
    value.caps.account_limit = "1";
    value.caps.global_active = false;
    value.public_claim.ticket_ttl_ms = "900000";
    value.public_claim.cooldown_ms = true;
    value.public_claim.max_claims_per_executor_24h = null;
  }

  return value;
}

async function fixture(mode) {
  const requests = [];
  const routeCounts = new Map();
  let pilotStatusCompleted = false;
  let boundaryProbeBeforePilotStatus = false;

  const server = createServer((req, res) => {
    requests.push({ method: req.method, url: req.url });
    routeCounts.set(req.url, (routeCounts.get(req.url) ?? 0) + 1);
    const json = (code, body) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.method === "GET" && req.url === "/__void/public-earn-gateway-v1/status.json") {
      if (mode === "transient" && routeCounts.get(req.url) === 1) {
        return json(502, { error: "temporary_gateway_failure" });
      }
      return json(200, gateway(mode));
    }
    if (req.method === "GET" && req.url === "/wc/public-earning-pilot-v1/status") {
      if (mode === "transient" && routeCounts.get(req.url) === 1) {
        return json(502, { error: "temporary_pilot_failure" });
      }

      if (mode === "ordered") {
        setTimeout(() => {
          pilotStatusCompleted = true;
          json(200, pilot(mode));
        }, 100);
        return;
      }

      pilotStatusCompleted = true;
      return json(200, pilot(mode));
    }
    if (req.method === "GET" && [
      "/wc/public-earning-pilot-v1/claim-ticket",
      "/wc/public-earning-pilot-v1/submit-result",
    ].includes(req.url)) {
      if (mode === "ordered" && !pilotStatusCompleted) {
        boundaryProbeBeforePilotStatus = true;
      }
      return json(405, { error: "method_not_allowed" });
    }
    if (req.method === "GET" && [
      "/wc/public-earning-pilot-v1/operator/issue",
      "/wc/public-earning-pilot-v1/sign-claim",
    ].includes(req.url)) {
      if (mode === "ordered" && !pilotStatusCompleted) {
        boundaryProbeBeforePilotStatus = true;
      }
      return json(404, { error: "not_found" });
    }
    return json(404, { error: "not_found" });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return {
    base: `http://127.0.0.1:${address.port}`,
    requests,
    boundaryProbeBeforePilotStatus: () => boundaryProbeBeforePilotStatus,
    close: () => new Promise((r, j) => server.close((e) => e ? j(e) : r())),
  };
}

const readyFx = await fixture("ready");
try {
  const result = await run(["--base", readyFx.base, "--require-ready"]);
  assert.equal(result.code, 0, result.stderr || result.stdout);
  const body = JSON.parse(result.stdout);
  assert.equal(body.marker, "VOID_WC_PUBLIC_COORDINATOR_READINESS_V1");
  assert.equal(body.readiness_state, "ready");
  assert.equal(body.ready_for_bounded_enablement, true);
  assert.equal(body.summary.failed_checks, 0);
  assert.ok(body.summary.total_checks >= 20);
  assert.ok(body.checks.some((entry) => entry.id === "public_claim_route_no_direct_award" && entry.pass === true));
  assert.deepEqual(body.safety.http_methods_used, ["GET"]);
  assert.equal(body.safety.mutation_attempted, false);
  assert.equal(readyFx.requests.every((x) => x.method === "GET"), true);
} finally {
  await readyFx.close();
}

const transientFx = await fixture("transient");
try {
  const result = await run([
    "--base", transientFx.base,
    "--status-retries", "3",
    "--require-ready",
  ]);
  assert.equal(result.code, 0, result.stderr || result.stdout);
  const body = JSON.parse(result.stdout);
  assert.equal(body.readiness_state, "ready");
  assert.equal(body.ready_for_bounded_enablement, true);

  const gatewayAttempt = body.attempts.find(
    (entry) => entry.path === "/__void/public-earn-gateway-v1/status.json",
  );
  const pilotAttempt = body.attempts.find(
    (entry) => entry.path === "/wc/public-earning-pilot-v1/status",
  );

  assert.equal(gatewayAttempt.attempt_count, 2);
  assert.equal(pilotAttempt.attempt_count, 2);
  assert.equal(gatewayAttempt.retry_history[0].http_status, 502);
  assert.equal(gatewayAttempt.retry_history[1].http_status, 200);
  assert.equal(pilotAttempt.retry_history[0].http_status, 502);
  assert.equal(pilotAttempt.retry_history[1].http_status, 200);
  assert.equal(transientFx.requests.every((entry) => entry.method === "GET"), true);
} finally {
  await transientFx.close();
}

const orderedFx = await fixture("ordered");
try {
  const result = await run([
    "--base",
    orderedFx.base,
    "--status-retries",
    "1",
    "--require-ready",
  ]);

  assert.equal(result.code, 0, result.stderr || result.stdout);
  const body = JSON.parse(result.stdout);
  assert.equal(body.readiness_state, "ready");
  assert.equal(body.ready_for_bounded_enablement, true);
  assert.equal(orderedFx.boundaryProbeBeforePilotStatus(), false);

  const gatewayIndex = orderedFx.requests.findIndex(
    (entry) => entry.url === "/__void/public-earn-gateway-v1/status.json",
  );
  const pilotIndex = orderedFx.requests.findIndex(
    (entry) => entry.url === "/wc/public-earning-pilot-v1/status",
  );
  const firstBoundaryIndex = orderedFx.requests.findIndex(
    (entry) => [
      "/wc/public-earning-pilot-v1/claim-ticket",
      "/wc/public-earning-pilot-v1/submit-result",
      "/wc/public-earning-pilot-v1/operator/issue",
      "/wc/public-earning-pilot-v1/sign-claim",
    ].includes(entry.url),
  );

  assert.ok(gatewayIndex >= 0);
  assert.ok(pilotIndex > gatewayIndex);
  assert.ok(firstBoundaryIndex > pilotIndex);
  assert.equal(orderedFx.requests.every((entry) => entry.method === "GET"), true);
} finally {
  await orderedFx.close();
}

const wrongTypesFx = await fixture("wrong_types");
try {
  const result = await run([
    "--base", wrongTypesFx.base,
    "--status-retries", "1",
    "--require-ready",
  ]);
  assert.equal(result.code, 2, result.stderr || result.stdout);
  const body = JSON.parse(result.stdout);
  assert.equal(body.readiness_state, "hold");
  assert.equal(body.ready_for_bounded_enablement, false);
  assert.ok(body.summary.failed_check_ids.includes("fixed_award_policy"));
  assert.ok(body.summary.failed_check_ids.includes("ticket_caps_configured"));
  assert.ok(body.summary.failed_check_ids.includes("claim_rate_caps_configured"));
  assert.equal(wrongTypesFx.requests.every((entry) => entry.method === "GET"), true);
} finally {
  await wrongTypesFx.close();
}

const disabledFx = await fixture("disabled");
try {
  const normal = await run(["--base", disabledFx.base]);
  assert.equal(normal.code, 0);
  const body = JSON.parse(normal.stdout);
  assert.equal(body.readiness_state, "hold");
  assert.ok(body.summary.failed_check_ids.includes("coordinator_role_enabled"));
  const required = await run(["--base", disabledFx.base, "--require-ready"]);
  assert.equal(required.code, 2);
} finally {
  await disabledFx.close();
}

const unsafeFx = await fixture("unsafe");
try {
  const result = await run(["--base", unsafeFx.base]);
  assert.equal(result.code, 0);
  const body = JSON.parse(result.stdout);
  assert.equal(body.readiness_state, "hold");
  assert.ok(body.summary.failed_check_ids.includes("public_claim_route_no_direct_award"));
} finally {
  await unsafeFx.close();
}

const missingBoundaryFx = await fixture("missing_boundary");
try {
  const result = await run(["--base", missingBoundaryFx.base]);
  assert.equal(result.code, 0);
  const body = JSON.parse(result.stdout);
  assert.equal(body.readiness_state, "hold");
  assert.ok(body.summary.failed_check_ids.includes("public_claim_route_no_direct_award"));
  assert.equal(body.ready_for_bounded_enablement, false);
} finally {
  await missingBoundaryFx.close();
}

const invalid = await run(["--base", "ftp://invalid.example"]);
assert.equal(invalid.code, 2);
assert.equal(JSON.parse(invalid.stdout).safety.mutation_attempted, false);

console.log("VOID_WC_PUBLIC_COORDINATOR_READINESS_V1_PROOF_GREEN");

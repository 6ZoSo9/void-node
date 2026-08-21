#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const TOOL = resolve(ROOT, "tools/wc-public-coordinator-readiness-v1.mjs");
const MAX_RESPONSE_BYTES = 64 * 1024;

function run(base, timeoutMs = 500) {
  const startedAt = Date.now();
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      TOOL,
      "--base", base,
      "--timeout-ms", String(timeoutMs),
      "--status-retries", "1",
      "--require-ready",
    ], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", rejectRun);
    child.on("close", (code) => resolveRun({
      code,
      stdout,
      stderr,
      elapsed_ms: Date.now() - startedAt,
    }));
  });
}

function gateway() {
  return {
    marker: "VOID_PUBLIC_EARN_GATEWAY_V1",
    fixed_award_wc: 3,
    routes: {
      claim_ticket: "/wc/public-earning-pilot-v1/claim-ticket",
      submit_result: "/wc/public-earning-pilot-v1/submit-result",
    },
    methods: { claim_ticket: ["POST"], submit_result: ["POST"] },
    audit_assertions: { public_routes_award_wc: false },
  };
}

function pilot() {
  return {
    marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
    coordinator_enabled: true,
    executor_enabled: false,
    fixed_award_wc: 3,
    routes: { submit_result: "/wc/public-earning-pilot-v1/submit-result" },
    caps: { account_limit: 1, global_limit: 10, global_active: 0, global_consumed: 0 },
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
}

async function fixture(mode) {
  const server = createServer((req, res) => {
    const json = (code, body) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };

    if (req.method === "GET" && req.url === "/__void/public-earn-gateway-v1/status.json") {
      if (mode === "declared_oversize") {
        res.writeHead(200, {
          "content-type": "application/json",
          "content-length": String(MAX_RESPONSE_BYTES + 1),
        });
        res.end("{}");
        return;
      }
      if (mode === "streamed_oversize") {
        res.writeHead(200, {
          "content-type": "application/json",
          "transfer-encoding": "chunked",
        });
        res.write("x".repeat(MAX_RESPONSE_BYTES + 1));
        res.end();
        return;
      }
      if (mode === "stalled_body") {
        res.writeHead(200, {
          "content-type": "application/json",
          "transfer-encoding": "chunked",
        });
        res.write("{");
        return;
      }
      return json(200, gateway());
    }

    if (req.method === "GET" && req.url?.startsWith("/wc/public-earning-pilot-v1/status?")) {
      return json(200, pilot());
    }

    if (req.method === "GET" && [
      "/wc/public-earning-pilot-v1/claim-ticket",
      "/wc/public-earning-pilot-v1/submit-result",
    ].includes(req.url)) {
      return json(405, { error: "method_not_allowed" });
    }

    if (req.method === "GET" && [
      "/wc/public-earning-pilot-v1/operator/issue",
      "/wc/public-earning-pilot-v1/sign-claim",
    ].includes(req.url)) {
      return json(404, { error: "not_found" });
    }

    return json(404, { error: "not_found" });
  });

  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return {
    base: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.closeAllConnections?.();
      await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
    },
  };
}

async function exercise(mode, expectedError, timeoutMs = 500) {
  const fx = await fixture(mode);
  try {
    const result = await run(fx.base, timeoutMs);
    assert.equal(result.code, 2, result.stderr || result.stdout);
    const body = JSON.parse(result.stdout);
    assert.equal(body.marker, "VOID_WC_PUBLIC_COORDINATOR_READINESS_V1");
    assert.equal(body.ready_for_bounded_enablement, false);
    assert.deepEqual(body.safety.http_methods_used, ["GET"]);
    assert.equal(body.safety.mutation_attempted, false);
    const gatewayAttempt = body.attempts.find(
      (entry) => entry.path === "/__void/public-earn-gateway-v1/status.json",
    );
    assert.ok(gatewayAttempt);
    assert.equal(gatewayAttempt.attempt_count, 1);
    assert.equal(gatewayAttempt.http_status, 200);
    assert.equal(gatewayAttempt.json, false);
    if (expectedError) assert.equal(gatewayAttempt.error, expectedError);
    else assert.equal(typeof gatewayAttempt.error, "string");
    return result;
  } finally {
    await fx.close();
  }
}

await exercise("declared_oversize", "response_body_too_large");
await exercise("streamed_oversize", "response_body_too_large");
const stalled = await exercise("stalled_body", null, 250);
assert.ok(stalled.elapsed_ms < 2000, `stalled body exceeded total deadline bound: ${stalled.elapsed_ms}ms`);

console.log("VOID_WC_PUBLIC_COORDINATOR_READINESS_RESPONSE_BOUNDS_V1_GREEN");

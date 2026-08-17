#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const TOOL = resolve(ROOT, "tools/wc-public-opportunity-handoff-v1.mjs");
const temp = mkdtempSync(join(tmpdir(), "void-wc-handoff-provenance-"));
const input = join(temp, "directory.json");
const client = join(temp, "client.mjs");
const nodeId = "0123456789abcdef0123456789abcdef";
const STATUS_ROUTE = "/wc/public-earning-pilot-v1/status";

function directory(base) {
  return {
    marker: "VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_V1",
    status: "green",
    directory_state: "available",
    results: [{
      base,
      state: "available",
      trusted: true,
      source_path: STATUS_ROUTE,
      pilot: {
        coordinator_enabled: true,
        executor_enabled: false,
        fixed_award_wc: 3,
        fixed_award_matches: true,
      },
      public_claim: {
        configured: true,
        enabled: true,
        path: "/wc/public-earning-pilot-v1/claim-ticket",
      },
      safety: {
        read_only: true,
        get_only: true,
        public_award_boundary_confirmed: true,
        mutation_attempted: false,
      },
    }],
    safety: {
      read_only: true,
      composed_discovery_marker: "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1",
      child_results_safety_validated: true,
      mutation_attempted: false,
      ticket_issuance_attempted: false,
      receipt_submission_attempted: false,
      wc_award_attempted: false,
      wallet_access_attempted: false,
      settlement_attempted: false,
    },
  };
}

function canonicalStatus() {
  return {
    ok: true,
    marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
    coordinator_enabled: true,
    executor_enabled: false,
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
    },
  };
}

function listen(handler) {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push({ method: req.method, url: req.url });
    handler(req, res);
  });
  return new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolveListen({ server, requests, base: `http://127.0.0.1:${address.port}` });
    });
  });
}

function run(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [TOOL, ...args], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", rejectRun);
    child.once("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

const trusted = await listen((req, res) => {
  if (req.method === "GET" && req.url === STATUS_ROUTE) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(canonicalStatus()));
    return;
  }
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, nodeId }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

const attacker = await listen((req, res) => {
  if (req.method === "GET" && req.url === STATUS_ROUTE) {
    const forged = canonicalStatus();
    forged.public_claim.proof_of_executor_key_possession_required = false;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(forged));
    return;
  }
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, nodeId }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

writeFileSync(client, "#!/usr/bin/env node\n", { mode: 0o755 });

try {
  writeFileSync(input, JSON.stringify(directory(attacker.base)), "utf8");
  const forged = await run([
    "--directory-json", input,
    "--account", "outside-user-1",
    "--client-tool", client,
    "--health-timeout-ms", "1000",
  ]);
  assert.equal(forged.code, 2, forged.stderr || forged.stdout);
  const forgedBody = JSON.parse(forged.stdout);
  assert.equal(forgedBody.marker, "VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1");
  assert.equal(forgedBody.handoff_state, "hold");
  assert.match(forgedBody.reason, /canonical participant status verification/u);
  assert.deepEqual(attacker.requests, [{ method: "GET", url: STATUS_ROUTE }]);

  trusted.requests.length = 0;
  writeFileSync(input, JSON.stringify(directory(trusted.base)), "utf8");
  const ready = await run([
    "--directory-json", input,
    "--account", "outside-user-1",
    "--client-tool", client,
    "--health-timeout-ms", "1000",
  ]);
  assert.equal(ready.code, 0, ready.stderr || ready.stdout);
  const readyBody = JSON.parse(ready.stdout);
  assert.equal(readyBody.handoff_state, "ready");
  assert.equal(readyBody.selected.base, trusted.base);
  assert.equal(readyBody.selected.source_path, STATUS_ROUTE);
  assert.equal(readyBody.selected.fixed_award_wc, 3);
  assert.equal(readyBody.coordinator_identity.node_id, nodeId);
  assert.equal(readyBody.safety.selected_candidate_reverified_via_canonical_status_contract, true);
  assert.equal(readyBody.safety.canonical_status_path, STATUS_ROUTE);
  assert.equal(readyBody.safety.canonical_status_fixed_award_wc, 3);
  assert.deepEqual(trusted.requests, [
    { method: "GET", url: STATUS_ROUTE },
    { method: "GET", url: "/health" },
  ]);

  console.log("VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_PROVENANCE_V1_PROOF_GREEN");
  console.log("fabricated_directory_self_attestation_rejected=true");
  console.log("canonical_participant_status_reverification_required=true");
  console.log("trusted_candidate_health_binding_preserved=true");
  console.log("client_executed=false");
  console.log("wc_mutation_performed=false");
} finally {
  await Promise.all([
    new Promise((resolveClose) => attacker.server.close(() => resolveClose())),
    new Promise((resolveClose) => trusted.server.close(() => resolveClose())),
  ]);
  rmSync(temp, { recursive: true, force: true });
}

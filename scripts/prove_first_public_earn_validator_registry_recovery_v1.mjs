#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  Interface,
  JsonRpcProvider,
  getAddress,
  parseEther,
} from "ethers";
import {
  CHAIN_ID,
  MARKER as RESOLVER_MARKER,
  MIN_VALIDATOR_STAKE_WEI,
  REGISTRY_ABI,
  buildRegistryDecision,
  classifyRegistrySnapshot,
  extractRegistryAddresses,
  scanRegistryCandidates,
} from "../tools/void-validator-candidate-registry-live-resolver-v1.mjs";

const ROOT = process.cwd();
const read = (relative) =>
  fs.readFileSync(path.join(ROOT, relative), "utf8");
const FIXTURE_PATH = path.join(
  ROOT,
  "fixtures",
  "public-earning",
  "void-public-earn-first-work-v1.json",
);
const FIXTURE_ID = "void-public-earn-first-work-v1";
const FIXTURE_SHA =
  "c12a7a4aec535398d3cb9b3dd7a19894f52daf8a2bf1c11019f81a1f0a0c38ea";
const COMPOSITION_MARKER =
  "VOID_PUBLIC_EARN_COORDINATOR_COMPOSITION_V1";
const PROOF_MARKER =
  "VOID_FIRST_PUBLIC_EARN_VALIDATOR_REGISTRY_RECOVERY_V1";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function listen(server, host = "127.0.0.1", port = 0) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve(server.address().port));
  });
}

function close(server) {
  if (!server) return Promise.resolve();
  return new Promise((resolve) => server.close(resolve));
}

async function freePort() {
  const server = http.createServer();
  const port = await listen(server);
  await close(server);
  return port;
}

async function json(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = text;
  }
  return { response, body, text };
}

const fixture = fs.readFileSync(FIXTURE_PATH);
assert.equal(fixture.length, 565);
assert.equal(sha256(fixture), FIXTURE_SHA);
const fixtureJson = JSON.parse(fixture.toString("utf8"));
assert.equal(
  fixtureJson.marker,
  "VOID_PUBLIC_EARN_FIRST_WORK_PACKET_V1",
);
assert.equal(fixtureJson.task_class, "datanet_fetch_verify");
assert.equal(fixtureJson.chain_id, 2050);
assert.equal(fixtureJson.fixed_award_wc, 3);
assert.equal(fixtureJson.server_selected_work, true);
assert.equal(fixtureJson.participant_selected_dataset, false);
assert.equal(fixtureJson.participant_selected_input_hash, false);
assert.equal(fixtureJson.participant_selected_award, false);
assert.equal(fixtureJson.wallet_or_signer_required, false);
assert.equal(fixtureJson.money_movement, false);

const upstreamRequests = [];
const upstream = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    upstreamRequests.push({
      method: req.method,
      url: req.url,
      authorization: String(req.headers.authorization || ""),
      raw,
    });

    res.setHeader("content-type", "application/json");
    res.setHeader("set-cookie", "private=1");
    res.setHeader("location", "http://private.invalid/");

    if (req.method === "GET" && req.url === "/health") {
      res.end(
        JSON.stringify({
          ok: true,
          nodeId: "9d89483769e469e0473b489dc50dba96",
          private_path: "/secret",
        }),
      );
      return;
    }
    if (
      req.method === "GET" &&
      req.url?.startsWith("/wc/public-earning-pilot-v1/status")
    ) {
      res.end(
        JSON.stringify({
          ok: true,
          marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
          coordinator_enabled: true,
          executor_enabled: false,
          fixed_award_wc: 3,
          public_claim: {
            marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
            enabled: true,
            available: true,
            work_available: true,
            server_selected_work: true,
            proof_of_executor_key_possession_required: true,
            claim_nonce_replay_protection: true,
            participant_selected_dataset: false,
            participant_selected_input_hash: false,
            participant_selected_award: false,
            money_movement: false,
          },
        }),
      );
      return;
    }
    if (
      req.method === "POST" &&
      req.url === "/wc/public-earning-pilot-v1/claim-ticket"
    ) {
      res.statusCode = 201;
      res.end(
        JSON.stringify({
          ok: true,
          marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
          received: JSON.parse(raw),
        }),
      );
      return;
    }
    if (
      req.method === "POST" &&
      req.url === "/wc/public-earning-pilot-v1/submit-result"
    ) {
      res.end(
        JSON.stringify({
          ok: true,
          marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
          capability_forwarded:
            req.headers.authorization ===
            `Bearer wcep1.${"a".repeat(32)}.${"B".repeat(43)}`,
        }),
      );
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
  });
});

const upstreamPort = await listen(upstream);
const compositionPort = await freePort();
process.env.VOID_EARN_PRIVATE_COORDINATOR_UPSTREAM =
  `http://127.0.0.1:${upstreamPort}`;
process.env.VOID_PUBLIC_EARN_COMPOSITION_HOST = "127.0.0.1";
process.env.VOID_PUBLIC_EARN_COMPOSITION_PORT =
  String(compositionPort);
process.env.VOID_EARN_PUBLIC_DATASET_ID = FIXTURE_ID;
process.env.VOID_EARN_PUBLIC_DATASET_SHA256 = FIXTURE_SHA;
process.env.VOID_EARN_PUBLIC_DATASET_FILE = FIXTURE_PATH;

const compositionModule = await import(
  `${pathToFileURL(
    path.join(
      ROOT,
      "ops",
      "public",
      "public-earn-coordinator-composition-v1.mjs",
    ),
  ).href}?proof=${Date.now()}`
);
assert.equal(compositionModule.MARKER, COMPOSITION_MARKER);
assert.equal(compositionModule.DEFAULT_DATASET_ID, FIXTURE_ID);
assert.equal(compositionModule.DEFAULT_DATASET_SHA256, FIXTURE_SHA);

const composition = compositionModule.createCompositionServer();
await listen(composition, "127.0.0.1", compositionPort);
const compositionBase = `http://127.0.0.1:${compositionPort}`;

try {
  const status = await json(
    `${compositionBase}/__void/public-earn-coordinator-composition-v1/status.json`,
  );
  assert.equal(status.response.status, 200);
  assert.equal(status.body.marker, COMPOSITION_MARKER);
  assert.equal(status.body.bind.loopback_only, true);
  assert.equal(status.body.dataset.dataset_id, FIXTURE_ID);
  assert.equal(status.body.dataset.sha256, FIXTURE_SHA);
  assert.equal(status.body.dataset.bytes, fixture.length);
  assert.equal(status.body.safety.private_upstream_hidden, true);
  assert.equal(status.body.safety.operator_issue_exposed, false);
  assert.equal(status.body.safety.local_claim_sign_exposed, false);
  assert.equal(status.body.safety.wallet_or_signer_access, false);
  assert.equal(status.body.safety.money_movement, false);
  assert.equal(status.text.includes(String(upstreamPort)), false);

  const datasetResponse = await fetch(
    `${compositionBase}/datanet/v1/fetch/${FIXTURE_ID}?who=proof-client-v1`,
  );
  const datasetBytes = Buffer.from(await datasetResponse.arrayBuffer());
  assert.equal(datasetResponse.status, 200);
  assert.equal(sha256(datasetBytes), FIXTURE_SHA);
  assert.equal(
    datasetResponse.headers.get("x-void-dataset-sha256"),
    FIXTURE_SHA,
  );

  const datasetHead = await fetch(
    `${compositionBase}/datanet/v1/fetch/${FIXTURE_ID}`,
    { method: "HEAD" },
  );
  assert.equal(datasetHead.status, 200);
  assert.equal((await datasetHead.arrayBuffer()).byteLength, 0);
  assert.equal(
    datasetHead.headers.get("content-length"),
    String(fixture.length),
  );

  const badDatasetQuery = await json(
    `${compositionBase}/datanet/v1/fetch/${FIXTURE_ID}?token=secret`,
  );
  assert.equal(badDatasetQuery.response.status, 400);
  assert.equal(badDatasetQuery.body.error, "dataset_query_invalid");

  const unknownDataset = await json(
    `${compositionBase}/datanet/v1/fetch/not-allowlisted`,
  );
  assert.equal(unknownDataset.response.status, 404);
  assert.equal(unknownDataset.body.error, "dataset_not_allowlisted");

  const health = await json(`${compositionBase}/health`);
  assert.equal(health.response.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.response.headers.has("set-cookie"), false);
  assert.equal(health.response.headers.has("location"), false);

  const coordinatorStatus = await json(
    `${compositionBase}/wc/public-earning-pilot-v1/status?account=outside-user-1`,
  );
  assert.equal(coordinatorStatus.response.status, 200);
  assert.equal(coordinatorStatus.body.coordinator_enabled, true);

  const claimGet = await json(
    `${compositionBase}/wc/public-earning-pilot-v1/claim-ticket`,
  );
  assert.equal(claimGet.response.status, 405);
  assert.equal(claimGet.body.error, "method_not_allowed");

  const operator = await json(
    `${compositionBase}/wc/public-earning-pilot-v1/operator/issue`,
  );
  assert.equal(operator.response.status, 404);
  assert.equal(operator.body.error, "not_public");

  const claimBody = {
    claim: { marker: "proof-claim" },
    signature: { alg: "ed25519" },
  };
  const claim = await json(
    `${compositionBase}/wc/public-earning-pilot-v1/claim-ticket`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(claimBody),
    },
  );
  assert.equal(claim.response.status, 201);
  assert.deepEqual(claim.body.received, claimBody);
  assert.equal(claim.response.headers.has("set-cookie"), false);
  assert.equal(claim.response.headers.has("location"), false);

  const claimWithAuthorization = await json(
    `${compositionBase}/wc/public-earning-pilot-v1/claim-ticket`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer should-not-forward",
      },
      body: JSON.stringify(claimBody),
    },
  );
  assert.equal(claimWithAuthorization.response.status, 400);
  assert.equal(
    claimWithAuthorization.body.error,
    "authorization_forbidden",
  );

  const submitWithoutCapability = await json(
    `${compositionBase}/wc/public-earning-pilot-v1/submit-result`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    },
  );
  assert.equal(submitWithoutCapability.response.status, 401);

  const capability =
    `Bearer wcep1.${"a".repeat(32)}.${"B".repeat(43)}`;
  const submit = await json(
    `${compositionBase}/wc/public-earning-pilot-v1/submit-result`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: capability,
      },
      body: JSON.stringify({ marker: "proof-result" }),
    },
  );
  assert.equal(submit.response.status, 200);
  assert.equal(submit.body.capability_forwarded, true);

  const upstreamClaim = upstreamRequests.find(
    (entry) =>
      entry.method === "POST" &&
      entry.url === "/wc/public-earning-pilot-v1/claim-ticket",
  );
  assert.ok(upstreamClaim);
  assert.equal(upstreamClaim.authorization, "");
  const upstreamSubmit = upstreamRequests.find(
    (entry) =>
      entry.method === "POST" &&
      entry.url === "/wc/public-earning-pilot-v1/submit-result",
  );
  assert.ok(upstreamSubmit);
  assert.equal(upstreamSubmit.authorization, capability);
} finally {
  await close(composition);
  await close(upstream);
}

assert.equal(
  RESOLVER_MARKER,
  "VOID_VALIDATOR_CANDIDATE_REGISTRY_LIVE_RESOLVER_V1",
);
assert.equal(CHAIN_ID, 2050n);
assert.equal(MIN_VALIDATOR_STAKE_WEI, parseEther("10000"));

const liveAddress = getAddress(
  "0x1111111111111111111111111111111111111111",
);
const staleAddress = getAddress(
  "0x2222222222222222222222222222222222222222",
);
const ownerAddress = getAddress(
  "0x3333333333333333333333333333333333333333",
);

assert.deepEqual(
  extractRegistryAddresses({
    registry: staleAddress,
    nested: {
      deployedTo: liveAddress,
      owner: ownerAddress,
      arbitrary: "0x4444444444444444444444444444444444444444",
    },
  }).sort(),
  [liveAddress, staleAddress].sort(),
);

assert.equal(
  classifyRegistrySnapshot({
    code_present: false,
    calls_succeeded: false,
  }),
  "stale_no_code",
);
assert.equal(
  classifyRegistrySnapshot({
    code_present: true,
    calls_succeeded: true,
    min_validator_stake_wei: parseEther("1000").toString(),
    max_active_validators: "256",
    activation_churn_limit: "4",
    owner: ownerAddress,
  }),
  "live_policy_mismatch",
);
assert.equal(
  classifyRegistrySnapshot({
    code_present: true,
    calls_succeeded: true,
    min_validator_stake_wei: parseEther("10000").toString(),
    max_active_validators: "256",
    activation_churn_limit: "4",
    owner: ownerAddress,
  }),
  "live_exact_policy",
);
assert.equal(
  buildRegistryDecision([
    { address: liveAddress, classification: "live_exact_policy" },
  ]).decision,
  "READY_EXISTING_LIVE_EXACT_REGISTRY",
);
assert.equal(
  buildRegistryDecision([
    { address: liveAddress, classification: "live_exact_policy" },
    { address: staleAddress, classification: "live_exact_policy" },
  ]).decision,
  "HOLD_MULTIPLE_LIVE_EXACT_REGISTRIES",
);

const registryInterface = new Interface(REGISTRY_ABI);
const selectorResults = new Map([
  [
    registryInterface.getFunction("minValidatorStake").selector,
    registryInterface.encodeFunctionResult(
      "minValidatorStake",
      [parseEther("10000")],
    ),
  ],
  [
    registryInterface.getFunction("maxActiveValidators").selector,
    registryInterface.encodeFunctionResult(
      "maxActiveValidators",
      [256n],
    ),
  ],
  [
    registryInterface.getFunction("activationChurnLimit").selector,
    registryInterface.encodeFunctionResult(
      "activationChurnLimit",
      [4n],
    ),
  ],
  [
    registryInterface.getFunction("owner").selector,
    registryInterface.encodeFunctionResult("owner", [ownerAddress]),
  ],
  [
    registryInterface.getFunction("candidateCount").selector,
    registryInterface.encodeFunctionResult("candidateCount", [1n]),
  ],
  [
    registryInterface.getFunction("waitingCount").selector,
    registryInterface.encodeFunctionResult("waitingCount", [1n]),
  ],
  [
    registryInterface.getFunction("activeCount").selector,
    registryInterface.encodeFunctionResult("activeCount", [0n]),
  ],
]);

const rpcServer = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const requests = Array.isArray(request) ? request : [request];
    const responses = requests.map((entry) => {
      let result;
      if (entry.method === "eth_chainId") {
        result = "0x802";
      } else if (entry.method === "eth_blockNumber") {
        result = "0x1";
      } else if (entry.method === "eth_getCode") {
        const address = getAddress(entry.params[0]);
        result = address === liveAddress ? "0x6001600055" : "0x";
      } else if (entry.method === "eth_call") {
        const transaction = entry.params[0] || {};
        const address = getAddress(transaction.to);
        assert.equal(address, liveAddress);
        const selector = String(transaction.data || "").slice(0, 10);
        result = selectorResults.get(selector);
        assert.ok(result, `unhandled selector ${selector}`);
      } else {
        throw new Error(`unhandled RPC method ${entry.method}`);
      }
      return { jsonrpc: "2.0", id: entry.id, result };
    });
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify(Array.isArray(request) ? responses : responses[0]),
    );
  });
});
const rpcPort = await listen(rpcServer);
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-validator-registry-resolver-v1-"),
);
const artifactDir = path.join(temp, "artifacts");
fs.mkdirSync(artifactDir, { recursive: true, mode: 0o700 });
fs.writeFileSync(
  path.join(
    artifactDir,
    "validator-candidate-registry.local.current.json",
  ),
  JSON.stringify({
    ok: true,
    registry: staleAddress,
    owner: ownerAddress,
  }),
  { mode: 0o600 },
);
fs.writeFileSync(
  path.join(
    artifactDir,
    "validator-candidate-registry.local.previous.json",
  ),
  JSON.stringify({
    ok: true,
    deployment: { contractAddress: liveAddress },
  }),
  { mode: 0o600 },
);
fs.writeFileSync(
  path.join(
    artifactDir,
    "validator-candidate-registry.invalid.json",
  ),
  "{not-json",
  { mode: 0o600 },
);

const provider = new JsonRpcProvider(
  `http://127.0.0.1:${rpcPort}`,
  undefined,
  { batchMaxCount: 1 },
);
try {
  const report = await scanRegistryCandidates({
    provider,
    artifactDirectory: artifactDir,
    observedAt: "2026-08-05T08:00:00.000Z",
  });
  assert.equal(report.chain_id, 2050);
  assert.equal(
    report.decision,
    "READY_EXISTING_LIVE_EXACT_REGISTRY",
  );
  assert.equal(report.ready, true);
  assert.equal(report.selected_address, liveAddress);
  assert.equal(report.results.length, 2);
  const live = report.results.find(
    (entry) => entry.address === liveAddress,
  );
  const stale = report.results.find(
    (entry) => entry.address === staleAddress,
  );
  assert.equal(live.classification, "live_exact_policy");
  assert.equal(
    live.min_validator_stake_wei,
    parseEther("10000").toString(),
  );
  assert.equal(live.max_active_validators, "256");
  assert.equal(live.activation_churn_limit, "4");
  assert.equal(live.owner, ownerAddress);
  assert.equal(live.candidate_count, "1");
  assert.equal(live.waiting_count, "1");
  assert.equal(live.active_count, "0");
  assert.equal(stale.classification, "stale_no_code");
  assert.equal(report.artifact_scan.scanned_files, 2);
  assert.equal(report.artifact_scan.rejected_files.length, 1);
  assert.equal(report.authority_boundary.read_only_rpc, true);
  assert.equal(report.authority_boundary.contract_deployed, false);
  assert.equal(report.authority_boundary.transaction_broadcast, false);
  assert.equal(report.authority_boundary.wallet_or_signer_access, false);
  assert.equal(report.authority_boundary.fund_movement, false);
} finally {
  provider.destroy();
  await close(rpcServer);
  fs.rmSync(temp, { recursive: true, force: true });
}

const installerPath =
  "ops/mainnet0/install-first-public-earn-runtime-v1.sh";
const installer = read(installerPath);
const syntax = spawnSync("bash", ["-n", installerPath], {
  cwd: ROOT,
  encoding: "utf8",
});
assert.equal(
  syntax.status,
  0,
  `installer syntax failed: ${syntax.stderr}`,
);
for (const required of [
  "VOID_FIRST_PUBLIC_EARN_RUNTIME_ACTIVATION_V1",
  "APPLY=\"${APPLY:-0}\"",
  "activate-first-public-earn-runtime-v1",
  "VOID_WC_PUBLIC_TICKET_CLAIM_ENABLED=1",
  `VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID=$DATASET_ID`,
  `VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH=$DATASET_SHA256`,
  "VOID_WC_PUBLIC_EARNING_EXECUTOR_ENABLED=0",
  "void-public-earn-coordinator-composition-v1.service",
  "http://127.0.0.1:4110",
  "http://127.0.0.1:4111",
  "ROLLBACK_BEGIN",
  "--require-ready",
  "ticket_issued=false",
  "wc_written=false",
  "fund_movement=false",
]) {
  assert.ok(installer.includes(required), `installer missing ${required}`);
}
for (const forbidden of [
  "--private-key",
  "seed_phrase",
  "mnemonic",
  "wallet_file",
  "VOID_ADAPTER_HOST=0.0.0.0",
  "sudo ",
]) {
  assert.equal(
    installer.includes(forbidden),
    false,
    `installer contains forbidden ${forbidden}`,
  );
}

const compositionSource = read(
  "ops/public/public-earn-coordinator-composition-v1.mjs",
);
for (const required of [
  COMPOSITION_MARKER,
  FIXTURE_ID,
  FIXTURE_SHA,
  "dataset_not_allowlisted",
  "authorization_forbidden",
  "missing_or_invalid_capability",
  "private_upstream_hidden: true",
  "operator_issue_exposed: false",
  "wallet_or_signer_access: false",
  "money_movement: false",
]) {
  assert.ok(
    compositionSource.includes(required),
    `composition source missing ${required}`,
  );
}

const resolverSource = read(
  "tools/void-validator-candidate-registry-live-resolver-v1.mjs",
);
for (const required of [
  RESOLVER_MARKER,
  "READY_EXISTING_LIVE_EXACT_REGISTRY",
  "HOLD_MULTIPLE_LIVE_EXACT_REGISTRIES",
  "HOLD_NO_LIVE_EXACT_REGISTRY",
  "stale_no_code",
  "live_exact_policy",
  "write-live-validator-registry-v1:",
  "artifact_pointer_overwritten: false",
  "contract_deployed: false",
  "transaction_broadcast: false",
  "wallet_or_signer_access: false",
]) {
  assert.ok(
    resolverSource.includes(required),
    `resolver source missing ${required}`,
  );
}

const workflow = read(
  ".github/workflows/first-public-earn-validator-registry-recovery-v1.yml",
);
for (const required of [
  "actions/checkout@v6",
  "actions/setup-node@v6",
  'node-version: "22"',
  "npm ci --ignore-scripts --no-audit --no-fund",
  "node scripts/prove_first_public_earn_validator_registry_recovery_v1.mjs",
  "npm run typecheck",
  "permissions:\n  contents: read",
]) {
  assert.ok(workflow.includes(required), `workflow missing ${required}`);
}
assert.equal(workflow.includes("workflow_dispatch"), false);
assert.equal(workflow.includes("contents: write"), false);

const documentation = read(
  "docs/operators/first-public-earn-validator-registry-recovery-v1.md",
);
for (const required of [
  "void-public-earn-first-work-v1",
  FIXTURE_SHA,
  "activate-first-public-earn-runtime-v1",
  "127.0.0.1:4100 → 127.0.0.1:4110 → 127.0.0.1:4111",
  "stale artifact",
  "10,000 VOID",
  "does not deploy",
  "does not issue a ticket",
]) {
  assert.ok(
    documentation.includes(required),
    `documentation missing ${required}`,
  );
}

console.log(
  JSON.stringify(
    {
      marker: PROOF_MARKER,
      deterministic_first_work_packet: true,
      first_work_packet_sha256: FIXTURE_SHA,
      loopback_composition_runtime_verified: true,
      exact_dataset_allowlist_verified: true,
      claim_and_submit_proxy_boundaries_verified: true,
      private_headers_stripped: true,
      activation_default_no_mutation: true,
      activation_rollback_present: true,
      registry_stale_artifact_detection_verified: true,
      registry_historical_live_recovery_verified: true,
      exact_10000_void_policy_verified: true,
      wallet_or_signer_access: false,
      ticket_issued: false,
      wc_written: false,
      validator_mutation: false,
      transaction_broadcast: false,
      fund_movement: false,
      status: "GREEN",
    },
    null,
    2,
  ),
);
console.log(`${PROOF_MARKER}_PROOF_GREEN`);

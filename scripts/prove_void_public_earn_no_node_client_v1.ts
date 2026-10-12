#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolPath = path.resolve(__dirname, "../tools/void_public_earn_no_node_client_v1.mjs");
const tool = await import(pathToFileURL(toolPath).href);
const t = tool.testOnly;

function mode(file) {
  return fs.statSync(file).mode & 0o777;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > 2 * 1024 * 1024) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(data),
  });
  res.end(data);
}

function sendOversizedJson(res, { declared = false } = {}) {
  const data = JSON.stringify({
    ok: true,
    padding: "x".repeat(tool.MAX_CONTROL_RESPONSE_BYTES + 1024),
  });
  const headers = { "content-type": "application/json" };
  if (declared) {
    headers["content-length"] = Buffer.byteLength(data);
  }
  res.writeHead(200, headers);
  res.end(data);
}

function sendInterruptedJson(res) {
  res.writeHead(200, { "content-type": "application/json" });
  res.flushHeaders();
  res.write('{"ok":true,"partial":"');
  setTimeout(() => res.destroy(), 5);
}

function listen(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      Promise.resolve(handler(req, res)).catch((error) => {
        sendJson(res, 500, { ok: false, error: String(error?.message || error) });
      });
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, base: `http://127.0.0.1:${address.port}` });
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function runClient(args, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [toolPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => stdout += chunk);
    child.stderr.on("data", (chunk) => stderr += chunk);
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("client proof timed out"));
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({ code: Number(code ?? -1), stdout, stderr });
    });
  });
}

const source = fs.readFileSync(toolPath, "utf8");
for (const forbidden of [
  "/wc/public-earning-pilot-v1/sign-claim",
  "/wc/public-earning-pilot-v1/execute-local",
  "/jobs/submit?dry=0",
  "/__void/jobs-and-datanet-worker/run-once",
  "NODE_PRIVKEY_PATH",
  "VOID_NODE_KEY_A",
]) {
  assert.equal(source.includes(forbidden), false, `forbidden full-node dependency: ${forbidden}`);
}
for (const required of [
  "crypto.generateKeyPairSync(\"ed25519\")",
  "transport_mode: \"outbound_bundle\"",
  "participant_selected_dataset: false",
  "participant_selected_input_hash: false",
  "participant_selected_award: false",
  "full_void_node_required: false",
  "authorization: `Bearer ${capabilityToken}`",
  "MAX_CONTROL_RESPONSE_BYTES = 64 * 1024",
  "readResponseTextBounded(response)",
  "readDatasetBytesBounded(response, maxBytes)",
  "reviewed_signed_public_origin_v1",
  "PUBLIC_ORIGIN_BINDING_PATH",
  "REVIEWED_PUBLIC_NODE_FINGERPRINTS",
  "canonicalReviewedPublicHttpsOrigin",
]) {
  assert.equal(source.includes(required), true, `required client marker missing: ${required}`);
}
assert.equal(source.includes("--dataset-id"), false);
assert.equal(source.includes("--award"), false);
assert.equal(
  source.includes("response.text()"),
  false,
  "control JSON must not use unbounded response.text()",
);
assert.equal(
  source.includes("response.arrayBuffer()"),
  false,
  "dataset fetch must not buffer an unbounded response before enforcing max bytes",
);
assert.deepEqual(
  source.match(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/g) || [],
  [],
  "raw empty catches must remain zero",
);
assert.match(
  source,
  /VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_BEST_EFFORT_FAILURE_VISIBLE/,
);
assert.equal(t.safeBase("http://[::1]:8082"), "http://[::1]:8082");
assert.equal(t.safeBase("http://[2001:db8::1]:8082"), "");
assert.equal(t.safeBase("http://8.8.8.8:8082"), "");
assert.equal(
  t.safeBase("https://public.example:8443"),
  "https://public.example:8443",
);
assert.equal(tool.MAX_CONTROL_RESPONSE_BYTES, 64 * 1024);
assert.equal(
  tool.PUBLIC_ORIGIN_BINDING_PATH,
  "/.well-known/void-node-public-origin-binding-v1.json",
);
assert.equal(
  tool.REVIEWED_PUBLIC_NODE_FINGERPRINTS[
    "9d89483769e469e0473b489dc50dba96"
  ],
  "2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b",
);
assert.equal(
  tool.REVIEWED_PUBLIC_NODE_IDENTITY_TRUST_SHA256,
  "49f285908fa70c72ce036b44d9ead41e11fc1bd40092384636a2c0cc3a0d3790",
);
assert.equal(
  t.requiresReviewedPublicOriginBinding(
    "https://public.example",
  ),
  true,
);
assert.equal(
  t.requiresReviewedPublicOriginBinding(
    "https://127.0.0.1",
  ),
  true,
);
assert.equal(
  t.requiresReviewedPublicOriginBinding(
    "https://node.tail.ts.net",
  ),
  true,
);
assert.equal(
  t.requiresReviewedPublicOriginBinding(
    "http://127.0.0.1:8082",
  ),
  false,
);
assert.equal(
  t.canonicalReviewedPublicHttpsOrigin(
    "https://public.example",
  ),
  "https://public.example",
);
for (const invalidOrigin of [
  "https://public.example:8443",
  "https://public.example/",
  "https://Public.Example",
  "https://proofservice.onion",
  "https://203.0.113.7",
  "https://127.0.0.1",
]) {
  assert.throws(
    () => t.canonicalReviewedPublicHttpsOrigin(invalidOrigin),
    /public_origin_binding_origin_mismatch/,
    invalidOrigin,
  );
}

{
  const { privateKey, publicKey } =
    crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const fingerprint = t.sha256(
    publicKey.export({ type: "spki", format: "der" }),
  );
  const nodeId = "d".repeat(32);
  const nowMs = Date.parse("2026-09-30T12:00:00.000Z");
  const binding = {
    marker: "VOID_NODE_PUBLIC_ORIGIN_BINDING_V1",
    version: 1,
    status: "active",
    issued_at: "2026-09-30T11:59:00.000Z",
    expires_at: "2026-10-30T11:59:00.000Z",
    network: {
      name: "VOID Mainnet-0",
      identity: "mainnet0",
      chain_id: 2050,
    },
    origin: {
      value: "https://public.example",
    },
    node: {
      node_id: nodeId,
      key_type: "ed25519",
      public_key_pem: publicKeyPem,
      public_key_fingerprint_sha256: fingerprint,
    },
    surface: {
      binding_paths: [
        "/.well-known/void-node-public-origin-binding-v1.json",
        "/public-node/identity/public-origin-binding-v1.json",
      ],
      health: {
        path: "/health",
        methods: ["GET"],
      },
      work_credit_status: {
        path: "/wc/public-earning-pilot-v1/status",
        methods: ["GET"],
      },
      same_origin_only: true,
      redirects_allowed: false,
    },
    authority: {
      read_only: true,
      transaction_submission: false,
      payment_authority: false,
      wallet_or_signer_access: false,
      work_credit_write: false,
      validator_mutation: false,
      governance_mutation: false,
      treasury_or_liquidity: false,
      void_settlement: false,
      node_runtime_mutation: false,
      operator_control: false,
    },
    signature: {
      domain: "VOID_NODE_PUBLIC_ORIGIN_BINDING_V1",
      algorithm: "ed25519",
      encoding: "base64",
      canonicalization: "void-canonical-json-v1",
      key_id: `ed25519:${fingerprint}`,
      value: "",
    },
  };
  const resignBinding = (value: typeof binding) => {
    value.signature.value = crypto.sign(
      null,
      t.publicOriginBindingUnsignedBytes(value),
      privateKey,
    ).toString("base64");
    return value;
  };
  resignBinding(binding);

  const verified = t.verifyPublicOriginBindingV1(
    binding,
    {
      expectedOrigin: "https://public.example",
      expectedNodeId: nodeId,
      trustedFingerprints: {
        [nodeId]: fingerprint,
      },
      nowMs,
    },
  );
  assert.equal(
    verified.mode,
    "reviewed_signed_public_origin_v1",
  );
  assert.equal(verified.node_id, nodeId);
  assert.equal(
    verified.public_key_fingerprint_sha256,
    fingerprint,
  );

  for (const invalidOrigin of [
    "https://public.example:8443",
    "https://public.example/",
    "https://Public.Example",
    "https://proofservice.onion",
    "https://203.0.113.7",
    "https://127.0.0.1",
  ]) {
    const invalidBinding = structuredClone(binding);
    invalidBinding.origin.value = invalidOrigin;
    resignBinding(invalidBinding);
    assert.throws(
      () => t.verifyPublicOriginBindingV1(
        invalidBinding,
        {
          expectedOrigin: invalidOrigin,
          expectedNodeId: nodeId,
          trustedFingerprints: {
            [nodeId]: fingerprint,
          },
          nowMs,
        },
      ),
      /public_origin_binding_origin_mismatch/,
      invalidOrigin,
    );
  }

  const wrongTrust = {
    ...binding,
  };
  assert.throws(
    () => t.verifyPublicOriginBindingV1(
      wrongTrust,
      {
        expectedOrigin: "https://public.example",
        expectedNodeId: nodeId,
        trustedFingerprints: {
          [nodeId]: "0".repeat(64),
        },
        nowMs,
      },
    ),
    /public_origin_binding_fingerprint_mismatch/,
  );

  const tamperedOrigin = structuredClone(binding);
  tamperedOrigin.origin.value =
    "https://attacker.example";
  assert.throws(
    () => t.verifyPublicOriginBindingV1(
      tamperedOrigin,
      {
        expectedOrigin: "https://public.example",
        expectedNodeId: nodeId,
        trustedFingerprints: {
          [nodeId]: fingerprint,
        },
        nowMs,
      },
    ),
    /public_origin_binding_origin_mismatch/,
  );

  const escalated = structuredClone(binding);
  escalated.authority.wallet_or_signer_access = true;
  assert.throws(
    () => t.verifyPublicOriginBindingV1(
      escalated,
      {
        expectedOrigin: "https://public.example",
        expectedNodeId: nodeId,
        trustedFingerprints: {
          [nodeId]: fingerprint,
        },
        nowMs,
      },
    ),
    /public_origin_binding_authority_invalid/,
  );

  const expired = structuredClone(binding);
  expired.expires_at = "2026-09-30T11:00:00.000Z";
  assert.throws(
    () => t.verifyPublicOriginBindingV1(
      expired,
      {
        expectedOrigin: "https://public.example",
        expectedNodeId: nodeId,
        trustedFingerprints: {
          [nodeId]: fingerprint,
        },
        nowMs,
      },
    ),
    /public_origin_binding_expired/,
  );
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-earn-no-node-client-v1-"));
const successState = path.join(root, "success-state");
const failureState = path.join(root, "failure-state");
const dataset = Buffer.from("VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_DATASET\n", "utf8");
const expectedHash = t.sha256(dataset);
const coordinatorNodeId = "c".repeat(32);
const balances = new Map();
const tickets = new Map();
let claimCount = 0;
let submitCount = 0;
let badHashSubmitCount = 0;
let badDatasetReady = false;
let faultMode = "";
let faultSubmitCount = 0;
let oversizedDatasetRequests = 0;
const warmingClaimBodies = [];
const warmingSubmitBodies = [];
let delayedWarmingAttempts = 0;
let stalledRetryAttempts = 0;

async function runFault(modeName, args) {
  faultMode = modeName;
  try {
    return await runClient(args);
  } finally {
    faultMode = "";
  }
}

const { server, base } = await listen(async (req, res) => {
  const url = new URL(req.url || "/", base);
  if (
    req.method === "POST" &&
    url.pathname === "/__test/transient-warming-deadline"
  ) {
    delayedWarmingAttempts += 1;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return sendJson(res, 503, {
      ok: false,
      marker: tool.PILOT_MARKER,
      error: "remote_truth_warming",
    });
  }
  if (
    req.method === "POST" &&
    url.pathname === "/__test/transient-warming-stall"
  ) {
    stalledRetryAttempts += 1;
    return;
  }
  if (req.method === "GET" && url.pathname === "/health") {
    if (faultMode === "oversized-health-declared") {
      return sendOversizedJson(res, { declared: true });
    }
    return sendJson(res, 200, { ok: true, nodeId: coordinatorNodeId });
  }
  if (req.method === "GET" && url.pathname === "/wc/public-earning-pilot-v1/status") {
    if (faultMode === "oversized-status-streamed") {
      return sendOversizedJson(res);
    }
    const account = url.searchParams.get("account") || "";
    return sendJson(res, 200, {
      ok: true,
      marker: tool.PILOT_MARKER,
      coordinator_enabled: true,
      executor_enabled: false,
      task_class: tool.TASK_CLASS,
      fixed_award_wc: 3,
      public_claim: {
        marker: tool.CLAIM_MARKER,
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
        dataset_url_template:
          `${base}/public-node/datanet/open-by-id-v1?dataset_id={dataset_id}`,
        account,
      },
    });
  }
  if (req.method === "GET" && url.pathname === "/wc/redeemable") {
    const account = url.searchParams.get("account") || "";
    return sendJson(res, 200, {
      ok: true,
      account,
      earned: balances.get(account) || 0,
      redeemable: balances.get(account) || 0,
      canonical_coordinator_accounting: true,
    });
  }
  if (req.method === "POST" && url.pathname === "/wc/public-earning-pilot-v1/claim-ticket") {
    claimCount += 1;
    const claimBodyText = await readBody(req);
    const payload = JSON.parse(claimBodyText);
    if (faultMode === "oversized-claim-streamed") {
      return sendOversizedJson(res);
    }
    assert.deepEqual(Object.keys(payload).sort(), ["claim", "signature"]);
    const claim = t.canonicalClaim(payload.claim);
    assert.equal(payload.signature.alg, "ed25519");
    assert.equal(payload.signature.key_id, claim.executor_node_id);
    assert.match(payload.signature.sig, /^[0-9a-f]{128}$/);
    const publicKey = crypto.createPublicKey(claim.executor_pubkey);
    assert.equal(
      crypto.verify(
        null,
        t.claimSigningBytes(claim),
        publicKey,
        Buffer.from(payload.signature.sig, "hex"),
      ),
      true,
    );
    if (claim.account === "warming-claim-user") {
      warmingClaimBodies.push(claimBodyText);
      if (warmingClaimBodies.length === 1) {
        return sendJson(res, 503, {
          ok: false,
          marker: tool.PILOT_MARKER,
          error: "remote_truth_warming",
        });
      }
    }
    const ticketId = crypto.randomBytes(16).toString("hex");
    const token = `wcep1.${ticketId}.${crypto.randomBytes(32).toString("base64url")}`;
    assert.equal(token.split(".")[2].length, 43);
    const bad = claim.account === "bad-hash-user";
    const ticket = {
      marker: tool.PILOT_MARKER,
      version: 1,
      ticket_id: ticketId,
      account: claim.account,
      task_class: tool.TASK_CLASS,
      executor_node_id: claim.executor_node_id,
      executor_http_base: "",
      transport_mode: "outbound_bundle",
      dataset_id: bad ? "ds_bad_hash_v1" : "ds_no_node_v1",
      expected_input_hash: expectedHash,
      token_sha256: t.sha256(token),
      nonce: crypto.randomBytes(16).toString("hex"),
      issued_at_ms: Date.now(),
      expires_at_ms: Date.now() + 300_000,
      max_uses: 1,
      status: "issued",
      public_submit_route: tool.SUBMIT_ROUTE,
      local_execute_route: "/wc/public-earning-pilot-v1/execute-local",
      issuance_source: "public_claim",
      public_claim_id: t.sha256(t.claimSigningBytes(claim)),
      fixed_award_wc: 3,
    };
    tickets.set(ticketId, { token, ticket, publicKey, bad });
    return sendJson(res, 201, {
      ok: true,
      marker: tool.CLAIM_MARKER,
      claim_id: ticket.public_claim_id,
      claim_request_verified: true,
      executor_key_possession_verified: true,
      server_selected_work: true,
      ticket,
      capability_token: token,
      capability_token_returned_once: true,
      fixed_award_wc: 3,
      participant_selected_dataset: false,
      participant_selected_input_hash: false,
      participant_selected_award: false,
      generic_job_submit: false,
      wallet_send: false,
      wc_to_void: false,
      buy_void_fulfillment: false,
      money_movement: false,
    });
  }
  if (req.method === "GET" && url.pathname === "/public-node/datanet/open-by-id-v1") {
    if (faultMode === "oversized-dataset-streamed") {
      oversizedDatasetRequests += 1;
      res.writeHead(200, {
        "content-type": "application/octet-stream",
      });
      res.write(Buffer.alloc(600, 0x61));
      res.write(Buffer.alloc(600, 0x62));
      return res.end(Buffer.alloc(600, 0x63));
    }
    const datasetId = url.searchParams.get("dataset_id") || "";
    const body = datasetId === "ds_bad_hash_v1" && !badDatasetReady
      ? Buffer.from("temporarily-wrong-dataset\n", "utf8")
      : dataset;
    res.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-length": body.length,
    });
    return res.end(body);
  }
  if (req.method === "POST" && url.pathname === "/wc/public-earning-pilot-v1/submit-result") {
    const authorization = String(req.headers.authorization || "");
    assert.match(authorization, /^Bearer wcep1\./);
    const token = authorization.slice("Bearer ".length);
    const ticketId = token.split(".")[1];
    const stored = tickets.get(ticketId);
    assert.ok(stored);
    assert.equal(token, stored.token);
    if (faultMode === "oversized-submit-streamed") {
      faultSubmitCount += 1;
      await readBody(req);
      return sendOversizedJson(res);
    }
    if (faultMode === "interrupted-submit") {
      faultSubmitCount += 1;
      await readBody(req);
      return sendInterruptedJson(res);
    }
    if (stored.bad) badHashSubmitCount += 1;
    else submitCount += 1;
    const bodyText = await readBody(req);
    assert.equal(bodyText.includes(token), false);
    const body = JSON.parse(bodyText);
    if (stored.ticket.account === "warming-submit-user") {
      warmingSubmitBodies.push(bodyText);
      if (warmingSubmitBodies.length === 1) {
        return sendJson(res, 503, {
          ok: false,
          marker: tool.PILOT_MARKER,
          error: "remote_truth_warming",
        });
      }
    }
    assert.deepEqual(Object.keys(body).sort(), ["envelope", "proof_bundle", "signature"]);
    const envelope = t.canonicalResult(body.envelope);
    assert.equal(body.signature.alg, "ed25519");
    assert.equal(body.signature.key_id, envelope.executor_node_id);
    assert.equal(
      crypto.verify(
        null,
        t.resultSigningBytes(envelope),
        crypto.createPublicKey(envelope.executor_pubkey),
        Buffer.from(body.signature.sig, "hex"),
      ),
      true,
    );
    assert.equal(envelope.ticket_id, stored.ticket.ticket_id);
    assert.equal(envelope.account, stored.ticket.account);
    assert.equal(envelope.dataset_id, stored.ticket.dataset_id);
    assert.equal(envelope.expected_input_hash, stored.ticket.expected_input_hash);
    assert.equal(envelope.input_hash, stored.ticket.expected_input_hash);
    assert.equal(envelope.fetched_input_hash, stored.ticket.expected_input_hash);
    assert.equal(envelope.transport_mode, "outbound_bundle");
    assert.equal(envelope.executor_http_base, "");
    const bundle = body.proof_bundle;
    assert.equal(bundle.marker, tool.PILOT_MARKER);
    assert.equal(bundle.version, 1);
    assert.equal(bundle.transport_mode, "outbound_bundle");
    assert.equal(bundle.ticket_id, envelope.ticket_id);
    assert.equal(bundle.executor_node_id, envelope.executor_node_id);
    assert.equal(bundle.job_id, envelope.job_id);
    assert.equal(bundle.receipt_id, envelope.receipt_id);
    assert.deepEqual(bundle.health, { ok: true, nodeId: envelope.executor_node_id, peers: [] });
    assert.equal(bundle.job.account, envelope.account);
    assert.equal(bundle.job.kind, tool.TASK_CLASS);
    assert.equal(bundle.job.dataset_id, envelope.dataset_id);
    const plaintext = JSON.parse(bundle.job.plaintext);
    assert.equal(plaintext.capability_ticket_id, envelope.ticket_id);
    assert.equal(plaintext.executor_node_id, envelope.executor_node_id);
    assert.equal(bundle.receipt.status, "completed");
    assert.equal(bundle.receipt.output.verified, true);
    assert.equal(bundle.receipt.output.fetched_input_hash, expectedHash);
    assert.equal(bundle.receipt.input_hash, expectedHash);
    assert.equal(bundle.receipt.output_hash, envelope.output_hash);
    const before = balances.get(envelope.account) || 0;
    const after = before + 3;
    balances.set(envelope.account, after);
    return sendJson(res, 200, {
      ok: true,
      marker: tool.PILOT_MARKER,
      remote_executor: true,
      executor_node_id: envelope.executor_node_id,
      transport_mode: "outbound_bundle",
      coordinator_inbound_fetch: false,
      participant_outbound_bundle: true,
      signature_verified: true,
      remote_health_verified: true,
      remote_job_verified: true,
      remote_receipt_verified: true,
      imported_truth: { receipt: true, job: true, completed: true },
      capability_consumed: true,
      ticket_id: envelope.ticket_id,
      account: envelope.account,
      task_class: envelope.task_class,
      job_id: envelope.job_id,
      receipt_id: envelope.receipt_id,
      dataset_id: envelope.dataset_id,
      wc: {
        before,
        before_exact: String(before),
        before_quanta: String(BigInt(before) * 1_000_000_000n),
        after_local: after,
        after_local_exact: String(after),
        after_local_quanta: String(BigInt(after) * 1_000_000_000n),
        delta: 3,
        terminal_award_wc: 3,
        fixed_award_wc: 3,
        acceptance_local_delta: true,
        numeric_authority: "nano_wc_fixed_point_v1",
      },
      acceptance: {
        credited: true,
        duplicate: false,
        recovered_after_acceptance: false,
      },
      completed_ticket_status: "completed",
      participant_selected_award: false,
      automatic_background_loop: false,
      generic_credit_route: false,
      wc_to_void: false,
      wallet_send: false,
      buy_void_fulfillment: false,
      money_movement: false,
    });
  }
  return sendJson(res, 404, { ok: false, error: "not_found" });
});

try {
  const success = await runClient([
    "run",
    "--account", "outside-user-no-node-v1",
    "--coordinator-base", base,
    "--coordinator-node-id", coordinatorNodeId,
    "--state-dir", successState,
  ]);
  assert.equal(success.code, 0, `success run failed: ${success.stderr}`);
  assert.match(success.stdout, /VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_EARNED_3_WC_EXACT_GREEN/);
  assert.match(success.stdout, /full_void_node_required=false/);
  assert.match(success.stdout, /inbound_executor_reachability_required=false/);
  assert.match(success.stdout, /wc_delta=3/);
  assert.match(success.stdout, /wc_before_exact=0/);
  assert.match(success.stdout, /wc_after_exact=3/);
  assert.match(success.stdout, /wc_numeric_authority=nano_wc_fixed_point_v1/);
  assert.match(success.stdout, /recovered_terminal=false/);
  assert.equal(success.stderr, "");
  assert.equal(claimCount, 1);
  assert.equal(submitCount, 1);
  assert.equal(balances.get("outside-user-no-node-v1"), 3);

  const identityDir = path.join(successState, "identity");
  const pendingDir = path.join(successState, "pending");
  const receiptsDir = path.join(successState, "receipts");
  assert.equal(mode(successState), 0o700);
  assert.equal(mode(identityDir), 0o700);
  assert.equal(mode(pendingDir), 0o700);
  assert.equal(mode(receiptsDir), 0o700);
  assert.equal(mode(path.join(identityDir, "executor-private-key.pem")), 0o600);
  assert.equal(mode(path.join(identityDir, "executor-public-key.pem")), 0o600);
  assert.equal(mode(path.join(identityDir, "identity.json")), 0o600);
  assert.deepEqual(fs.readdirSync(pendingDir), []);
  const receipts = fs.readdirSync(receiptsDir);
  assert.equal(receipts.length, 1);
  const receiptFile = path.join(receiptsDir, receipts[0]);
  assert.equal(mode(receiptFile), 0o600);
  const receiptText = fs.readFileSync(receiptFile, "utf8");
  assert.equal(receiptText.includes("capability_token"), false);
  for (const stored of tickets.values()) {
    assert.equal(success.stdout.includes(stored.token), false);
    assert.equal(receiptText.includes(stored.token), false);
  }
  const receipt = JSON.parse(receiptText);
  assert.equal(receipt.full_void_node_required, false);
  assert.equal(receipt.loopback_sign_claim_used, false);
  assert.equal(receipt.loopback_execute_local_used, false);
  assert.equal(receipt.participant_selected_dataset, false);
  assert.equal(receipt.participant_selected_award, false);
  assert.equal(receipt.wc.delta, 3);
  assert.equal(receipt.wc.before_exact, "0");
  assert.equal(receipt.wc.before_quanta, "0");
  assert.equal(receipt.wc.after_exact, "3");
  assert.equal(receipt.wc.after_quanta, "3000000000");
  assert.equal(receipt.wc.numeric_authority, "nano_wc_fixed_point_v1");
  assert.equal(receipt.wc.recovered_terminal, false);

  const successStored = [...tickets.values()].find(
    (entry) => entry.ticket.account === "outside-user-no-node-v1",
  );
  assert.ok(successStored);

  const recoveredTerminalAccounting = t.validateCoordinatorSubmission(
    {
      ok: true,
      marker: tool.PILOT_MARKER,
      idempotent: true,
      recovered_terminal: true,
      capability_consumed: true,
      ticket_id: successStored.ticket.ticket_id,
      account: successStored.ticket.account,
      job_id: "job_recovered_terminal_v1",
      receipt_id: "rcpt_recovered_terminal_v1",
      dataset_id: successStored.ticket.dataset_id,
      wc: {
        delta: 0,
        original_delta: 3,
        fixed_award_wc: 3,
        canonical_redeemable_after_local: 3,
        canonical_redeemable_after_local_exact: "3",
        canonical_redeemable_after_local_quanta: "3000000000",
        numeric_authority: "nano_wc_fixed_point_v1",
      },
      completed_ticket_status: "completed",
      transaction_phase: "completed",
      money_movement: false,
    },
    successStored.ticket,
  );
  assert.equal(recoveredTerminalAccounting.beforeExact, "0");
  assert.equal(recoveredTerminalAccounting.afterExact, "3");
  assert.equal(recoveredTerminalAccounting.recoveredTerminal, true);

  const recoveredAcceptanceAccounting = t.validateCoordinatorSubmission(
    {
      ok: true,
      marker: tool.PILOT_MARKER,
      remote_executor: true,
      executor_node_id: successStored.ticket.executor_node_id,
      transport_mode: "outbound_bundle",
      coordinator_inbound_fetch: false,
      participant_outbound_bundle: true,
      signature_verified: true,
      remote_health_verified: true,
      remote_job_verified: true,
      remote_receipt_verified: true,
      capability_consumed: true,
      ticket_id: successStored.ticket.ticket_id,
      account: successStored.ticket.account,
      dataset_id: successStored.ticket.dataset_id,
      wc: {
        before: 3,
        before_exact: "3",
        before_quanta: "3000000000",
        after_local: 3,
        after_local_exact: "3",
        after_local_quanta: "3000000000",
        delta: 0,
        terminal_award_wc: 3,
        fixed_award_wc: 3,
        acceptance_local_delta: true,
        numeric_authority: "nano_wc_fixed_point_v1",
      },
      acceptance: {
        credited: false,
        duplicate: true,
        recovered_after_acceptance: true,
      },
      participant_selected_award: false,
      money_movement: false,
    },
    successStored.ticket,
  );
  assert.equal(recoveredAcceptanceAccounting.beforeExact, "0");
  assert.equal(recoveredAcceptanceAccounting.afterExact, "3");
  assert.equal(recoveredAcceptanceAccounting.recoveredTerminal, true);

  assert.throws(
    () => t.validateCoordinatorSubmission(
      {
        ok: true,
        marker: tool.PILOT_MARKER,
        idempotent: true,
        recovered_terminal: true,
        capability_consumed: true,
        ticket_id: successStored.ticket.ticket_id,
        account: successStored.ticket.account,
        dataset_id: successStored.ticket.dataset_id,
        wc: {
          delta: 0,
          original_delta: 3,
          fixed_award_wc: 3,
          canonical_redeemable_after_local_exact: "3",
          canonical_redeemable_after_local_quanta: "2999999999",
          numeric_authority: "nano_wc_fixed_point_v1",
        },
        completed_ticket_status: "completed",
        money_movement: false,
      },
      successStored.ticket,
    ),
    /coordinator_submission_response_invalid/,
  );

  const firstIdentity = JSON.parse(
    fs.readFileSync(path.join(identityDir, "identity.json"), "utf8"),
  );
  const identityRun = await runClient([
    "identity",
    "--state-dir", successState,
  ]);
  assert.equal(identityRun.code, 0);
  assert.match(identityRun.stdout, new RegExp(`executor_node_id=${firstIdentity.node_id}`));
  assert.match(identityRun.stdout, /VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_IDENTITY_EXACT_GREEN/);

  const wrongCoordinator = await runClient([
    "status",
    "--account", "wrong-coordinator-user",
    "--coordinator-base", base,
    "--coordinator-node-id", "d".repeat(32),
    "--state-dir", path.join(root, "wrong-coordinator-state"),
  ]);
  assert.notEqual(wrongCoordinator.code, 0);
  assert.match(wrongCoordinator.stderr, /coordinator_node_identity_mismatch/);
  assert.equal(claimCount, 1);

  const badHash = await runClient([
    "run",
    "--account", "bad-hash-user",
    "--coordinator-base", base,
    "--coordinator-node-id", coordinatorNodeId,
    "--state-dir", failureState,
  ]);
  assert.notEqual(badHash.code, 0);
  assert.match(badHash.stderr, /dataset_fetch_verify_failed/);
  assert.match(badHash.stderr, /VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_HOLD/);
  assert.equal(badHashSubmitCount, 0);
  const failurePending = fs.readdirSync(path.join(failureState, "pending"));
  assert.equal(failurePending.length, 1);
  const pendingPath = path.join(failureState, "pending", failurePending[0]);
  const pendingText = fs.readFileSync(pendingPath, "utf8");
  const pending = JSON.parse(pendingText);
  assert.equal(typeof pending.capability_token, "string");
  assert.equal(mode(pendingPath), 0o600);
  assert.equal(badHash.stdout.includes(pending.capability_token), false);
  assert.equal(badHash.stderr.includes(pending.capability_token), false);

  badDatasetReady = true;
  const claimsBeforeResume = claimCount;
  const resumed = await runClient([
    "run",
    "--account", "bad-hash-user",
    "--coordinator-base", base,
    "--coordinator-node-id", coordinatorNodeId,
    "--state-dir", failureState,
  ]);
  assert.equal(resumed.code, 0, `resume run failed: ${resumed.stderr}`);
  assert.match(resumed.stdout, /resumed_pending_ticket=true/);
  assert.match(resumed.stdout, /VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_EARNED_3_WC_EXACT_GREEN/);
  assert.equal(claimCount, claimsBeforeResume);
  assert.equal(badHashSubmitCount, 1);
  assert.deepEqual(fs.readdirSync(path.join(failureState, "pending")), []);
  assert.equal(balances.get("bad-hash-user"), 3);
  assert.equal(resumed.stdout.includes(pending.capability_token), false);
  assert.equal(resumed.stderr.includes(pending.capability_token), false);

  assert.equal(
    t.transientRemoteTruthRetryBudgetMs,
    3_000,
  );

  const delayedBudgetMs = 250;
  const delayedStarted = performance.now();
  await assert.rejects(
    () =>
      t.requestJsonWithTransientRemoteTruthRetry(
        `${base}/__test/transient-warming-deadline`,
        { method: "POST" },
        30_000,
        [],
        delayedBudgetMs,
      ),
    (error) => {
      assert.equal(error?.code, "remote_truth_warming");
      return true;
    },
  );
  const delayedElapsed = performance.now() - delayedStarted;
  assert.equal(delayedWarmingAttempts, 2);
  assert.ok(
    delayedElapsed < 1_000,
    `delayed warming retry exceeded total budget wall: ${delayedElapsed}`,
  );

  const stalledBudgetMs = 250;
  const stalledStarted = performance.now();
  await assert.rejects(
    () =>
      t.requestJsonWithTransientRemoteTruthRetry(
        `${base}/__test/transient-warming-stall`,
        { method: "POST" },
        30_000,
        [],
        stalledBudgetMs,
      ),
    (error) => {
      assert.equal(error?.code, "request_timeout");
      return true;
    },
  );
  const stalledElapsed = performance.now() - stalledStarted;
  assert.equal(stalledRetryAttempts, 1);
  assert.ok(
    stalledElapsed < 1_000,
    `stalled retry exceeded total budget wall: ${stalledElapsed}`,
  );

  const claimsBeforeWarmingClaim = claimCount;
  const submitsBeforeWarmingClaim = submitCount;
  const warmingClaim = await runClient([
    "run",
    "--account", "warming-claim-user",
    "--coordinator-base", base,
    "--coordinator-node-id", coordinatorNodeId,
    "--state-dir", path.join(root, "warming-claim-state"),
  ]);
  assert.equal(
    warmingClaim.code,
    0,
    `warming claim run failed: ${warmingClaim.stderr}`,
  );
  assert.equal(claimCount, claimsBeforeWarmingClaim + 2);
  assert.equal(submitCount, submitsBeforeWarmingClaim + 1);
  assert.equal(warmingClaimBodies.length, 2);
  assert.equal(warmingClaimBodies[0], warmingClaimBodies[1]);
  assert.match(
    warmingClaim.stdout,
    /VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_EARNED_3_WC_EXACT_GREEN/,
  );
  assert.equal(balances.get("warming-claim-user"), 3);

  const claimsBeforeWarmingSubmit = claimCount;
  const submitsBeforeWarmingSubmit = submitCount;
  const warmingSubmit = await runClient([
    "run",
    "--account", "warming-submit-user",
    "--coordinator-base", base,
    "--coordinator-node-id", coordinatorNodeId,
    "--state-dir", path.join(root, "warming-submit-state"),
  ]);
  assert.equal(
    warmingSubmit.code,
    0,
    `warming submit run failed: ${warmingSubmit.stderr}`,
  );
  assert.equal(claimCount, claimsBeforeWarmingSubmit + 1);
  assert.equal(submitCount, submitsBeforeWarmingSubmit + 2);
  assert.equal(warmingSubmitBodies.length, 2);
  assert.equal(warmingSubmitBodies[0], warmingSubmitBodies[1]);
  assert.match(
    warmingSubmit.stdout,
    /VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_EARNED_3_WC_EXACT_GREEN/,
  );
  assert.equal(balances.get("warming-submit-user"), 3);

  const claimsBeforeFaults = claimCount;

  const oversizedHealthState = path.join(
    root,
    "oversized-health-state",
  );
  const oversizedHealth = await runFault(
    "oversized-health-declared",
    [
      "status",
      "--account", "oversized-health-user",
      "--coordinator-base", base,
      "--coordinator-node-id", coordinatorNodeId,
      "--state-dir", oversizedHealthState,
    ],
  );
  assert.notEqual(oversizedHealth.code, 0);
  assert.match(oversizedHealth.stderr, /response_too_large/);
  assert.equal(claimCount, claimsBeforeFaults);

  const oversizedStatus = await runFault(
    "oversized-status-streamed",
    [
      "status",
      "--account", "oversized-status-user",
      "--coordinator-base", base,
      "--coordinator-node-id", coordinatorNodeId,
      "--state-dir", path.join(root, "oversized-status-state"),
    ],
  );
  assert.notEqual(oversizedStatus.code, 0);
  assert.match(oversizedStatus.stderr, /response_too_large/);
  assert.equal(claimCount, claimsBeforeFaults);

  const oversizedClaimState = path.join(
    root,
    "oversized-claim-state",
  );
  const oversizedClaim = await runFault(
    "oversized-claim-streamed",
    [
      "run",
      "--account", "oversized-claim-user",
      "--coordinator-base", base,
      "--coordinator-node-id", coordinatorNodeId,
      "--state-dir", oversizedClaimState,
    ],
  );
  assert.notEqual(oversizedClaim.code, 0);
  assert.match(oversizedClaim.stderr, /response_too_large/);
  assert.deepEqual(
    fs.readdirSync(path.join(oversizedClaimState, "pending")),
    [],
  );
  assert.deepEqual(
    fs.readdirSync(path.join(oversizedClaimState, "receipts")),
    [],
  );

  const oversizedDatasetState = path.join(
    root,
    "oversized-dataset-state",
  );
  const claimsBeforeOversizedDataset = claimCount;
  const submitsBeforeOversizedDataset = submitCount;
  const oversizedDataset = await runFault(
    "oversized-dataset-streamed",
    [
      "run",
      "--account", "oversized-dataset-user",
      "--coordinator-base", base,
      "--coordinator-node-id", coordinatorNodeId,
      "--state-dir", oversizedDatasetState,
      "--max-dataset-bytes", "1024",
    ],
  );
  assert.notEqual(oversizedDataset.code, 0);
  assert.match(oversizedDataset.stderr, /dataset_too_large/);
  assert.equal(claimCount, claimsBeforeOversizedDataset + 1);
  assert.equal(submitCount, submitsBeforeOversizedDataset);
  assert.equal(oversizedDatasetRequests, 1);
  assert.equal(
    fs.readdirSync(path.join(oversizedDatasetState, "pending")).length,
    1,
  );
  assert.deepEqual(
    fs.readdirSync(path.join(oversizedDatasetState, "receipts")),
    [],
  );
  assert.doesNotMatch(
    oversizedDataset.stdout,
    /EARNED_3_WC_EXACT_GREEN/,
  );

  const oversizedSubmitState = path.join(
    root,
    "oversized-submit-state",
  );
  const oversizedSubmit = await runFault(
    "oversized-submit-streamed",
    [
      "run",
      "--account", "oversized-submit-user",
      "--coordinator-base", base,
      "--coordinator-node-id", coordinatorNodeId,
      "--state-dir", oversizedSubmitState,
    ],
  );
  assert.notEqual(oversizedSubmit.code, 0);
  assert.match(oversizedSubmit.stderr, /response_too_large/);
  assert.equal(
    fs.readdirSync(path.join(oversizedSubmitState, "pending")).length,
    1,
  );
  assert.deepEqual(
    fs.readdirSync(path.join(oversizedSubmitState, "receipts")),
    [],
  );
  assert.doesNotMatch(
    oversizedSubmit.stdout,
    /EARNED_3_WC_EXACT_GREEN/,
  );

  const interruptedSubmitState = path.join(
    root,
    "interrupted-submit-state",
  );
  const interruptedSubmit = await runFault(
    "interrupted-submit",
    [
      "run",
      "--account", "interrupted-submit-user",
      "--coordinator-base", base,
      "--coordinator-node-id", coordinatorNodeId,
      "--state-dir", interruptedSubmitState,
    ],
  );
  assert.notEqual(interruptedSubmit.code, 0);
  assert.match(interruptedSubmit.stderr, /request_failed/);
  assert.equal(
    fs.readdirSync(path.join(interruptedSubmitState, "pending")).length,
    1,
  );
  assert.deepEqual(
    fs.readdirSync(path.join(interruptedSubmitState, "receipts")),
    [],
  );
  assert.doesNotMatch(
    interruptedSubmit.stdout,
    /EARNED_3_WC_EXACT_GREEN/,
  );
  assert.equal(faultSubmitCount, 2);
  assert.equal(balances.has("oversized-submit-user"), false);
  assert.equal(balances.has("interrupted-submit-user"), false);

  console.log("fixture_cases=10");
  console.log("success_earn_cases=2");
  console.log("hold_cases=8");
  console.log("pending_ticket_resume_cases=1");
  console.log("fixed_point_fresh_accounting_cases=1");
  console.log("fixed_point_recovered_terminal_cases=2");
  console.log("fixed_point_invalid_quanta_cases=1");
  console.log(
    `control_response_limit_bytes=${tool.MAX_CONTROL_RESPONSE_BYTES}`,
  );
  console.log("control_response_fault_cases=5");
  console.log("dataset_streamed_oversize_cases=1");
  console.log("dataset_bytes_bounded_before_buffering=true");
  console.log("transient_remote_truth_warming_claim_retry_cases=1");
  console.log("transient_remote_truth_warming_submit_retry_cases=1");
  console.log("transient_retry_reuses_exact_request_body=true");
  console.log("transient_retry_total_budget_ms=3000");
  console.log("transient_retry_remaining_budget_caps_request_timeout=true");
  console.log("automatic_resubmission=false");
  console.log("full_void_node_required=false");
  console.log("loopback_sign_claim_used=false");
  console.log("loopback_execute_local_used=false");
  console.log("participant_selected_award=false");
  console.log("raw_empty_catches=0");
  console.log("VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_PROOF_EXACT_GREEN");
} finally {
  await close(server);
  fs.rmSync(root, { recursive: true, force: true });
}

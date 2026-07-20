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
]) {
  assert.equal(source.includes(required), true, `required client marker missing: ${required}`);
}
assert.equal(source.includes("--dataset-id"), false);
assert.equal(source.includes("--award"), false);

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

const { server, base } = await listen(async (req, res) => {
  const url = new URL(req.url || "/", base);
  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, { ok: true, nodeId: coordinatorNodeId });
  }
  if (req.method === "GET" && url.pathname === "/wc/public-earning-pilot-v1/status") {
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
    const payload = JSON.parse(await readBody(req));
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
    if (stored.bad) badHashSubmitCount += 1;
    else submitCount += 1;
    const bodyText = await readBody(req);
    assert.equal(bodyText.includes(token), false);
    const body = JSON.parse(bodyText);
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
        after,
        delta: 3,
        fixed_award_wc: 3,
        canonical_redeemable: true,
      },
      acceptance: { credited: true, duplicate: false },
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

  console.log("fixture_cases=4");
  console.log("success_earn_cases=2");
  console.log("hold_cases=2");
  console.log("pending_ticket_resume_cases=1");
  console.log("full_void_node_required=false");
  console.log("loopback_sign_claim_used=false");
  console.log("loopback_execute_local_used=false");
  console.log("participant_selected_award=false");
  console.log("VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_PROOF_EXACT_GREEN");
} finally {
  await close(server);
  fs.rmSync(root, { recursive: true, force: true });
}

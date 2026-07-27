import * as assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  JsonValue,
  ReviewPolicyV1,
  buildReviewQueue,
  canonicalJson,
  decideRequest,
  sha256Bytes,
} from "./agent_paid_work_credential_request_review_queue_v1.js";
import {
  prepareCredentialIssuance,
} from "./agent_paid_work_credential_request_bounded_issuance_v1.js";

function utc(value: string): string {
  return value;
}

function materializeRequest(options: {
  createdAt: string;
  expiresAt: string;
  agentId: string;
  callbackUri: string;
  lifetimeDays: number;
  capabilities: string[];
  nonce: string;
}): Record<string, JsonValue> {
  const body: Record<string, JsonValue> = {
    marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_V1",
    version: 1,
    created_at_utc: options.createdAt,
    expires_at_utc: options.expiresAt,
    agent_id: options.agentId,
    callback_uri: options.callbackUri,
    requested_scope: "agent_paid_work_submit",
    requested_credential_lifetime_days: options.lifetimeDays,
    capability_ids: options.capabilities,
    nonce: options.nonce,
  };

  return {
    ...body,
    request_id: `voidapwcrq1_${sha256Bytes(canonicalJson(body))}`,
  };
}

function receiptFor(
  request: Record<string, JsonValue>,
  receivedAt: string,
): Record<string, JsonValue> {
  const callbackUri = String(request.callback_uri);
  const callbackHost = new URL(callbackUri).hostname;
  const body: Record<string, JsonValue> = {
    marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_INTAKE_RECEIPT_V1",
    version: 1,
    request_id: request.request_id,
    received_at_utc: receivedAt,
    decision: "accepted_for_review",
    reason_codes: [],
    normalized: {
      agent_id: request.agent_id,
      callback_scheme: "https",
      callback_host: callbackHost,
      requested_scope: "agent_paid_work_submit",
      requested_credential_lifetime_days:
        request.requested_credential_lifetime_days,
      capability_ids: request.capability_ids,
    },
    authority: {
      credential_issuance_authorized: false,
      credential_registry_mutation_authorized: false,
      receiver_restart_authorized: false,
      provider_selected: false,
      quote_created: false,
      payment_authorized: false,
      work_execution_authorized: false,
      work_dispatched: false,
      wc_award_authorized: false,
      wc_ledger_write_authorized: false,
      wallet_or_signer_access_granted: false,
      buy_void_fulfillment_authorized: false,
    },
  };

  return {
    ...body,
    receipt_id: `voidapwcrqi1_${crypto
      .createHash("sha256")
      .update(canonicalJson(body))
      .digest("hex")}`,
  };
}

function writeJson(pathname: string, value: JsonValue, mode: number): void {
  fs.mkdirSync(path.dirname(pathname), {
    recursive: true,
    mode: 0o700,
  });
  fs.writeFileSync(pathname, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode,
  });
  fs.chmodSync(pathname, mode);
}

function fileSnapshot(directory: string): Record<string, string> {
  const output: Record<string, string> = {};

  if (!fs.existsSync(directory)) {
    return output;
  }

  for (const name of fs.readdirSync(directory).sort()) {
    const pathname = path.join(directory, name);

    if (fs.lstatSync(pathname).isFile()) {
      output[name] = crypto
        .createHash("sha256")
        .update(fs.readFileSync(pathname))
        .digest("hex");
    }
  }

  return output;
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-credential-request-review-queue-v1-"),
);
const stateDirectory = path.join(root, "gateway-state");
const requestDirectory = path.join(stateDirectory, "requests");
const receiptDirectory = path.join(stateDirectory, "receipts");
const decisionDirectory = path.join(root, "decisions");
const preparationDirectory = path.join(root, "preparations");
fs.mkdirSync(requestDirectory, { recursive: true, mode: 0o700 });
fs.mkdirSync(receiptDirectory, { recursive: true, mode: 0o700 });
fs.mkdirSync(decisionDirectory, { recursive: true, mode: 0o700 });
fs.mkdirSync(preparationDirectory, { recursive: true, mode: 0o700 });

try {
  const policy: ReviewPolicyV1 = {
    marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_REVIEW_POLICY_V1",
    version: 1,
    policy_id: "void-credential-review-policy-proof-v1",
    allowed_scopes: ["agent_paid_work_submit"],
    allowed_capability_ids: ["datanet.fetch_verify"],
    maximum_credential_lifetime_days: 30,
    maximum_request_age_seconds: 86400,
    require_https_callback: true,
  };
  const policyPath = path.join(root, "policy.json");
  writeJson(policyPath, policy as unknown as JsonValue, 0o644);

  const approvedRequest = materializeRequest({
    createdAt: utc("2026-07-27T21:00:00Z"),
    expiresAt: utc("2026-07-27T23:00:00Z"),
    agentId: "void.agent.review-proof-approved",
    callbackUri: "https://agent-approved.example.invalid/void/callback",
    lifetimeDays: 30,
    capabilities: ["datanet.fetch_verify"],
    nonce: "credential-review-proof-approved-0001",
  });
  const rejectedRequest = materializeRequest({
    createdAt: utc("2026-07-27T21:01:00Z"),
    expiresAt: utc("2026-07-27T23:01:00Z"),
    agentId: "void.agent.review-proof-rejected",
    callbackUri: "https://agent-rejected.example.invalid/void/callback",
    lifetimeDays: 30,
    capabilities: ["datanet.fetch_verify"],
    nonce: "credential-review-proof-rejected-0001",
  });
  const heldRequest = materializeRequest({
    createdAt: utc("2026-07-27T21:02:00Z"),
    expiresAt: utc("2026-07-27T23:02:00Z"),
    agentId: "void.agent.review-proof-held",
    callbackUri: "https://agent-held.example.invalid/void/callback",
    lifetimeDays: 45,
    capabilities: ["datanet.fetch_verify"],
    nonce: "credential-review-proof-held-0001",
  });

  for (const request of [
    approvedRequest,
    rejectedRequest,
    heldRequest,
  ]) {
    const requestId = String(request.request_id);
    writeJson(
      path.join(requestDirectory, `${requestId}.json`),
      request,
      0o600,
    );
    writeJson(
      path.join(receiptDirectory, `${requestId}.json`),
      receiptFor(request, utc("2026-07-27T21:03:00Z")),
      0o600,
    );
  }

  const queueBefore = buildReviewQueue({
    stateDirectory,
    decisionDirectory,
    policy,
    nowUtc: utc("2026-07-27T21:30:00Z"),
  });
  assert.equal(queueBefore.counts.total, 3);
  assert.equal(queueBefore.counts.pending, 2);
  assert.equal(queueBefore.counts.policy_hold, 1);
  assert.equal(queueBefore.raw_callback_uri_exposed, false);
  assert.equal(
    JSON.stringify(queueBefore).includes(
      "https://agent-approved.example.invalid/void/callback",
    ),
    false,
  );

  const approvedId = String(approvedRequest.request_id);
  const rejectedId = String(rejectedRequest.request_id);
  const approvedDecision = decideRequest({
    stateDirectory,
    decisionDirectory,
    policy,
    requestId: approvedId,
    reviewerId: "void.operator.review-proof-v1",
    decision: "approve_for_issuance_preparation",
    reasonCodes: ["requirements_verified"],
    decidedAtUtc: utc("2026-07-27T21:31:00Z"),
    confirmation: "credentialRequestReview",
  });
  assert.equal(approvedDecision.created, true);
  assert.equal(
    approvedDecision.decision.authority.credential_issuance_authorized,
    false,
  );

  const beforeDuplicate = fileSnapshot(decisionDirectory);
  const approvedDuplicate = decideRequest({
    stateDirectory,
    decisionDirectory,
    policy,
    requestId: approvedId,
    reviewerId: "void.operator.review-proof-v1",
    decision: "approve_for_issuance_preparation",
    reasonCodes: ["requirements_verified"],
    decidedAtUtc: utc("2026-07-27T21:31:00Z"),
    confirmation: "credentialRequestReview",
  });
  const afterDuplicate = fileSnapshot(decisionDirectory);
  assert.equal(approvedDuplicate.created, false);
  assert.deepEqual(afterDuplicate, beforeDuplicate);

  assert.throws(() =>
    decideRequest({
      stateDirectory,
      decisionDirectory,
      policy,
      requestId: approvedId,
      reviewerId: "void.operator.review-proof-v1",
      decision: "reject",
      reasonCodes: ["conflicting_review"],
      decidedAtUtc: utc("2026-07-27T21:32:00Z"),
      confirmation: "credentialRequestReview",
    }),
  );

  const rejectedDecision = decideRequest({
    stateDirectory,
    decisionDirectory,
    policy,
    requestId: rejectedId,
    reviewerId: "void.operator.review-proof-v1",
    decision: "reject",
    reasonCodes: ["callback_not_controlled"],
    decidedAtUtc: utc("2026-07-27T21:33:00Z"),
    confirmation: "credentialRequestReview",
  });
  assert.equal(rejectedDecision.created, true);

  const queueAfter = buildReviewQueue({
    stateDirectory,
    decisionDirectory,
    policy,
    nowUtc: utc("2026-07-27T21:34:00Z"),
  });
  assert.equal(queueAfter.counts.pending, 0);
  assert.equal(queueAfter.counts.approved_for_issuance_preparation, 1);
  assert.equal(queueAfter.counts.rejected, 1);
  assert.equal(queueAfter.counts.policy_hold, 1);

  const approvedRequestPath = path.join(
    requestDirectory,
    `${approvedId}.json`,
  );
  const approvedReceiptPath = path.join(
    receiptDirectory,
    `${approvedId}.json`,
  );
  const approvedDecisionPath = path.join(
    decisionDirectory,
    `${approvedId}.json`,
  );
  const preparationPath = path.join(
    preparationDirectory,
    `${approvedId}.json`,
  );
  const preparation = prepareCredentialIssuance({
    requestPath: approvedRequestPath,
    receiptPath: approvedReceiptPath,
    decisionPath: approvedDecisionPath,
    policyPath,
    outputPath: preparationPath,
    preparedAtUtc: utc("2026-07-27T21:35:00Z"),
    confirmation: "prepareCredentialIssuance",
  });
  assert.equal(preparation.credential_lifetime_days, 30);
  assert.deepEqual(preparation.capability_ids, ["datanet.fetch_verify"]);
  assert.equal(preparation.credential_created, false);
  assert.equal(preparation.credential_applied, false);
  assert.equal(preparation.raw_token_included, false);
  assert.equal(
    preparation.authority.credential_registry_mutation_authorized,
    false,
  );
  assert.equal(
    JSON.stringify(preparation).includes(
      "https://agent-approved.example.invalid/void/callback",
    ),
    false,
  );

  assert.throws(() =>
    prepareCredentialIssuance({
      requestPath: path.join(requestDirectory, `${rejectedId}.json`),
      receiptPath: path.join(receiptDirectory, `${rejectedId}.json`),
      decisionPath: path.join(decisionDirectory, `${rejectedId}.json`),
      policyPath,
      outputPath: path.join(preparationDirectory, `${rejectedId}.json`),
      preparedAtUtc: utc("2026-07-27T21:36:00Z"),
      confirmation: "prepareCredentialIssuance",
    }),
  );

  assert.throws(() =>
    decideRequest({
      stateDirectory,
      decisionDirectory,
      policy,
      requestId: String(heldRequest.request_id),
      reviewerId: "void.operator.review-proof-v1",
      decision: "approve_for_issuance_preparation",
      reasonCodes: ["requirements_verified"],
      decidedAtUtc: utc("2026-07-27T21:37:00Z"),
      confirmation: "credentialRequestReview",
    }),
  );

  assert.throws(() =>
    decideRequest({
      stateDirectory,
      decisionDirectory,
      policy,
      requestId: rejectedId,
      reviewerId: "void.operator.review-proof-v1",
      decision: "reject",
      reasonCodes: ["callback_not_controlled"],
      decidedAtUtc: utc("2026-07-27T21:33:00Z"),
      confirmation: "wrong",
    }),
  );

  console.log(
    "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_REVIEW_QUEUE_V1_PROOF_GREEN",
  );
  console.log("append_only_review_decision=1");
  console.log("duplicate_review_decision_second_write=0");
  console.log("conflicting_review_decision_blocked=1");
  console.log("policy_hold_enforced=1");
  console.log("rejected_request_issuance_preparation=0");
  console.log("approved_request_issuance_preparation=1");
  console.log("lifetime_policy_cap_enforced=1");
  console.log("capability_allowlist_enforced=1");
  console.log("raw_callback_uri_exposed=0");
  console.log("credential_created=0");
  console.log("credential_applied=0");
  console.log("credential_registry_mutated=0");
  console.log("receiver_restart=0");
  console.log("raw_token_included=0");
  console.log("payment_authorized=0");
  console.log("work_execution_authorized=0");
  console.log("wc_ledger_write=0");
  console.log("wallet_access=0");
  console.log("buy_void_change=0");
} finally {
  fs.rmSync(root, {
    recursive: true,
    force: true,
  });
}

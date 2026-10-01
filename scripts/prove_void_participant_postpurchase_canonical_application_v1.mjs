#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import {
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1,
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1,
  buildVoidParticipantPostpurchaseProductionRuntimeBindingV1,
} from "../tools/void-participant-postpurchase-production-runtime-binding-v1.mjs";
import {
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1,
} from "../tools/void-participant-postpurchase-finality-v1.mjs";
import {
  buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1,
} from "../tools/void-participant-postpurchase-coupled-candidate-promotion-v1.mjs";
import {
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "../tools/void-coupled-economic-successor-gate-v1.mjs";
import {
  VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_PLAN_V1,
  prepareVoidParticipantPostpurchaseCanonicalApplicationV1,
  verifyVoidParticipantPostpurchaseCanonicalApplicationStateV1,
  verifyVoidParticipantPostpurchaseCanonicalApplicationV1,
  _internal,
} from "../tools/void-participant-postpurchase-canonical-application-v1.mjs";

const ROOT = process.cwd();
const TOOL =
  "tools/void-participant-postpurchase-canonical-application-v1.mjs";
const COUPLED =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const PROMOTION_TOOL =
  "tools/void-participant-postpurchase-coupled-candidate-promotion-v1.mjs";
const CLASSIFIER =
  "tools/void-coupled-economic-successor-gate-v1.mjs";
const RUNTIME_TOOL =
  "tools/void-participant-postpurchase-production-runtime-binding-v1.mjs";

const TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const PARTICIPANT = "0x" + "1".repeat(40);
const FULFILLMENT = "0x" + "2".repeat(40);
const RECIPIENT = "0x" + "3".repeat(40);
const DELIVERY_TX = "0x" + "4".repeat(64);
const CONTROL_TX = "0x" + "5".repeat(64);
const DELIVERY_BLOCK_HASH = "0x" + "6".repeat(64);
const CONTROL_BLOCK_HASH = "0x" + "7".repeat(64);
const DELIVERY_STATE_ROOT = "0x" + "8".repeat(64);
const CONTROL_STATE_ROOT = "0x" + "9".repeat(64);
const GENESIS_BLOCK_HASH =
  "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const GENESIS_STATE_ROOT =
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";
const ORIGIN =
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1;
const PROMOTED_GATE =
  "participant_post_purchase_voidtoken_control_ready";
const MISSING_GATE =
  "participant_post_purchase_voidtoken_control_required";

function canonicalize(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function gitText(args) {
  return execFileSync("/usr/bin/git", args, {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
}

const DELIVERED = "1000000000000000000";
const CONTROLLED = "100000000000000000";
const DELIVERY_BLOCK = "100";
const CONTROL_BLOCK = "101";
const PAYLOAD_KEYS = [
  "schema",
  "chain_id",
  "execution_epoch",
  "delivery_transaction_hash",
  "delivery_receipt_evidence_fingerprint_sha256",
  "delivery_fulfillment_wallet",
  "delivered_token_amount_atoms",
  "delivery_transfer_log_index",
  "delivery_receipt_block_number",
  "delivery_receipt_block_hash",
  "delivery_observed_confirmation_count",
  "delivery_current_confirmation_count",
  "transaction_hash",
  "participant_address",
  "void_token",
  "transfer_recipient",
  "transfer_amount_atoms",
  "transfer_log_index",
  "receipt_block_number",
  "receipt_block_hash",
  "observed_confirmation_count",
  "required_confirmation_count",
];

function finalityAuthority() {
  return {
    source_only: true,
    explicit_input_only: true,
    injected_read_transport_required: true,
    read_only_rpc: true,
    built_in_network_transport: false,
    transaction_submission: false,
    transaction_broadcast: false,
    automatic_retry: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    funds_movement: false,
    market_activation: false,
    public_presale_activation: false,
  };
}

function finalityEvidenceId(value) {
  const payload = {};
  for (const key of PAYLOAD_KEYS) payload[key] = value[key];
  return "sha256:" + sha256(Buffer.from(canonicalJson(payload), "utf8"));
}

const DELIVERY_FINGERPRINT = sha256(
  Buffer.from(
    [
      "chain_id=2050",
      "transaction_hash=" + DELIVERY_TX,
      "receipt_block_number=" + DELIVERY_BLOCK,
      "receipt_block_hash=" + DELIVERY_BLOCK_HASH,
      "void_token_address=" + TOKEN,
      "transfer_from=" + FULFILLMENT,
      "transfer_to=" + PARTICIPANT,
      "token_amount_atoms=" + DELIVERED,
      "transfer_log_index=0",
    ].join("\n"),
    "utf8",
  ),
);

function finalityInputFixture() {
  const evidence = {
    marker: VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1,
    schema: "void.participant-postpurchase-finality-evidence.v1",
    chain_id: 2050,
    execution_epoch: 2,
    delivery_transaction_hash: DELIVERY_TX,
    delivery_receipt_evidence_fingerprint_sha256: DELIVERY_FINGERPRINT,
    delivery_fulfillment_wallet: FULFILLMENT,
    delivered_token_amount_atoms: DELIVERED,
    delivery_transfer_log_index: "0",
    delivery_receipt_block_number: DELIVERY_BLOCK,
    delivery_receipt_block_hash: DELIVERY_BLOCK_HASH,
    delivery_observed_confirmation_count: "6",
    delivery_current_confirmation_count: "21",
    transaction_hash: CONTROL_TX,
    participant_address: PARTICIPANT,
    void_token: TOKEN,
    transfer_recipient: RECIPIENT,
    transfer_amount_atoms: CONTROLLED,
    transfer_log_index: "0",
    receipt_block_number: CONTROL_BLOCK,
    receipt_block_hash: CONTROL_BLOCK_HASH,
    observed_confirmation_count: "11",
    required_confirmation_count: "3",
    evidence_id: "sha256:" + "0".repeat(64),
    rpc_methods_used: [
      "eth_chainId",
      "eth_getTransactionReceipt",
      "eth_getTransactionReceipt",
      "eth_blockNumber",
      "eth_getTransactionReceipt",
      "eth_getTransactionReceipt",
    ],
    exact_delivery_receipt_binding_verified: true,
    stable_delivery_receipt_revalidation_verified: true,
    delivery_to_control_participant_binding_verified: true,
    exact_submission_receipt_binding_verified: true,
    exact_voidtoken_transfer_finality_verified: true,
    stable_receipt_revalidation_verified: true,
    participant_postpurchase_voidtoken_control_finality_source_ready: true,
    runtime_or_launch_evidence: false,
    runtime_route_active: false,
    public_submission_open: false,
    transaction_submission_performed: false,
    transaction_broadcast_performed: false,
    authoritative_chain2050_write_performed: false,
    token_movement_performed_by_this_verifier: false,
    funds_movement_performed_by_this_verifier: false,
    authority: finalityAuthority(),
  };
  evidence.evidence_id = finalityEvidenceId(evidence);
  return {
    expected: {
      delivery_transaction_hash: DELIVERY_TX,
      delivery_receipt_evidence_fingerprint_sha256: DELIVERY_FINGERPRINT,
      participant_address: PARTICIPANT,
      delivered_token_amount_atoms: DELIVERED,
      control_transaction_hash: CONTROL_TX,
      control_transfer_recipient: RECIPIENT,
      control_transfer_amount_atoms: CONTROLLED,
      control_receipt_block_number: CONTROL_BLOCK,
      control_receipt_block_hash: CONTROL_BLOCK_HASH,
      control_transfer_log_index: "0",
      minimum_delivery_confirmation_count: "12",
      minimum_control_confirmation_count: "6",
    },
    evidence,
  };
}

function runtimeBoundary() {
  return {
    production_successor_rpc_endpoint_selected: true,
    exact_production_genesis_read_replica: true,
    p2p_enabled: false,
    discovery_enabled: false,
    raw_public_rpc_allowed: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    validator_mutation: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  };
}

function transport(body, pathname) {
  const bytes = prettyBytes(body);
  return {
    url: new URL(pathname, ORIGIN).href,
    http_status: 200,
    body,
    artifact_sha256: sha256(bytes),
  };
}

function statusResultFixture() {
  return transport(
    {
      ok: true,
      marker: "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1",
      status: "INACTIVE_SUCCESSOR_PUBLIC_READ_RUNTIME_READY",
      chain_id: 2050,
      execution_epoch: 2,
      block_number: "0x0",
      block_hash: GENESIS_BLOCK_HASH,
      state_root: GENESIS_STATE_ROOT,
      query_kinds: ["balance", "code", "receipt"],
      balance_code_block_fixed_to_genesis: true,
      live_receipt_lookup_transport_verified: true,
      successful_receipt_semantics_source_proven: true,
      live_balance_receipt_code_gateway_ready: true,
      runtime_route_active: true,
      public_gateway_active: false,
      ...runtimeBoundary(),
    },
    "/public-node/economic/epoch2/read-status-v1.json",
  );
}

function receiptResultFixture({
  transactionHash,
  blockNumberHex,
  blockHash,
  stateRoot,
  from,
}) {
  const core = {
    query_kind: "receipt",
    chain_id: 2050,
    execution_epoch: 2,
    block_number: blockNumberHex,
    block_hash: blockHash,
    state_root: stateRoot,
    transaction_hash: transactionHash,
    receipt_status: "0x1",
    receipt_from: from,
    receipt_to: TOKEN,
  };
  return transport(
    {
      ok: true,
      marker: "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1",
      status: "LIVE_SUCCESSOR_RECEIPT_VERIFIED",
      receipt_found: true,
      source_evidence_id:
        "sha256:" + sha256(Buffer.from(canonicalJson(core), "utf8")),
      transaction_hash: transactionHash,
      block_number: blockNumberHex,
      block_hash: blockHash,
      state_root: stateRoot,
      receipt_status: "0x1",
      receipt_from: from,
      receipt_to: TOKEN,
      exact_receipt_identity_revalidated: true,
      exact_block_identity_revalidated: true,
      live_receipt_lookup_transport_verified: true,
      successful_receipt_semantics_source_proven: true,
      live_balance_receipt_code_gateway_ready: true,
      runtime_route_active: true,
      public_gateway_active: false,
      ...runtimeBoundary(),
    },
    "/public-node/economic/epoch2/receipt-v1?tx=" + transactionHash,
  );
}

function deliveryResultFixture() {
  return receiptResultFixture({
    transactionHash: DELIVERY_TX,
    blockNumberHex: "0x64",
    blockHash: DELIVERY_BLOCK_HASH,
    stateRoot: DELIVERY_STATE_ROOT,
    from: FULFILLMENT,
  });
}

function controlResultFixture() {
  return receiptResultFixture({
    transactionHash: CONTROL_TX,
    blockNumberHex: "0x65",
    blockHash: CONTROL_BLOCK_HASH,
    stateRoot: CONTROL_STATE_ROOT,
    from: PARTICIPANT,
  });
}

function runtimeBindingReceipt() {
  return buildVoidParticipantPostpurchaseProductionRuntimeBindingV1({
    finalityInput: finalityInputFixture(),
    statusResult: statusResultFixture(),
    deliveryReceiptResult: deliveryResultFixture(),
    controlReceiptResult: controlResultFixture(),
  });
}

function recomputeRuntimeBindingId(receipt) {
  const finality = receipt.finality;
  const status = receipt.runtime.status;
  const delivery = receipt.runtime.delivery;
  const control = receipt.runtime.control;
  const identity = {
    finality_import_id: finality.import_id,
    finality_binding_id: finality.binding_id,
    source_finality_evidence_id: finality.source_evidence_id,
    public_origin: ORIGIN,
    chain_id: 2050,
    execution_epoch: 2,
    status_artifact_sha256: status.artifact_sha256,
    delivery_artifact_sha256: delivery.artifact_sha256,
    control_artifact_sha256: control.artifact_sha256,
    delivery_source_evidence_id: delivery.source_evidence_id,
    control_source_evidence_id: control.source_evidence_id,
    delivery_transaction_hash: delivery.transaction_hash,
    delivery_receipt_block_number: delivery.block_number,
    delivery_receipt_block_hash: delivery.block_hash,
    control_transaction_hash: control.transaction_hash,
    control_receipt_block_number: control.block_number,
    control_receipt_block_hash: control.block_hash,
  };
  return "voidpprtb1_" + sha256(Buffer.from(canonicalJson(identity), "utf8"));
}

function promotionFixture(runtimeReceipt) {
  const coupled = JSON.parse(fs.readFileSync(COUPLED, "utf8"));
  const successor = JSON.parse(fs.readFileSync(SUCCESSOR, "utf8"));
  const head = gitText(["rev-parse", "HEAD"]);
  const tree = gitText(["rev-parse", "HEAD^{tree}"]);
  const runtimeBytes = prettyBytes(runtimeReceipt);
  return buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1({
    candidate: coupled,
    successorMigrationCandidate: successor,
    runtimeBindingReceipt: runtimeReceipt,
    runtimeBindingFileSha256: sha256(runtimeBytes),
    candidateFileSha256: sha256(fs.readFileSync(COUPLED)),
    successorCandidateFileSha256: sha256(fs.readFileSync(SUCCESSOR)),
    repositoryHeadSha: head,
    repositoryTreeSha: tree,
    candidateGitBlobSha1: gitText(["rev-parse", "HEAD:" + COUPLED]),
    successorCandidateGitBlobSha1:
      gitText(["rev-parse", "HEAD:" + SUCCESSOR]),
    classifierGitBlobSha1:
      gitText(["rev-parse", "HEAD:" + CLASSIFIER]),
    promotionToolGitBlobSha1:
      gitText(["rev-parse", "HEAD:" + PROMOTION_TOOL]),
  });
}

function requestFixture() {
  const finalityInput = finalityInputFixture();
  const statusResult = statusResultFixture();
  const deliveryResult = deliveryResultFixture();
  const controlResult = controlResultFixture();
  const runtime = buildVoidParticipantPostpurchaseProductionRuntimeBindingV1({
    finalityInput,
    statusResult,
    deliveryReceiptResult: deliveryResult,
    controlReceiptResult: controlResult,
  });
  const promotion = promotionFixture(runtime);
  const finalityBytes = prettyBytes(finalityInput);
  const statusBytes = prettyBytes(statusResult);
  const deliveryBytes = prettyBytes(deliveryResult);
  const controlBytes = prettyBytes(controlResult);
  const runtimeBytes = prettyBytes(runtime);
  const promotionBytes = prettyBytes(promotion);
  return {
    finalityInput,
    statusResult,
    deliveryResult,
    controlResult,
    runtime,
    promotion,
    finalityBytes,
    statusBytes,
    deliveryBytes,
    controlBytes,
    runtimeBytes,
    promotionBytes,
    request: {
      finality_input_bytes: finalityBytes,
      finality_input_file_sha256: sha256(finalityBytes),
      status_result_bytes: statusBytes,
      status_result_file_sha256: sha256(statusBytes),
      delivery_receipt_result_bytes: deliveryBytes,
      delivery_receipt_result_file_sha256: sha256(deliveryBytes),
      control_receipt_result_bytes: controlBytes,
      control_receipt_result_file_sha256: sha256(controlBytes),
      runtime_binding_receipt_bytes: runtimeBytes,
      runtime_binding_receipt_file_sha256: sha256(runtimeBytes),
      promotion_receipt_bytes: promotionBytes,
      promotion_receipt_file_sha256: sha256(promotionBytes),
    },
  };
}

const authorityTrue = new Set([
  "source_only_application",
  "exact_runtime_binding_receipt_required",
  "exact_runtime_binding_evidence_required",
  "runtime_binding_reexecution_required",
  "exact_promotion_receipt_required",
  "promotion_reexecution_required",
  "canonical_head_candidate_bytes_required",
  "reviewed_repository_generation_required",
  "exact_one_gate_source_delta",
  "canonical_classifier_reexecution",
  "reviewed_git_commit_required",
  "canonical_main_application_required",
  "canonical_remote_main_read_required",
  "external_network_read",
  "filesystem_read",
]);
for (const [key, value] of Object.entries(
  VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_AUTHORITY_V1,
)) {
  assert.equal(value, authorityTrue.has(key), key);
}

const fixture = requestFixture();
const plan =
  prepareVoidParticipantPostpurchaseCanonicalApplicationV1(
    fixture.request,
  );

assert.equal(
  plan.marker,
  VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_PLAN_V1,
);
assert.match(plan.application_plan_id, /^voidppca1_[0-9a-f]{64}$/u);
assert.equal(
  plan.status,
  "PARTICIPANT_CONTROL_CANONICAL_APPLICATION_PREPARED",
);
assert.equal(plan.coupled_target_candidate.status, "HOLD");
assert.equal(
  plan.coupled_target_candidate.gates[PROMOTED_GATE],
  true,
);
assert.equal(
  plan.coupled_target_candidate.gates.coupled_activation_ready,
  false,
);
assert.equal(
  plan.coupled_before.missing_gates.includes(MISSING_GATE),
  true,
);
assert.equal(
  plan.coupled_after.missing_gates.includes(MISSING_GATE),
  false,
);
assert.deepEqual(
  plan.coupled_after.missing_gates,
  plan.coupled_before.missing_gates.filter((gate) => gate !== MISSING_GATE),
);
assert.equal(plan.market_activation_authorized, false);
assert.equal(plan.public_presale_activation_authorized, false);
assert.equal(plan.funds_movement_authorized, false);
assert.equal(plan.runtime_binding_rederived_from_evidence, true);
assert.equal(plan.finality_input_file_sha256, sha256(fixture.finalityBytes));
assert.equal(plan.status_result_file_sha256, sha256(fixture.statusBytes));
assert.equal(
  plan.delivery_receipt_result_file_sha256,
  sha256(fixture.deliveryBytes),
);
assert.equal(
  plan.control_receipt_result_file_sha256,
  sha256(fixture.controlBytes),
);

const sourceCoupled = JSON.parse(fs.readFileSync(COUPLED, "utf8"));
const reset = structuredClone(plan.coupled_target_candidate);
reset.gates[PROMOTED_GATE] = false;
assert.equal(canonicalJson(reset), canonicalJson(sourceCoupled));

const successor = JSON.parse(fs.readFileSync(SUCCESSOR, "utf8"));
const state =
  verifyVoidParticipantPostpurchaseCanonicalApplicationStateV1({
    plan,
    coupledCandidate: plan.coupled_target_candidate,
    successorCandidate: successor,
  });
assert.equal(state.ok, true);
assert.equal(
  state.participant_post_purchase_voidtoken_control_ready,
  true,
);
assert.equal(state.coupled_activation_ready, false);

const decision = classifyVoidCoupledEconomicSuccessorGateV1(
  plan.coupled_target_candidate,
  successor,
);
assert.equal(decision.status, "HOLD");
assert.equal(decision.market_activation_authorized, false);
assert.equal(decision.public_presale_activation_authorized, false);
assert.equal(decision.funds_movement_authorized, false);

const repeat =
  prepareVoidParticipantPostpurchaseCanonicalApplicationV1(
    requestFixture().request,
  );
assert.equal(repeat.application_plan_id, plan.application_plan_id);

assert.throws(
  () =>
    prepareVoidParticipantPostpurchaseCanonicalApplicationV1({
      ...fixture.request,
      runtime_binding_receipt_file_sha256: "0".repeat(64),
    }),
  /PARTICIPANT_CANONICAL_RUNTIME_BINDING_RECEIPT_SHA256_MISMATCH/u,
);

{
  const forgedRuntime = structuredClone(fixture.runtime);
  forgedRuntime.runtime.status.artifact_sha256 = "a".repeat(64);
  forgedRuntime.runtime_binding_id = recomputeRuntimeBindingId(forgedRuntime);
  const forgedPromotion = promotionFixture(forgedRuntime);
  const forgedRuntimeBytes = prettyBytes(forgedRuntime);
  const forgedPromotionBytes = prettyBytes(forgedPromotion);
  assert.throws(
    () =>
      prepareVoidParticipantPostpurchaseCanonicalApplicationV1({
        ...fixture.request,
        runtime_binding_receipt_bytes: forgedRuntimeBytes,
        runtime_binding_receipt_file_sha256: sha256(forgedRuntimeBytes),
        promotion_receipt_bytes: forgedPromotionBytes,
        promotion_receipt_file_sha256: sha256(forgedPromotionBytes),
      }),
    /PARTICIPANT_CANONICAL_RUNTIME_BINDING_REDERIVATION_MISMATCH/u,
  );
}

{
  const altered = structuredClone(fixture.promotion);
  altered.promoted_gate_value = false;
  const bytes = prettyBytes(altered);
  assert.throws(
    () =>
      prepareVoidParticipantPostpurchaseCanonicalApplicationV1({
        ...fixture.request,
        promotion_receipt_bytes: bytes,
        promotion_receipt_file_sha256: sha256(bytes),
      }),
    /PARTICIPANT_CANONICAL_REVIEWED_PROMOTION_RECEIPT_MISMATCH/u,
  );
}

assert.throws(
  () =>
    prepareVoidParticipantPostpurchaseCanonicalApplicationV1({
      ...fixture.request,
      extra: true,
    }),
  /INVALID_PARTICIPANT_CANONICAL_APPLICATION_INPUT_SHAPE/u,
);

{
  const badTarget = structuredClone(plan.coupled_target_candidate);
  badTarget.gates[PROMOTED_GATE] = false;
  assert.throws(
    () =>
      verifyVoidParticipantPostpurchaseCanonicalApplicationStateV1({
        plan,
        coupledCandidate: badTarget,
        successorCandidate: successor,
      }),
    /PARTICIPANT_CANONICAL_COUPLED_TARGET_NOT_APPLIED/u,
  );
}

{
  const fake = structuredClone(plan);
  Object.defineProperty(fake, "status", {
    enumerable: true,
    configurable: true,
    get() {
      return "PARTICIPANT_CONTROL_CANONICAL_APPLICATION_PREPARED";
    },
  });
  assert.throws(
    () =>
      verifyVoidParticipantPostpurchaseCanonicalApplicationStateV1({
        plan: fake,
        coupledCandidate: plan.coupled_target_candidate,
        successorCandidate: successor,
      }),
    /PARTICIPANT_CANONICAL_APPLICATION_PLAN_SHAPE_INVALID/u,
  );
}

{
  const dirtyPath =
    "docs/operators/participant-postpurchase-canonical-application-v1.md";
  const original = fs.readFileSync(dirtyPath);
  try {
    fs.appendFileSync(dirtyPath, "\n");
    assert.throws(
      () =>
        prepareVoidParticipantPostpurchaseCanonicalApplicationV1(
          fixture.request,
        ),
      /PARTICIPANT_CANONICAL_REPOSITORY_NOT_CLEAN/u,
    );
  } finally {
    fs.writeFileSync(dirtyPath, original);
  }
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-participant-canonical-application-"),
);
try {
  fs.chmodSync(temp, 0o700);
  const finalityPath = path.join(temp, "finality-input.json");
  const statusPath = path.join(temp, "status-result.json");
  const deliveryPath = path.join(temp, "delivery-result.json");
  const controlPath = path.join(temp, "control-result.json");
  const runtimePath = path.join(temp, "runtime-binding.json");
  const promotionPath = path.join(temp, "promotion.json");
  const planPath = path.join(temp, "plan.json");
  fs.writeFileSync(finalityPath, fixture.finalityBytes, { mode: 0o600 });
  fs.writeFileSync(statusPath, fixture.statusBytes, { mode: 0o600 });
  fs.writeFileSync(deliveryPath, fixture.deliveryBytes, { mode: 0o600 });
  fs.writeFileSync(controlPath, fixture.controlBytes, { mode: 0o600 });
  fs.writeFileSync(runtimePath, fixture.runtimeBytes, { mode: 0o600 });
  fs.writeFileSync(promotionPath, fixture.promotionBytes, { mode: 0o600 });

  const cli = spawnSync(
    process.execPath,
    [
      TOOL,
      "prepare",
      "--finality-input",
      finalityPath,
      "--finality-input-sha256",
      sha256(fixture.finalityBytes),
      "--status-result",
      statusPath,
      "--status-result-sha256",
      sha256(fixture.statusBytes),
      "--delivery-result",
      deliveryPath,
      "--delivery-result-sha256",
      sha256(fixture.deliveryBytes),
      "--control-result",
      controlPath,
      "--control-result-sha256",
      sha256(fixture.controlBytes),
      "--runtime-binding",
      runtimePath,
      "--runtime-binding-sha256",
      sha256(fixture.runtimeBytes),
      "--promotion",
      promotionPath,
      "--promotion-sha256",
      sha256(fixture.promotionBytes),
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);
  const cliPlan = JSON.parse(cli.stdout);
  assert.equal(cliPlan.application_plan_id, plan.application_plan_id);
  const planBytes = prettyBytes(cliPlan);
  fs.writeFileSync(planPath, planBytes, { mode: 0o600 });

  const verify = spawnSync(
    process.execPath,
    [
      TOOL,
      "verify-applied",
      "--plan",
      planPath,
      "--plan-sha256",
      sha256(planBytes),
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.notEqual(verify.status, 0);
  assert.match(
    String(verify.stderr || ""),
    /PARTICIPANT_CANONICAL_APPLIED_BRANCH_NOT_MAIN/u,
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const source = fs.readFileSync(TOOL, "utf8");
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "systemctl",
  "fetch(",
  "new Wallet(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const required of [
  "buildVoidParticipantPostpurchaseProductionRuntimeBindingV1",
  "PARTICIPANT_CANONICAL_RUNTIME_BINDING_REDERIVATION_MISMATCH",
  "buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1",
  "participant_post_purchase_voidtoken_control_ready",
  "PARTICIPANT_CANONICAL_APPLIED_BRANCH_NOT_MAIN",
  "--no-replace-objects",
  "GIT_NO_REPLACE_OBJECTS",
  "canonicalRemote",
  "canonicalRemoteMainHead",
  "PARTICIPANT_CANONICAL_APPLIED_HEAD_NOT_REMOTE_MAIN",
  "assertWorktreeBlob",
]) {
  assert.equal(source.includes(required), true, required);
}

assert.match(_internal.gitBlobSha1(prettyBytes(plan.coupled_target_candidate)), /^[0-9a-f]{40}$/u);

console.log(
  "VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_V1_PROOF_GREEN",
);
console.log("runtime_binding_reexecution_verified=true");
console.log("runtime_binding_origin_evidence_bound=true");
console.log("promotion_reexecution_verified=true");
console.log("exact_one_gate_source_delta=true");
console.log("participant_post_purchase_voidtoken_control_ready=true");
console.log("participant_control_missing_gate_removed=true");
console.log("coupled_status_remains_hold=true");
console.log("coupled_activation_ready=false");
console.log("canonical_main_application_required=true");
console.log("repository_source_write=false");
console.log("runtime_or_rpc_write=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");

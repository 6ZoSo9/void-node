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
} from "../tools/void-participant-postpurchase-production-runtime-binding-v1.mjs";
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

function runtimeBindingReceipt() {
  const finality = {
    import_id: "voidppfri1_" + "a".repeat(64),
    binding_id: "voidppfrb1_" + "b".repeat(64),
    source_evidence_id: "sha256:" + "c".repeat(64),
    participant_address: PARTICIPANT,
    delivered_token_amount_atoms: "1000000000000000000",
    control_transfer_recipient: RECIPIENT,
    control_transfer_amount_atoms: "100000000000000000",
    observed_delivery_confirmation_count: "12",
    observed_control_confirmation_count: "6",
  };
  const status = {
    url: ORIGIN + "/public-node/economic/epoch2/read-status-v1.json",
    artifact_sha256: "d".repeat(64),
    status: "INACTIVE_SUCCESSOR_PUBLIC_READ_RUNTIME_READY",
    chain_id: 2050,
    execution_epoch: 2,
    genesis_block_hash: GENESIS_BLOCK_HASH,
    genesis_state_root: GENESIS_STATE_ROOT,
  };
  const delivery = {
    url:
      ORIGIN +
      "/public-node/economic/epoch2/receipt-v1?tx=" +
      DELIVERY_TX,
    artifact_sha256: "e".repeat(64),
    source_evidence_id: "sha256:" + "f".repeat(64),
    transaction_hash: DELIVERY_TX,
    block_number: "100",
    block_hash: DELIVERY_BLOCK_HASH,
    state_root: DELIVERY_STATE_ROOT,
    receipt_status: "0x1",
    receipt_from: FULFILLMENT,
    receipt_to: TOKEN,
    exact_receipt_identity_revalidated: true,
    exact_block_identity_revalidated: true,
  };
  const control = {
    url:
      ORIGIN +
      "/public-node/economic/epoch2/receipt-v1?tx=" +
      CONTROL_TX,
    artifact_sha256: "0".repeat(64),
    source_evidence_id: "sha256:" + "1".repeat(64),
    transaction_hash: CONTROL_TX,
    block_number: "101",
    block_hash: CONTROL_BLOCK_HASH,
    state_root: CONTROL_STATE_ROOT,
    receipt_status: "0x1",
    receipt_from: PARTICIPANT,
    receipt_to: TOKEN,
    exact_receipt_identity_revalidated: true,
    exact_block_identity_revalidated: true,
  };
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
  return {
    marker:
      VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1,
    version: 1,
    status:
      "PRODUCTION_RUNTIME_FINALITY_BINDING_VERIFIED_SOURCE_PROMOTION_HOLD",
    runtime_binding_id:
      "voidpprtb1_" +
      sha256(Buffer.from(canonicalJson(identity), "utf8")),
    finality,
    runtime: {
      public_origin: ORIGIN,
      chain_id: 2050,
      execution_epoch: 2,
      status,
      delivery,
      control,
      external_public_receipt_route_verified: true,
      raw_public_rpc_used: false,
    },
    production_runtime_binding_verified: true,
    participant_control_finality_evidence_imported: true,
    participant_postpurchase_voidtoken_control_runtime_binding_source_ready:
      true,
    participant_post_purchase_voidtoken_control_ready: false,
    coupled_candidate_updated: false,
    candidate_promotion_required: true,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_AUTHORITY_V1,
  };
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
  const runtime = runtimeBindingReceipt();
  const promotion = promotionFixture(runtime);
  const runtimeBytes = prettyBytes(runtime);
  const promotionBytes = prettyBytes(promotion);
  return {
    runtime,
    promotion,
    runtimeBytes,
    promotionBytes,
    request: {
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
  const runtimePath = path.join(temp, "runtime-binding.json");
  const promotionPath = path.join(temp, "promotion.json");
  const planPath = path.join(temp, "plan.json");
  fs.writeFileSync(runtimePath, fixture.runtimeBytes, { mode: 0o600 });
  fs.writeFileSync(promotionPath, fixture.promotionBytes, { mode: 0o600 });

  const cli = spawnSync(
    process.execPath,
    [
      TOOL,
      "prepare",
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

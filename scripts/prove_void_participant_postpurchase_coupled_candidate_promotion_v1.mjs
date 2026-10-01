import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1,
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1,
} from "../tools/void-participant-postpurchase-production-runtime-binding-v1.mjs";
import {
  VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_V1,
  buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1,
  readVoidParticipantPostpurchasePromotionSourcesV1,
} from "../tools/void-participant-postpurchase-coupled-candidate-promotion-v1.mjs";
import {
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "../tools/void-coupled-economic-successor-gate-v1.mjs";

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
const PARTICIPANT_MISSING =
  "participant_post_purchase_voidtoken_control_required";

function plain(value) {
  return (
    value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
  );
}

function canonicalize(value) {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!plain(value)) throw new Error("invalid canonical value");
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

function clone(value) {
  return structuredClone(value);
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
    url:
      ORIGIN
      + "/public-node/economic/epoch2/read-status-v1.json",
    artifact_sha256: "d".repeat(64),
    status: "INACTIVE_SUCCESSOR_PUBLIC_READ_RUNTIME_READY",
    chain_id: 2050,
    execution_epoch: 2,
    genesis_block_hash: GENESIS_BLOCK_HASH,
    genesis_state_root: GENESIS_STATE_ROOT,
  };
  const delivery = {
    url:
      ORIGIN
      + "/public-node/economic/epoch2/receipt-v1?tx="
      + DELIVERY_TX,
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
      ORIGIN
      + "/public-node/economic/epoch2/receipt-v1?tx="
      + CONTROL_TX,
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
      "voidpprtb1_"
      + sha256(Buffer.from(canonicalJson(identity), "utf8")),
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

const candidate = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
    "utf8",
  ),
);
const successor = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    "utf8",
  ),
);

const before = classifyVoidCoupledEconomicSuccessorGateV1(
  candidate,
  successor,
);
assert.equal(before.ok, false);
assert.equal(before.status, "HOLD");
assert.equal(before.reason, "coupled_economic_gates_incomplete");
assert.ok(before.missing_gates.includes(PARTICIPANT_MISSING));

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-participant-promotion-v1-"),
);
try {
  const receipt = runtimeBindingReceipt();
  const receiptFile = path.join(root, "runtime-binding.json");
  const receiptBytes = Buffer.from(
    JSON.stringify(receipt, null, 2) + "\n",
    "utf8",
  );
  fs.writeFileSync(receiptFile, receiptBytes, { mode: 0o600 });
  fs.chmodSync(receiptFile, 0o600);
  const receiptSha = sha256(receiptBytes);

  const sources =
    readVoidParticipantPostpurchasePromotionSourcesV1({
      runtimeBindingFile: receiptFile,
      runtimeBindingFileSha256: receiptSha,
    });
  assert.equal(sources.runtimeBindingFileSha256, receiptSha);
  assert.equal(
    sources.runtimeBindingReceipt.runtime_binding_id,
    receipt.runtime_binding_id,
  );
  const repositoryHead =
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const repositoryTree =
    execFileSync("git", ["rev-parse", "HEAD^{tree}"], { encoding: "utf8" }).trim();
  assert.equal(sources.repositoryHeadSha, repositoryHead);
  assert.equal(sources.repositoryTreeSha, repositoryTree);
  for (const key of [
    "candidateGitBlobSha1",
    "successorCandidateGitBlobSha1",
    "classifierGitBlobSha1",
    "promotionToolGitBlobSha1",
  ]) {
    assert.match(sources[key], /^[0-9a-f]{40}$/u, key);
  }

  {
    const candidatePath =
      "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
    const original = fs.readFileSync(candidatePath);
    try {
      fs.appendFileSync(candidatePath, "\n");
      assert.throws(
        () =>
          readVoidParticipantPostpurchasePromotionSourcesV1({
            runtimeBindingFile: receiptFile,
            runtimeBindingFileSha256: receiptSha,
          }),
        /promotion_repository_must_be_clean/u,
      );
    } finally {
      fs.writeFileSync(candidatePath, original);
    }
  }

  const promotion =
    buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1(
      sources,
    );

  assert.equal(
    promotion.marker,
    VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_V1,
  );
  assert.match(promotion.promotion_id, /^voidppccp1_[0-9a-f]{64}$/u);
  assert.equal(
    promotion.status,
    "PARTICIPANT_CONTROL_GATE_PROMOTION_ARTIFACT_READY_CANDIDATE_HOLD",
  );
  assert.equal(
    promotion.runtime_binding_file_sha256,
    receiptSha,
  );
  assert.equal(
    promotion.runtime_binding_id,
    receipt.runtime_binding_id,
  );
  assert.equal(
    promotion.promoted_gate,
    "participant_post_purchase_voidtoken_control_ready",
  );
  assert.equal(promotion.promoted_gate_value, true);
  assert.equal(
    promotion.promoted_candidate.gates
      .participant_post_purchase_voidtoken_control_ready,
    true,
  );
  assert.equal(
    promotion.promoted_candidate.gates.coupled_activation_ready,
    false,
  );
  assert.equal(promotion.promoted_candidate.status, "HOLD");
  assert.equal(promotion.canonical_candidate_file_updated, false);
  assert.equal(promotion.candidate_promotion_application_required, true);
  assert.equal(promotion.coupled_activation_ready, false);
  assert.equal(promotion.market_activation_authorized, false);
  assert.equal(promotion.public_presale_activation_authorized, false);
  assert.equal(promotion.funds_movement_authorized, false);
  assert.deepEqual(
    promotion.authority,
    VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_AUTHORITY_V1,
  );

  const expectedCandidate = clone(candidate);
  expectedCandidate.gates
    .participant_post_purchase_voidtoken_control_ready = true;
  assert.deepEqual(promotion.promoted_candidate, expectedCandidate);

  const after = classifyVoidCoupledEconomicSuccessorGateV1(
    promotion.promoted_candidate,
    successor,
  );
  assert.equal(after.ok, false);
  assert.equal(after.status, "HOLD");
  assert.equal(after.reason, "coupled_economic_gates_incomplete");
  assert.equal(
    after.missing_gates.includes(PARTICIPANT_MISSING),
    false,
  );
  assert.deepEqual(
    after.missing_gates,
    before.missing_gates.filter(
      (value) => value !== PARTICIPANT_MISSING,
    ),
  );

  assert.throws(
    () =>
      readVoidParticipantPostpurchasePromotionSourcesV1({
        runtimeBindingFile: receiptFile,
        runtimeBindingFileSha256: "9".repeat(64),
      }),
    /runtime_binding_receipt_sha256_mismatch/u,
  );

  assert.throws(
    () =>
      buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1({
        ...sources,
        runtimeBindingFileSha256: "9".repeat(64),
      }),
    /promotion_runtime_binding_file_sha256_unbound/u,
  );
  assert.throws(
    () =>
      buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1({
        ...sources,
        candidateFileSha256: "8".repeat(64),
      }),
    /promotion_candidate_file_sha256_unbound/u,
  );
  assert.throws(
    () =>
      buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1({
        ...sources,
        successorCandidateFileSha256: "7".repeat(64),
      }),
    /promotion_successor_file_sha256_unbound/u,
  );
  {
    const falseHead =
      (sources.repositoryHeadSha[0] === "0" ? "1" : "0")
      + sources.repositoryHeadSha.slice(1);
    assert.throws(
      () =>
        buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1({
          ...sources,
          repositoryHeadSha: falseHead,
        }),
      /promotion_repository_identity_mismatch/u,
    );
  }
  {
    const falseBlob =
      (sources.candidateGitBlobSha1[0] === "0" ? "1" : "0")
      + sources.candidateGitBlobSha1.slice(1);
    assert.throws(
      () =>
        buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1({
          ...sources,
          candidateGitBlobSha1: falseBlob,
        }),
      /promotion_repository_blob_identity_mismatch/u,
    );
  }

  fs.chmodSync(receiptFile, 0o644);
  assert.throws(
    () =>
      readVoidParticipantPostpurchasePromotionSourcesV1({
        runtimeBindingFile: receiptFile,
        runtimeBindingFileSha256: receiptSha,
      }),
    /runtime_binding_receipt_must_be_private/u,
  );
  fs.chmodSync(receiptFile, 0o600);

  const compactFile = path.join(root, "runtime-binding-compact.json");
  const compactBytes = Buffer.from(JSON.stringify(receipt), "utf8");
  fs.writeFileSync(compactFile, compactBytes, { mode: 0o600 });
  fs.chmodSync(compactFile, 0o600);
  assert.throws(
    () =>
      readVoidParticipantPostpurchasePromotionSourcesV1({
        runtimeBindingFile: compactFile,
        runtimeBindingFileSha256: sha256(compactBytes),
      }),
    /serialization_not_canonical_collector_form/u,
  );

  {
    const bad = clone(receipt);
    bad.runtime_binding_id =
      "voidpprtb1_" + "9".repeat(64);
    assert.throws(
      () =>
        buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1({
          ...sources,
          runtimeBindingReceipt: bad,
        }),
      /runtime_binding_id_mismatch/u,
    );
  }

  {
    const bad = clone(receipt);
    bad.authority = clone(bad.authority);
    bad.authority.transaction_submission = true;
    assert.throws(
      () =>
        buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1({
          ...sources,
          runtimeBindingReceipt: bad,
        }),
      /runtime_binding_authority_mismatch/u,
    );
  }

  {
    const bad = clone(receipt);
    bad.finality = clone(bad.finality);
    bad.finality.participant_address =
      "0x" + "a".repeat(40);
    assert.throws(
      () =>
        buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1({
          ...sources,
          runtimeBindingReceipt: bad,
        }),
      /runtime_binding_control_participant_mismatch/u,
    );
  }

  {
    const badCandidate = clone(sources.candidate);
    badCandidate.gates
      .participant_post_purchase_voidtoken_control_ready = true;
    assert.throws(
      () =>
        buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1({
          ...sources,
          candidate: badCandidate,
          candidateFileSha256:
            sha256(Buffer.from(JSON.stringify(badCandidate, null, 2) + "\n", "utf8")),
        }),
      /promotion_candidate_prestate_invalid/u,
    );
  }

  {
    const badCandidate = clone(sources.candidate);
    badCandidate.authority = clone(badCandidate.authority);
    badCandidate.authority.market_activation = true;
    assert.throws(
      () =>
        buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1({
          ...sources,
          candidate: badCandidate,
          candidateFileSha256:
            sha256(Buffer.from(JSON.stringify(badCandidate, null, 2) + "\n", "utf8")),
        }),
      /promotion_candidate_prestate_classification_invalid/u,
    );
  }

  console.log(
    "VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_V1_PROOF_GREEN",
  );
  console.log("runtime_binding_file_digest_pinned=true");
  console.log("pure_builder_source_file_hashes_bound=true");
  console.log("runtime_binding_closed_schema_revalidated=true");
  console.log("runtime_binding_id_recomputed=true");
  console.log("canonical_candidate_path_fixed=true");
  console.log("successor_candidate_path_fixed=true");
  console.log("repository_head_tree_bound=true");
  console.log("candidate_successor_classifier_tool_git_blobs_bound=true");
  console.log("dirty_worktree_rejected=true");
  console.log("false_valid_git_identity_rejected=true");
  console.log("exactly_one_candidate_gate_promoted=true");
  console.log("canonical_candidate_file_updated=false");
  console.log("candidate_status_remains_hold=true");
  console.log("coupled_activation_ready=false");
  console.log("market_activation=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
  console.log("external_network_request=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

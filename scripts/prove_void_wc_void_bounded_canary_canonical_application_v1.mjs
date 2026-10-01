#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1,
  VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1,
} from "../tools/void-wc-void-bounded-canary-semantic-promotion-v1.mjs";
import {
  promoteWcVoidBoundedCanaryCandidatesV1,
} from "../tools/void-wc-void-bounded-canary-candidate-promotion-v1.mjs";
import {
  VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_AUTHORITY_V1,
  VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_PLAN_V1,
  prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1,
  verifyVoidWcVoidBoundedCanaryCanonicalApplicationStateV1,
  verifyVoidWcVoidBoundedCanaryCanonicalApplicationV1,
} from "../tools/void-wc-void-bounded-canary-canonical-application-v1.mjs";

const LAUNCH =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const PRODUCTION =
  "ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonicalJson(value[key]),
    ).join(",") + "}";
  }
  throw new Error("invalid canonical value");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes) {
  const header = Buffer.from("blob " + bytes.length + "\0", "utf8");
  return createHash("sha1").update(header).update(bytes).digest("hex");
}

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function git(...args) {
  return execFileSync(
    "/usr/bin/git",
    ["-C", process.cwd(), ...args],
    { encoding: "utf8" },
  ).trim();
}

function fixtureSemanticPromotion() {
  const material = {
    marker: VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1,
    version: 1,
    status: "BOUNDED_CANARY_SEMANTICALLY_VERIFIED_PROMOTION_READY",
    chain_id: 2050,
    execution_epoch: 2,
    pair: "WC_VOID",
    coupled_launch_id: LAUNCH,
    reviewed_policy_id: "voidwcbcp1_" + "1".repeat(64),
    canary_evidence_id: "voidwcbce1_" + "2".repeat(64),
    evaluation_time_utc: "2030-01-01T00:00:00Z",
    observed_at_utc: "2030-01-01T00:00:00Z",
    valid_until_utc: "2030-01-01T00:10:00Z",
    participant_count: "1",
    settled_wc_units: "25",
    delivered_void_atoms: "1250000000000000000000000",
    observed_finality_confirmations: "11",
    market_vault_address: "0x1111111111111111111111111111111111111111",
    market_vault_runtime_code_sha256: "3".repeat(64),
    market_vault_runtime_verification_evidence_id:
      "sha256:" + "4".repeat(64),
    inventory_lock_evidence_id: "sha256:" + "5".repeat(64),
    wc_ledger_custody_evidence_id: "sha256:" + "6".repeat(64),
    opening_claim_binding_id: "sha256:" + "7".repeat(64),
    opening_claim_binding_persistence_evidence_id:
      "sha256:" + "8".repeat(64),
    replay_capsule_id: "voidwcrp1_" + "9".repeat(64),
    replay_terminal_capsule_sha256: "a".repeat(64),
    participant_control_evidence_id: "sha256:" + "b".repeat(64),
    bounded_canary_input_file_sha256: "c".repeat(64),
    market_vault_at_use_file_sha256: "d".repeat(64),
    ledger_persistence_import_input_file_sha256: "e".repeat(64),
    opening_request_file_sha256: "f".repeat(64),
    opening_claim_binding_file_sha256: "0".repeat(64),
    opening_claim_persistence_receipt_file_sha256: "1".repeat(64),
    opening_replay_capsule_file_sha256: "2".repeat(64),
    opening_replay_inspection_receipt_file_sha256: "3".repeat(64),
    participant_at_use_file_sha256: "4".repeat(64),
    durable_claim_binding_verified: true,
    durable_replay_terminal_verified: true,
    upstream_evidence_semantically_verified: true,
    live_canary_evidence_verified: true,
    bounded_canary_green: true,
    production_candidate_binding_allowed: true,
    production_candidate_updated: false,
    coupled_candidate_updated: false,
    candidate_promotion_required: true,
    coupled_activation_ready: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1,
  };
  const digest = sha256(
    Buffer.from(canonicalJson(material), "utf8"),
  );
  return {
    ...material,
    semantic_evidence_id: "sha256:" + digest,
    promotion_id: "voidwcbcsp1_" + digest,
  };
}

const semantic = fixtureSemanticPromotion();
const semanticBytes = prettyBytes(semantic);
const productionBytes = fs.readFileSync(PRODUCTION);
const coupledBytes = fs.readFileSync(COUPLED);
const successorBytes = fs.readFileSync(SUCCESSOR);
const successor = JSON.parse(successorBytes.toString("utf8"));
const head = git("rev-parse", "HEAD");
const tree = git("rev-parse", "HEAD^{tree}");

const promotion =
  promoteWcVoidBoundedCanaryCandidatesV1({
    repository_head_sha: head,
    repository_tree_sha: tree,
    semantic_promotion_bytes: semanticBytes,
    semantic_promotion_file_sha256: sha256(semanticBytes),
    production_candidate_bytes: productionBytes,
    production_candidate_file_sha256: sha256(productionBytes),
    coupled_candidate_bytes: coupledBytes,
    coupled_candidate_file_sha256: sha256(coupledBytes),
    successor_candidate_bytes: successorBytes,
    successor_candidate_file_sha256: sha256(successorBytes),
  });
const promotionBytes = prettyBytes(promotion);

const plan =
  prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1({
    semanticPromotionBytes: semanticBytes,
    semanticPromotionFileSha256: sha256(semanticBytes),
    candidatePromotionReceiptBytes: promotionBytes,
    candidatePromotionReceiptFileSha256: sha256(promotionBytes),
  });

assert.equal(
  plan.marker,
  VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_PLAN_V1,
);
assert.equal(plan.status, "CANONICAL_BOUNDED_CANARY_APPLICATION_PREPARED");
assert.match(plan.application_plan_id, /^voidwcbcap1_[0-9a-f]{64}$/u);
assert.equal(plan.candidate_promotion_id, promotion.promotion_id);
assert.equal(plan.production_target_candidate.bounded_canary_green, true);
assert.equal(plan.production_target_candidate.coupled_activation_ready, false);
assert.equal(plan.production_target_candidate.status, "hold");
assert.equal(plan.coupled_target_candidate.gates.bounded_canary_green, true);
assert.equal(
  plan.coupled_target_candidate.gates.coupled_activation_ready,
  false,
);
assert.equal(plan.coupled_target_candidate.status, "HOLD");
assert.equal(plan.removed_production_missing_gate, "bounded_canary_required");
assert.equal(plan.removed_coupled_missing_gate, "bounded_canary_required");
assert.equal(plan.market_activation_authorized, false);
assert.equal(plan.public_presale_activation_authorized, false);
assert.equal(plan.funds_movement_authorized, false);

const pure =
  verifyVoidWcVoidBoundedCanaryCanonicalApplicationStateV1({
    plan,
    productionCandidate: plan.production_target_candidate,
    coupledCandidate: plan.coupled_target_candidate,
    successorCandidate: successor,
  });
assert.equal(pure.production.status, "HOLD");
assert.equal(pure.coupled.status, "HOLD");
assert.equal(
  pure.production.missing_gates.includes("bounded_canary_required"),
  false,
);
assert.equal(
  pure.coupled.missing_gates.includes("bounded_canary_required"),
  false,
);

const planBytes = prettyBytes(plan);
assert.throws(
  () => verifyVoidWcVoidBoundedCanaryCanonicalApplicationV1({
    applicationPlanBytes: planBytes,
    applicationPlanFileSha256: sha256(planBytes),
  }),
  /CANONICAL_APPLICATION_APPLIED_SOURCE_IDENTITY_MISMATCH/u,
);

{
  const forged = structuredClone(promotion);
  forged.promoted_production_candidate.inventory_funded = true;
  const bytes = prettyBytes(forged);
  assert.throws(
    () => prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1({
      semanticPromotionBytes: semanticBytes,
      semanticPromotionFileSha256: sha256(semanticBytes),
      candidatePromotionReceiptBytes: bytes,
      candidatePromotionReceiptFileSha256: sha256(bytes),
    }),
    /CANONICAL_APPLICATION_REVIEWED_PROMOTION_RECEIPT_MISMATCH/u,
  );
}

{
  const forged = structuredClone(plan);
  forged.production_target_candidate.inventory_funded = true;
  const targetBytes = prettyBytes(forged.production_target_candidate);
  forged.production_target_file_sha256 = sha256(targetBytes);
  forged.production_target_git_blob_sha1 = gitBlobSha1(targetBytes);
  delete forged.application_plan_id;
  forged.application_plan_id =
    "voidwcbcap1_" +
    sha256(Buffer.from(canonicalJson(forged), "utf8"));
  assert.throws(
    () => verifyVoidWcVoidBoundedCanaryCanonicalApplicationStateV1({
      plan: forged,
      productionCandidate: forged.production_target_candidate,
      coupledCandidate: forged.coupled_target_candidate,
      successorCandidate: successor,
    }),
    /CANONICAL_APPLICATION_PRODUCTION_CHANGE_SCOPE_INVALID/u,
  );
}

assert.throws(
  () => prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1({
    semanticPromotionBytes: semanticBytes,
    semanticPromotionFileSha256: "0".repeat(64),
    candidatePromotionReceiptBytes: promotionBytes,
    candidatePromotionReceiptFileSha256: sha256(promotionBytes),
  }),
  /CANONICAL_APPLICATION_SEMANTIC_PROMOTION_FILE_SHA256_MISMATCH/u,
);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_AUTHORITY_V1,
)) {
  const allowed = new Set([
    "source_only_application",
    "exact_semantic_promotion_bytes_required",
    "exact_candidate_promotion_receipt_required",
    "candidate_promotion_reexecution_required",
    "canonical_head_candidate_bytes_required",
    "reviewed_repository_generation_required",
    "canonical_classifier_reexecution",
    "exact_two_gate_source_delta",
    "reviewed_git_commit_required",
    "reviewed_git_executable_required",
    "ambient_git_overrides_ignored",
    "filesystem_read",
  ]);
  assert.equal(value, allowed.has(key), key);
}

const source = fs.readFileSync(
  "tools/void-wc-void-bounded-canary-canonical-application-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "unlinkSync",
  "systemctl",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const required of [
  "promoteWcVoidBoundedCanaryCandidatesV1",
  "production_target_git_blob_sha1",
  "coupled_target_git_blob_sha1",
  "CANONICAL_APPLICATION_PRODUCTION_CHANGE_SCOPE_INVALID",
  "CANONICAL_APPLICATION_COUPLED_CHANGE_SCOPE_INVALID",
  "final_coupled_activation_required",
]) {
  assert.equal(source.includes(required), true, required);
}

console.log(
  "VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_V1_PROOF_GREEN",
);
console.log("candidate_promotion_reexecuted=true");
console.log("canonical_source_prestates_bound=true");
console.log("exact_two_gate_delta_prepared=true");
console.log("forged_promotion_receipt_held=true");
console.log("forged_application_plan_held=true");
console.log("current_unapplied_source_held=true");
console.log("coupled_activation_ready=false");
console.log("repository_source_write=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");

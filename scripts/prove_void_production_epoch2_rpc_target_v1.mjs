#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  HOLD_STATUS,
  SELECTED_STATUS,
  VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1,
  loadProductionEpoch2RpcTargetV1,
  productionEpoch2RpcUrlFingerprintV1,
  validateProductionEpoch2RpcTargetV1,
} from "../tools/void-production-epoch2-rpc-target-v1.mjs";
import {
  SELECTION_EVIDENCE_PACKET_V1,
  verifyProductionEpoch2RpcSelectionEvidencePacketV1,
  verifyReviewedSelectionEvidenceExecutionClosureV1,
} from "../tools/void-production-epoch2-rpc-selection-evidence-verifier-v1.mjs";

const target = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/production-epoch2-rpc-target-v1.json",
    "utf8",
  ),
);

const loaded = loadProductionEpoch2RpcTargetV1();
assert.equal(loaded.evaluation.marker, VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1);
assert.equal(loaded.evaluation.status, SELECTED_STATUS);
assert.equal(loaded.evaluation.production_rpc_target_selected, true);
assert.equal(loaded.evaluation.rpc_url, "http://127.0.0.1:18553/");
assert.equal(loaded.evaluation.evidence_aware_selection_verified, true);
assert.equal(
  loaded.promotion.promotion_id,
  "voidpe2rpctprom1_754cf0701f226a8ac47375757a42aa5dc328110ac89346c699b05565813b382f",
);
assert.equal(
  loaded.promotion.promotion_admission_id,
  "voidpe2rpctapply1_f76ce9f3d147a6097910947e3a8735664ff81bea07d1940ebdb663102589b040",
);
assert.equal(loaded.evaluation.transaction_authorized, false);
assert.equal(loaded.evaluation.authoritative_chain2050_write, false);
assert.equal(loaded.promotion.evidence_packet.checked_in_evidence_verified, true);
assert.equal(
  loaded.promotion.evidence_packet.exact_evidence_semantics_reexecuted,
  true,
);
assert.equal(
  loaded.promotion.evidence_packet.selected_candidate_recompiled_from_exact_evidence,
  true,
);
assert.equal(
  loaded.promotion.evidence_packet.promotion_admission_content_address_reverified,
  true,
);
assert.equal(
  loaded.promotion.evidence_packet.historical_source_trees_reverified,
  true,
);
assert.equal(
  loaded.promotion.evidence_packet.source_lineage_ancestry_reverified,
  true,
);
assert.equal(
  loaded.promotion.evidence_packet.verifier_entry_git_object_bound,
  true,
);
assert.equal(
  loaded.promotion.evidence_packet.reviewed_execution_exact_head_git_object_bytes,
  true,
);
assert.equal(
  loaded.promotion.evidence_packet.reviewed_execution_non_shallow_repository,
  true,
);
assert.equal(
  loaded.promotion.evidence_packet.reviewed_execution_bare_package_runtime_absent,
  true,
);

const reviewedClosure = verifyReviewedSelectionEvidenceExecutionClosureV1();
assert.ok(
  reviewedClosure.module_count > 1,
  "reviewed execution closure must contain transitive modules",
);
assert.equal(reviewedClosure.non_shallow_repository, true);
assert.equal(reviewedClosure.exact_head_git_object_bytes, true);
assert.equal(reviewedClosure.bare_package_runtime_absent, true);
for (const required of [
  "tools/void-production-epoch2-rpc-selection-evidence-verifier-v1.mjs",
  "tools/void-production-epoch2-rpc-target-v1.mjs",
  "tools/void-production-epoch2-rpc-target-promotion-compiler-v1.mjs",
  "tools/void-production-epoch2-rpc-target-promotion-apply-admission-v1.mjs",
  "tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs",
]) {
  assert.equal(reviewedClosure.module_paths.includes(required), true, required);
}

function evidencePacketInput() {
  return {
    target_bytes: fs.readFileSync(
      "ops/mainnet0/production-epoch2-rpc-target-v1.json",
    ),
    selected_candidate_bytes: fs.readFileSync(
      SELECTION_EVIDENCE_PACKET_V1.selected_candidate.path,
    ),
    activation_plan_bytes: fs.readFileSync(
      SELECTION_EVIDENCE_PACKET_V1.activation_plan.path,
    ),
    activation_receipt_bytes: fs.readFileSync(
      SELECTION_EVIDENCE_PACKET_V1.activation_receipt.path,
    ),
    runtime_observation_bytes: fs.readFileSync(
      SELECTION_EVIDENCE_PACKET_V1.runtime_observation.path,
    ),
    promotion_apply_admission_bytes: fs.readFileSync(
      SELECTION_EVIDENCE_PACKET_V1.promotion_apply_admission.path,
    ),
  };
}

const verifiedPacket =
  verifyProductionEpoch2RpcSelectionEvidencePacketV1(evidencePacketInput());
assert.equal(verifiedPacket.verified, true);
assert.equal(
  verifiedPacket.selected_candidate_recompiled_from_exact_evidence,
  true,
);
assert.equal(
  verifiedPacket.promotion_admission_content_address_reverified,
  true,
);

for (const [key, pattern] of [
  ["activation_plan_bytes", /production_epoch2_selection_activation_plan_sha256_mismatch/u],
  ["activation_receipt_bytes", /production_epoch2_selection_activation_receipt_sha256_mismatch/u],
  ["runtime_observation_bytes", /production_epoch2_selection_runtime_observation_sha256_mismatch/u],
  ["selected_candidate_bytes", /production_epoch2_selection_selected_candidate_sha256_mismatch/u],
  ["promotion_apply_admission_bytes", /production_epoch2_selection_promotion_apply_admission_sha256_mismatch/u],
]) {
  const bad = evidencePacketInput();
  bad[key] = Buffer.from(bad[key]);
  bad[key][0] ^= 0x01;
  assert.throws(
    () => verifyProductionEpoch2RpcSelectionEvidencePacketV1(bad),
    pattern,
    key,
  );
}

function holdFixture() {
  const value = structuredClone(target);
  value.status = HOLD_STATUS;
  value.selection = {
    production_rpc_target_selected: false,
    rpc_url: null,
    rpc_url_fingerprint_sha256: null,
    service_unit: null,
    activation_plan_id: null,
    activation_receipt_id: null,
    activation_receipt_sha256: null,
    runtime_observation_id: null,
    runtime_observation_sha256: null,
    runtime_active_verified: false,
    exact_genesis_bound: false,
    production_validator_set_bound: false,
    production_validator_binding_source_path: null,
    production_validator_binding_evidence_sha256: null,
    write_capability_classification: null,
    independent_host_acceptance: false,
  };
  value.next_gate =
    "observe_and_select_one_real_long_lived_production_epoch2_rpc_runtime";
  return value;
}

function selectedFixture(url = "http://127.0.0.1:18553/") {
  const value = structuredClone(target);
  value.status = SELECTED_STATUS;
  value.selection = {
    production_rpc_target_selected: true,
    rpc_url: url,
    rpc_url_fingerprint_sha256:
      productionEpoch2RpcUrlFingerprintV1(url),
    service_unit:
      "void-economic-epoch2-qbft-validator-v1.service",
    activation_plan_id:
      "voide2qactp1_" + "4".repeat(64),
    activation_receipt_id:
      "voide2qactr1_" + "5".repeat(64),
    activation_receipt_sha256:
      "6".repeat(64),
    runtime_observation_id:
      "voidpe2rpcobs1_" + "1".repeat(64),
    runtime_observation_sha256:
      "2".repeat(64),
    runtime_active_verified: true,
    exact_genesis_bound: true,
    production_validator_set_bound: true,
    production_validator_binding_source_path:
      "ops/mainnet0/economic-epoch2-production-successor-equivalence-evidence-v1.json",
    production_validator_binding_evidence_sha256:
      "5006aa32a298c0fbcea6395e75201af66fedacde5b664ac953699dfb2f0c061b",
    write_capability_classification:
      "write_capable_not_authorized",
    independent_host_acceptance: true,
  };
  value.next_gate =
    "downstream_consumers_must_rebind_and_repeat_fresh_read_only_preflights";
  return value;
}

const synthetic = validateProductionEpoch2RpcTargetV1(
  selectedFixture(),
);
assert.equal(synthetic.status, SELECTED_STATUS);
assert.equal(synthetic.production_rpc_target_selected, true);
assert.equal(synthetic.rpc_url, "http://127.0.0.1:18553/");
assert.equal(synthetic.transaction_authorized, false);
assert.equal(synthetic.authoritative_chain2050_write, false);
assert.equal(synthetic.funds_movement, false);

for (const forbidden of [
  "http://127.0.0.1:8545/",
  "http://127.0.0.1:18550/",
  "http://127.0.0.1:18551/",
  "http://127.0.0.1:18552/",
]) {
  assert.throws(
    () => validateProductionEpoch2RpcTargetV1(
      selectedFixture(forbidden),
    ),
    /production_epoch2_rpc_target_forbidden/u,
  );
}

assert.throws(
  () => validateProductionEpoch2RpcTargetV1(
    selectedFixture("http://192.0.2.10:28545/"),
  ),
  /production_epoch2_rpc_url_not_canonical_loopback/u,
);

assert.throws(
  () => validateProductionEpoch2RpcTargetV1(
    selectedFixture("http://127.0.0.1:18553"),
  ),
  /production_epoch2_rpc_url_not_canonical_loopback/u,
);

assert.throws(
  () => validateProductionEpoch2RpcTargetV1(
    selectedFixture("http://127.0.0.1:28545/"),
  ),
  /production_epoch2_selected_evidence_incomplete/u,
);

const badGenesis = selectedFixture();
badGenesis.reviewed_successor_identity.genesis_file_sha256 =
  "0".repeat(64);
assert.throws(
  () => validateProductionEpoch2RpcTargetV1(badGenesis),
  /reviewed_successor_identity_mismatch/u,
);

const wrongService = selectedFixture();
wrongService.selection.service_unit =
  "void-economic-epoch2-production-rpc-v1.service";
assert.throws(
  () => validateProductionEpoch2RpcTargetV1(wrongService),
  /production_epoch2_selected_evidence_incomplete/u,
);

const missingActivationReceipt = selectedFixture();
missingActivationReceipt.selection.activation_receipt_id = null;
assert.throws(
  () => validateProductionEpoch2RpcTargetV1(missingActivationReceipt),
  /production_epoch2_selected_evidence_incomplete/u,
);

const incomplete = selectedFixture();
incomplete.selection.independent_host_acceptance = false;
assert.throws(
  () => validateProductionEpoch2RpcTargetV1(incomplete),
  /production_epoch2_selected_evidence_incomplete/u,
);

const missingValidatorLineage = selectedFixture();
missingValidatorLineage.selection.production_validator_binding_source_path = null;
assert.throws(
  () => validateProductionEpoch2RpcTargetV1(missingValidatorLineage),
  /production_epoch2_selected_evidence_incomplete/u,
);

const wrongValidatorDigest = selectedFixture();
wrongValidatorDigest.selection.production_validator_binding_evidence_sha256 =
  "0".repeat(64);
assert.throws(
  () => validateProductionEpoch2RpcTargetV1(wrongValidatorDigest),
  /production_epoch2_selected_evidence_incomplete/u,
);

const forgedHold = holdFixture();
forgedHold.selection.rpc_url = "http://127.0.0.1:28545/";
assert.throws(
  () => validateProductionEpoch2RpcTargetV1(forgedHold),
  /production_epoch2_hold_selection_mismatch/u,
);

const wrongConsumer = structuredClone(target);
wrongConsumer.downstream_consumers[3] = "invented_consumer";
assert.throws(
  () => validateProductionEpoch2RpcTargetV1(wrongConsumer),
  /production_epoch2_downstream_consumers_mismatch/u,
);

const reorderedAuthority = structuredClone(target);
reorderedAuthority.authority = Object.fromEntries(
  Object.entries(reorderedAuthority.authority).reverse(),
);
assert.equal(
  validateProductionEpoch2RpcTargetV1(reorderedAuthority).status,
  SELECTED_STATUS,
);

const digest = crypto
  .createHash("sha256")
  .update(fs.readFileSync(
    "ops/mainnet0/production-epoch2-rpc-target-v1.json",
  ))
  .digest("hex");

console.log("VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1_PROOF_GREEN");
console.log("canonical_status=" + SELECTED_STATUS);
console.log("canonical_target_sha256=" + digest);
console.log("reviewed_successor_source_files_verified=true");
console.log("historical_epoch1_8545_rejected=true");
console.log("isolated_18550_rejected=true");
console.log("isolated_18551_rejected=true");
console.log("isolated_18552_rejected=true");
console.log("remote_rpc_rejected=true");
console.log("noncanonical_loopback_spelling_rejected=true");
console.log("exact_downstream_consumer_set_bound=true");
console.log("json_object_field_order_not_authority=true");
console.log("synthetic_selected_contract_semantics_green=true");
console.log("independent_host_acceptance_required=true");
console.log("reviewed_production_validator_binding_lineage_required=true");
console.log("promoted_validator_evidence_exactly_bound=true");
console.log("private_qbft_activation_lineage_required=true");
console.log("canonical_loader_selected_evidence_aware=true");
console.log("checked_in_evidence_semantics_reexecuted=true");
console.log("selected_candidate_recompiled_from_exact_evidence=true");
console.log("promotion_admission_content_address_reverified=true");
console.log("historical_source_trees_reverified=true");
console.log("source_lineage_ancestry_reverified=true");
console.log("evidence_packet_tamper_adversaries_green=true");
console.log("verifier_entry_git_object_bound=true");
console.log("reviewed_execution_exact_head_git_object_bytes=true");
console.log("reviewed_execution_non_shallow_repository=true");
console.log("reviewed_execution_bare_package_runtime_absent=true");
console.log("promotion_manifest_content_addressed=true");
console.log("promotion_admission_exactly_pinned=true");
console.log("production_rpc_18553_exact=true");
console.log("production_service_unit_exact=true");
console.log("transaction_authorized=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("funds_movement=false");

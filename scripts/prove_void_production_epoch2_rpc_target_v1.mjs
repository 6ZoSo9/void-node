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

const target = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/production-epoch2-rpc-target-v1.json",
    "utf8",
  ),
);

const loaded = loadProductionEpoch2RpcTargetV1();
assert.equal(loaded.evaluation.marker, VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1);
assert.equal(loaded.evaluation.status, HOLD_STATUS);
assert.equal(loaded.evaluation.production_rpc_target_selected, false);
assert.equal(loaded.evaluation.rpc_url, null);
assert.equal(loaded.evaluation.transaction_authorized, false);
assert.equal(loaded.evaluation.authoritative_chain2050_write, false);

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

const forgedHold = structuredClone(target);
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
  HOLD_STATUS,
);

const digest = crypto
  .createHash("sha256")
  .update(fs.readFileSync(
    "ops/mainnet0/production-epoch2-rpc-target-v1.json",
  ))
  .digest("hex");

console.log("VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1_PROOF_GREEN");
console.log("canonical_status=" + HOLD_STATUS);
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
console.log("production_rpc_18553_exact=true");
console.log("production_service_unit_exact=true");
console.log("transaction_authorized=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("funds_movement=false");

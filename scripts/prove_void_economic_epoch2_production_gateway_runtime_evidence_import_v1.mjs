#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_SERVICE_CONTRACT_V1,
  voidEconomicEpoch2ProductionGatewayRuntimeEvidenceIdV1,
  voidEconomicEpoch2ProductionGatewayRuntimeServiceContractIdV1,
} from "../tools/void-economic-epoch2-production-gateway-runtime-evidence-candidate-v1.mjs";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_IMPORT_V1,
  importVoidEconomicEpoch2ProductionGatewayRuntimeEvidenceV1,
} from "../tools/void-economic-epoch2-production-gateway-runtime-evidence-import-v1.mjs";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function contractFixture() {
  const value = {
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_SERVICE_CONTRACT_V1,
    version: 1,
    hostname: "gateway-proof-host",
    service_unit: "void-economic-epoch2-gateway.service",
    unit_file_sha256: "1".repeat(64),
    runtime_source_sha256: "2".repeat(64),
    replay_root_path_sha256: "3".repeat(64),
    status_file_path_sha256: "4".repeat(64),
    max_evidence_age_seconds: 600,
    systemd_user_service_required: true,
    current_operator_uid_required: true,
    same_uid_process_model_accepted: true,
    private_startup_receipt_required: true,
    no_service_socket_fds_required: true,
    runtime_route_active_required: false,
    public_submission_open_required: false,
    transaction_submission_required: false,
    transaction_broadcast_required: false,
    authoritative_chain2050_write_required: false,
    contract_id: "voide2grc1_" + "0".repeat(64),
  };
  value.contract_id =
    voidEconomicEpoch2ProductionGatewayRuntimeServiceContractIdV1(value);
  return value;
}

function evidenceFixture(contract) {
  const value = {
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_CANDIDATE_V1,
    version: 1,
    status: "RUNTIME_BINDING_EVIDENCE_CANDIDATE_REVIEW_REQUIRED",
    chain_id: 2050,
    execution_epoch: 2,
    service_contract_id: contract.contract_id,
    hostname: contract.hostname,
    service_unit: contract.service_unit,
    unit_file_sha256: contract.unit_file_sha256,
    runtime_source_sha256: contract.runtime_source_sha256,
    startup_receipt_id:
      "voide2grt1_" + "5".repeat(64),
    startup_receipt_file_sha256: "6".repeat(64),
    startup_receipt_status_file_path_sha256:
      contract.status_file_path_sha256,
    replay_root_path_sha256: contract.replay_root_path_sha256,
    replay_root_dev: "100",
    replay_root_ino: "200",
    replay_root_uid: "1000",
    replay_root_gid: "1000",
    replay_root_mode: "0700",
    replay_root_identity_stable: true,
    systemd_service_active: true,
    systemd_service_running: true,
    service_main_pid: 4242,
    service_main_pid_start_time_ticks: "999999",
    service_invocation_id: "7".repeat(32),
    service_control_group_path_sha256: "8".repeat(64),
    service_cgroup_member_count: 2,
    all_service_processes_current_uid: true,
    same_uid_process_model_observed: true,
    network_namespace_consistent: true,
    service_socket_fd_count: 0,
    no_service_socket_fds_observed: true,
    runtime_process_binding_constructed: true,
    replay_root_binding_receipt_verified: true,
    production_gateway_replay_store_binding_source_verified: true,
    production_gateway_replay_store_binding_evidence_candidate: true,
    upstream_live_evidence_semantically_verified: false,
    runtime_service_identity_verified: false,
    same_uid_process_model_verified: false,
    production_gateway_replay_store_binding_verified: false,
    runtime_route_active: false,
    public_submission_open: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    cross_epoch_replay_protection_proven: false,
    observed_at_utc: "2030-01-01T00:00:00Z",
    evaluated_at_utc: "2030-01-01T00:00:10Z",
    valid_until_utc: "2030-01-01T00:10:00Z",
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_AUTHORITY_V1,
    evidence_id: "voide2gre1_" + "0".repeat(64),
  };
  value.evidence_id =
    voidEconomicEpoch2ProductionGatewayRuntimeEvidenceIdV1(value);
  return value;
}

function evidenceBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function importEvidence(contract, evidence, overrides = {}) {
  const bytes = evidenceBytes(evidence);
  return importVoidEconomicEpoch2ProductionGatewayRuntimeEvidenceV1({
    serviceContract:
      overrides.serviceContract ?? contract,
    expectedServiceContractId:
      overrides.expectedServiceContractId ?? contract.contract_id,
    evidenceBytes:
      overrides.evidenceBytes ?? bytes,
    expectedFileSha256:
      overrides.expectedFileSha256 ?? sha256(bytes),
    expectedEvidenceId:
      overrides.expectedEvidenceId ?? evidence.evidence_id,
    evaluationTimeUtc:
      overrides.evaluationTimeUtc ?? "2030-01-01T00:05:00Z",
  });
}

const contract = contractFixture();
const evidence = evidenceFixture(contract);
const receipt = importEvidence(contract, evidence);

assert.equal(
  receipt.marker,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_IMPORT_V1,
);
assert.equal(receipt.version, 1);
assert.equal(
  receipt.status,
  "PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_IMPORTED_CROSS_EPOCH_REPLAY_HOLD",
);
assert.equal(receipt.chain_id, 2050);
assert.equal(receipt.execution_epoch, 2);
assert.equal(receipt.service_contract_id, contract.contract_id);
assert.equal(receipt.evidence_id, evidence.evidence_id);
assert.match(receipt.evidence_file_sha256, /^[0-9a-f]{64}$/u);
assert.match(receipt.import_id, /^voide2gri1_[0-9a-f]{64}$/u);
assert.equal(receipt.hostname, contract.hostname);
assert.equal(receipt.service_unit, contract.service_unit);
assert.equal(receipt.startup_receipt_id, evidence.startup_receipt_id);
assert.equal(
  receipt.verification.service_contract_content_addressed,
  true,
);
assert.equal(receipt.verification.evidence_file_sha256_verified, true);
assert.equal(receipt.verification.evidence_id_verified, true);
assert.equal(receipt.verification.evidence_fresh_at_import, true);
assert.equal(receipt.verification.runtime_service_identity_verified, true);
assert.equal(receipt.verification.same_uid_process_model_verified, true);
assert.equal(receipt.verification.no_service_socket_fds_verified, true);
assert.equal(receipt.verification.replay_root_identity_verified, true);
assert.equal(receipt.verification.startup_receipt_binding_verified, true);
assert.equal(
  receipt.verification.production_gateway_replay_store_binding_verified,
  true,
);
assert.equal(
  receipt.gates.production_gateway_replay_store_binding_verified,
  true,
);
assert.equal(receipt.gates.cross_epoch_replay_protection_proven, false);
assert.equal(receipt.gates.migration_authorized, false);
assert.equal(receipt.gates.public_activation_authorized, false);
assert.equal(receipt.gates.funds_movement_authorized, false);

const repeat = importEvidence(
  structuredClone(contract),
  structuredClone(evidence),
);
assert.equal(repeat.import_id, receipt.import_id);

assert.throws(
  () => importEvidence(contract, evidence, {
    expectedFileSha256: "0".repeat(64),
  }),
  /evidence_file_sha256_mismatch/u,
);

assert.throws(
  () => importEvidence(contract, evidence, {
    expectedEvidenceId: "voide2gre1_" + "f".repeat(64),
  }),
  /runtime_evidence_id_mismatch/u,
);

assert.throws(
  () => importEvidence(contract, evidence, {
    expectedServiceContractId:
      "voide2grc1_" + "f".repeat(64),
  }),
  /runtime_service_contract_id_mismatch/u,
);

assert.throws(
  () => importEvidence(contract, evidence, {
    evaluationTimeUtc: "2030-01-01T00:10:01Z",
  }),
  /runtime_evidence_not_current_at_import/u,
);

{
  const bad = structuredClone(evidence);
  bad.service_unit = "different.service";
  bad.evidence_id =
    voidEconomicEpoch2ProductionGatewayRuntimeEvidenceIdV1(bad);
  assert.throws(
    () => importEvidence(contract, bad),
    /runtime_evidence_contract_binding_mismatch/u,
  );
}

{
  const bad = structuredClone(evidence);
  bad.service_socket_fd_count = 1;
  bad.evidence_id =
    voidEconomicEpoch2ProductionGatewayRuntimeEvidenceIdV1(bad);
  assert.throws(
    () => importEvidence(contract, bad),
    /runtime_evidence_service_identity_invalid/u,
  );
}

{
  const bad = structuredClone(evidence);
  bad.authority = {
    ...bad.authority,
    network_request: true,
  };
  bad.evidence_id =
    voidEconomicEpoch2ProductionGatewayRuntimeEvidenceIdV1(bad);
  assert.throws(
    () => importEvidence(contract, bad),
    /runtime_evidence_authority_mismatch/u,
  );
}

{
  const bad = structuredClone(contract);
  bad.public_submission_open_required = true;
  bad.contract_id =
    voidEconomicEpoch2ProductionGatewayRuntimeServiceContractIdV1(bad);
  assert.throws(
    () => importEvidence(bad, evidence, {
      expectedServiceContractId: bad.contract_id,
    }),
    /runtime_service_contract_required_false_flag_invalid/u,
  );
}

for (const [key, value] of Object.entries(receipt.authority)) {
  if (key === "source_import_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_IMPORT_V1_PROOF_GREEN",
);
console.log("service_contract_content_addressed=true");
console.log("evidence_file_sha256_verified=true");
console.log("evidence_id_verified=true");
console.log("evidence_fresh_at_import=true");
console.log("runtime_service_identity_verified=true");
console.log("same_uid_process_model_verified=true");
console.log("production_gateway_replay_store_binding_verified=true");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");

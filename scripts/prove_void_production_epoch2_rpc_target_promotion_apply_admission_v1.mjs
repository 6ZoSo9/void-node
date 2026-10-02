#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  EXPECTED_VALIDATORS_V1,
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1,
  buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1,
  validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";
import {
  buildProductionEpoch2RpcSelectedDescriptorV1,
} from "../tools/void-production-epoch2-rpc-target-promotion-compiler-v1.mjs";
import {
  VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_PREVIEW_V1,
  buildProductionEpoch2RpcTargetPromotionApplyAdmissionPreviewV1,
} from "../tools/void-production-epoch2-rpc-target-promotion-apply-admission-v1.mjs";
import {
  SELECTED_STATUS,
  productionEpoch2RpcUrlFingerprintV1,
  validateProductionEpoch2RpcTargetV1,
} from "../tools/void-production-epoch2-rpc-target-v1.mjs";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonical(value[key]),
    ).join(",") + "}";
  }
  throw new Error("proof_canonical_value_invalid");
}
function withId(prefix, material, key) {
  return {
    ...material,
    [key]: prefix + sha256(Buffer.from(canonical(material), "utf8")),
  };
}
function withObservationId(material) {
  return {
    ...material,
    observation_id:
      "voidpe2rpcobs1_" +
      sha256(Buffer.from(canonical(material), "utf8")),
  };
}

const holdTarget = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/production-epoch2-rpc-target-v1.json",
    "utf8",
  ),
);

const activationPlanMaterial = {
  marker: VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1,
  version: 1,
  status: "THREE_HOST_PRESTART_ADMISSION_BOUND_VALIDATOR_START_HOLD",
  plan_id: "voide2qprp1_" + "1".repeat(64),
  bundle_set_id: "voide2qbsv1_" + "2".repeat(64),
  plan_file_sha256: "3".repeat(64),
  start_admission_id: "voide2qsad1_" + "4".repeat(64),
  start_admission_evaluated_at_utc: "2030-01-01T00:04:00.000Z",
  start_admission_valid_until_utc: "2030-01-01T00:08:00.000Z",
  start_admission_observed_repo_head: "b".repeat(40),
  compiled_at_utc: "2030-01-01T00:04:30.000Z",
  chain: {
    chain_id: 2050,
    chain_id_hex: "0x802",
    execution_epoch: 2,
    consensus: "QBFT",
    validator_count: 3,
    required_quorum: 2,
    block_period_seconds: 5,
    request_timeout_seconds: 10,
    expected_validators: [...EXPECTED_VALIDATORS_V1],
  },
  rpc: {
    role: "precision",
    url: "http://127.0.0.1:18553/",
    allowed_observation_methods: [
      "eth_chainId",
      "eth_blockNumber",
      "net_peerCount",
      "qbft_getValidatorsByBlockNumber",
    ],
    transaction_methods_forbidden: true,
  },
  install_receipts: ["precision", "nimo", "xiphos"].map((role, index) => ({
    role,
    hostname: ["zoso-Precision-Tower-7810", "Nimo", "Xiphos"][index],
    install_receipt_id: "voide2qinst1_" + String(index + 1).repeat(64),
    materialization_id: "voide2qmat1_" + String(index + 4).repeat(64),
    receipt_basis: "fresh_install",
    install_receipt_observed_at_utc:
      "2030-01-01T00:02:0" + String(index) + ".000Z",
    install_receipt_observed_repo_head:
      ["c", "d", "e"][index].repeat(40),
    runtime_root:
      "/home/zoso/.local/share/void/epoch2-qbft-private-runtime-v1/" + role,
    unit_install_path:
      "/home/zoso/.config/systemd/user/" +
      "void-economic-epoch2-qbft-validator-v1.service",
    systemd_unit_sha256: String(index + 7).repeat(64),
    genesis_sha256: ["a", "b", "c"][index].repeat(64),
    static_nodes_sha256: ["d", "e", "f"][index].repeat(64),
    unit_file_state: "static",
    operator_user_unit_dir_direct_enablement_links_absent: true,
    indirect_activation_absence_proven: false,
  })),
  start_sequence: [
    { step: 1, role: "precision" },
    { step: 2, role: "nimo" },
    { step: 3, role: "xiphos" },
  ],
  pre_start_revalidation: {
    exact_installed_hashes: true,
    exact_empty_data_directory: true,
    exact_plugin_sha256: true,
    exact_rootless_docker_identity: true,
    exact_tailnet_ipv4_binding: true,
    exact_nodekey_public_identity_required: true,
    nodekey_private_bytes_must_not_be_logged: true,
    unit_file_state_observation_required: true,
    operator_user_unit_dir_direct_enablement_links_absent_required: true,
    indirect_activation_absence_proven: false,
    service_inactive_required: true,
    unit_restart_no_required: true,
    p2p_port_vacant_required: true,
    precision_rpc_port_vacant_required: true,
    repo_main_clean_and_descendant_required: true,
  },
  activation: {
    authorized: false,
    required_confirmation: "startPrivateEpoch2QbftSuccessorV1",
    daemon_reload_per_host: true,
    service_enable: false,
    service_start: true,
    service_restart: false,
    automatic_retry: false,
    rollback_stop_all_started_on_any_failure: true,
    first_possible_authoritative_block_production_step: 2,
    third_validator_start_after_quorum_proof: true,
  },
  authority: {
    source_plan_only: true,
    runtime_filesystem_write: false,
    systemd_reload: false,
    service_enable: false,
    service_start: false,
    service_stop: false,
    docker_mutation: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    validator_set_mutation: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  },
  next_gate:
    "explicit_activation_confirmation_then_final_live_revalidation_and_" +
    "single_attempt_start_sequence",
};

const activationPlan = withId(
  "voide2qactp1_",
  activationPlanMaterial,
  "activation_plan_id",
);
validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(activationPlan);

const activationReceipt =
  buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1({
    activation_plan: activationPlan,
    activated_at_utc: "2030-01-01T00:05:00.000Z",
    observed: {
      validators: [...EXPECTED_VALIDATORS_V1],
      precision_only_block_number: "0",
      after_nimo_block_number: "1",
      after_nimo_peer_count: 1,
      after_xiphos_block_number: "2",
      after_xiphos_peer_count: 2,
      chain_id_hex: "0x802",
      started_roles: ["precision", "nimo", "xiphos"],
    },
  });

function bytesFor(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}
const activationPlanBytes = bytesFor(activationPlan);
const activationReceiptBytes = bytesFor(activationReceipt);
const activationPlanSha = sha256(activationPlanBytes);
const activationReceiptSha = sha256(activationReceiptBytes);
const targetIdentity = holdTarget.reviewed_successor_identity;

const observationMaterial = {
  marker: "VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1",
  version: 1,
  status: "PRODUCTION_EPOCH2_RPC_HOST_OBSERVATION_ACCEPTED",
  hostname: "zoso-Precision-Tower-7810",
  chain_id: 2050,
  execution_epoch: 2,
  source_binding: {
    branch: "main",
    head: "a".repeat(40),
    tree: "b".repeat(40),
    remote_main_sha: "a".repeat(40),
    canonical_remote_url: "https://github.com/6ZoSo9/void-node.git",
    canonical_main_live_match: true,
  },
  target_descriptor: {
    status: "HOLD_PRODUCTION_EPOCH2_RPC_TARGET_NOT_SELECTED",
    production_rpc_target_selected: false,
    prospective_rpc_url: "http://127.0.0.1:18553/",
    rpc_url_fingerprint_sha256:
      productionEpoch2RpcUrlFingerprintV1("http://127.0.0.1:18553/"),
    prospective_service_unit:
      "void-economic-epoch2-qbft-validator-v1.service",
    production_validator_binding_evidence_path:
      targetIdentity.production_validator_binding_evidence_path,
    production_validator_binding_evidence_sha256:
      targetIdentity.production_validator_binding_evidence_sha256,
    production_validator_binding_evidence_id:
      targetIdentity.production_validator_binding_evidence_id,
  },
  reviewed_semantic_execution: {
    source_head_sha: "a".repeat(40),
    source_tree_sha: "b".repeat(40),
    reviewed_execution_verified: true,
    private_reviewed_execution_tree: true,
    reviewed_execution_bytes_rebound_before_and_after: true,
    worktree_semantic_import: false,
    reviewed_execution_manifest_sha256: "4".repeat(64),
    activation_source_head_sha: "c".repeat(40),
    activation_source_tree_sha: "d".repeat(40),
    activation_execution_manifest_sha256: "5".repeat(64),
    activation_source_ancestor_current_main: true,
  },
  activation_lineage: {
    activation_plan_id: activationPlan.activation_plan_id,
    activation_plan_file_sha256: activationPlanSha,
    private_runtime_plan_file_sha256: "6".repeat(64),
    bundle_set_receipt_file_sha256: "7".repeat(64),
    start_admission_receipt_file_sha256: "8".repeat(64),
    install_receipt_file_sha256: {
      precision: "9".repeat(64),
      nimo: "a".repeat(64),
      xiphos: "b".repeat(64),
    },
    activation_plan_rederived_from_upstream: true,
    activation_receipt_id: activationReceipt.activation_receipt_id,
    activation_receipt_file_sha256: activationReceiptSha,
    activated_at_utc: activationReceipt.activated_at_utc,
    activation_receipt_rederived: true,
    activation_floor_block_number:
      activationReceipt.observations.after_xiphos_block_number,
    source_lineage_ancestor_current_main: true,
  },
  service: {
    service_unit: "void-economic-epoch2-qbft-validator-v1.service",
    fragment_path: "/home/zoso/.config/systemd/user/" +
      "void-economic-epoch2-qbft-validator-v1.service",
    fragment_file_sha256: "c".repeat(64),
    active_state: "active",
    sub_state: "running",
    main_pid: "1234",
    invocation_id: "d".repeat(32),
    drop_in_paths: "",
    exec_start_argv_sha256: "e".repeat(64),
    main_pid_argv_sha256: "e".repeat(64),
    main_pid_cgroup_service_bound: true,
    docker_host_environment: "DOCKER_HOST=unix:///run/user/1000/docker.sock",
    main_pid_docker_host_environment_sha256: "f".repeat(64),
    main_pid_docker_host_environment_verified: true,
    systemd_exec_start_matches_reviewed_contract: true,
    runtime_active_verified: true,
    listener_address: "127.0.0.1",
    listener_port: 18553,
    listener_present: true,
    invocation_stable_during_observation: true,
    listener_stable_during_observation: true,
    container_stable_during_observation: true,
    service_container_contract_verified: true,
  },
  container: {
    docker_host: "unix:///run/user/1000/docker.sock",
    container_name: "void-e2-qbft-precision-v1",
    container_id: "1".repeat(64),
    image_reference: targetIdentity.besu_image,
    image_id: "sha256:" + "2".repeat(64),
    running: true,
  },
  service_container_listener_binding_verified: true,
  rpc: {
    url: "http://127.0.0.1:18553/",
    chain_id_hex: "0x802",
    genesis_block_number: "0",
    genesis_block_hash: targetIdentity.genesis_block_hash,
    genesis_state_root: targetIdentity.genesis_state_root,
    head_block_number: "10",
    head_block_hash: "0x" + "3".repeat(64),
    head_state_root: "0x" + "4".repeat(64),
    peer_count: 2,
    validators: [...EXPECTED_VALIDATORS_V1],
    exact_validator_set_verified: true,
    two_peer_minimum_verified: true,
    head_at_or_above_activation_floor: true,
  },
  write_capability_classification: "write_capable_not_authorized",
  exact_genesis_bound: true,
  production_validator_set_bound: true,
  independent_host_acceptance: true,
  target_descriptor_promotion_authorized: false,
  canonical_main_stable_during_observation: true,
  observed_at_utc: "2030-01-01T00:06:00.000Z",
  authority: {
    target_descriptor_promotion: false,
    authoritative_chain2050_write: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    migration_authorized: false,
    public_presale_activation: false,
    funds_movement: false,
  },
};

const runtimeObservation = withObservationId(observationMaterial);

function compile({
  activationPlanValue = activationPlan,
  activationPlanExpectedSha = activationPlanSha,
  activationReceiptValue = activationReceipt,
  activationReceiptExpectedSha = activationReceiptSha,
  runtimeObservationValue = runtimeObservation,
  runtimeObservationExpectedSha = null,
} = {}) {
  const planBytes = bytesFor(activationPlanValue);
  const receiptBytes = bytesFor(activationReceiptValue);
  const observationBytes = bytesFor(runtimeObservationValue);
  return buildProductionEpoch2RpcSelectedDescriptorV1({
    hold_target: structuredClone(holdTarget),
    activation_plan_bytes: planBytes,
    activation_plan_file_sha256: activationPlanExpectedSha,
    activation_receipt_bytes: receiptBytes,
    activation_receipt_file_sha256: activationReceiptExpectedSha,
    runtime_observation_bytes: observationBytes,
    runtime_observation_file_sha256:
      runtimeObservationExpectedSha ?? sha256(observationBytes),
  });
}

const compiled = compile();

const candidateBytes = bytesFor(compiled.candidate);
const candidateSha = sha256(candidateBytes);

function preview(overrides = {}) {
  return buildProductionEpoch2RpcTargetPromotionApplyAdmissionPreviewV1({
    hold_target: structuredClone(holdTarget),
    candidate_bytes: candidateBytes,
    candidate_file_sha256: candidateSha,
    activation_plan_bytes: activationPlanBytes,
    activation_plan_file_sha256: activationPlanSha,
    activation_receipt_bytes: activationReceiptBytes,
    activation_receipt_file_sha256: activationReceiptSha,
    runtime_observation_bytes: bytesFor(runtimeObservation),
    runtime_observation_file_sha256: sha256(bytesFor(runtimeObservation)),
    current_source: {
      branch: "main",
      head: "f".repeat(40),
      tree: "e".repeat(40),
      canonical_remote_url: "https://github.com/6ZoSo9/void-node.git",
      remote_main_sha: "f".repeat(40),
      canonical_main_live_match: true,
    },
    lineage_ancestor_commits: [
      "a".repeat(40),
      "b".repeat(40),
      "c".repeat(40),
    ],
    ...overrides,
  });
}

const result = preview();
assert.equal(
  result.marker,
  VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_PREVIEW_V1,
);
assert.equal(
  result.status,
  "PROMOTION_APPLY_ADMISSION_PREVIEW_NOT_SOURCE_VERIFIED",
);
assert.equal(result.candidate_sha256, candidateSha);
assert.equal(result.source_lineage_ancestor_current_main, false);
assert.equal(result.canonical_target_write, false);
assert.equal(result.authority.repository_write, false);
assert.equal(result.authority.rpc_call, false);
assert.equal(result.authority.transaction_broadcast, false);
assert.equal(result.authority.funds_movement, false);

const alteredCandidate = structuredClone(compiled.candidate);
alteredCandidate.selection.independent_host_acceptance = false;
const alteredBytes = bytesFor(alteredCandidate);
assert.throws(
  () => preview({
    candidate_bytes: alteredBytes,
    candidate_file_sha256: sha256(alteredBytes),
  }),
  /production_epoch2_rpc_apply_admission_candidate_recompile_mismatch/u,
);

assert.throws(
  () => preview({ candidate_file_sha256: "0".repeat(64) }),
  /production_epoch2_rpc_apply_admission_candidate_sha256_mismatch/u,
);

assert.throws(
  () => preview({
    current_source: {
      branch: "main",
      head: "f".repeat(40),
      tree: "e".repeat(40),
      canonical_remote_url: "https://github.com/6ZoSo9/void-node.git",
      remote_main_sha: "0".repeat(40),
      canonical_main_live_match: true,
    },
  }),
  /production_epoch2_rpc_apply_admission_source_invalid/u,
);

console.log(
  "VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_V1_PROOF_GREEN",
);
console.log("candidate_exact_recompile_required=true");
console.log("candidate_hash_binding_required=true");
console.log("activation_lineage_revalidated=true");
console.log("runtime_observation_revalidated=true");
console.log("authoritative_admission_cli_source_verification_required=true");
console.log("historical_lineage_ancestry_required=true");
console.log("canonical_target_write=false");
console.log("repository_write=false");
console.log("rpc_call=false");
console.log("service_action=false");
console.log("docker_mutation=false");
console.log("transaction_broadcast=false");
console.log("migration_authorized=false");
console.log("funds_movement=false");

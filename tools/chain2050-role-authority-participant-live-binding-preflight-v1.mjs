#!/usr/bin/env node
import crypto from "node:crypto";

import {
  verifyRoleAuthorityCheckpointVerifiedAttestationEvidenceV1,
} from "./chain2050-role-authority-checkpoint-verified-attestation-evidence-v1.mjs";
import {
  verifySovereignGenesisAppendReconciliationEvidenceV1,
} from "./chain2050-role-authority-sovereign-genesis-append-reconciliation-evidence-v1.mjs";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_QUERY_CONTRACT_SHA256_V1,
  computeChain2050RoleAuthorityLiveRpcFinalityPolicySha256V1,
} from "./chain2050-role-authority-live-rpc-observer-v1.mjs";

export const VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_PREFLIGHT_V1 =
  "VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_PREFLIGHT_V1";

export const EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1 = Object.freeze({
  chain_id: 2050,
  contract_address:
    "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
  accepted_runtime_sha256:
    "b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d",
  reviewed_registry_contract_sha256:
    "a6ecf042569223cc1d56b3e2cc3350206a0abd6352b009212b6540699f7c57f6",
  binding_id:
    "participant-role-authority-mainnet0-live-v1",
  confirmation_depth: "12",
  deployment_block_number: "37379",
  sovereign_genesis_block_number: "37392",
  empty_registry_root_sha256:
    "d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7",
  sovereign_identity_id: "sovereign.zoso",
  sovereign_genesis_role_record_sha256:
    "1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b",
  sovereign_genesis_registry_root_sha256:
    "54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041",
  sovereign_subject_binding_sha256:
    "7945ba03feac32e5268382a8b995eb7c927a084d9dd1d44598ffb340a12a770e",
  sovereign_policy_sha256:
    "9a8ee80c68cb026b88117710c7d78e8b3063a1c5c2fe1cf6cb555ca80d8f1e75",
});

export const VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_AUTHORITY_V1 =
  Object.freeze({
    source_only_preflight: true,
    accepted_deployment_checkpoint_required: true,
    reconciled_sovereign_genesis_required: true,
    fresh_live_rpc_observer_required: true,
    fixed_block_revalidation_required: true,
    twelve_confirmation_policy_required: true,
    canonical_binding_descriptor_required: true,
    canonical_snapshot_validation_required: true,
    bound_sovereign_read_required: true,
    live_chain_registry_binding_claim_green_only: true,
    durable_participant_session_state_required_separately: true,
    public_session_route_mount_authorized: false,
    runtime_activation_authorized: false,
    credential_access: false,
    private_key_access: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    registry_append: false,
    work_credit_mutation: false,
    validator_mutation: false,
    service_action: false,
    funds_action: false,
  });

const HEX64 = /^[a-f0-9]{64}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonical(value));
}

function sha256Utf8(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function held(reason, detail = undefined) {
  return Object.freeze({
    ok: false,
    marker:
      VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_PREFLIGHT_V1,
    version: 1,
    status: "held",
    reason,
    ...(detail === undefined ? {} : { detail }),
    live_chain_registry_bound: false,
    participant_role_source_ready: false,
    durable_participant_session_state_bound: false,
    public_session_route_mount_authorized: false,
    runtime_activation_authorized: false,
    authority:
      VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_AUTHORITY_V1,
  });
}

function decimalAtLeast(value, minimum) {
  if (typeof value !== "string" || !DECIMAL.test(value)) return false;
  try {
    return BigInt(value) >= BigInt(minimum);
  } catch {
    return false;
  }
}

function computeNamespaceSha256() {
  const expected = EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1;
  return sha256Utf8(canonicalJson({
    schema: "void.chain2050-role-authority-contract-namespace.v1",
    chain_id: 2050,
    contract_address: expected.contract_address,
    runtime_code_sha256: expected.accepted_runtime_sha256,
  }));
}

function computeDescriptorSha256(descriptor) {
  return sha256Utf8(canonicalJson(descriptor));
}

function validateHistoricalEvidence(
  checkpointEvidence,
  genesisEvidence,
) {
  let checkpoint;
  let genesis;
  try {
    checkpoint =
      verifyRoleAuthorityCheckpointVerifiedAttestationEvidenceV1(
        checkpointEvidence,
      );
  } catch (error) {
    throw new Error(
      "role_authority_deployment_checkpoint_invalid:" +
        String(error?.message || error),
    );
  }
  try {
    genesis =
      verifySovereignGenesisAppendReconciliationEvidenceV1(
        genesisEvidence,
      );
  } catch (error) {
    throw new Error(
      "role_authority_sovereign_genesis_invalid:" +
        String(error?.message || error),
    );
  }
  return { checkpoint, genesis };
}

function validateObserverResult(observerResult) {
  const expected = EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1;
  const expectedFinality =
    computeChain2050RoleAuthorityLiveRpcFinalityPolicySha256V1({
      confirmation_depth: Number(expected.confirmation_depth),
    });
  if (!HEX64.test(String(expectedFinality || ""))) {
    throw new Error("role_authority_expected_finality_policy_invalid");
  }

  if (
    !isRecord(observerResult) ||
    observerResult.ok !== true ||
    observerResult.marker !==
      "VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1" ||
    observerResult.version !== 1 ||
    observerResult.status !== "read_only_live_rpc_observer_ready" ||
    observerResult.deployment_verified !== false ||
    observerResult.production_activation_authorized !== false
  ) {
    throw new Error("role_authority_live_observer_result_invalid");
  }

  const source = observerResult.source;
  const observation = observerResult.observation;
  const snapshot = observerResult.initial_snapshot;
  if (
    !isRecord(source) ||
    source.marker !==
      "VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_OBSERVER_V1" ||
    source.chain_id !== 2050 ||
    source.contract_address !== expected.contract_address ||
    source.runtime_code_sha256 !== expected.accepted_runtime_sha256 ||
    source.registry_contract_sha256 !==
      expected.reviewed_registry_contract_sha256 ||
    source.query_contract_sha256 !==
      VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_QUERY_CONTRACT_SHA256_V1 ||
    source.finality_policy_sha256 !== expectedFinality ||
    source.transport_kind !== "loopback_http_json_rpc" ||
    source.synthetic_transport !== false ||
    typeof source.readContractSnapshotV1 !== "function"
  ) {
    throw new Error("role_authority_live_observer_source_binding_invalid");
  }

  if (
    !isRecord(observation) ||
    String(observation.chain_id) !== "2050" ||
    observation.confirmation_depth !== expected.confirmation_depth ||
    observation.fixed_block_observation !== true ||
    observation.observation_block_hash_revalidated !== true ||
    observation.runtime_code_revalidated !== true ||
    observation.terminal_state_revalidated !== true ||
    !decimalAtLeast(
      observation.observation_block_number,
      expected.sovereign_genesis_block_number,
    ) ||
    !/^0x[0-9a-f]{64}$/.test(
      String(observation.observation_block_hash || ""),
    )
  ) {
    throw new Error("role_authority_live_observation_invalid");
  }

  if (
    !isRecord(snapshot) ||
    snapshot.schema !==
      "void.chain2050-role-authority-contract-snapshot.v1" ||
    snapshot.chain_id !== 2050 ||
    snapshot.contract_address !== expected.contract_address ||
    snapshot.runtime_code_sha256 !== expected.accepted_runtime_sha256 ||
    snapshot.empty_registry_root_sha256 !==
      expected.empty_registry_root_sha256 ||
    typeof snapshot.entry_count !== "string" ||
    !DECIMAL.test(snapshot.entry_count) ||
    BigInt(snapshot.entry_count) < 1n ||
    !Array.isArray(snapshot.entries) ||
    BigInt(snapshot.entry_count) !== BigInt(snapshot.entries.length)
  ) {
    throw new Error("role_authority_live_snapshot_shape_invalid");
  }

  const entry0 = snapshot.entries[0];
  if (
    !isRecord(entry0) ||
    entry0.entry_index !== "0" ||
    entry0.previous_registry_root_sha256 !==
      expected.empty_registry_root_sha256 ||
    entry0.role_record_sha256 !==
      expected.sovereign_genesis_role_record_sha256 ||
    entry0.registry_root_sha256 !==
      expected.sovereign_genesis_registry_root_sha256 ||
    !isRecord(entry0.record) ||
    entry0.record.identity_id !== expected.sovereign_identity_id ||
    entry0.record.role !== "SOVEREIGN" ||
    entry0.record.authority_status !== "active" ||
    entry0.record.role_authority_generation !== "0" ||
    entry0.record.subject_binding_sha256 !==
      expected.sovereign_subject_binding_sha256 ||
    entry0.record.authority_policy_sha256 !==
      expected.sovereign_policy_sha256 ||
    entry0.record.predecessor_role_record_sha256 !== null ||
    entry0.record.transition !== "genesis_grant" ||
    entry0.record.role_record_sha256 !==
      expected.sovereign_genesis_role_record_sha256
  ) {
    throw new Error("role_authority_sovereign_genesis_prefix_mismatch");
  }

  return {
    expectedFinality,
    source,
    observation,
    snapshot,
  };
}

function validateBindingResult(bindingResult, observerSource, expectedFinality) {
  const expected = EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1;
  if (
    !isRecord(bindingResult) ||
    bindingResult.ok !== true ||
    !isRecord(bindingResult.descriptor) ||
    typeof bindingResult.binding_descriptor_sha256 !== "string" ||
    !HEX64.test(bindingResult.binding_descriptor_sha256) ||
    !isRecord(bindingResult.source) ||
    bindingResult.source.chain_id !== 2050 ||
    bindingResult.source.source_kind !==
      "canonical_chain2050_role_authority" ||
    bindingResult.source.binding_descriptor_sha256 !==
      bindingResult.binding_descriptor_sha256 ||
    typeof bindingResult.source.readCurrentRoleAuthorityRecordV1 !==
      "function"
  ) {
    throw new Error("role_authority_live_binding_result_invalid");
  }

  const descriptor = bindingResult.descriptor;
  const expectedNamespace = computeNamespaceSha256();
  if (
    descriptor.schema !==
      "void.chain2050-role-authority-registry-binding.v1" ||
    descriptor.chain_id !== 2050 ||
    descriptor.binding_kind !==
      "reviewed_chain2050_role_authority_registry_binding" ||
    descriptor.binding_id !== expected.binding_id ||
    descriptor.registry_namespace_sha256 !== expectedNamespace ||
    descriptor.registry_contract_sha256 !==
      expected.reviewed_registry_contract_sha256 ||
    descriptor.query_contract_sha256 !==
      VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_QUERY_CONTRACT_SHA256_V1 ||
    descriptor.finality_policy_sha256 !== expectedFinality
  ) {
    throw new Error("role_authority_live_binding_descriptor_invalid");
  }

  const expectedDescriptorSha = computeDescriptorSha256(descriptor);
  if (
    expectedDescriptorSha !==
      bindingResult.binding_descriptor_sha256
  ) {
    throw new Error(
      "role_authority_live_binding_descriptor_hash_mismatch",
    );
  }

  if (
    observerSource.contract_address !== expected.contract_address ||
    observerSource.runtime_code_sha256 !==
      expected.accepted_runtime_sha256 ||
    observerSource.registry_contract_sha256 !==
      descriptor.registry_contract_sha256 ||
    observerSource.query_contract_sha256 !==
      descriptor.query_contract_sha256 ||
    observerSource.finality_policy_sha256 !==
      descriptor.finality_policy_sha256
  ) {
    throw new Error("role_authority_live_binding_observer_drift");
  }

  return {
    descriptor,
    bindingDescriptorSha256: expectedDescriptorSha,
    namespaceSha256: expectedNamespace,
    source: bindingResult.source,
  };
}

function canonicalRoleRecordSha256(record) {
  return sha256Utf8(canonicalJson(record));
}

export async function buildRoleAuthorityParticipantLiveBindingPreflightV1({
  checkpoint_evidence,
  genesis_reconciliation_evidence,
  observer_result,
  binding_result,
} = {}) {
  let historical;
  let observer;
  let binding;
  try {
    historical = validateHistoricalEvidence(
      checkpoint_evidence,
      genesis_reconciliation_evidence,
    );
    observer = validateObserverResult(observer_result);
    binding = validateBindingResult(
      binding_result,
      observer.source,
      observer.expectedFinality,
    );
  } catch (error) {
    return held(String(error?.message || error));
  }

  let sovereignRecord;
  try {
    sovereignRecord =
      await binding.source.readCurrentRoleAuthorityRecordV1(
        EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.sovereign_identity_id,
      );
  } catch (error) {
    return held(
      "role_authority_bound_sovereign_read_failed",
      String(error?.message || error).slice(0, 240),
    );
  }

  if (
    !isRecord(sovereignRecord) ||
    sovereignRecord.schema !==
      "void.chain2050-role-authority-record.v1" ||
    sovereignRecord.chain_id !== 2050 ||
    sovereignRecord.identity_id !==
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.sovereign_identity_id ||
    sovereignRecord.role !== "SOVEREIGN" ||
    sovereignRecord.authority_status !== "active" ||
    typeof sovereignRecord.role_authority_generation !== "string" ||
    !DECIMAL.test(sovereignRecord.role_authority_generation) ||
    typeof sovereignRecord.subject_binding_sha256 !== "string" ||
    !HEX64.test(sovereignRecord.subject_binding_sha256) ||
    typeof sovereignRecord.authority_policy_sha256 !== "string" ||
    !HEX64.test(sovereignRecord.authority_policy_sha256)
  ) {
    return held("role_authority_bound_sovereign_record_invalid");
  }

  const currentSovereignRecordSha256 =
    canonicalRoleRecordSha256(sovereignRecord);
  if (
    sovereignRecord.role_authority_generation === "0" &&
    currentSovereignRecordSha256 !==
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1
        .sovereign_genesis_role_record_sha256
  ) {
    return held("role_authority_sovereign_genesis_current_hash_mismatch");
  }

  const normalized = {
    chain_id: "2050",
    contract_address:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.contract_address,
    accepted_runtime_sha256:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.accepted_runtime_sha256,
    reviewed_registry_contract_sha256:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1
        .reviewed_registry_contract_sha256,
    deployment_finality_evidence_id:
      historical.checkpoint.verified_attestation_evidence_id,
    sovereign_genesis_reconciliation_evidence_id:
      historical.genesis.reconciliation_evidence_id,
    observation_block_number:
      observer.observation.observation_block_number,
    observation_block_hash:
      observer.observation.observation_block_hash,
    confirmation_depth:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.confirmation_depth,
    initial_observed_registry_entry_count:
      observer.snapshot.entry_count,
    initial_observed_registry_root_sha256:
      observer.snapshot.registry_root_sha256,
    registry_namespace_sha256: binding.namespaceSha256,
    query_contract_sha256:
      VOID_CHAIN2050_ROLE_AUTHORITY_LIVE_RPC_QUERY_CONTRACT_SHA256_V1,
    finality_policy_sha256: observer.expectedFinality,
    binding_id:
      EXPECTED_ROLE_AUTHORITY_LIVE_BINDING_V1.binding_id,
    binding_descriptor_sha256:
      binding.bindingDescriptorSha256,
    current_sovereign_generation:
      sovereignRecord.role_authority_generation,
    current_sovereign_role_record_sha256:
      currentSovereignRecordSha256,
  };

  const preflightId =
    "voidcrapalb1_" + sha256Utf8(canonicalJson(normalized));

  return Object.freeze({
    ok: true,
    marker:
      VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_PREFLIGHT_V1,
    version: 1,
    status:
      "LIVE_CHAIN_ROLE_AUTHORITY_BOUND_HELD_FOR_DURABLE_SESSION_AND_COMPOSITION_WIRING",
    preflight_id: preflightId,
    ...normalized,
    facts: Object.freeze({
      accepted_deployment_checkpoint_verified: true,
      sovereign_genesis_reconciled: true,
      sovereign_genesis_prefix_exact: true,
      fresh_live_fixed_block_observation_verified: true,
      runtime_code_identity_revalidated: true,
      terminal_registry_state_revalidated: true,
      canonical_snapshot_validation_exercised: true,
      bound_sovereign_read_verified: true,
      live_chain_registry_bound: true,
      participant_role_source_ready: true,
      durable_participant_session_state_bound: false,
      public_session_route_mount_authorized: false,
      runtime_activation_authorized: false,
    }),
    authority:
      VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_AUTHORITY_V1,
    next_gate:
      "merge_durable_participant_session_state_then_review_composition_wiring_and_restart_rollback_preflight",
  });
}

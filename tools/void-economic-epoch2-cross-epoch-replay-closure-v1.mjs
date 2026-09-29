#!/usr/bin/env node
import { createHash } from "node:crypto";

export const VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_CLOSURE_V1 =
  "VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_CLOSURE_V1";

export const VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_CLOSURE_AUTHORITY_V1 =
  Object.freeze({
    source_classification_only: true,
    filesystem_read: false,
    filesystem_write: false,
    service_action: false,
    rpc_call: false,
    validator_mutation: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });

const INPUT_KEYS = Object.freeze([
  "migration_candidate",
  "raw_domain_policy",
  "gateway_replay_binding",
  "privileged_signer_replay_fence",
  "signed_artifact_census_closeout",
  "qbft_binding_candidate",
]);

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(code);
  const sorted = actual.sort();
  const expected = [...keys].sort();
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

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
  if (plain(value)) {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function digest(value) {
  return "sha256:" +
    createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function bool(value, code) {
  if (typeof value !== "boolean") fail(code);
  return value;
}

function requireFalseAuthority(authority, allowTrueKey, code) {
  if (!plain(authority)) fail(code);
  for (const [key, value] of Object.entries(authority)) {
    if (key === allowTrueKey) {
      if (value !== true) fail(code);
    } else if (value !== false) {
      fail(code);
    }
  }
}

export function classifyVoidEconomicEpoch2CrossEpochReplayClosureV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "cross_epoch_replay_closure_input_shape_invalid",
  );

  const migration = request.migration_candidate;
  if (
    !plain(migration) ||
    migration.marker !== "VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1" ||
    migration.version !== 1 ||
    migration.successor_execution_layer?.chain_id !== 2050 ||
    migration.successor_execution_layer?.execution_epoch !== 2
  ) {
    fail("cross_epoch_replay_migration_candidate_invalid");
  }
  const replay = migration.replay_and_epoch_safety;
  if (
    !plain(replay) ||
    replay.legacy_write_rpc_disabled_before_successor_activation !== true ||
    replay.execution_epoch_bound_in_public_gateway !== true ||
    replay.privileged_signer_nonce_or_key_replay_fence_proven !== true ||
    replay.pending_legacy_signed_transaction_census_complete !== true ||
    replay.raw_transaction_epoch_domain_defined !== true ||
    replay.raw_transaction_epoch_domain_source_proven !== true ||
    replay.besu_transaction_validation_rule_implemented !== true ||
    replay.plugin_artifact_content_addressed !== true ||
    replay.plugin_artifact_runtime_identity_verified !== true ||
    replay.besu_transaction_validation_rule_runtime_proven !== true ||
    replay.cross_epoch_replay_protection_proven !== false
  ) {
    fail("cross_epoch_replay_migration_prerequisite_mismatch");
  }
  const migrationAllValidators = bool(
    replay.all_production_validators_epoch_domain_enforced,
    "cross_epoch_replay_migration_validator_gate_invalid",
  );

  const rawDomain = request.raw_domain_policy;
  if (
    !plain(rawDomain) ||
    rawDomain.marker !== "VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_V1" ||
    rawDomain.version !== 1 ||
    rawDomain.chain_id !== 2050 ||
    rawDomain.execution_epoch !== 2 ||
    rawDomain.gates?.raw_transaction_epoch_domain_defined !== true ||
    rawDomain.gates?.raw_transaction_epoch_domain_source_proven !== true ||
    rawDomain.gates?.besu_transaction_validation_rule_implemented !== true ||
    rawDomain.gates?.besu_transaction_validation_rule_source_tested !== true ||
    rawDomain.gates?.plugin_artifact_content_addressed !== true ||
    rawDomain.gates?.plugin_artifact_runtime_identity_verified !== true ||
    rawDomain.gates?.besu_transaction_validation_rule_runtime_proven !== true ||
    rawDomain.gates?.cross_epoch_replay_protection_proven !== false
  ) {
    fail("cross_epoch_replay_raw_domain_prerequisite_mismatch");
  }
  const rawDomainAllValidators = bool(
    rawDomain.gates.all_production_validators_epoch_domain_enforced,
    "cross_epoch_replay_raw_domain_validator_gate_invalid",
  );
  if (rawDomainAllValidators !== migrationAllValidators) {
    fail("cross_epoch_replay_validator_gate_disagreement");
  }

  const gateway = request.gateway_replay_binding;
  if (
    !plain(gateway) ||
    gateway.marker !==
      "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1" ||
    gateway.version !== 1 ||
    gateway.chain_id !== 2050 ||
    gateway.execution_epoch !== 2 ||
    gateway.gates?.durable_replay_store_implemented !== true ||
    gateway.gates?.durable_replay_store_verified !== true ||
    gateway.gates?.production_gateway_replay_store_binding_source_verified !==
      true ||
    gateway.gates?.runtime_route_active !== false ||
    gateway.gates?.public_submission_open !== false ||
    gateway.gates?.transaction_submission !== false ||
    gateway.gates?.transaction_broadcast !== false ||
    gateway.gates?.authoritative_chain2050_write !== false ||
    gateway.gates?.cross_epoch_replay_protection_proven !== false
  ) {
    fail("cross_epoch_replay_gateway_prerequisite_mismatch");
  }
  const gatewayLiveBinding = bool(
    gateway.gates.production_gateway_replay_store_binding_verified,
    "cross_epoch_replay_gateway_live_binding_gate_invalid",
  );

  const fence = request.privileged_signer_replay_fence;
  if (
    !plain(fence) ||
    fence.marker !== "VOID_ECONOMIC_EPOCH2_PRIVILEGED_SIGNER_REPLAY_FENCE_V1" ||
    fence.version !== 1 ||
    fence.chain_id !== 2050 ||
    fence.source_execution_epoch !== 1 ||
    fence.successor_execution_epoch !== 2 ||
    fence.decision?.privileged_signer_nonce_or_key_replay_fence_proven !== true ||
    fence.decision?.pending_legacy_signed_transaction_census_complete !== true ||
    fence.decision?.cross_epoch_replay_protection_proven !== false
  ) {
    fail("cross_epoch_replay_privileged_signer_fence_invalid");
  }
  requireFalseAuthority(
    fence.authority,
    "source_only",
    "cross_epoch_replay_privileged_signer_authority_invalid",
  );

  const census = request.signed_artifact_census_closeout;
  if (
    !plain(census) ||
    census.marker !== "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CENSUS_CLOSEOUT_V1" ||
    census.version !== 1 ||
    census.chain_id !== 2050 ||
    census.source_execution_epoch !== 1 ||
    census.successor_execution_epoch !== 2 ||
    census.decision?.pending_legacy_signed_transaction_census_complete !== true ||
    census.decision?.cross_epoch_replay_protection_proven !== false ||
    typeof census.closeout_id !== "string" ||
    !/^voidepoch2census1_[0-9a-f]{64}$/u.test(census.closeout_id)
  ) {
    fail("cross_epoch_replay_signed_artifact_census_invalid");
  }
  requireFalseAuthority(
    census.authority,
    "source_only",
    "cross_epoch_replay_signed_artifact_census_authority_invalid",
  );

  const binding = request.qbft_binding_candidate;
  const entries = binding?.qbft?.production_binding_entries;
  if (
    !plain(binding) ||
    binding.marker !== "VOID_ECONOMIC_EPOCH2_QBFT_VALIDATOR_BINDING_CANDIDATE_V1" ||
    binding.version !== 1 ||
    binding.qbft?.client !== "Besu" ||
    binding.qbft?.client_version !== "26.8.1" ||
    binding.qbft?.consensus !== "QBFT" ||
    binding.qbft?.production_validator_count !== 3 ||
    binding.qbft?.required_live_node_count !== 3 ||
    binding.qbft?.attested_live_node_count !== 3 ||
    binding.qbft?.attested_identity_slots_remaining !== 0 ||
    !Array.isArray(entries) ||
    entries.length !== 3
  ) {
    fail("cross_epoch_replay_qbft_binding_invalid");
  }
  const roles = entries.map((row) => row?.machine_role);
  if (
    roles.join(",") !== "precision,nimo,xiphos" ||
    new Set(entries.map((row) => row?.besu_validator_address)).size !== 3 ||
    new Set(entries.map((row) => row?.void_node_id)).size !== 3
  ) {
    fail("cross_epoch_replay_qbft_binding_identity_set_invalid");
  }

  const missingLiveGates = [];
  if (!migrationAllValidators) {
    missingLiveGates.push("all_production_validators_epoch_domain_enforced");
  }
  if (!gatewayLiveBinding) {
    missingLiveGates.push("production_gateway_replay_store_binding_verified");
  }

  const composition = Object.freeze({
    chain_id: 2050,
    source_execution_epoch: 1,
    successor_execution_epoch: 2,
    validator_roles: Object.freeze([...roles]),
    validator_count: 3,
    pending_legacy_signed_transaction_census_complete: true,
    privileged_signer_nonce_or_key_replay_fence_proven: true,
    raw_transaction_epoch_domain_defined: true,
    raw_transaction_epoch_domain_runtime_proven: true,
    durable_replay_store_source_bound: true,
    all_production_validators_epoch_domain_enforced:
      migrationAllValidators,
    production_gateway_replay_store_binding_verified:
      gatewayLiveBinding,
    census_closeout_id: census.closeout_id,
  });

  return Object.freeze({
    ok: true,
    status: missingLiveGates.length === 0
      ? "PROMOTION_INPUTS_PRESENT_UPSTREAM_LIVE_EVIDENCE_REVALIDATION_REQUIRED"
      : "SOURCE_CLOSURE_READY_LIVE_RUNTIME_HOLD",
    marker: VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_CLOSURE_V1,
    closure_id: digest(composition),
    ...composition,
    source_prerequisites_verified: true,
    missing_live_gates: Object.freeze(missingLiveGates),
    upstream_live_evidence_semantically_verified: false,
    cross_epoch_replay_protection_promotable:
      missingLiveGates.length === 0,
    cross_epoch_replay_protection_proven: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_CLOSURE_AUTHORITY_V1,
  });
}

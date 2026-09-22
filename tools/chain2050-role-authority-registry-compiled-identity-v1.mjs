#!/usr/bin/env node
import {
  canonicalJson,
  sha256,
} from "./chain2050-role-authority-registry-dual-compiler-v1.mjs";

export const VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_COMPILED_IDENTITY_RECORD_V1 =
  "VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_COMPILED_IDENTITY_RECORD_V1";

export const EXPECTED = Object.freeze({
  identity_id:
    "voidcraregci1_357e5b21d523eec80cb1485eb44c54acc9d42c9088fd6891075bc52183a65119",
  identity_json_sha256:
    "1590a2dcde983e483c3bbac6628c6d57b0a560e44cb5796f8075ebdc38fc7bb1",
  identity_json_bytes: 4181,
  compiler_evidence_source_commit:
    "4a1ea998c817576cce714a3786d544a198b721d4",
  merged_main_commit:
    "58691b0a0309c6fc7f1aaebb00232338d842cec9",
  contract_source_sha256:
    "a6ecf042569223cc1d56b3e2cc3350206a0abd6352b009212b6540699f7c57f6",
  standard_json_input_canonical_sha256:
    "06246343aa5c3b4610c87530dd6317cade3d6da61d313bee6c6eeb9c93d44f12",
  creation_bytecode_sha256:
    "c0844cd0718ed2dc345bbc01107b57dbb2c2129e325066bff399502031a14733",
  runtime_template_sha256:
    "b42f8c9397ab02c299563f84233aecdd8f237bbeb553231b702b9b7db03c535d",
  expected_deployed_runtime_sha256:
    "b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d",
  immutable_empty_registry_root_sha256:
    "d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7",
  runtime_immutable_references:
    Object.freeze([
      Object.freeze({
        ast_id: "83",
        start: 1390,
        length: 32,
      }),
    ]),
  abi_sha256:
    "e56ff6fb3c9c1d3847b7bfab49793d623788dcf5d1dc3d1eac4384fc70c356c2",
  metadata_sha256:
    "09309636ce80a9baa748e9a65a59ff9a7ef29374ee76ec90417e1b86171c0d89",
  storage_layout_sha256:
    "14e186caa001ba17491c04456d6b32cd64be5cd93cb71c22a565e419af817fbe",
  method_identifiers_sha256:
    "7e2ddaad9d4345b3a4a38363142152ba385733cadaf28f16310405df1c662fbf",
});

export const AUTHORITY = Object.freeze({
  pure_artifact_validation_only: true,
  process_environment_read: false,
  filesystem_write: false,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_construction: false,
  transaction_broadcast: false,
  deployment: false,
  registry_append: false,
  chain2050_mutation: false,
  service_restart: false,
  production_activation: false,
  work_credit_mutation: false,
  validator_mutation: false,
  funds_action: false,
});

function plain(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function held(reason, detail = undefined) {
  return Object.freeze({
    ok: false,
    status: "held",
    marker:
      VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_COMPILED_IDENTITY_RECORD_V1,
    version: 1,
    reason,
    ...(detail === undefined ? {} : { detail }),
    measured_compiled_identity_recorded: false,
    sovereign_bytecode_acceptance: false,
    owner_binding_resolved: false,
    deployer_binding_resolved: false,
    unsigned_transaction_constructed: false,
    deployment_authorized: false,
    transaction_broadcast_authorized: false,
    production_activation_authorized: false,
    authority: AUTHORITY,
  });
}

function exactSha(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function verifyChain2050RoleAuthorityRegistryCompiledIdentityV1(input) {
  if (!plain(input)) {
    return held("compiled_identity_record_object_required");
  }

  const { identity_id: identityId, ...body } = input;
  if (
    typeof identityId !== "string" ||
    !/^voidcraregci1_[0-9a-f]{64}$/.test(identityId) ||
    identityId !== "voidcraregci1_" + sha256(canonicalJson(body)) ||
    identityId !== EXPECTED.identity_id
  ) {
    return held("compiled_identity_record_id_invalid");
  }

  if (
    input.marker !==
      VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_COMPILED_IDENTITY_RECORD_V1 ||
    input.protocol !==
      "void-chain2050-role-authority-registry-compiled-identity-record/1" ||
    input.version !== 1 ||
    input.status !==
      "recorded_hold_pending_sovereign_bytecode_acceptance_and_owner_deployer_binding"
  ) {
    return held("compiled_identity_record_contract_mismatch");
  }

  const source = input.source;
  if (
    !plain(source) ||
    source.repository !== "6ZoSo9/void-node" ||
    source.compiler_evidence_source_commit !==
      EXPECTED.compiler_evidence_source_commit ||
    source.merged_main_commit !== EXPECTED.merged_main_commit ||
    source.pull_request !== 1695 ||
    source.contract_path !==
      "contracts/mainnet0/VoidChain2050RoleAuthorityRegistryV1.sol" ||
    source.contract_name !==
      "VoidChain2050RoleAuthorityRegistryV1" ||
    source.contract_source_sha256 !==
      EXPECTED.contract_source_sha256 ||
    source.standard_json_input_canonical_sha256 !==
      EXPECTED.standard_json_input_canonical_sha256
  ) {
    return held("compiled_identity_record_source_binding_mismatch");
  }

  const profile = input.compiler_profile;
  if (
    !plain(profile) ||
    profile.compiler !== "solc" ||
    profile.release !== "0.8.20+commit.a1b79de6" ||
    profile.evm_version !== "paris" ||
    profile.optimizer_enabled !== true ||
    profile.optimizer_runs !== 200 ||
    profile.via_ir !== true ||
    profile.metadata_append_cbor !== true ||
    profile.metadata_use_literal_content !== true ||
    profile.metadata_bytecode_hash !== "ipfs"
  ) {
    return held("compiled_identity_record_compiler_profile_mismatch");
  }

  const evidence = input.evidence;
  if (
    !plain(evidence) ||
    evidence.focused_run_id !== 35701262479 ||
    evidence.real_compile_job_id !== 106659598758 ||
    evidence.reproducibility_id !==
      "voidcraregdc1_98ae94aacbf76c6d8de48aa3f57b181dab7e15ee95aaf179fbbb16a40c0c3d73" ||
    evidence.native_and_solcjs_exact_match !== true ||
    evidence.legacy_codegen_stack_too_deep_observed !== true ||
    evidence.deployment_profile_corrected_to_viair !== true ||
    evidence.solidity_source_modified_for_viair !== false
  ) {
    return held("compiled_identity_record_evidence_mismatch");
  }

  const artifacts = input.artifacts;
  if (
    !plain(artifacts) ||
    artifacts.creation_bytecode_sha256 !==
      EXPECTED.creation_bytecode_sha256 ||
    artifacts.runtime_template_sha256 !==
      EXPECTED.runtime_template_sha256 ||
    artifacts.expected_deployed_runtime_sha256 !==
      EXPECTED.expected_deployed_runtime_sha256 ||
    artifacts.immutable_empty_registry_root_sha256 !==
      EXPECTED.immutable_empty_registry_root_sha256 ||
    canonicalJson(artifacts.runtime_immutable_references) !==
      canonicalJson(EXPECTED.runtime_immutable_references) ||
    artifacts.abi_sha256 !== EXPECTED.abi_sha256 ||
    artifacts.metadata_sha256 !== EXPECTED.metadata_sha256 ||
    artifacts.storage_layout_sha256 !==
      EXPECTED.storage_layout_sha256 ||
    artifacts.method_identifiers_sha256 !==
      EXPECTED.method_identifiers_sha256
  ) {
    return held("compiled_identity_record_artifact_mismatch");
  }
  for (const value of [
    artifacts.creation_bytecode_sha256,
    artifacts.runtime_template_sha256,
    artifacts.expected_deployed_runtime_sha256,
    artifacts.immutable_empty_registry_root_sha256,
    artifacts.abi_sha256,
    artifacts.metadata_sha256,
    artifacts.storage_layout_sha256,
    artifacts.method_identifiers_sha256,
  ]) {
    if (!exactSha(value)) {
      return held("compiled_identity_record_hash_shape_invalid");
    }
  }

  const constructor = input.constructor;
  if (
    !plain(constructor) ||
    constructor.signature !== "constructor(address)" ||
    canonicalJson(constructor.parameter_order) !==
      canonicalJson(["initial_owner"]) ||
    constructor.initial_owner_address !== null
  ) {
    return held("compiled_identity_record_constructor_boundary_drift");
  }

  const unresolved = input.unresolved;
  if (
    !plain(unresolved) ||
    unresolved.sovereign_bytecode_acceptance !== false ||
    unresolved.owner_address !== null ||
    unresolved.deployer_address !== null ||
    unresolved.owner_deployer_separation_reviewed !== false ||
    unresolved.deployment_data_sha256 !== null ||
    unresolved.unsigned_transaction_constructed !== false ||
    unresolved.deployment_attested !== false ||
    unresolved.live_contract_address !== null ||
    unresolved.production_activation_authorized !== false
  ) {
    return held("compiled_identity_record_unresolved_boundary_drift");
  }

  if (
    !plain(input.authority) ||
    canonicalJson(input.authority) !== canonicalJson(AUTHORITY) ||
    Object.entries(input.authority).some(
      ([key, value]) =>
        key !== "pure_artifact_validation_only" && value !== false,
    ) ||
    input.authority.pure_artifact_validation_only !== true
  ) {
    return held("compiled_identity_record_authority_drift");
  }

  const decision = input.decision;
  if (
    !plain(decision) ||
    decision.measured_compiled_identity_recorded !== true ||
    decision.sovereign_bytecode_acceptance !== false ||
    decision.owner_binding_resolved !== false ||
    decision.deployer_binding_resolved !== false ||
    decision.unsigned_transaction_constructed !== false ||
    decision.deployment_authorized !== false ||
    decision.transaction_broadcast_authorized !== false ||
    decision.production_activation_authorized !== false ||
    decision.next_gate !==
      "sovereign_review_of_exact_compiled_identity_then_owner_deployer_binding_source_only"
  ) {
    return held("compiled_identity_record_decision_drift");
  }

  return Object.freeze({
    ok: true,
    status:
      "compiled_identity_recorded_held_on_sovereign_bytecode_acceptance",
    marker:
      VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_COMPILED_IDENTITY_RECORD_V1,
    version: 1,
    identity_id: identityId,
    measured_compiled_identity_recorded: true,
    sovereign_bytecode_acceptance: false,
    owner_binding_resolved: false,
    deployer_binding_resolved: false,
    unsigned_transaction_constructed: false,
    deployment_authorized: false,
    transaction_broadcast_authorized: false,
    production_activation_authorized: false,
    next_gate:
      "sovereign_review_of_exact_compiled_identity_then_owner_deployer_binding_source_only",
    authority: AUTHORITY,
  });
}

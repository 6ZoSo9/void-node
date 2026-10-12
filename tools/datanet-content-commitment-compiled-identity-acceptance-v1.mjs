#!/usr/bin/env node
import { keccak256 } from "ethers";
import {
  VOID_DATANET_CONTENT_COMMITMENT_DUAL_COMPILER_IDENTITY_V1,
  DECISION,
  AUTHORITY,
} from "./datanet-content-commitment-dual-compiler-identity-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_COMPILED_IDENTITY_ACCEPTANCE_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_COMPILED_IDENTITY_ACCEPTANCE_V1";

export const EXPECTED = {
  "identity_id": "voiddccci1_81d496b90721265d126a12e331432c10ca5403cc650fe634adce92b15c6afed6",
  "identity_json_sha256": "17e74d657c0b9a348d5d007e7e66b830faba97b217ea4f7a0d5ba97f9963f6cd",
  "identity_json_bytes": 21089,
  "source_commit": "beb4bd06d66304347080bb0852af1efbb4546128",
  "source_ref": "main",
  "contract_source_sha256": "b1f4d40bf701fa72ff5921646c32d091c65bdee3257098aaabfef8df4d802877",
  "standard_json_input_canonical_sha256": "bb0dd93cde5de9aa93bc372a49b3ee7c6f7dc269d7c35138900a29d1abb11daa",
  "creation_bytecode_bytes": 4039,
  "creation_bytecode_sha256": "85716cc7d58f49f92a3d09fd2b365ae74e5045514d3ebf7eb12f7787ef18c6df",
  "creation_bytecode_keccak256": "0x57c1cd394f7a0e845542c40691f424dcc141338052a3a31561407ad08aadb370",
  "runtime_template_bytes": 2910,
  "runtime_template_sha256": "6bf8ccf7463f6f42f2b41be19bba7dad96b72cfd7a4b651b244caec6f88946db",
  "runtime_template_keccak256": "0x469a5a0b4104fe64f0555572ab30f2d840d530b143448cb57e4a9f9103ee1b62",
  "immutable_layout_sha256": "7546b9f20a800437dbbf39f5dc32b0d0bb2980ae45f785527bc8ea53241ef8cf",
  "immutable_layout": {
    "publisher": {
      "references": [
        {
          "start": 1070,
          "length": 32
        },
        {
          "start": 1106,
          "length": 32
        }
      ]
    },
    "predecessor": {
      "references": [
        {
          "start": 454,
          "length": 32
        },
        {
          "start": 518,
          "length": 32
        },
        {
          "start": 816,
          "length": 32
        },
        {
          "start": 876,
          "length": 32
        },
        {
          "start": 1767,
          "length": 32
        }
      ]
    }
  }
};

export const VOID_DATANET_CONTENT_COMMITMENT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1 = {
  pure_artifact_validation_only: true,
  process_environment_read: false,
  filesystem_write: false,
  credential_access: false,
  wallet_access: false,
  rpc_call: false,
  signing: false,
  transaction_construction: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  validator_mutation: false,
  governance_mutation: false,
  runtime_service_action: false,
  funds_action: false,
};

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function held(reason, detail = undefined) {
  return {
    ok: false,
    status: "held",
    marker: VOID_DATANET_CONTENT_COMMITMENT_COMPILED_IDENTITY_ACCEPTANCE_V1,
    version: 1,
    reason,
    ...(detail === undefined ? {} : { detail }),
    compiled_identity_accepted: false,
    deployment_attested: false,
    predecessor_lineage_attested: false,
    object_uncommitted_preflight_verified: false,
    transaction_construction_authorized: false,
    transaction_signing_authorized: false,
    transaction_broadcast_authorized: false,
    chain2050_write_authorized: false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1,
  };
}

function referencesOnly(layout) {
  const result = {};
  for (const name of ["publisher", "predecessor"]) {
    const entry = layout?.[name];
    if (!plain(entry) || !Array.isArray(entry.references)) return null;
    result[name] = {
      references: entry.references.map((value) => ({
        start: value?.start,
        length: value?.length,
      })),
    };
  }
  return result;
}

export function verifyDatanetContentCommitmentCompiledIdentityV1(input) {
  if (!plain(input)) return held("compiled_identity_object_required");

  const { identity_id: identityId, ...body } = input;
  if (
    typeof identityId !== "string" ||
    !/^voiddccci1_[0-9a-f]{64}$/.test(identityId) ||
    identityId !== "voiddccci1_" + sha256(canonicalJson(body)) ||
    identityId !== EXPECTED.identity_id
  ) {
    return held("compiled_identity_id_invalid");
  }

  if (
    input.marker !== VOID_DATANET_CONTENT_COMMITMENT_DUAL_COMPILER_IDENTITY_V1 ||
    input.protocol !== "void-datanet-content-commitment-dual-compiler-identity/1" ||
    input.version !== 1 ||
    input.decision?.status !== DECISION
  ) {
    return held("compiled_identity_contract_mismatch");
  }

  if (
    input.source?.source_commit !== EXPECTED.source_commit ||
    input.source?.source_ref !== EXPECTED.source_ref ||
    input.source?.contract_source_sha256 !== EXPECTED.contract_source_sha256 ||
    input.source?.standard_json_input_canonical_sha256 !==
      EXPECTED.standard_json_input_canonical_sha256
  ) {
    return held("compiled_identity_source_binding_mismatch");
  }

  if (
    input.compiler_profile?.release !== "0.8.24+commit.e11b9ed9" ||
    input.compiler_profile?.evm_version !== "paris" ||
    input.compiler_profile?.optimizer_enabled !== false ||
    input.compiler_profile?.optimizer_runs !== 200 ||
    input.compiler_profile?.via_ir !== false
  ) {
    return held("compiled_identity_compiler_profile_mismatch");
  }

  const requiredTrue = [
    "compiler_environments_independent",
    "exact_compiler_release",
    "exact_standard_json_input",
    "zero_compiler_errors",
    "zero_link_references",
    "paris_push0_absent",
    "creation_bytecode_exact_match",
    "runtime_template_exact_match",
    "abi_exact_match",
    "metadata_exact_match",
    "storage_layout_exact_match",
    "method_identifiers_exact_match",
    "immutable_layout_exact_match",
    "source_maps_exact_match",
  ];
  for (const key of requiredTrue) {
    if (input.comparison?.[key] !== true) {
      return held("compiled_identity_comparison_not_green", { key });
    }
  }

  const artifacts = input.artifacts;
  const creationHex =
    typeof artifacts?.creation_bytecode_hex === "string"
      ? artifacts.creation_bytecode_hex.toLowerCase()
      : "";
  const runtimeHex =
    typeof artifacts?.runtime_template_hex === "string"
      ? artifacts.runtime_template_hex.toLowerCase()
      : "";
  const creationBytes =
    /^0x[0-9a-f]+$/.test(creationHex) && creationHex.length % 2 === 0
      ? Buffer.from(creationHex.slice(2), "hex")
      : null;
  const runtimeBytes =
    /^0x[0-9a-f]+$/.test(runtimeHex) && runtimeHex.length % 2 === 0
      ? Buffer.from(runtimeHex.slice(2), "hex")
      : null;
  const layoutSha =
    plain(artifacts?.immutable_layout)
      ? sha256(canonicalJson(artifacts.immutable_layout))
      : "";

  if (
    artifacts?.creation_bytecode_bytes !== EXPECTED.creation_bytecode_bytes ||
    artifacts?.creation_bytecode_sha256 !== EXPECTED.creation_bytecode_sha256 ||
    artifacts?.creation_bytecode_keccak256 !== EXPECTED.creation_bytecode_keccak256 ||
    artifacts?.runtime_template_bytes !== EXPECTED.runtime_template_bytes ||
    artifacts?.runtime_template_sha256 !== EXPECTED.runtime_template_sha256 ||
    artifacts?.runtime_template_keccak256 !== EXPECTED.runtime_template_keccak256 ||
    artifacts?.immutable_layout_sha256 !== EXPECTED.immutable_layout_sha256 ||
    creationBytes === null ||
    creationBytes.length !== EXPECTED.creation_bytecode_bytes ||
    sha256(creationBytes) !== EXPECTED.creation_bytecode_sha256 ||
    keccak256(creationHex) !== EXPECTED.creation_bytecode_keccak256 ||
    runtimeBytes === null ||
    runtimeBytes.length !== EXPECTED.runtime_template_bytes ||
    sha256(runtimeBytes) !== EXPECTED.runtime_template_sha256 ||
    keccak256(runtimeHex) !== EXPECTED.runtime_template_keccak256 ||
    layoutSha !== EXPECTED.immutable_layout_sha256
  ) {
    return held("compiled_identity_artifact_mismatch");
  }

  const refs = referencesOnly(artifacts.immutable_layout);
  if (
    refs === null ||
    canonicalJson(refs) !== canonicalJson(EXPECTED.immutable_layout)
  ) {
    return held("compiled_identity_immutable_layout_mismatch");
  }

  if (
    !plain(input.authority) ||
    canonicalJson(input.authority) !== canonicalJson(AUTHORITY) ||
    Object.values(input.authority).some((value) => value !== false)
  ) {
    return held("compiled_identity_authority_drift");
  }

  if (
    input.unresolved?.compiled_identity_committed !== false ||
    input.unresolved?.registry_contract_address !== null ||
    input.unresolved?.deployment_transaction_hash !== null ||
    input.unresolved?.deployment_block_hash !== null ||
    input.unresolved?.publisher_address !== null ||
    input.unresolved?.predecessor_address !== null ||
    input.unresolved?.predecessor_lineage_attested !== false ||
    input.unresolved?.deployed_runtime_code_observed !== false ||
    input.unresolved?.object_uncommitted_preflight_verified !== false ||
    input.unresolved?.transaction_construction_authorized !== false ||
    input.unresolved?.transaction_signing_authorized !== false ||
    input.unresolved?.transaction_broadcast_authorized !== false ||
    input.unresolved?.chain2050_write_authorized !== false ||
    input.decision?.compiled_identity_committed !== false ||
    input.decision?.deployment_attested !== false ||
    input.decision?.predecessor_lineage_attested !== false ||
    input.decision?.transaction_construction_authorized !== false ||
    input.decision?.chain2050_write_authorized !== false
  ) {
    return held("compiled_identity_unresolved_boundary_drift");
  }

  if (
    input.deployment_identity_requirements?.constructor_signature !==
      "constructor(address,address)" ||
    canonicalJson(input.deployment_identity_requirements?.constructor_order) !==
      canonicalJson(["publisher", "predecessor"]) ||
    input.deployment_identity_requirements
      ?.deployed_runtime_must_patch_exact_immutable_layout !== true ||
    input.deployment_identity_requirements
      ?.deployed_runtime_keccak256_must_match_reconstructed_runtime !== true ||
    input.deployment_identity_requirements?.live_registry_version_must_equal !== "1" ||
    input.deployment_identity_requirements?.live_max_object_bytes_must_equal !==
      "268435456" ||
    input.deployment_identity_requirements?.live_publisher_view_must_match_constructor !==
      true ||
    input.deployment_identity_requirements?.live_predecessor_view_must_match_constructor !==
      true ||
    input.deployment_identity_requirements?.predecessor_lineage_must_be_attested !==
      true ||
    input.deployment_identity_requirements?.fresh_is_committed_preflight_required !==
      true
  ) {
    return held("compiled_identity_deployment_requirements_mismatch");
  }

  return {
    ok: true,
    status:
      "compiled_identity_accepted_held_on_chain2050_registry_deployment_lineage_attestation",
    marker: VOID_DATANET_CONTENT_COMMITMENT_COMPILED_IDENTITY_ACCEPTANCE_V1,
    version: 1,
    identity_id: identityId,
    identity_json_sha256: EXPECTED.identity_json_sha256,
    identity_json_bytes: EXPECTED.identity_json_bytes,
    source_commit: EXPECTED.source_commit,
    contract_source_sha256: EXPECTED.contract_source_sha256,
    creation_bytecode_sha256: EXPECTED.creation_bytecode_sha256,
    creation_bytecode_keccak256: EXPECTED.creation_bytecode_keccak256,
    runtime_template_sha256: EXPECTED.runtime_template_sha256,
    runtime_template_keccak256: EXPECTED.runtime_template_keccak256,
    immutable_layout_sha256: EXPECTED.immutable_layout_sha256,
    compiled_identity_accepted: true,
    deployment_attested: false,
    predecessor_lineage_attested: false,
    object_uncommitted_preflight_verified: false,
    transaction_construction_authorized: false,
    transaction_signing_authorized: false,
    transaction_broadcast_authorized: false,
    chain2050_write_authorized: false,
    next_gate:
      "exact_chain2050_registry_deployment_and_predecessor_lineage_attestation",
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1,
  };
}

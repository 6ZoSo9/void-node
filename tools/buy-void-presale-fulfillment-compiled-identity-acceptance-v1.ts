#!/usr/bin/env node
import {
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DUAL_COMPILER_IDENTITY_V1,
  DECISION,
  AUTHORITY,
} from "./buy-void-presale-fulfillment-dual-compiler-identity-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./buy-void-presale-fulfillment-compiler-profile-v1.mjs";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILED_IDENTITY_ACCEPTANCE_V1 =
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILED_IDENTITY_ACCEPTANCE_V1";

export const EXPECTED = {
  source_commit:
    "b65dd27070cbd2894a2378dc4e044a32210064c1",
  source_ref: "main",
  contract_source_sha256:
    "2d72ed1997e043cd370132a75a66b8df96c654c9c0c9dfafb9cbdc2fb12abdb8",
  standard_json_input_canonical_sha256:
    "f413f3a6ef968f4992fcc9f8ea5cc6225fab039a0aef05fc7d13a5149b2ea3e9",
  creation_bytecode_bytes: 5681,
  creation_bytecode_sha256:
    "ef0b7cfbe195b2196860715a8ce1d9bec6d65d8ca234cd7502c2cffd6ee0fab2",
  creation_bytecode_keccak256:
    "0x14f68a6c6a69d87105129ae1901f8aa3d103518828a7795f08bf5b00d4b188c3",
  runtime_template_bytes: 4237,
  runtime_template_sha256:
    "bf349d39ade578ab06ba44881b3ddc43e88c752eefc75291f9196e883c435885",
  runtime_template_keccak256:
    "0xfe85fd25582fd367a4be4ea8a7b25d7d17cebc7763800ceeae88e6071bd6686e",
  immutable_layout_sha256:
    "8562e3098ac4cd88d3685e0880761866a9d8d18891a33a196a4846091a80ae6b",
  immutable_layout: {
    token: {
      references: [
        { start: 1292, length: 32 },
        { start: 2833, length: 32 },
        { start: 2871, length: 32 },
      ],
    },
    fulfiller: {
      references: [
        { start: 543, length: 32 },
        { start: 2795, length: 32 },
      ],
    },
    predecessor: {
      references: [
        { start: 1795, length: 32 },
        { start: 1855, length: 32 },
        { start: 2046, length: 32 },
        { start: 2109, length: 32 },
        { start: 2169, length: 32 },
        { start: 2568, length: 32 },
        { start: 2632, length: 32 },
      ],
    },
  },
} as const;

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1 = {
  pure_artifact_validation_only: true,
  process_environment_read: false,
  filesystem_write: false,
  credential_access: false,
  wallet_access: false,
  rpc_call: false,
  signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  inventory_funding: false,
  runtime_enablement_change: false,
  public_activation: false,
  money_movement: false,
} as const;

function plain(value: unknown): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function held(reason: string, detail?: Record<string, unknown>) {
  return {
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILED_IDENTITY_ACCEPTANCE_V1,
    version: 1 as const,
    reason,
    ...(detail ? { detail } : {}),
    compiled_identity_accepted: false as const,
    deployment_attested: false as const,
    inventory_funding_verified: false as const,
    runtime_activation_authorized: false as const,
    public_activation_authorized: false as const,
    authority:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1,
  };
}

function referencesOnly(layout: Record<string, any>) {
  const result: Record<string, any> = {};
  for (const name of ["token", "fulfiller", "predecessor"]) {
    const entry = layout?.[name];
    if (!plain(entry) || !Array.isArray(entry.references)) {
      return null;
    }
    result[name] = {
      references: entry.references.map((value: any) => ({
        start: value?.start,
        length: value?.length,
      })),
    };
  }
  return result;
}

export function verifyBuyVoidPresaleFulfillmentCompiledIdentityV1(
  input: unknown,
) {
  if (!plain(input)) {
    return held("compiled_identity_object_required");
  }

  const { identity_id: identityId, ...body } = input;
  if (
    typeof identityId !== "string" ||
    !/^voidbvpfci1_[0-9a-f]{64}$/.test(identityId) ||
    identityId !==
      "voidbvpfci1_" + sha256(canonicalJson(body))
  ) {
    return held("compiled_identity_id_invalid");
  }

  if (
    input.marker !==
      VOID_BUY_VOID_PRESALE_FULFILLMENT_DUAL_COMPILER_IDENTITY_V1 ||
    input.protocol !==
      "void-buy-void-presale-fulfillment-dual-compiler-identity/1" ||
    input.version !== 1 ||
    input.decision?.status !== DECISION
  ) {
    return held("compiled_identity_contract_mismatch");
  }

  if (
    input.source?.source_commit !== EXPECTED.source_commit ||
    input.source?.source_ref !== EXPECTED.source_ref ||
    input.source?.contract_source_sha256 !==
      EXPECTED.contract_source_sha256 ||
    input.source?.standard_json_input_canonical_sha256 !==
      EXPECTED.standard_json_input_canonical_sha256
  ) {
    return held("compiled_identity_source_binding_mismatch");
  }

  if (
    input.compiler_profile?.release !==
      "0.8.24+commit.e11b9ed9" ||
    input.compiler_profile?.evm_version !== "paris" ||
    input.compiler_profile?.optimizer_enabled !== false ||
    input.compiler_profile?.optimizer_runs !== 200 ||
    input.compiler_profile?.via_ir !== false
  ) {
    return held("compiled_identity_compiler_profile_mismatch");
  }

  const comparison = input.comparison;
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
    if (comparison?.[key] !== true) {
      return held("compiled_identity_comparison_not_green", {
        key,
      });
    }
  }

  const artifacts = input.artifacts;
  if (
    artifacts?.creation_bytecode_bytes !==
      EXPECTED.creation_bytecode_bytes ||
    artifacts?.creation_bytecode_sha256 !==
      EXPECTED.creation_bytecode_sha256 ||
    artifacts?.creation_bytecode_keccak256 !==
      EXPECTED.creation_bytecode_keccak256 ||
    artifacts?.runtime_template_bytes !==
      EXPECTED.runtime_template_bytes ||
    artifacts?.runtime_template_sha256 !==
      EXPECTED.runtime_template_sha256 ||
    artifacts?.runtime_template_keccak256 !==
      EXPECTED.runtime_template_keccak256 ||
    artifacts?.immutable_layout_sha256 !==
      EXPECTED.immutable_layout_sha256 ||
    typeof artifacts?.creation_bytecode_hex !== "string" ||
    !artifacts.creation_bytecode_hex.startsWith("0x") ||
    artifacts.creation_bytecode_hex.length !==
      2 + EXPECTED.creation_bytecode_bytes * 2 ||
    typeof artifacts?.runtime_template_hex !== "string" ||
    !artifacts.runtime_template_hex.startsWith("0x") ||
    artifacts.runtime_template_hex.length !==
      2 + EXPECTED.runtime_template_bytes * 2
  ) {
    return held("compiled_identity_artifact_mismatch");
  }

  const actualReferences = referencesOnly(
    artifacts.immutable_layout,
  );
  if (
    actualReferences === null ||
    canonicalJson(actualReferences) !==
      canonicalJson(EXPECTED.immutable_layout)
  ) {
    return held("compiled_identity_immutable_layout_mismatch");
  }

  if (
    canonicalJson(input.authority) !== canonicalJson(AUTHORITY) ||
    Object.values(input.authority).some((value) => value !== false)
  ) {
    return held("compiled_identity_authority_drift");
  }

  if (
    input.unresolved?.compiled_identity_committed !== false ||
    input.unresolved?.fulfillment_contract_address !== null ||
    input.unresolved?.deployment_transaction_hash !== null ||
    input.unresolved?.deployment_block_hash !== null ||
    input.unresolved?.predecessor_lineage_attested !== false ||
    input.unresolved?.deployed_runtime_code_observed !== false ||
    input.unresolved?.inventory_funding_verified !== false ||
    input.unresolved?.runtime_activation_authorized !== false ||
    input.unresolved?.public_activation_authorized !== false ||
    input.decision?.compiled_identity_committed !== false ||
    input.decision?.deployment_attested !== false ||
    input.decision?.predecessor_lineage_attested !== false ||
    input.decision?.inventory_funding_verified !== false ||
    input.decision?.runtime_activation_authorized !== false ||
    input.decision?.public_activation_authorized !== false
  ) {
    return held("compiled_identity_unresolved_boundary_drift");
  }

  if (
    input.deployment_identity_requirements?.constructor_signature !==
      "constructor(address,address,address)" ||
    canonicalJson(
      input.deployment_identity_requirements?.constructor_order,
    ) !==
      canonicalJson([
        "void_token",
        "fulfiller",
        "predecessor",
      ]) ||
    input.deployment_identity_requirements
      ?.deployed_runtime_must_patch_exact_immutable_layout !== true ||
    input.deployment_identity_requirements
      ?.deployed_runtime_keccak256_must_match_reconstructed_runtime !== true ||
    input.deployment_identity_requirements
      ?.live_max_inventory_atoms_must_equal !==
      "10000000000000000000000000"
  ) {
    return held("compiled_identity_deployment_requirements_mismatch");
  }

  return {
    ok: true as const,
    status:
      "compiled_identity_accepted_held_on_chain2050_deployment_attestation" as const,
    marker:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILED_IDENTITY_ACCEPTANCE_V1,
    version: 1 as const,
    identity_id: identityId,
    source_commit: EXPECTED.source_commit,
    contract_source_sha256:
      EXPECTED.contract_source_sha256,
    creation_bytecode_sha256:
      EXPECTED.creation_bytecode_sha256,
    creation_bytecode_keccak256:
      EXPECTED.creation_bytecode_keccak256,
    runtime_template_sha256:
      EXPECTED.runtime_template_sha256,
    runtime_template_keccak256:
      EXPECTED.runtime_template_keccak256,
    immutable_layout_sha256:
      EXPECTED.immutable_layout_sha256,
    compiled_identity_accepted: true as const,
    deployment_attested: false as const,
    predecessor_lineage_attested: false as const,
    inventory_funding_verified: false as const,
    runtime_activation_authorized: false as const,
    public_activation_authorized: false as const,
    next_gate:
      "exact_chain2050_fulfillment_deployment_and_predecessor_lineage_attestation" as const,
    authority:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1,
  };
}

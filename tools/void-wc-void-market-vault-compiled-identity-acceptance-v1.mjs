#!/usr/bin/env node
import {
  AUTHORITY as COMPILER_AUTHORITY,
  CONTRACT_NAME,
  CONTRACT_PATH,
  EVM_VERSION,
  SOLC_RELEASE,
  canonicalJson,
  sha256,
} from "./void-wc-void-market-vault-compiler-identity-v1.mjs";

export const VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_V1 =
  "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_V1";

export const EXPECTED = Object.freeze({
  packet_path:
    "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json",
  packet_id:
    "voidwcvcia1_ec8ebbc59aab8c6ad244592565f9debafda4c0c9bcf37f623bc5ea8bfebe2bad",
  packet_json_sha256:
    "909a2d628e67c4654692641cf895165e39701856a6b16bddf5af4e037d86c3fb",
  packet_json_bytes: 85516,
  identity_id:
    "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a",
  identity_json_sha256:
    "fb9a92e24afa9d7611364ca30b6eff4fe2df2cc2aa8002b77307bead4b864a4b",
  identity_json_bytes: 57245,
  workflow_run_id: 36464403015,
  workflow_job_id: 109070717228,
  workflow_artifact_id: 10988626461,
  workflow_artifact_zip_sha256:
    "d8707b0a5abc530f888639bffb2079b2d193d147bacfc4a65c3e704858bcb2fc",
  source_commit:
    "dba4a50b444dc5b1369d96fd63f5aa79f185e3e4",
  source_ref:
    "feat/wc-void-vault-compiled-identity-v1-20260928",
  contract_source_sha256:
    "2ac773c7580f5a5d477d12da62e1a597d64c174395af8b20b721873a63138925",
  contract_source_bytes: 10830,
  standard_json_input_canonical_sha256:
    "bf268481fc655693e2b3d564222af253151cd60fac6ace43a7f3b6e7b2cf38f5",
  compiler_a_fingerprint_sha256:
    "2b0b6820729fba9dab4a1127d75c30d3cf97636851555a5afd3b21a2ff89c2f9",
  compiler_a_output_raw_sha256:
    "f63598713529b44aa1aaaf3c7dbfa52553f12e51ca51a3a5fe13d9b9abf988b8",
  compiler_b_fingerprint_sha256:
    "14655563b61e468ee7d54b58d379eaf4a9df4332128f082f73c802281896e559",
  compiler_b_output_raw_sha256:
    "d1a692e9f725268ba9386fb1157b4f8176ade8fadde2e0077c99755726baf910",
  creation_bytecode_bytes: 9441,
  creation_bytecode_sha256:
    "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540",
  creation_bytecode_keccak256:
    "0xa741a938f6570d3b8de727e7487460a0dda04244e6e45a79ab22756b16369c41",
  runtime_template_bytes: 8342,
  runtime_template_sha256:
    "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e",
  runtime_template_keccak256:
    "0xea29fc4564e552b4b16a824f9f9566edc82d886b81d908f6205091cbe6ce24af",
  abi_sha256:
    "27e6d3a1b9e071b891bdd16abf0f2ee4a06ba988803e8dac60e2542b00f0ff5b",
  metadata_sha256:
    "c51f421ac8f35bb8aa7d8b525c8291a12e9765a6300058ea859624bcac3f7141",
  storage_layout_sha256:
    "f92175f62ad1bc13d0e3aa074dd95e28005553f2616530783a67b934cbc0a5d2",
  method_identifiers_sha256:
    "e8ad68bd3137823246432c9b6126da8f2c9f3fdabe097b95227bf9f47c5a0702",
  immutable_layout_sha256:
    "61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b",
  immutable_layout: Object.freeze({
    closeoutController: Object.freeze({
      references: Object.freeze([
        Object.freeze({ start: 1138, length: 32 }),
        Object.freeze({ start: 2068, length: 32 }),
        Object.freeze({ start: 4857, length: 32 }),
      ]),
    }),
    coupledLaunchId: Object.freeze({
      references: Object.freeze([
        Object.freeze({ start: 1481, length: 32 }),
        Object.freeze({ start: 2271, length: 32 }),
        Object.freeze({ start: 3201, length: 32 }),
        Object.freeze({ start: 3835, length: 32 }),
        Object.freeze({ start: 4737, length: 32 }),
        Object.freeze({ start: 5201, length: 32 }),
        Object.freeze({ start: 6465, length: 32 }),
      ]),
    }),
    launchController: Object.freeze({
      references: Object.freeze([
        Object.freeze({ start: 1085, length: 32 }),
        Object.freeze({ start: 2138, length: 32 }),
      ]),
    }),
    settlementExecutor: Object.freeze({
      references: Object.freeze([
        Object.freeze({ start: 2847, length: 32 }),
        Object.freeze({ start: 2927, length: 32 }),
        Object.freeze({ start: 3492, length: 32 }),
      ]),
    }),
    token: Object.freeze({
      references: Object.freeze([
        Object.freeze({ start: 2688, length: 32 }),
        Object.freeze({ start: 4423, length: 32 }),
        Object.freeze({ start: 5384, length: 32 }),
        Object.freeze({ start: 5936, length: 32 }),
        Object.freeze({ start: 5974, length: 32 }),
        Object.freeze({ start: 6173, length: 32 }),
      ]),
    }),
  }),
});

export const VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1 =
  Object.freeze({
    pure_artifact_validation_only: true,
    process_environment_read: false,
    filesystem_write: false,
    credential_access: false,
    wallet_access: false,
    rpc_call: false,
    signing: false,
    transaction_broadcast: false,
    deployment: false,
    chain2050_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
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
      VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_V1,
    version: 1,
    reason,
    ...(detail ? { detail } : {}),
    compiled_identity_accepted: false,
    deployment_attested: false,
    final_role_bindings_attested: false,
    inventory_funding_verified: false,
    inventory_lock_verified: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    authority:
      VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1,
  });
}

function referencesOnly(layout) {
  if (!plain(layout)) return null;
  const result = {};
  for (const name of [
    "closeoutController",
    "coupledLaunchId",
    "launchController",
    "settlementExecutor",
    "token",
  ]) {
    const entry = layout[name];
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

export function verifyWcVoidMarketVaultCompiledIdentityAcceptanceV1(input) {
  if (!plain(input)) return held("acceptance_packet_object_required");

  const { packet_id: packetId, ...body } = input;
  if (
    typeof packetId !== "string" ||
    packetId !==
      "voidwcvcia1_" + sha256(canonicalJson(body)) ||
    packetId !== EXPECTED.packet_id
  ) {
    return held("acceptance_packet_id_invalid");
  }

  if (
    input.marker !==
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_PACKET_V1" ||
    input.version !== 1 ||
    input.status !==
      "COMPILED_IDENTITY_ACCEPTED_HELD_ON_CHAIN2050_DEPLOYMENT_ATTESTATION"
  ) {
    return held("acceptance_packet_contract_mismatch");
  }

  const accepted = input.accepted_identity;
  if (
    !plain(accepted) ||
    accepted.identity_id !== EXPECTED.identity_id ||
    accepted.identity_json_sha256 !== EXPECTED.identity_json_sha256 ||
    accepted.identity_json_bytes !== EXPECTED.identity_json_bytes ||
    accepted.workflow_run_id !== EXPECTED.workflow_run_id ||
    accepted.workflow_job_id !== EXPECTED.workflow_job_id ||
    accepted.workflow_artifact_id !== EXPECTED.workflow_artifact_id ||
    accepted.workflow_artifact_zip_sha256 !==
      EXPECTED.workflow_artifact_zip_sha256 ||
    accepted.reviewed_at_utc !== "2026-09-28T18:20:05.000Z"
  ) {
    return held("accepted_identity_binding_mismatch");
  }

  if (
    input.source?.repository !== "6ZoSo9/void-node" ||
    input.source?.source_commit !== EXPECTED.source_commit ||
    input.source?.source_ref !== EXPECTED.source_ref ||
    input.source?.contract_path !== CONTRACT_PATH ||
    input.source?.contract_name !== CONTRACT_NAME ||
    input.source?.contract_source_sha256 !==
      EXPECTED.contract_source_sha256 ||
    input.source?.contract_source_bytes !== EXPECTED.contract_source_bytes ||
    input.source?.standard_json_input_canonical_sha256 !==
      EXPECTED.standard_json_input_canonical_sha256
  ) {
    return held("compiled_identity_source_binding_mismatch");
  }

  if (
    input.compiler_profile?.compiler !== "solc" ||
    input.compiler_profile?.semantic_version !== "0.8.24" ||
    input.compiler_profile?.release !== SOLC_RELEASE ||
    input.compiler_profile?.evm_version !== EVM_VERSION ||
    input.compiler_profile?.optimizer_enabled !== false ||
    input.compiler_profile?.optimizer_runs !== 200 ||
    input.compiler_profile?.via_ir !== false ||
    input.compiler_profile?.metadata_append_cbor !== true ||
    input.compiler_profile?.metadata_use_literal_content !== true ||
    input.compiler_profile?.metadata_bytecode_hash !== "ipfs"
  ) {
    return held("compiled_identity_compiler_profile_mismatch");
  }

  if (
    input.environments?.compiler_a?.fingerprint_sha256 !==
      EXPECTED.compiler_a_fingerprint_sha256 ||
    input.environments?.compiler_a?.output_raw_sha256 !==
      EXPECTED.compiler_a_output_raw_sha256 ||
    input.environments?.compiler_a?.artifact_identity !==
      "sha256:434803786cb17d2e37c48140bd986b0d7d366833bfe989ed6447cfe8bd200ef1" ||
    input.environments?.compiler_a?.implementation !==
      "ethereum-solc-native-linux-amd64" ||
    input.environments?.compiler_b?.fingerprint_sha256 !==
      EXPECTED.compiler_b_fingerprint_sha256 ||
    input.environments?.compiler_b?.output_raw_sha256 !==
      EXPECTED.compiler_b_output_raw_sha256 ||
    input.environments?.compiler_b?.artifact_identity !==
      "npm-integrity:sha512-G5yUqjTUPc8Np74sCFwfsevhBPlUifUOfhYrgyu6CmYlC6feSw0YS6eZW47XDT23k3JYdKx5nJ+Q7whCEmNcoA==" ||
    input.environments?.compiler_b?.implementation !==
      "solc-js-emscripten"
  ) {
    return held("compiler_environment_binding_mismatch");
  }

  for (const key of [
    "compiler_environments_independent",
    "exact_standard_json_input",
    "exact_compiler_release",
    "zero_compiler_errors",
    "zero_link_references",
    "creation_bytecode_exact_match",
    "runtime_template_exact_match",
    "abi_exact_match",
    "metadata_exact_match",
    "storage_layout_exact_match",
    "method_identifiers_exact_match",
    "immutable_layout_exact_match",
    "source_maps_exact_match",
  ]) {
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
    /^0x[0-9a-f]+$/.test(creationHex) &&
    creationHex.length % 2 === 0
      ? Buffer.from(creationHex.slice(2), "hex")
      : null;
  const runtimeBytes =
    /^0x[0-9a-f]+$/.test(runtimeHex) &&
    runtimeHex.length % 2 === 0
      ? Buffer.from(runtimeHex.slice(2), "hex")
      : null;
  const actualLayoutSha =
    plain(artifacts?.immutable_layout)
      ? sha256(canonicalJson(artifacts.immutable_layout))
      : "";

  if (
    creationBytes === null ||
    creationBytes.length !== EXPECTED.creation_bytecode_bytes ||
    artifacts?.creation_bytecode_bytes !==
      EXPECTED.creation_bytecode_bytes ||
    sha256(creationBytes) !== EXPECTED.creation_bytecode_sha256 ||
    artifacts?.creation_bytecode_sha256 !==
      EXPECTED.creation_bytecode_sha256 ||
    artifacts?.creation_bytecode_keccak256 !==
      EXPECTED.creation_bytecode_keccak256 ||
    runtimeBytes === null ||
    runtimeBytes.length !== EXPECTED.runtime_template_bytes ||
    artifacts?.runtime_template_bytes !== EXPECTED.runtime_template_bytes ||
    sha256(runtimeBytes) !== EXPECTED.runtime_template_sha256 ||
    artifacts?.runtime_template_sha256 !== EXPECTED.runtime_template_sha256 ||
    artifacts?.runtime_template_keccak256 !==
      EXPECTED.runtime_template_keccak256 ||
    artifacts?.abi_sha256 !== EXPECTED.abi_sha256 ||
    artifacts?.metadata_sha256 !== EXPECTED.metadata_sha256 ||
    artifacts?.storage_layout_sha256 !== EXPECTED.storage_layout_sha256 ||
    artifacts?.method_identifiers_sha256 !==
      EXPECTED.method_identifiers_sha256 ||
    artifacts?.immutable_layout_sha256 !==
      EXPECTED.immutable_layout_sha256 ||
    actualLayoutSha !== EXPECTED.immutable_layout_sha256
  ) {
    return held("compiled_identity_artifact_mismatch");
  }

  const actualReferences = referencesOnly(artifacts?.immutable_layout);
  if (
    actualReferences === null ||
    canonicalJson(actualReferences) !==
      canonicalJson(EXPECTED.immutable_layout)
  ) {
    return held("compiled_identity_immutable_layout_mismatch");
  }

  if (
    !plain(input.authority) ||
    canonicalJson(input.authority) !== canonicalJson(COMPILER_AUTHORITY) ||
    Object.values(input.authority).some((value) => value !== false)
  ) {
    return held("compiled_identity_authority_drift");
  }

  const unresolved = input.unresolved;
  if (
    unresolved?.compiled_identity_committed !== false ||
    unresolved?.market_vault_address !== null ||
    unresolved?.deployment_transaction_hash !== null ||
    unresolved?.deployment_block_hash !== null ||
    unresolved?.final_role_bindings_attested !== false ||
    unresolved?.deployed_runtime_code_observed !== false ||
    unresolved?.inventory_funding_verified !== false ||
    unresolved?.inventory_lock_verified !== false ||
    unresolved?.market_activation_authorized !== false ||
    unresolved?.public_presale_activation_authorized !== false
  ) {
    return held("compiled_identity_unresolved_boundary_drift");
  }

  if (
    input.deployment_identity_requirements?.constructor_signature !==
      "constructor(address,address,address,address,bytes32)" ||
    canonicalJson(
      input.deployment_identity_requirements?.constructor_order,
    ) !==
      canonicalJson([
        "void_token",
        "launch_controller",
        "settlement_executor",
        "closeout_controller",
        "coupled_launch_id",
      ]) ||
    input.deployment_identity_requirements
      ?.deployed_runtime_must_patch_exact_immutable_layout !== true ||
    input.deployment_identity_requirements
      ?.live_opening_inventory_atoms_must_equal !==
      "10000000000000000000000000"
  ) {
    return held("compiled_identity_deployment_requirements_mismatch");
  }

  const decision = input.decision;
  if (
    decision?.compiled_identity_accepted !== true ||
    decision?.deployment_attested !== false ||
    decision?.final_role_bindings_attested !== false ||
    decision?.deployed_runtime_code_observed !== false ||
    decision?.inventory_funding_verified !== false ||
    decision?.inventory_lock_verified !== false ||
    decision?.market_activation_authorized !== false ||
    decision?.public_presale_activation_authorized !== false ||
    decision?.next_gate !==
      "exact_chain2050_market_vault_deployment_and_role_runtime_attestation"
  ) {
    return held("acceptance_decision_boundary_drift");
  }

  return Object.freeze({
    ok: true,
    status:
      "compiled_identity_accepted_held_on_chain2050_vault_deployment_attestation",
    marker:
      VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_V1,
    version: 1,
    packet_id: EXPECTED.packet_id,
    packet_json_sha256: EXPECTED.packet_json_sha256,
    packet_json_bytes: EXPECTED.packet_json_bytes,
    identity_id: EXPECTED.identity_id,
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
    final_role_bindings_attested: false,
    inventory_funding_verified: false,
    inventory_lock_verified: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    next_gate:
      "exact_chain2050_market_vault_deployment_and_role_runtime_attestation",
    authority:
      VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1,
  });
}

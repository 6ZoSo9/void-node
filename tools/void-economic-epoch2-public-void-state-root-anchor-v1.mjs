#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_V1";

export const ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_V1 =
  "void:economic:epoch2:successor-state-root:v1";

export const ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1 =
  "fa6a4ff9a7a25b8ec1888c58d7eb49159a69d84a4021b1365fe1293e868f1f51";

export const ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1 =
  "e0d6cff588a13315f7a63ff246895440b2d2faf858d8f228912a508ffa88f4d4";

export const ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1 = 3203;

export const VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    rpc_call: false,
    filesystem_mutation: false,
    credential_content_access: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    validator_mutation: false,
    governance_mutation: false,
    work_credit_mutation: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });

const TOP_KEYS = [
  "marker","version","status","chain_id","execution_epoch","object_id",
  "anchor","economic_identity","evidence","commitment","authority","gates",
  "next_gate",
];

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected) {
  return plain(value) &&
    JSON.stringify(Object.keys(value).sort()) ===
      JSON.stringify([...expected].sort());
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function fail(reason) {
  return {
    ok: false,
    marker: VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_V1,
    version: 1,
    status: "HOLD",
    reason,
    successor_state_root_public_void_anchor_ready: false,
    chain2050_write_authorized: false,
    transaction_signing_authorized: false,
    transaction_broadcast_authorized: false,
    migration_authorized: false,
    public_activation_authorized: false,
    authority: VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_AUTHORITY_V1,
  };
}

export function verifyEconomicEpoch2PublicVoidStateRootAnchorPayloadV1(input) {
  if (!plain(input) || !Buffer.isBuffer(input.payload_bytes)) {
    return fail("anchor_payload_input_invalid");
  }

  const bytes = input.payload_bytes;
  if (
    bytes.length !== ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1 ||
    sha256(bytes) !== ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1
  ) {
    return fail("anchor_payload_exact_bytes_mismatch");
  }

  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    return fail("anchor_payload_json_invalid");
  }

  if (!exactKeys(value, TOP_KEYS)) {
    return fail("anchor_payload_top_level_schema_mismatch");
  }

  const expectedObjectIdSha256 = sha256(
    Buffer.from(ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_V1, "utf8"),
  );
  if (
    expectedObjectIdSha256 !==
      ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1 ||
    value.object_id !== ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_V1 ||
    value.commitment?.object_id_sha256 !==
      ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1
  ) {
    return fail("anchor_payload_object_identity_mismatch");
  }

  if (
    value.marker !==
      "VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_PAYLOAD_V1" ||
    value.version !== 1 ||
    value.status !==
      "ANCHOR_PAYLOAD_SOURCE_READY_CHAIN2050_COMMITMENT_PENDING" ||
    value.chain_id !== 2050 ||
    value.execution_epoch !== 2 ||
    value.anchor?.client !== "Besu" ||
    value.anchor?.client_version !== "26.8.1" ||
    value.anchor?.client_repo_digest !==
      "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042" ||
    value.anchor?.genesis_block_hash !==
      "0x59ef190bdbd42268a497edca4237446665deb0f1fa98f54ac85ed461bdd282a7" ||
    value.anchor?.genesis_state_root !==
      "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b" ||
    value.economic_identity?.void_token_address !==
      "0x470075b85352eb86f7d089fb9ba88945f12aad94" ||
    value.economic_identity?.void_token_total_supply_atoms !==
      "333333333000000000000000000" ||
    value.economic_identity?.economic_state_account_count !== 4 ||
    value.economic_identity?.verified_storage_entry_count !== 1268
  ) {
    return fail("anchor_payload_economic_identity_mismatch");
  }

  if (
    value.evidence?.public_state_manifest_path !==
      "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json" ||
    value.evidence?.public_state_manifest_route !==
      "/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json" ||
    value.evidence?.public_state_manifest_file_sha256 !==
      "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9" ||
    value.evidence?.public_state_manifest_material_sha256 !==
      "286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f" ||
    value.evidence?.public_migration_manifest_path !==
      "public/public-node/evidence/economic-epoch2-migration-manifest-v1.json" ||
    value.evidence?.public_migration_manifest_material_sha256 !==
      "7793624324ce6b171f43c1f8089af7edfbbc8c5144eefe911688128600847572" ||
    value.evidence?.besu_nonce_continuity_evidence_path !==
      "ops/mainnet0/economic-epoch2-besu-nonce-continuity-evidence-v1.json" ||
    value.evidence?.besu_nonce_continuity_evidence_file_sha256 !==
      "b89723b6e67a05d7e79b0d5d3c90b32d91dcdb3d08de3b8f685309f887cdd876"
  ) {
    return fail("anchor_payload_evidence_binding_mismatch");
  }

  if (
    value.commitment?.registry_contract !==
      "DatanetContentCommitmentRegistryV1" ||
    value.commitment?.function_signature !==
      "commit(bytes32,bytes32,uint64)" ||
    value.commitment?.max_object_bytes !== 268435456 ||
    value.commitment?.accepted_checkpoint_policy_id !==
      "mainnet0-checkpoint-finality-v1" ||
    value.commitment?.canonical_truth_admission_required !== true ||
    bytes.length > value.commitment.max_object_bytes
  ) {
    return fail("anchor_payload_commitment_contract_mismatch");
  }

  if (
    !exactKeys(
      value.authority,
      Object.keys(
        VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_AUTHORITY_V1,
      ),
    ) ||
    Object.entries(
      VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_AUTHORITY_V1,
    ).some(([key, expected]) => value.authority[key] !== expected)
  ) {
    return fail("anchor_payload_authority_mismatch");
  }

  if (
    !exactKeys(value.gates, [
      "successor_genesis_or_state_manifest_public_evidence_ready",
      "successor_state_root_public_void_anchor_ready",
      "public_balance_receipt_code_verification_ready",
    ]) ||
    value.gates.successor_genesis_or_state_manifest_public_evidence_ready !==
      true ||
    value.gates.successor_state_root_public_void_anchor_ready !== false ||
    value.gates.public_balance_receipt_code_verification_ready !== false ||
    value.next_gate !==
      "commit_exact_payload_through_existing_datanet_content_commitment_pipeline_and_admit_finalized_canonical_truth"
  ) {
    return fail("anchor_payload_gate_boundary_mismatch");
  }

  return {
    ok: true,
    marker: VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_V1,
    version: 1,
    status: "ANCHOR_PAYLOAD_SOURCE_READY_CHAIN2050_COMMITMENT_PENDING",
    chain_id: "2050",
    execution_epoch: "2",
    object_id: value.object_id,
    object_id_sha256: ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1,
    content_sha256: ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1,
    byte_length: String(ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1),
    registry_contract: value.commitment.registry_contract,
    function_signature: value.commitment.function_signature,
    accepted_checkpoint_policy_id:
      value.commitment.accepted_checkpoint_policy_id,
    genesis_block_hash: value.anchor.genesis_block_hash,
    genesis_state_root: value.anchor.genesis_state_root,
    successor_state_root_public_void_anchor_ready: false,
    next_gate: value.next_gate,
    chain2050_write_authorized: false,
    transaction_signing_authorized: false,
    transaction_broadcast_authorized: false,
    migration_authorized: false,
    public_activation_authorized: false,
    authority: VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_AUTHORITY_V1,
  };
}

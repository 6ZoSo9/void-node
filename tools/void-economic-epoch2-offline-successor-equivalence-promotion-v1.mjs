#!/usr/bin/env node
import { createHash } from "node:crypto";

export const VOID_ECONOMIC_EPOCH2_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_V1 =
  "VOID_ECONOMIC_EPOCH2_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_V1";

export const EXPECTED = Object.freeze({
  promotion_path:
    "ops/mainnet0/economic-epoch2-offline-successor-equivalence-promotion-v1.json",
  promotion_id:
    "voide2osep1_994c59c8ba3039a59aadfb8fe2b2537d7fec66ae290f6f81100cb427523f0b51",
  client_neutral: Object.freeze({
    path: "ops/mainnet0/economic-epoch2-client-neutral-state-manifest-evidence-v1.json",
    git_blob_sha1: "d938bb3a879f2430490992ba278a104983199412",
    manifest_file_sha256:
      "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9",
    manifest_material_sha256:
      "286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f",
  }),
  isolated: Object.freeze({
    path: "ops/mainnet0/economic-epoch2-isolated-successor-equivalence-evidence-v1.json",
    git_blob_sha1: "f16a5275d35205fe19b4ed44b085ce6a0bb2c665",
    source_commit: "48bab586809cead81fcc77ebfb601687154759dd",
    receipt_file_sha256:
      "8d4bdd7e053d6a790e879ec89f59879c734d7a9e1768d62056156fb03e4af17a",
    receipt_material_sha256:
      "467b2c8088d84d4856d16b37b591f2b9b8c3f3b424ea633cdf4e56a3fef7325d",
  }),
  besu: Object.freeze({
    path: "ops/mainnet0/economic-epoch2-besu-state-equivalence-evidence-v1.json",
    git_blob_sha1: "1c84c3cfe46cf61d5f8b7b8f23f6edfcac19d90a",
    source_commit: "9916991dc6dab5bc05e5f4e38994f7e554c81e24",
    canonical_merge_commit: "a16729fefbb8d0824836906a41838c76f6be93c9",
    state_manifest_file_sha256:
      "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9",
    genesis_file_sha256:
      "630d70e57372f7e586cdf44f788c0b2cf27de81283e05b1294f1385467bf452d",
    genesis_material_sha256:
      "175f6f67fc7242ec8e6d1d2e3393ee4fa7e856c6597590ee86e6fba3844b6166",
    genesis_block_hash:
      "0x56dfa1f57079af9f2496f8df429968ae693e57ff13d8739824ce388533dd0948",
    genesis_state_root:
      "0xbfa05a2faf767855be50d885936f8c641b08ed123a5387fbed2d02cbf0b6703b",
    receipt_file_sha256:
      "18a28299a16ae1b3c01a15c7278441c873e4b203536bc958ec00b35cba696c70",
    receipt_material_sha256:
      "a46ea33c2f8b3becf232008108c3a6161e5e118f0b37bffc1dd39afa267478e5",
  }),
  total_supply_atoms: "333333333000000000000000000",
  verified_storage_entry_count: 1268,
});

export const VOID_ECONOMIC_EPOCH2_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_AUTHORITY_V1 =
  Object.freeze({
    source_promotion_only: true,
    rpc_call: false,
    state_mutation: false,
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

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (plain(value)) {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("invalid_canonical_value");
}

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function gitBlobSha1(bytes) {
  if (!Buffer.isBuffer(bytes)) fail("evidence_bytes_required");
  return createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function parseEvidence(bytes, expected, code) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2 || bytes.length > 1024 * 1024) {
    fail(code + "_bytes_invalid");
  }
  if (gitBlobSha1(bytes) !== expected.git_blob_sha1) {
    fail(code + "_git_blob_sha1_mismatch");
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(code + "_json_invalid");
  }
  if (!plain(value)) fail(code + "_object_required");
  return value;
}

function assertFalseAuthority(value, code) {
  if (!plain(value)) fail(code);
  for (const item of Object.values(value)) {
    if (item !== false) fail(code);
  }
}

function validateClientNeutral(bytes) {
  const x = parseEvidence(bytes, EXPECTED.client_neutral, "client_neutral_evidence");
  if (
    x.marker !==
      "VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_EVIDENCE_V1" ||
    x.version !== 1 ||
    x.status !== "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN" ||
    x.manifest_file_sha256 !== EXPECTED.client_neutral.manifest_file_sha256 ||
    x.manifest_material_sha256 !== EXPECTED.client_neutral.manifest_material_sha256 ||
    x.token_total_supply_atoms !== EXPECTED.total_supply_atoms ||
    x.token_behavioral_semantic_equivalence !== true ||
    x.staking_exact_state_bound !== true ||
    x.native_gas_accounting_excluded !== true ||
    x.client_specific_genesis_built !== false ||
    x.offline_successor_equivalence_proven !== false ||
    x.migration_authorized !== false ||
    x.public_activation_authorized !== false
  ) {
    fail("client_neutral_evidence_semantics_mismatch");
  }
  assertFalseAuthority(x.authority, "client_neutral_evidence_authority_mismatch");
  return x;
}

function validateIsolated(bytes) {
  const x = parseEvidence(bytes, EXPECTED.isolated, "isolated_evidence");
  if (
    x.marker !==
      "VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_EVIDENCE_V1" ||
    x.version !== 1 ||
    x.status !== "ISOLATED_SUCCESSOR_EQUIVALENCE_GREEN" ||
    x.source_commit !== EXPECTED.isolated.source_commit ||
    x.receipt_file_sha256 !== EXPECTED.isolated.receipt_file_sha256 ||
    x.receipt_material_sha256 !== EXPECTED.isolated.receipt_material_sha256 ||
    x.verified_storage_entry_count !== EXPECTED.verified_storage_entry_count ||
    x.successor_total_supply_atoms !== EXPECTED.total_supply_atoms ||
    x.successor_holder_sum_atoms !== EXPECTED.total_supply_atoms ||
    x.retired_source_balance_sum_atoms !== "0" ||
    x.retired_source_code_count !== 0
  ) {
    fail("isolated_evidence_semantics_mismatch");
  }
  for (const key of [
    "voidtoken_balance_storage_equivalence_verified",
    "voidtoken_supply_storage_equivalence_verified",
    "source_successor_holder_balance_equivalence_proven",
    "source_successor_total_supply_equivalence_proven",
    "source_successor_open_obligation_equivalence_proven",
    "unmapped_voidtoken_atomic_verified_zero",
    "orphan_contract_held_void_atomic_verified_zero",
    "isolated_successor_state_equivalence_proven",
  ]) {
    if (x.gates?.[key] !== true) fail("isolated_evidence_gate_missing:" + key);
  }
  for (const key of [
    "offline_successor_equivalence_proven",
    "client_specific_genesis_built",
    "migration_authorized",
    "public_activation_authorized",
  ]) {
    if (x.gates?.[key] !== false) fail("isolated_evidence_hold_gate_mismatch:" + key);
  }
  assertFalseAuthority(x.authority, "isolated_evidence_authority_mismatch");
  return x;
}

function validateBesu(bytes) {
  const x = parseEvidence(bytes, EXPECTED.besu, "besu_evidence");
  if (
    x.marker !== "VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_EVIDENCE_V1" ||
    x.version !== 1 ||
    x.status !== "BESU_CLIENT_SPECIFIC_STATE_EQUIVALENCE_GREEN" ||
    x.source_commit !== EXPECTED.besu.source_commit ||
    x.canonical_merge_commit !== EXPECTED.besu.canonical_merge_commit ||
    x.state_manifest_file_sha256 !== EXPECTED.besu.state_manifest_file_sha256 ||
    x.besu?.name !== "Besu" ||
    x.besu?.version !== "26.8.1" ||
    x.besu?.repo_digest !==
      "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042" ||
    x.besu?.observed_image_identity !==
      "sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042" ||
    x.besu?.shanghai_time !== 0 ||
    x.besu?.push0_runtime_compatible !== true ||
    x.genesis?.file_sha256 !== EXPECTED.besu.genesis_file_sha256 ||
    x.genesis?.material_sha256 !== EXPECTED.besu.genesis_material_sha256 ||
    x.genesis?.block_hash !== EXPECTED.besu.genesis_block_hash ||
    x.genesis?.state_root !== EXPECTED.besu.genesis_state_root ||
    x.state_equivalence_receipt?.file_sha256 !==
      EXPECTED.besu.receipt_file_sha256 ||
    x.state_equivalence_receipt?.material_sha256 !==
      EXPECTED.besu.receipt_material_sha256 ||
    x.verified_storage_entry_count !== EXPECTED.verified_storage_entry_count ||
    x.native_balance_sum_wei !== "0" ||
    x.successor_total_supply_atoms !== EXPECTED.total_supply_atoms ||
    x.successor_holder_sum_atoms !== EXPECTED.total_supply_atoms
  ) {
    fail("besu_evidence_semantics_mismatch");
  }
  for (const key of [
    "client_specific_genesis_built",
    "besu_genesis_parse_verified",
    "client_specific_state_equivalence_proven",
    "zero_base_fee_verified",
    "zero_gas_price_verified",
  ]) {
    if (x.gates?.[key] !== true) fail("besu_evidence_gate_missing:" + key);
  }
  for (const key of [
    "production_validator_set_bound",
    "offline_successor_equivalence_proven",
    "migration_authorized",
    "public_activation_authorized",
  ]) {
    if (x.gates?.[key] !== false) fail("besu_evidence_hold_gate_mismatch:" + key);
  }
  assertFalseAuthority(x.authority, "besu_evidence_authority_mismatch");
  return x;
}

function validateMigrationPrePromotion(candidate) {
  if (!plain(candidate)) fail("migration_candidate_required");
  const funds = candidate.funds_safety;
  const token = candidate.token_conservation;
  const successor = candidate.successor_execution_layer;
  const authority = candidate.launch_authority;
  if (
    candidate.marker !== "VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1" ||
    candidate.version !== 1 ||
    candidate.status !== "HOLD" ||
    !plain(funds) ||
    !plain(token) ||
    !plain(successor) ||
    funds.offline_successor_equivalence_proven !== false ||
    Object.hasOwn(funds, "offline_successor_equivalence_evidence") ||
    funds.final_snapshot_identity_verified !== true ||
    funds.independent_snapshot_reconciliation_1_green !== true ||
    funds.independent_snapshot_reconciliation_2_green !== true ||
    funds.isolated_successor_state_equivalence_proven !== true ||
    funds.isolated_successor_equivalence_evidence !== EXPECTED.isolated.path ||
    funds.client_specific_state_equivalence_proven !== true ||
    funds.client_specific_state_equivalence_evidence !== EXPECTED.besu.path ||
    funds.source_successor_holder_balance_equivalence_proven !== true ||
    funds.source_successor_total_supply_equivalence_proven !== true ||
    funds.source_successor_open_obligation_equivalence_proven !== true ||
    funds.unmapped_voidtoken_atomic_verified_zero !== true ||
    funds.orphan_contract_held_void_atomic_verified_zero !== true ||
    funds.no_funds_move_during_snapshot_or_offline_build !== true ||
    token.final_snapshot_total_supply_atomic !== EXPECTED.total_supply_atoms ||
    token.successor_total_supply_atomic !== EXPECTED.total_supply_atoms ||
    token.every_holder_balance_conserved !== true ||
    token.aggregate_holder_sum_matches_final_snapshot_total_supply !== true ||
    token.successor_holder_sum_matches_successor_total_supply !== true ||
    token.source_successor_total_supply_equal !== true ||
    successor.selected_client !== "Besu" ||
    successor.selected_client_version !== "26.8.1" ||
    successor.client_specific_genesis_built !== true ||
    successor.besu_genesis_parse_verified !== true ||
    successor.client_specific_state_equivalence_proven !== true ||
    successor.client_specific_state_equivalence_evidence !== EXPECTED.besu.path
  ) {
    fail("migration_candidate_pre_promotion_mismatch");
  }
  if (!plain(authority) || authority.source_only !== true) {
    fail("migration_candidate_authority_mismatch");
  }
  for (const [key, value] of Object.entries(authority)) {
    if (key === "source_only") continue;
    if (value !== false) fail("migration_candidate_authority_mismatch:" + key);
  }
}

function promotionBody() {
  return Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_V1,
    version: 1,
    status: "OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTED_MIGRATION_HOLD",
    evidence: Object.freeze({
      client_neutral_state_manifest: Object.freeze({
        path: EXPECTED.client_neutral.path,
        git_blob_sha1: EXPECTED.client_neutral.git_blob_sha1,
        manifest_file_sha256: EXPECTED.client_neutral.manifest_file_sha256,
        manifest_material_sha256: EXPECTED.client_neutral.manifest_material_sha256,
      }),
      isolated_successor_equivalence: Object.freeze({
        path: EXPECTED.isolated.path,
        git_blob_sha1: EXPECTED.isolated.git_blob_sha1,
        source_commit: EXPECTED.isolated.source_commit,
        receipt_file_sha256: EXPECTED.isolated.receipt_file_sha256,
        receipt_material_sha256: EXPECTED.isolated.receipt_material_sha256,
      }),
      besu_state_equivalence: Object.freeze({
        path: EXPECTED.besu.path,
        git_blob_sha1: EXPECTED.besu.git_blob_sha1,
        source_commit: EXPECTED.besu.source_commit,
        canonical_merge_commit: EXPECTED.besu.canonical_merge_commit,
        state_manifest_file_sha256: EXPECTED.besu.state_manifest_file_sha256,
        genesis_file_sha256: EXPECTED.besu.genesis_file_sha256,
        genesis_material_sha256: EXPECTED.besu.genesis_material_sha256,
        genesis_block_hash: EXPECTED.besu.genesis_block_hash,
        genesis_state_root: EXPECTED.besu.genesis_state_root,
        receipt_file_sha256: EXPECTED.besu.receipt_file_sha256,
        receipt_material_sha256: EXPECTED.besu.receipt_material_sha256,
      }),
    }),
    verified: Object.freeze({
      same_client_neutral_manifest_file: true,
      verified_storage_entry_count: EXPECTED.verified_storage_entry_count,
      successor_total_supply_atoms: EXPECTED.total_supply_atoms,
      successor_holder_sum_atoms: EXPECTED.total_supply_atoms,
      source_successor_holder_balance_equivalence_proven: true,
      source_successor_total_supply_equivalence_proven: true,
      source_successor_open_obligation_equivalence_proven: true,
      unmapped_voidtoken_atomic_verified_zero: true,
      orphan_contract_held_void_atomic_verified_zero: true,
      isolated_successor_state_equivalence_proven: true,
      client_specific_state_equivalence_proven: true,
      no_funds_moved_during_equivalence_proofs: true,
    }),
    gates: Object.freeze({
      offline_successor_equivalence_proven: true,
      migration_authorized: false,
      public_activation_authorized: false,
      funds_movement_authorized: false,
    }),
    authority:
      VOID_ECONOMIC_EPOCH2_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_AUTHORITY_V1,
  });
}

function buildPromotion() {
  const body = promotionBody();
  return Object.freeze({
    ...body,
    promotion_id: "voide2osep1_" + sha256Text(canonical(body)),
  });
}

export function promoteVoidEconomicEpoch2OfflineSuccessorEquivalenceV1({
  clientNeutralEvidenceBytes,
  isolatedEvidenceBytes,
  besuEvidenceBytes,
  migrationCandidate,
}) {
  const client = validateClientNeutral(clientNeutralEvidenceBytes);
  const isolated = validateIsolated(isolatedEvidenceBytes);
  const besu = validateBesu(besuEvidenceBytes);
  validateMigrationPrePromotion(migrationCandidate);

  if (
    client.manifest_file_sha256 !== besu.state_manifest_file_sha256 ||
    isolated.successor_total_supply_atoms !== besu.successor_total_supply_atoms ||
    isolated.successor_holder_sum_atoms !== besu.successor_holder_sum_atoms ||
    isolated.verified_storage_entry_count !== besu.verified_storage_entry_count
  ) {
    fail("offline_equivalence_cross_evidence_mismatch");
  }

  const promotion = buildPromotion();
  if (promotion.promotion_id !== EXPECTED.promotion_id) {
    fail("offline_equivalence_promotion_id_mismatch");
  }

  const updated = structuredClone(migrationCandidate);
  updated.funds_safety.offline_successor_equivalence_proven = true;
  updated.funds_safety.offline_successor_equivalence_evidence =
    EXPECTED.promotion_path;

  return Object.freeze({
    promotion,
    updated_migration_candidate: Object.freeze(updated),
  });
}

export function verifyVoidEconomicEpoch2OfflineSuccessorEquivalencePromotionV1({
  promotion,
  clientNeutralEvidenceBytes,
  isolatedEvidenceBytes,
  besuEvidenceBytes,
  migrationCandidate,
}) {
  if (!plain(promotion) || promotion.promotion_id !== EXPECTED.promotion_id) {
    fail("offline_equivalence_committed_promotion_invalid");
  }
  const pre = structuredClone(migrationCandidate);
  pre.funds_safety.offline_successor_equivalence_proven = false;
  delete pre.funds_safety.offline_successor_equivalence_evidence;
  const derived = promoteVoidEconomicEpoch2OfflineSuccessorEquivalenceV1({
    clientNeutralEvidenceBytes,
    isolatedEvidenceBytes,
    besuEvidenceBytes,
    migrationCandidate: pre,
  });
  if (canonical(derived.promotion) !== canonical(promotion)) {
    fail("offline_equivalence_committed_promotion_mismatch");
  }
  if (
    migrationCandidate?.funds_safety?.offline_successor_equivalence_proven !== true ||
    migrationCandidate?.funds_safety?.offline_successor_equivalence_evidence !==
      EXPECTED.promotion_path
  ) {
    fail("offline_equivalence_migration_candidate_binding_missing");
  }
  return Object.freeze({
    ok: true,
    status: "OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_VERIFIED",
    promotion_id: EXPECTED.promotion_id,
    offline_successor_equivalence_proven: true,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_ECONOMIC_EPOCH2_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTION_AUTHORITY_V1,
  });
}

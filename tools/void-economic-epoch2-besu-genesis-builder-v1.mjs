#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { decodeRlp, encodeRlp, getAddress } from "ethers";

export const VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1 =
  "VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1";
export const VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_CONFIRMATION_V1 =
  "buildEpoch2BesuGenesisCandidate";

const EXPECTED_STATE_MANIFEST_FILE_SHA256 =
  "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9";
const EXPECTED_STATE_MANIFEST_MATERIAL_SHA256 =
  "286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f";
const EXPECTED_BESU_REPO_DIGEST =
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042";
const EXPECTED_BESU_IMAGE_ID =
  "sha256:f3713c713ca4f9e89c09e1478d2a85116ba9ce8343129d709420ba2af009598b";
const EXPECTED_NONCE_CONTINUITY_TSV_SHA256 =
  "c8d316a3ca3739c644bfc7626715144762138cad3fb4d68bbd0e132b0dc42b70";
const EXPECTED_NONCE_CONTINUITY_ACCOUNT_COUNT = 154;
const EXPECTED_NONCE_ONLY_ALLOC_ACCOUNT_COUNT = 152;
const EXPECTED_TOTAL_ALLOC_ACCOUNT_COUNT = 156;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const QBFT_MIX_HASH =
  "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365";
const PRODUCTION_QBFT_EXTRA_DATA_MARKER =
  "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_EVIDENCE_V1";
const PRODUCTION_QBFT_EXTRA_DATA_STATUS =
  "PRODUCTION_QBFT_EXTRA_DATA_BUILT_GENESIS_BINDING_HOLD";
const PRODUCTION_QBFT_EXTRA_DATA_SOURCE_BLOBS = Object.freeze({
  qbft_extra_data_cli_adapter:
    "a2cda10a4a1bbbe4541477424778b00ea84a5531",
  qbft_extra_data_codec:
    "39c7aa3006738fa86b689a6e06e698fbf54da49b",
  bft_extra_data_codec:
    "c6bf51ee640c99f0b3bb06a03fc4fe05be867765",
});
const FORBIDDEN_PLACEHOLDER_VALIDATORS = Object.freeze([
  "0x1000000000000000000000000000000000000001",
  "0x2000000000000000000000000000000000000002",
  "0x3000000000000000000000000000000000000003",
  "0x4000000000000000000000000000000000000004",
]);

export const VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_AUTHORITY_V1 =
  Object.freeze({
    local_input_read: true,
    local_output_write: true,
    source_only_transformation: true,
    rpc_call: false,
    process_start: false,
    docker_action: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    chain2050_write: false,
    token_movement: false,
    funds_movement: false,
    contract_deployment_transaction: false,
    public_activation: false,
  });

export class VoidEconomicEpoch2BesuGenesisBuilderHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2BesuGenesisBuilderHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2BesuGenesisBuilderHoldV1(reason, detail);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function canonicalSha256(value) {
  return sha256(Buffer.from(canonical(value), "utf8"));
}

function lowerAddress(value, reason = "address_invalid") {
  const text = String(value || "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(text)) hold(reason, { value: text });
  return text;
}

function exactWord(value, reason = "word_invalid") {
  const text = String(value || "").toLowerCase();
  const hex = text.startsWith("0x") ? text.slice(2) : text;
  if (!/^[0-9a-f]{1,64}$/.test(hex)) hold(reason, { value: text });
  return `0x${hex.padStart(64, "0")}`;
}

function exactCode(value, reason = "runtime_code_invalid") {
  const text = String(value || "").toLowerCase();
  if (!/^0x(?:[0-9a-f]{2})+$/.test(text)) hold(reason);
  return text;
}

function quantityHex(value, reason = "quantity_invalid") {
  const text = String(value ?? "");
  if (!/^(?:0|[1-9][0-9]*)$/.test(text)) hold(reason, { value: text });
  return `0x${BigInt(text).toString(16)}`;
}

function readJson(file) {
  const raw = fs.readFileSync(file);
  let value;
  try {
    value = JSON.parse(raw.toString("utf8"));
  } catch {
    hold("json_parse_failed", { file });
  }
  return { raw, value };
}

function validateCandidate(candidate) {
  if (
    candidate?.marker !==
      "VOID_ECONOMIC_EPOCH2_PRODUCTION_CLIENT_CANDIDATE_V1" ||
    candidate?.status !== "CANDIDATE_RUNTIME_PROBE_GREEN_GENESIS_PENDING" ||
    candidate?.client?.name !== "Besu" ||
    candidate?.client?.version !== "26.8.1" ||
    candidate?.client?.docker_image !== "hyperledger/besu:26.8.1" ||
    candidate?.client?.docker_image_digest_sha256 !==
      EXPECTED_BESU_REPO_DIGEST.split("sha256:")[1] ||
    candidate?.client?.docker_image_id_sha256 !==
      EXPECTED_BESU_IMAGE_ID.slice("sha256:".length)
  ) {
    hold("besu_candidate_identity_mismatch");
  }
  if (
    candidate?.genesis_profile?.chain_id !== 2050 ||
    candidate?.genesis_profile?.berlin_block !== 0 ||
    candidate?.genesis_profile?.london_block !== 0 ||
    candidate?.genesis_profile?.shanghai_time !== 0 ||
    candidate?.genesis_profile?.zero_base_fee !== true
  ) {
    hold("besu_candidate_genesis_profile_mismatch");
  }
  if (
    candidate?.consensus?.engine !== "QBFT" ||
    candidate?.consensus?.production_validator_set_bound !== false ||
    candidate?.consensus?.placeholder_private_keys_exist !== false ||
    candidate?.consensus?.placeholder_validator_authority !== false ||
    candidate?.consensus?.placeholder_validator_set_must_not_ship_to_production !==
      true
  ) {
    hold("besu_candidate_consensus_boundary_mismatch");
  }
  for (const key of [
    "docker_digest_pinned",
    "besu_version_verified",
    "qbft_extra_data_verified",
    "free_gas_cli_surface_verified",
  ]) {
    if (candidate.gates?.[key] !== true) hold("besu_candidate_gate_missing", { key });
  }
  for (const key of [
    "client_specific_genesis_built",
    "client_specific_state_equivalence_proven",
    "production_validator_set_bound",
    "offline_successor_equivalence_proven",
    "migration_authorized",
    "public_activation_authorized",
  ]) {
    if (candidate.gates?.[key] !== false) {
      hold("besu_candidate_gate_premature", { key });
    }
  }
}

function validateStateManifest(state) {
  if (
    state?.marker !== "VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1" ||
    state?.status !== "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN" ||
    !/^[0-9a-f]{64}$/.test(String(state?.manifest_material_sha256 || "")) ||
    state?.chain_id !== 2050 ||
    state?.execution_epoch !== 2 ||
    !Array.isArray(state?.accounts) ||
    state.accounts.length !== 4
  ) {
    hold("client_neutral_state_manifest_identity_mismatch");
  }
  if (
    state?.token_state?.total_supply_atoms !==
      "333333333000000000000000000" ||
    state?.token_state?.holder_sum_atoms !==
      "333333333000000000000000000" ||
    state?.token_state?.successor_nonzero_holder_count !== 3 ||
    state?.token_state?.allowances_nonzero_count !== 0 ||
    state?.staking_state?.storage_entry_count !== 1264 ||
    state?.staking_state?.validator_count !== 126 ||
    state?.staking_state?.active_validator_count !== 126 ||
    state?.gates?.token_behavioral_semantic_equivalence !== true ||
    state?.gates?.staking_exact_state_bound !== true ||
    state?.gates?.offline_successor_equivalence_proven !== false ||
    state?.gates?.client_specific_genesis_built !== false ||
    state?.gates?.migration_authorized !== false ||
    state?.gates?.public_activation_authorized !== false
  ) {
    hold("client_neutral_state_manifest_state_mismatch");
  }
}

function validateNonceContinuity(value) {
  if (
    value?.marker !==
      "VOID_ECONOMIC_EPOCH2_ACCOUNT_NONCE_CONTINUITY_CANDIDATE_V1" ||
    value?.version !== 1 ||
    value?.status !==
      "CANDIDATE_NONCE_CONTINUITY_READY_BESU_READBACK_PENDING" ||
    value?.source_snapshot?.execution_epoch !== 1 ||
    value?.source_snapshot?.chain_id !== 2050 ||
    value?.source_snapshot?.block_number !== "37392" ||
    value?.source_snapshot?.block_hash !==
      "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52" ||
    value?.source_snapshot?.state_sha256 !==
      "94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505" ||
    value?.source_snapshot?.write_rpc_frozen !== true ||
    value?.census_evidence?.nonzero_nonce_account_count !==
      EXPECTED_NONCE_CONTINUITY_ACCOUNT_COUNT ||
    value?.census_evidence?.canonical_nonce_tsv_sha256 !==
      EXPECTED_NONCE_CONTINUITY_TSV_SHA256 ||
    value?.continuity_policy?.source_and_successor_chain_id_equal !== true ||
    value?.continuity_policy?.source_chain_id !== 2050 ||
    value?.continuity_policy?.successor_chain_id !== 2050 ||
    value?.continuity_policy?.successor_execution_epoch !== 2 ||
    value?.continuity_policy
      ?.exact_frozen_final_nonce_required_for_every_listed_account !== true ||
    value?.continuity_policy?.nonce_reset_to_zero_forbidden !== true ||
    value?.continuity_policy?.nonce_only_alloc_native_balance_wei !== "0" ||
    value?.continuity_policy
      ?.nonce_only_alloc_code_or_storage_migration_authorized !== false ||
    value?.continuity_policy?.raw_public_rpc_allowed !== false ||
    !Array.isArray(value?.accounts) ||
    value.accounts.length !== EXPECTED_NONCE_CONTINUITY_ACCOUNT_COUNT
  ) {
    hold("nonce_continuity_manifest_identity_mismatch");
  }

  const seen = new Set();
  const rows = [];
  let previous = "";
  let maximum = 0n;
  for (const entry of value.accounts) {
    const address = lowerAddress(
      entry?.address,
      "nonce_continuity_address_invalid",
    );
    const nonceText = String(entry?.frozen_final_nonce ?? "");
    if (!/^[1-9][0-9]*$/.test(nonceText)) {
      hold("nonce_continuity_nonce_invalid", { address, nonce: nonceText });
    }
    if (previous && address <= previous) {
      hold("nonce_continuity_accounts_not_strictly_sorted", { address });
    }
    previous = address;
    if (seen.has(address)) {
      hold("nonce_continuity_duplicate_address", { address });
    }
    seen.add(address);
    const nonce = BigInt(nonceText);
    if (nonce > maximum) maximum = nonce;
    rows.push(`${address}\t${nonceText}\n`);
  }

  if (sha256(Buffer.from(rows.join(""), "utf8")) !==
      EXPECTED_NONCE_CONTINUITY_TSV_SHA256) {
    hold("nonce_continuity_tsv_sha256_mismatch");
  }
  if (maximum !== 273n) {
    hold("nonce_continuity_maximum_nonce_mismatch", {
      observed: maximum.toString(),
    });
  }

  const retained = value.known_retained_raw_transaction;
  if (
    retained?.signed_transaction_hash !==
      "0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4" ||
    retained?.signer_address !==
      "0x4d0a1149d13b03448c56ee6582d161159c5e537f" ||
    retained?.transaction_nonce !== "0" ||
    retained?.frozen_final_account_nonce !== "1" ||
    retained?.included_epoch1_block !== "37379" ||
    retained?.stale_under_exact_nonce_continuity !== true
  ) {
    hold("known_retained_raw_transaction_nonce_binding_mismatch");
  }
  const signerEntry = value.accounts.find(
    (entry) => entry.address === retained.signer_address,
  );
  if (
    signerEntry?.frozen_final_nonce !== retained.frozen_final_account_nonce ||
    BigInt(retained.transaction_nonce) >=
      BigInt(retained.frozen_final_account_nonce)
  ) {
    hold("known_retained_raw_transaction_not_stale_under_nonce_continuity");
  }

  for (const gate of [
    "successor_genesis_nonce_continuity_built",
    "besu_nonce_readback_proven",
    "pending_legacy_signed_transaction_census_complete",
    "execution_epoch_bound_in_public_gateway",
    "privileged_signer_nonce_or_key_replay_fence_proven",
    "cross_epoch_replay_protection_proven",
    "migration_authorized",
    "public_activation_authorized",
  ]) {
    if (value.gates?.[gate] !== false) {
      hold("nonce_continuity_gate_premature", { gate });
    }
  }

  return Object.freeze({
    account_count: value.accounts.length,
    maximum_nonce: maximum.toString(),
    canonical_tsv_sha256: EXPECTED_NONCE_CONTINUITY_TSV_SHA256,
    known_retained_raw_transaction_stale: true,
  });
}

function validateProductionQbftExtraDataEvidence(value) {
  if (
    value?.marker !== PRODUCTION_QBFT_EXTRA_DATA_MARKER ||
    value?.version !== 1 ||
    value?.status !== PRODUCTION_QBFT_EXTRA_DATA_STATUS ||
    value?.chain_id !== 2050 ||
    value?.validator_management_method !== "blockheader" ||
    value?.validator_count !== 4
  ) {
    hold("production_qbft_extra_data_identity_mismatch");
  }

  if (
    value?.client?.name !== "Besu" ||
    value?.client?.version !== "26.8.1" ||
    value?.client?.image !== EXPECTED_BESU_REPO_DIGEST ||
    value?.client?.release_commit !==
      "d97cbd61976a52bb109e637196fef9a8ebf2b617" ||
    value?.client?.codec !== "QbftExtraDataCodec.encodeFromAddresses" ||
    value?.client?.rlp_cli_type !== "QBFT_EXTRA_DATA"
  ) {
    hold("production_qbft_extra_data_client_mismatch");
  }

  for (const [key, expected] of Object.entries(
    PRODUCTION_QBFT_EXTRA_DATA_SOURCE_BLOBS,
  )) {
    if (value?.client?.upstream_source_git_blob_sha1?.[key] !== expected) {
      hold("production_qbft_extra_data_source_provenance_mismatch", { key });
    }
  }

  if (
    !Array.isArray(value.validators) ||
    value.validators.length !== 4 ||
    !Array.isArray(value.validator_records) ||
    value.validator_records.length !== 4
  ) {
    hold("production_qbft_validator_set_shape_invalid");
  }

  const validators = value.validators.map((raw, index) => {
    let address;
    try {
      address = getAddress(String(raw)).toLowerCase();
    } catch {
      hold("production_qbft_validator_address_invalid", { index });
    }
    if (FORBIDDEN_PLACEHOLDER_VALIDATORS.includes(address)) {
      hold("production_qbft_placeholder_validator_forbidden", { index });
    }
    return address;
  });
  if (new Set(validators).size !== 4) {
    hold("production_qbft_validator_address_duplicate");
  }

  for (let index = 0; index < 4; index += 1) {
    const record = value.validator_records[index];
    let recordAddress;
    try {
      recordAddress = getAddress(
        String(record?.besu_validator_address || ""),
      ).toLowerCase();
    } catch {
      hold("production_qbft_validator_record_address_invalid", { index });
    }
    if (
      recordAddress !== validators[index] ||
      record?.public_key_address_derivation_verified !== true ||
      !/^[0-9a-f]{32}$/.test(String(record?.void_node_id || "")) ||
      !/^0x04[0-9a-f]{128}$/.test(
        String(record?.besu_public_key || "").toLowerCase(),
      ) ||
      !/^[0-9a-f]{64}$/.test(
        String(record?.node_identity_attestation_sha256 || ""),
      )
    ) {
      hold("production_qbft_validator_record_mismatch", { index });
    }
  }

  const extraData = String(value.extra_data_hex || "").toLowerCase();
  if (!/^0x(?:[0-9a-f]{2})+$/.test(extraData)) {
    hold("production_qbft_extra_data_hex_invalid");
  }
  const extraDataBytes = Buffer.from(extraData.slice(2), "hex");
  if (
    value.extra_data_bytes !== extraDataBytes.length ||
    !/^[0-9a-f]{64}$/.test(String(value.extra_data_sha256 || "")) ||
    sha256(extraDataBytes) !== value.extra_data_sha256
  ) {
    hold("production_qbft_extra_data_hash_mismatch");
  }

  let decoded;
  try {
    decoded = decodeRlp(extraData);
  } catch {
    hold("production_qbft_extra_data_rlp_invalid");
  }
  if (!Array.isArray(decoded) || decoded.length !== 5) {
    hold("production_qbft_extra_data_rlp_shape_invalid");
  }
  if (
    String(decoded[0]).toLowerCase() !==
    "0x" + "00".repeat(32)
  ) {
    hold("production_qbft_extra_data_vanity_invalid");
  }
  if (!Array.isArray(decoded[1]) || decoded[1].length !== 4) {
    hold("production_qbft_extra_data_validator_list_invalid");
  }
  for (let index = 0; index < 4; index += 1) {
    let observed;
    try {
      observed = getAddress(String(decoded[1][index])).toLowerCase();
    } catch {
      hold("production_qbft_extra_data_decoded_validator_invalid", {
        index,
      });
    }
    if (observed !== validators[index]) {
      hold("production_qbft_extra_data_validator_order_mismatch", {
        index,
      });
    }
  }
  if (
    !Array.isArray(decoded[2]) ||
    decoded[2].length !== 0 ||
    String(decoded[3]).toLowerCase() !== "0x" ||
    !Array.isArray(decoded[4]) ||
    decoded[4].length !== 0
  ) {
    hold("production_qbft_extra_data_genesis_fields_invalid");
  }

  const independent = encodeRlp([
    "0x" + "00".repeat(32),
    validators,
    [],
    "0x",
    [],
  ]).toLowerCase();
  if (independent !== extraData) {
    hold("production_qbft_extra_data_canonical_rlp_mismatch");
  }

  if (
    value?.decoded?.vanity_zero_bytes !== 32 ||
    value?.decoded?.validator_order_exact !== true ||
    value?.decoded?.vote_empty !== true ||
    value?.decoded?.round !== 0 ||
    value?.decoded?.commit_seals_empty !== true ||
    value?.decoded?.independently_reencoded_exact !== true
  ) {
    hold("production_qbft_extra_data_decoded_evidence_mismatch");
  }

  for (const gate of [
    "qbft_live_identity_manifest_ready",
    "qbft_minimum_live_nodes_attested",
    "qbft_public_key_address_derivations_verified",
    "qbft_production_extra_data_built",
  ]) {
    if (value?.gates?.[gate] !== true) {
      hold("production_qbft_extra_data_gate_missing", { gate });
    }
  }
  for (const gate of [
    "production_validator_set_bound",
    "offline_successor_equivalence_proven",
    "all_production_validators_epoch_domain_enforced",
    "authoritative_chain2050_write",
    "migration_authorized",
    "public_activation_authorized",
  ]) {
    if (value?.gates?.[gate] !== false) {
      hold("production_qbft_extra_data_gate_premature", { gate });
    }
  }

  if (value?.authority?.source_and_offline_encoding_only !== true) {
    hold("production_qbft_extra_data_authority_mismatch");
  }
  for (const [key, flag] of Object.entries(value.authority || {})) {
    if (key === "source_and_offline_encoding_only") continue;
    if (flag !== false) {
      hold("production_qbft_extra_data_authority_premature", { key });
    }
  }

  return Object.freeze({
    extra_data: extraData,
    extra_data_sha256: value.extra_data_sha256,
    validators: Object.freeze(validators),
    evidence_marker: value.marker,
    evidence_status: value.status,
  });
}

function storageToBesu(entries) {
  const out = {};
  let inputCount = 0;
  let nonzeroCount = 0;
  for (const entry of entries || []) {
    inputCount += 1;
    const slot = exactWord(entry?.slot, "storage_slot_invalid");
    const value = exactWord(entry?.value, "storage_value_invalid");
    if (BigInt(value) === 0n) continue;
    nonzeroCount += 1;
    const key = slot.slice(2);
    const encoded = value.slice(2);
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      hold("duplicate_nonzero_storage_slot", { slot });
    }
    out[key] = encoded;
  }
  return Object.freeze({
    storage: Object.freeze(out),
    input_count: inputCount,
    nonzero_count: nonzeroCount,
  });
}

export function buildVoidEconomicEpoch2BesuGenesisV1({
  stateManifest,
  clientCandidate,
  nonceContinuity,
  productionQbftExtraDataEvidence = null,
}) {
  validateCandidate(clientCandidate);
  validateStateManifest(stateManifest);
  const nonceEvidence = validateNonceContinuity(nonceContinuity);
  const productionQbft =
    productionQbftExtraDataEvidence === null
      ? null
      : validateProductionQbftExtraDataEvidence(
          productionQbftExtraDataEvidence,
        );

  const alloc = {};
  let totalStorageEntries = 0;
  let totalNonzeroStorageEntries = 0;
  for (const account of stateManifest.accounts) {
    const address = lowerAddress(account.address);
    if (Object.prototype.hasOwnProperty.call(alloc, address)) {
      hold("duplicate_alloc_address", { address });
    }
    const runtimeCode = exactCode(account.runtime_code_hex);
    const converted = storageToBesu(account.storage_entries);
    totalStorageEntries += converted.input_count;
    totalNonzeroStorageEntries += converted.nonzero_count;
    alloc[address] = {
      balance: "0x0",
      code: runtimeCode,
      ...(converted.nonzero_count > 0
        ? { storage: converted.storage }
        : {}),
    };
  }

  let nonceOnlyAllocAccountCount = 0;
  for (const entry of nonceContinuity.accounts) {
    const address = lowerAddress(
      entry.address,
      "nonce_continuity_address_invalid",
    );
    const nonce = quantityHex(
      entry.frozen_final_nonce,
      "nonce_continuity_nonce_invalid",
    );
    if (Object.prototype.hasOwnProperty.call(alloc, address)) {
      alloc[address] = {
        ...alloc[address],
        nonce,
      };
    } else {
      alloc[address] = {
        balance: "0x0",
        nonce,
      };
      nonceOnlyAllocAccountCount += 1;
    }
  }

  if (nonceOnlyAllocAccountCount !== EXPECTED_NONCE_ONLY_ALLOC_ACCOUNT_COUNT) {
    hold("nonce_only_alloc_account_count_mismatch", {
      observed: nonceOnlyAllocAccountCount,
    });
  }
  if (Object.keys(alloc).length !== EXPECTED_TOTAL_ALLOC_ACCOUNT_COUNT) {
    hold("alloc_account_count_mismatch", {
      observed: Object.keys(alloc).length,
    });
  }
  if (totalStorageEntries !== 1268) {
    hold("alloc_input_storage_count_mismatch", {
      observed: totalStorageEntries,
    });
  }
  if (totalNonzeroStorageEntries !== 1014) {
    hold("alloc_nonzero_storage_count_mismatch", {
      observed: totalNonzeroStorageEntries,
    });
  }

  const profile = clientCandidate.genesis_profile;
  const consensus = clientCandidate.consensus;
  const selectedExtraData =
    productionQbft?.extra_data ||
    consensus.offline_placeholder_qbft_extra_data;

  const genesis = {
    config: {
      chainId: 2050,
      berlinBlock: profile.berlin_block,
      londonBlock: profile.london_block,
      shanghaiTime: profile.shanghai_time,
      zeroBaseFee: profile.zero_base_fee,
      contractSizeLimit: profile.contract_size_limit,
      qbft: {
        blockperiodseconds: consensus.block_period_seconds,
        epochlength: consensus.epoch_length,
        requesttimeoutseconds: consensus.request_timeout_seconds,
      },
    },
    nonce: "0x0",
    timestamp: "0x0",
    extraData: selectedExtraData,
    gasLimit: profile.gas_limit,
    baseFeePerGas: "0x0",
    difficulty: "0x1",
    mixHash: QBFT_MIX_HASH,
    coinbase: ZERO_ADDRESS,
    alloc,
    number: "0x0",
    gasUsed: "0x0",
    parentHash:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
  };

  const evidenceMaterial = {
    marker: VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1,
    version: 1,
    status:
      productionQbft === null
        ? "BESU_GENESIS_CANDIDATE_BUILT"
        : "BESU_PRODUCTION_GENESIS_CANDIDATE_BUILT_VALIDATOR_RUNTIME_HOLD",
    client: {
      name: "Besu",
      version: "26.8.1",
      docker_repo_digest: EXPECTED_BESU_REPO_DIGEST,
      docker_image_id: EXPECTED_BESU_IMAGE_ID,
    },
    consensus: {
      engine: "QBFT",
      mode:
        productionQbft === null
          ? "offline_placeholder"
          : "production_four_validator_extra_data",
      placeholder_validator_set:
        consensus.placeholder_validator_set_for_offline_genesis_proof_only,
      placeholder_extra_data:
        consensus.offline_placeholder_qbft_extra_data,
      production_validator_addresses:
        productionQbft === null ? null : productionQbft.validators,
      production_extra_data_sha256:
        productionQbft === null
          ? null
          : productionQbft.extra_data_sha256,
      production_extra_data_evidence_marker:
        productionQbft === null
          ? null
          : productionQbft.evidence_marker,
      production_qbft_extra_data_bound_into_genesis:
        productionQbft !== null,
      production_validator_set_bound: false,
      placeholder_validator_authority: false,
    },
    evm_forks: {
      berlin_block: profile.berlin_block,
      london_block: profile.london_block,
      shanghai_time: profile.shanghai_time,
      push0_required: true,
    },
    free_gas: {
      zero_base_fee: true,
      base_fee_per_gas: "0x0",
      min_gas_price_runtime_required: "0",
      tx_pool_enable_balance_check_runtime_required: false,
      participant_native_gas_balance_required: false,
    },
    state: {
      source_manifest_material_sha256:
        stateManifest.manifest_material_sha256,
      alloc_account_count: Object.keys(alloc).length,
      economic_state_account_count: stateManifest.accounts.length,
      nonce_continuity_account_count: nonceEvidence.account_count,
      nonce_only_alloc_account_count: nonceOnlyAllocAccountCount,
      maximum_preserved_nonce: nonceEvidence.maximum_nonce,
      canonical_nonce_tsv_sha256: nonceEvidence.canonical_tsv_sha256,
      known_retained_raw_transaction_stale_under_exact_nonce_continuity:
        nonceEvidence.known_retained_raw_transaction_stale,
      input_storage_entry_count: totalStorageEntries,
      nonzero_genesis_storage_entry_count:
        totalNonzeroStorageEntries,
      native_prefunded_account_count: 0,
    },
    gates: {
      client_specific_genesis_candidate_built: true,
      production_qbft_extra_data_bound_into_genesis:
        productionQbft !== null,
      besu_genesis_parse_verified: false,
      client_specific_state_equivalence_proven: false,
      production_validator_set_bound: false,
      offline_successor_equivalence_proven: false,
      migration_authorized: false,
      public_activation_authorized: false,
    },
    authority: VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_AUTHORITY_V1,
  };

  return Object.freeze({
    genesis: Object.freeze(genesis),
    evidence: Object.freeze({
      ...evidenceMaterial,
      genesis_material_sha256: canonicalSha256(genesis),
      evidence_material_sha256: canonicalSha256(evidenceMaterial),
    }),
  });
}

function parseArgs(argv) {
  const args = { apply: false, confirmation: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--state-manifest") {
      if (!argv[i + 1]) hold("state_manifest_path_missing");
      args.state_manifest = argv[++i];
    } else if (key === "--qbft-production-extra-data") {
      if (!argv[i + 1]) hold("qbft_production_extra_data_path_missing");
      args.qbft_production_extra_data = argv[++i];
    } else if (key === "--out-genesis") {
      if (!argv[i + 1]) hold("output_genesis_path_missing");
      args.out_genesis = argv[++i];
    } else if (key === "--out-evidence") {
      if (!argv[i + 1]) hold("output_evidence_path_missing");
      args.out_evidence = argv[++i];
    } else if (key === "--apply") {
      args.apply = true;
    } else if (key === "--confirmation") {
      if (!argv[i + 1]) hold("confirmation_value_missing");
      args.confirmation = argv[++i];
    } else if (key === "--help") {
      args.help = true;
    } else {
      hold(`unknown_argument:${key}`);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "Usage: node tools/void-economic-epoch2-besu-genesis-builder-v1.mjs --state-manifest FILE [--qbft-production-extra-data FILE] --out-genesis FILE --out-evidence FILE --apply --confirmation buildEpoch2BesuGenesisCandidate\n",
    );
    return;
  }

  const candidate = readJson(
    "ops/mainnet0/economic-epoch2-production-client-candidate-v1.json",
  ).value;

  if (!args.apply) {
    process.stdout.write(
      JSON.stringify(
        {
          marker: VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1,
          status: "PLAN_READY",
          required_confirmation:
            VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_CONFIRMATION_V1,
          state_manifest_required: true,
          nonce_continuity_manifest_required: true,
          production_qbft_extra_data_optional: true,
          output_genesis_required: true,
          output_evidence_required: true,
          production_validator_set_bound: false,
          authority: VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_AUTHORITY_V1,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (
    args.confirmation !==
    VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_CONFIRMATION_V1
  ) {
    hold("explicit_confirmation_required");
  }
  if (!args.state_manifest || !args.out_genesis || !args.out_evidence) {
    hold("required_path_missing");
  }

  const state = readJson(path.resolve(args.state_manifest));
  const nonceContinuity = readJson(
    path.resolve(
      "ops/mainnet0/economic-epoch2-account-nonce-continuity-candidate-v1.json",
    ),
  ).value;
  if (sha256(state.raw) !== EXPECTED_STATE_MANIFEST_FILE_SHA256) {
    hold("client_neutral_state_manifest_file_sha256_mismatch");
  }
  if (
    state.value?.manifest_material_sha256 !==
    EXPECTED_STATE_MANIFEST_MATERIAL_SHA256
  ) {
    hold("client_neutral_state_manifest_material_sha256_mismatch");
  }

  const productionQbftExtraDataEvidence =
    args.qbft_production_extra_data
      ? readJson(path.resolve(args.qbft_production_extra_data)).value
      : null;

  const built = buildVoidEconomicEpoch2BesuGenesisV1({
    stateManifest: state.value,
    clientCandidate: candidate,
    nonceContinuity,
    productionQbftExtraDataEvidence,
  });

  const genesisRaw = Buffer.from(
    JSON.stringify(built.genesis, null, 2) + "\n",
  );
  const evidence = {
    ...built.evidence,
    genesis_file_sha256: sha256(genesisRaw),
  };
  const evidenceRaw = Buffer.from(
    JSON.stringify(evidence, null, 2) + "\n",
  );

  fs.writeFileSync(path.resolve(args.out_genesis), genesisRaw, {
    mode: 0o600,
    flag: "wx",
  });
  fs.writeFileSync(path.resolve(args.out_evidence), evidenceRaw, {
    mode: 0o600,
    flag: "wx",
  });

  process.stdout.write(
    JSON.stringify(
      {
        marker: VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1,
        status: evidence.status,
        genesis_path: path.resolve(args.out_genesis),
        evidence_path: path.resolve(args.out_evidence),
        genesis_file_sha256: evidence.genesis_file_sha256,
        genesis_material_sha256: evidence.genesis_material_sha256,
        alloc_account_count: evidence.state.alloc_account_count,
        nonce_continuity_account_count:
          evidence.state.nonce_continuity_account_count,
        nonce_only_alloc_account_count:
          evidence.state.nonce_only_alloc_account_count,
        maximum_preserved_nonce: evidence.state.maximum_preserved_nonce,
        input_storage_entry_count:
          evidence.state.input_storage_entry_count,
        nonzero_genesis_storage_entry_count:
          evidence.state.nonzero_genesis_storage_entry_count,
        production_qbft_extra_data_bound_into_genesis:
          built.evidence.gates
            .production_qbft_extra_data_bound_into_genesis,
        production_validator_set_bound: false,
        besu_genesis_parse_verified: false,
        client_specific_state_equivalence_proven: false,
        offline_successor_equivalence_proven: false,
        migration_authorized: false,
        public_activation_authorized: false,
      },
      null,
      2,
    ) + "\n",
  );
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;

if (invoked) {
  main().catch((error) => {
    const reason =
      error instanceof VoidEconomicEpoch2BesuGenesisBuilderHoldV1
        ? error.reason
        : String(error?.message || error);
    const detail =
      error instanceof VoidEconomicEpoch2BesuGenesisBuilderHoldV1 &&
      error.detail !== null
        ? ` detail=${JSON.stringify(error.detail)}`
        : "";
    process.stderr.write(
      `VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1_HOLD reason=${reason}${detail}\n`,
    );
    process.exitCode = 2;
  });
}

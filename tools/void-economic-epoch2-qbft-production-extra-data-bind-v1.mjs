#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { decodeRlp, encodeRlp, getAddress } from "ethers";

import {
  prepareQbftProductionExtraDataInputV1,
} from "./void-economic-epoch2-qbft-production-extra-data-preflight-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_BIND_V1 =
  "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_BIND_V1";

export const VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_EVIDENCE_V1 =
  "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_EVIDENCE_V1";

export const PINNED_BESU_26_8_1 =
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042";

export const PRODUCTION_EXTRA_DATA_EVIDENCE_PATH =
  "ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json";

const ZERO_VANITY = "0x" + "00".repeat(32);

function fail(reason) {
  throw new Error(reason);
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeExtraData(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!/^0x(?:[0-9a-f]{2})+$/.test(text)) {
    fail("qbft_extra_data_hex_invalid");
  }
  return text;
}

function exactAddress(value, reason) {
  try {
    return getAddress(String(value)).toLowerCase();
  } catch {
    fail(reason);
  }
}

function assertDecodedQbftGenesisExtraData(decoded, validators) {
  if (!Array.isArray(decoded) || decoded.length !== 5) {
    fail("qbft_extra_data_root_shape_invalid");
  }

  if (String(decoded[0]).toLowerCase() !== ZERO_VANITY) {
    fail("qbft_extra_data_vanity_invalid");
  }

  const decodedValidators = decoded[1];
  if (
    !Array.isArray(decodedValidators) ||
    decodedValidators.length !== validators.length
  ) {
    fail("qbft_extra_data_validator_list_invalid");
  }
  for (let index = 0; index < validators.length; index += 1) {
    const observed = exactAddress(
      decodedValidators[index],
      "qbft_extra_data_validator_address_invalid",
    );
    if (observed !== validators[index]) {
      fail("qbft_extra_data_validator_order_mismatch");
    }
  }

  if (!Array.isArray(decoded[2]) || decoded[2].length !== 0) {
    fail("qbft_extra_data_vote_must_be_empty");
  }

  if (String(decoded[3]).toLowerCase() !== "0x") {
    fail("qbft_extra_data_round_must_be_zero");
  }

  if (!Array.isArray(decoded[4]) || decoded[4].length !== 0) {
    fail("qbft_extra_data_seals_must_be_empty");
  }
}

export function bindVoidEconomicEpoch2QbftProductionExtraDataV1({
  binding,
  extraData,
  besuImageDigest,
}) {
  if (besuImageDigest !== PINNED_BESU_26_8_1) {
    fail("besu_image_digest_mismatch");
  }

  const preflight = prepareQbftProductionExtraDataInputV1(binding);
  if (
    preflight.status !== "READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING" ||
    preflight.attested_live_node_count !== 3 ||
    preflight.required_live_node_count !== 3 ||
    preflight.attested_identity_slots_remaining !== 0 ||
    !Array.isArray(preflight.validators) ||
    preflight.validators.length !== 3
  ) {
    fail("qbft_production_extra_data_preflight_not_ready");
  }

  const validators = preflight.validators.map((value) =>
    exactAddress(value, "qbft_preflight_validator_address_invalid"),
  );
  if (new Set(validators).size !== 3) {
    fail("qbft_preflight_validator_address_duplicate");
  }

  const normalizedExtraData = normalizeExtraData(extraData);
  const decoded = decodeRlp(normalizedExtraData);
  assertDecodedQbftGenesisExtraData(decoded, validators);

  const independentlyEncoded = encodeRlp([
    ZERO_VANITY,
    validators,
    [],
    "0x",
    [],
  ]).toLowerCase();
  if (independentlyEncoded !== normalizedExtraData) {
    fail("qbft_extra_data_canonical_rlp_mismatch");
  }

  const extraDataBytes = Buffer.from(normalizedExtraData.slice(2), "hex");
  const extraDataSha256 = sha256Bytes(extraDataBytes);

  const updated = structuredClone(binding);
  updated.qbft.production_extra_data_built = true;
  updated.qbft.production_extra_data_sha256 = extraDataSha256;
  updated.qbft.production_extra_data_evidence =
    PRODUCTION_EXTRA_DATA_EVIDENCE_PATH;
  updated.gates.qbft_live_identity_manifest_ready = true;
  updated.gates.qbft_minimum_live_nodes_attested = true;
  updated.gates.qbft_public_key_address_derivations_verified = true;
  updated.gates.qbft_production_extra_data_built = true;

  for (const field of [
    "production_validator_set_bound",
    "offline_successor_equivalence_proven",
    "migration_authorized",
    "public_activation_authorized",
  ]) {
    if (updated.gates?.[field] !== false) {
      fail("qbft_extra_data_downstream_gate_must_remain_false:" + field);
    }
  }

  for (const field of [
    "service_action",
    "validator_mutation",
    "wallet_access",
    "private_key_access",
    "credential_content_access",
    "transaction_construction",
    "transaction_signing",
    "transaction_submission",
    "transaction_broadcast",
    "authoritative_chain2050_write",
    "token_movement",
    "funds_movement",
    "migration_authorized",
    "public_activation_authorized",
  ]) {
    if (updated.authority?.[field] !== false) {
      fail("qbft_extra_data_authority_must_remain_false:" + field);
    }
  }

  const evidence = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_EVIDENCE_V1,
    version: 1,
    status: "PRODUCTION_QBFT_EXTRA_DATA_BUILT_GENESIS_BINDING_HOLD",
    client: Object.freeze({
      name: "Besu",
      version: "26.8.1",
      image: PINNED_BESU_26_8_1,
      release_commit:
        "d97cbd61976a52bb109e637196fef9a8ebf2b617",
      codec: "QbftExtraDataCodec.encodeFromAddresses",
      rlp_cli_type: "QBFT_EXTRA_DATA",
      upstream_source_git_blob_sha1: Object.freeze({
        qbft_extra_data_cli_adapter:
          "a2cda10a4a1bbbe4541477424778b00ea84a5531",
        qbft_extra_data_codec:
          "39c7aa3006738fa86b689a6e06e698fbf54da49b",
        bft_extra_data_codec:
          "c6bf51ee640c99f0b3bb06a03fc4fe05be867765",
      }),
    }),
    chain_id: 2050,
    validator_management_method: "blockheader",
    validator_count: 3,
    validators: Object.freeze([...validators]),
    validator_records: Object.freeze(
      preflight.validator_records.map((row) =>
        Object.freeze({ ...row }),
      ),
    ),
    extra_data_hex: normalizedExtraData,
    extra_data_bytes: extraDataBytes.length,
    extra_data_sha256: extraDataSha256,
    decoded: Object.freeze({
      vanity_zero_bytes: 32,
      validator_order_exact: true,
      vote_empty: true,
      round: 0,
      commit_seals_empty: true,
      independently_reencoded_exact: true,
    }),
    upstream: Object.freeze({
      preflight_marker: preflight.marker,
      preflight_status: preflight.status,
      binding_marker: binding.marker,
      binding_status: binding.status,
      production_binding_entry_count:
        binding.qbft.production_binding_entries.length,
    }),
    gates: Object.freeze({
      qbft_live_identity_manifest_ready: true,
      qbft_minimum_live_nodes_attested: true,
      qbft_public_key_address_derivations_verified: true,
      qbft_production_extra_data_built: true,
      production_validator_set_bound: false,
      offline_successor_equivalence_proven: false,
      all_production_validators_epoch_domain_enforced: false,
      authoritative_chain2050_write: false,
      migration_authorized: false,
      public_activation_authorized: false,
    }),
    authority: Object.freeze({
      source_and_offline_encoding_only: true,
      service_action: false,
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
    }),
  });

  const updatedBindingBytes = Buffer.from(
    JSON.stringify(updated, null, 2) + "\n",
    "utf8",
  );
  const evidenceBytes = Buffer.from(
    JSON.stringify(evidence, null, 2) + "\n",
    "utf8",
  );

  return Object.freeze({
    updated_binding: updated,
    updated_binding_bytes: updatedBindingBytes,
    evidence,
    evidence_bytes: evidenceBytes,
    updated_binding_sha256: sha256Bytes(updatedBindingBytes),
    evidence_file_sha256: sha256Bytes(evidenceBytes),
  });
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href) {
  const bindingPath = path.resolve(String(arg("--binding") || ""));
  const extraDataPath = path.resolve(String(arg("--extra-data") || ""));
  const outputDir = path.resolve(String(arg("--output-dir") || ""));
  const besuImageDigest = String(arg("--besu-image-digest") || "");

  for (const [value, reason] of [
    [bindingPath, "binding_path_required"],
    [extraDataPath, "extra_data_path_required"],
    [outputDir, "output_dir_required"],
  ]) {
    if (!value || value === path.parse(value).root) fail(reason);
  }

  const binding = JSON.parse(fs.readFileSync(bindingPath, "utf8"));
  const extraData = fs.readFileSync(extraDataPath, "utf8").trim();
  const result = bindVoidEconomicEpoch2QbftProductionExtraDataV1({
    binding,
    extraData,
    besuImageDigest,
  });

  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = [
    [
      path.join(
        outputDir,
        "economic-epoch2-qbft-validator-binding-candidate-v1.json",
      ),
      result.updated_binding_bytes,
    ],
    [
      path.join(
        outputDir,
        "economic-epoch2-qbft-production-extra-data-v1.json",
      ),
      result.evidence_bytes,
    ],
  ];

  for (const [file, bytes] of outputs) {
    if (fs.existsSync(file)) fail("output_already_exists:" + path.basename(file));
    fs.writeFileSync(file, bytes, { mode: 0o644, flag: "wx" });
  }

  console.log(VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_BIND_V1);
  console.log("status=" + result.evidence.status);
  console.log("validator_count=3");
  console.log("extra_data_sha256=" + result.evidence.extra_data_sha256);
  console.log("extra_data_bytes=" + result.evidence.extra_data_bytes);
  console.log("updated_binding_sha256=" + result.updated_binding_sha256);
  console.log("evidence_file_sha256=" + result.evidence_file_sha256);
  console.log("qbft_live_identity_manifest_ready=true");
  console.log("qbft_minimum_live_nodes_attested=true");
  console.log("qbft_public_key_address_derivations_verified=true");
  console.log("qbft_production_extra_data_built=true");
  console.log("production_validator_set_bound=false");
  console.log("offline_successor_equivalence_proven=false");
  console.log("all_production_validators_epoch_domain_enforced=false");
  console.log("authoritative_chain2050_write=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement=false");
  console.log("output_dir=" + outputDir);
}

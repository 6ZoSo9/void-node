#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { computeAddress, getAddress } from "ethers";

import {
  prepareQbftProductionExtraDataInputV1,
} from "./void-economic-epoch2-qbft-production-extra-data-preflight-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_QBFT_FOURTH_IDENTITY_IMPORT_V1 =
  "VOID_ECONOMIC_EPOCH2_QBFT_FOURTH_IDENTITY_IMPORT_V1";

export const VOID_ECONOMIC_EPOCH2_QBFT_ALIENWARE_CANONICAL_ATTESTATION_V1 =
  "ops/mainnet0/economic-epoch2-qbft-node-identity-alienware-v1.json";

const PUBLIC_ATTESTATION_MARKER =
  "VOID_ECONOMIC_EPOCH2_QBFT_NODE_IDENTITY_PUBLIC_ATTESTATION_V1";
const PUBLIC_ATTESTATION_STATUS =
  "PUBLIC_IDENTITY_DERIVATION_GREEN_UNBOUND";
const BESU_IMAGE =
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042";
const ADDRESS_DERIVATION =
  "ethers.SigningKey.publicKey + ethers.computeAddress";

function fail(reason) {
  throw new Error(reason);
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

function exactObject(value, keys, reason) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(reason);
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    fail(reason);
  }
  const observed = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    observed.length !== expected.length ||
    observed.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  return value;
}

function validateAlienwarePublicAttestationV1(attestation) {
  exactObject(
    attestation,
    [
      "marker",
      "version",
      "status",
      "source_commit",
      "machine_role",
      "hostname",
      "void_node_id",
      "node_base",
      "besu",
      "local_private_attestation",
      "authority",
    ],
    "alienware_public_attestation_shape_invalid",
  );

  if (attestation.marker !== PUBLIC_ATTESTATION_MARKER) {
    fail("alienware_public_attestation_marker_invalid");
  }
  if (attestation.version !== 1) {
    fail("alienware_public_attestation_version_invalid");
  }
  if (attestation.status !== PUBLIC_ATTESTATION_STATUS) {
    fail("alienware_public_attestation_status_invalid");
  }
  if (!/^[0-9a-f]{40}$/.test(String(attestation.source_commit || ""))) {
    fail("alienware_public_attestation_source_commit_invalid");
  }
  if (attestation.machine_role !== "alienware") {
    fail("alienware_public_attestation_machine_role_invalid");
  }
  if (
    typeof attestation.hostname !== "string" ||
    attestation.hostname.length < 1 ||
    attestation.hostname.length > 253 ||
    /[\u0000\r\n]/.test(attestation.hostname)
  ) {
    fail("alienware_public_attestation_hostname_invalid");
  }
  if (!/^[0-9a-f]{32}$/.test(String(attestation.void_node_id || ""))) {
    fail("alienware_public_attestation_void_node_id_invalid");
  }
  if (attestation.node_base !== "http://127.0.0.1:4100") {
    fail("alienware_public_attestation_node_base_invalid");
  }

  const besu = exactObject(
    attestation.besu,
    [
      "client",
      "client_version",
      "image",
      "public_key",
      "validator_address",
      "address_derivation_method",
      "public_key_address_derivation_verified",
    ],
    "alienware_public_attestation_besu_shape_invalid",
  );
  if (
    besu.client !== "Besu" ||
    besu.client_version !== "26.8.1" ||
    besu.image !== BESU_IMAGE
  ) {
    fail("alienware_public_attestation_besu_identity_invalid");
  }
  const publicKey = String(besu.public_key || "").toLowerCase();
  if (!/^0x04[0-9a-f]{128}$/.test(publicKey)) {
    fail("alienware_public_attestation_public_key_invalid");
  }
  let validatorAddress;
  try {
    validatorAddress = getAddress(String(besu.validator_address || "")).toLowerCase();
  } catch {
    fail("alienware_public_attestation_validator_address_invalid");
  }
  if (computeAddress(publicKey).toLowerCase() !== validatorAddress) {
    fail("alienware_public_attestation_public_key_address_mismatch");
  }
  if (
    besu.address_derivation_method !== ADDRESS_DERIVATION ||
    besu.public_key_address_derivation_verified !== true
  ) {
    fail("alienware_public_attestation_address_derivation_invalid");
  }

  const local = exactObject(
    attestation.local_private_attestation,
    [
      "filename",
      "file_sha256",
      "private_key_content_exported",
      "private_key_content_recorded_in_repo",
    ],
    "alienware_public_attestation_local_receipt_shape_invalid",
  );
  if (
    !/^void_epoch2_qbft_identity_alienware_v1_[0-9]{8}T[0-9]{6}Z\.json$/.test(
      String(local.filename || ""),
    )
  ) {
    fail("alienware_public_attestation_local_receipt_filename_invalid");
  }
  if (!/^[0-9a-f]{64}$/.test(String(local.file_sha256 || ""))) {
    fail("alienware_public_attestation_local_receipt_sha256_invalid");
  }
  if (
    local.private_key_content_exported !== false ||
    local.private_key_content_recorded_in_repo !== false
  ) {
    fail("alienware_public_attestation_private_key_boundary_invalid");
  }

  const authority = exactObject(
    attestation.authority,
    [
      "besu_node_started",
      "production_validator_set_bound",
      "validator_mutation",
      "authoritative_chain2050_write",
      "funds_movement",
      "migration_authorized",
      "public_activation",
    ],
    "alienware_public_attestation_authority_shape_invalid",
  );
  for (const [key, value] of Object.entries(authority)) {
    if (value !== false) {
      fail("alienware_public_attestation_authority_must_remain_false:" + key);
    }
  }

  return Object.freeze({
    machine_role: "alienware",
    void_node_id: attestation.void_node_id,
    besu_validator_address: validatorAddress,
    besu_public_key: publicKey,
    public_key_address_derivation_verified: true,
    address_derivation_method: ADDRESS_DERIVATION,
    node_identity_attestation:
      VOID_ECONOMIC_EPOCH2_QBFT_ALIENWARE_CANONICAL_ATTESTATION_V1,
    node_identity_attestation_sha256: local.file_sha256,
  });
}

export function importVoidEconomicEpoch2QbftFourthIdentityV1({
  binding,
  attestation,
  attestationBytes = null,
}) {
  const held = prepareQbftProductionExtraDataInputV1(binding);
  if (
    held.status !== "HOLD" ||
    held.reason !== "insufficient_attested_live_nodes" ||
    held.attested_live_node_count !== 3 ||
    held.required_live_node_count !== 4 ||
    held.attested_identity_slots_remaining !== 1
  ) {
    fail("canonical_qbft_binding_not_ready_for_fourth_identity");
  }

  const fourth = validateAlienwarePublicAttestationV1(attestation);
  const existing = binding.qbft.production_binding_entries;

  for (const [field, value] of [
    ["machine_role", fourth.machine_role],
    ["void_node_id", fourth.void_node_id],
    ["besu_validator_address", fourth.besu_validator_address],
    ["besu_public_key", fourth.besu_public_key],
    [
      "node_identity_attestation_sha256",
      fourth.node_identity_attestation_sha256,
    ],
  ]) {
    if (
      existing.some(
        (row) =>
          String(row?.[field] || "").toLowerCase() ===
          String(value).toLowerCase(),
      )
    ) {
      fail("fourth_identity_duplicate:" + field);
    }
  }

  const updated = structuredClone(binding);
  updated.qbft.production_binding_entries.push({ ...fourth });
  updated.qbft.attested_live_node_count = 4;
  updated.qbft.attested_identity_slots_remaining = 0;

  // The import only fills the fourth public identity slot. It does not
  // promote any downstream production, migration, or activation gate.
  if (
    updated.qbft.production_extra_data_built !== false ||
    updated.qbft.production_extra_data_sha256 !== null
  ) {
    fail("fourth_identity_import_production_extra_data_must_remain_unbuilt");
  }
  for (const field of [
    "qbft_live_identity_manifest_ready",
    "qbft_minimum_live_nodes_attested",
    "qbft_public_key_address_derivations_verified",
    "qbft_production_extra_data_built",
    "production_validator_set_bound",
    "offline_successor_equivalence_proven",
    "migration_authorized",
    "public_activation_authorized",
  ]) {
    if (updated.gates?.[field] !== false) {
      fail("fourth_identity_import_gate_must_remain_false:" + field);
    }
  }

  const ready = prepareQbftProductionExtraDataInputV1(updated);
  if (
    ready.status !== "READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING" ||
    ready.attested_live_node_count !== 4 ||
    ready.required_live_node_count !== 4 ||
    ready.attested_identity_slots_remaining !== 0 ||
    ready.validators.length !== 4
  ) {
    fail("fourth_identity_import_preflight_not_ready");
  }

  const bindingBytes = Buffer.from(
    JSON.stringify(updated, null, 2) + "\n",
    "utf8",
  );
  const publicBytes =
    attestationBytes === null
      ? Buffer.from(JSON.stringify(attestation, null, 2) + "\n", "utf8")
      : Buffer.from(attestationBytes);

  const receipt = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_QBFT_FOURTH_IDENTITY_IMPORT_V1,
    version: 1,
    status: "FOURTH_IDENTITY_IMPORTED_PREFLIGHT_READY",
    machine_role: fourth.machine_role,
    canonical_attestation_path:
      VOID_ECONOMIC_EPOCH2_QBFT_ALIENWARE_CANONICAL_ATTESTATION_V1,
    public_attestation_file_sha256: sha256Bytes(publicBytes),
    local_private_attestation_sha256:
      fourth.node_identity_attestation_sha256,
    void_node_id: fourth.void_node_id,
    besu_validator_address: fourth.besu_validator_address,
    besu_public_key: fourth.besu_public_key,
    updated_binding_sha256: sha256Bytes(bindingBytes),
    production_binding_entry_count: 4,
    attested_live_node_count: 4,
    required_live_node_count: 4,
    attested_identity_slots_remaining: 0,
    preflight_status: ready.status,
    validators: Object.freeze([...ready.validators]),
    production_extra_data_built: false,
    production_validator_set_bound: false,
    all_production_validators_epoch_domain_enforced: false,
    authoritative_chain2050_write: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement: false,
  });

  return Object.freeze({
    canonical_attestation: attestation,
    canonical_attestation_bytes: publicBytes,
    updated_binding: updated,
    updated_binding_bytes: bindingBytes,
    receipt,
  });
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href) {
  const attestationPath = path.resolve(String(arg("--attestation") || ""));
  const bindingPath = path.resolve(
    String(
      arg("--binding") ||
        "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
    ),
  );
  const outputDir = path.resolve(String(arg("--output-dir") || ""));

  if (!attestationPath || attestationPath === path.parse(attestationPath).root) {
    fail("attestation_path_required");
  }
  if (!outputDir || outputDir === path.parse(outputDir).root) {
    fail("output_dir_required");
  }

  const attestationBytes = fs.readFileSync(attestationPath);
  const attestation = JSON.parse(attestationBytes.toString("utf8"));
  const binding = JSON.parse(fs.readFileSync(bindingPath, "utf8"));

  const result = importVoidEconomicEpoch2QbftFourthIdentityV1({
    binding,
    attestation,
    attestationBytes,
  });

  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = [
    [
      path.join(
        outputDir,
        "economic-epoch2-qbft-node-identity-alienware-v1.json",
      ),
      result.canonical_attestation_bytes,
    ],
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
        "void-economic-epoch2-qbft-fourth-identity-import-v1.json",
      ),
      Buffer.from(JSON.stringify(result.receipt, null, 2) + "\n", "utf8"),
    ],
  ];

  for (const [file, bytes] of outputs) {
    if (fs.existsSync(file)) fail("output_already_exists:" + path.basename(file));
    fs.writeFileSync(file, bytes, { mode: 0o644, flag: "wx" });
  }

  console.log(VOID_ECONOMIC_EPOCH2_QBFT_FOURTH_IDENTITY_IMPORT_V1);
  console.log("status=" + result.receipt.status);
  console.log("machine_role=alienware");
  console.log("void_node_id=" + result.receipt.void_node_id);
  console.log(
    "besu_validator_address=" + result.receipt.besu_validator_address,
  );
  console.log(
    "public_attestation_file_sha256=" +
      result.receipt.public_attestation_file_sha256,
  );
  console.log(
    "local_private_attestation_sha256=" +
      result.receipt.local_private_attestation_sha256,
  );
  console.log(
    "updated_binding_sha256=" + result.receipt.updated_binding_sha256,
  );
  console.log("production_binding_entry_count=4");
  console.log("preflight_status=" + result.receipt.preflight_status);
  console.log("production_extra_data_built=false");
  console.log("production_validator_set_bound=false");
  console.log("all_production_validators_epoch_domain_enforced=false");
  console.log("authoritative_chain2050_write=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement=false");
  console.log("output_dir=" + outputDir);
}

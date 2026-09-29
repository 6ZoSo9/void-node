#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { computeAddress, getAddress } from "ethers";

export const MARKER =
  "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_PREFLIGHT_V1";
export const REQUIRED_VALIDATORS = 3;
export const FORBIDDEN_PLACEHOLDERS = [
  "0x1000000000000000000000000000000000000001",
  "0x2000000000000000000000000000000000000002",
  "0x3000000000000000000000000000000000000003",
  "0x4000000000000000000000000000000000000004",
].map((value) => value.toLowerCase());

function fail(reason) {
  throw new Error(reason);
}

function requireFalse(object, field) {
  if (object?.[field] !== false) fail("authority_must_remain_false:" + field);
}

function normalizeHex(value, bytes, field) {
  const text = String(value ?? "").toLowerCase();
  const re = new RegExp("^0x[0-9a-f]{" + String(bytes * 2) + "}$");
  if (!re.test(text)) fail(field + "_invalid");
  return text;
}

function normalizeAddress(value, field) {
  const text = String(value ?? "");
  try {
    return getAddress(text).toLowerCase();
  } catch {
    fail(field + "_invalid");
  }
}

export function prepareQbftProductionExtraDataInputV1(binding) {
  if (
    binding?.marker !==
    "VOID_ECONOMIC_EPOCH2_QBFT_VALIDATOR_BINDING_CANDIDATE_V1"
  ) {
    fail("binding_marker_invalid");
  }
  if (binding?.status !== "HOLD") fail("binding_status_invalid");

  const qbft = binding?.qbft;
  if (!qbft || qbft.consensus !== "QBFT") fail("qbft_binding_invalid");
  if (qbft.client !== "Besu" || qbft.client_version !== "26.8.1") {
    fail("besu_client_identity_invalid");
  }
  if (qbft.selected_validator_management_method !== "blockheader") {
    fail("validator_management_method_invalid");
  }
  if (
    qbft.topology_evidence !==
      "ops/mainnet0/economic-epoch2-qbft-topology-v1.json" ||
    qbft.production_validator_count !== 3 ||
    qbft.required_validator_quorum !== 2 ||
    qbft.byzantine_fault_tolerance !== 0 ||
    qbft.one_byzantine_fault_tolerance_available !== false ||
    qbft.minimum_validator_count_for_one_byzantine_fault_tolerance !== 4 ||
    qbft.fourth_validator_required_for_launch !== false
  ) {
    fail("three_validator_topology_contract_invalid");
  }
  if (qbft.required_live_node_count !== REQUIRED_VALIDATORS) {
    fail("required_live_node_count_invalid");
  }
  if (!Array.isArray(qbft.production_binding_entries)) {
    fail("production_binding_entries_invalid");
  }
  if (qbft.attested_live_node_count !== qbft.production_binding_entries.length) {
    fail("attested_live_node_count_mismatch");
  }
  if (
    qbft.attested_identity_slots_remaining !==
    REQUIRED_VALIDATORS - qbft.production_binding_entries.length
  ) {
    fail("attested_identity_slots_remaining_mismatch");
  }
  if (qbft.production_extra_data_built !== false) {
    fail("production_extra_data_must_start_unbuilt");
  }
  if (qbft.production_extra_data_sha256 !== null) {
    fail("production_extra_data_hash_must_start_null");
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
    requireFalse(binding.gates, field);
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
    requireFalse(binding.authority, field);
  }

  const normalized = qbft.production_binding_entries.map((entry, index) => {
    const prefix = "entry_" + String(index);
    const machineRole = String(entry?.machine_role ?? "");
    if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(machineRole)) {
      fail(prefix + "_machine_role_invalid");
    }
    const voidNodeId = String(entry?.void_node_id ?? "").toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(voidNodeId)) {
      fail(prefix + "_void_node_id_invalid");
    }
    const address = normalizeAddress(
      entry?.besu_validator_address,
      prefix + "_validator_address",
    );
    const publicKey = normalizeHex(
      entry?.besu_public_key,
      65,
      prefix + "_public_key",
    );
    if (!publicKey.startsWith("0x04")) {
      fail(prefix + "_public_key_must_be_uncompressed");
    }
    if (entry?.public_key_address_derivation_verified !== true) {
      fail(prefix + "_derivation_not_verified");
    }
    if (computeAddress(publicKey).toLowerCase() !== address) {
      fail(prefix + "_public_key_address_mismatch");
    }
    if (FORBIDDEN_PLACEHOLDERS.includes(address)) {
      fail(prefix + "_placeholder_address_forbidden");
    }
    if (
      typeof entry?.node_identity_attestation !== "string" ||
      !entry.node_identity_attestation.startsWith(
        "ops/mainnet0/economic-epoch2-qbft-node-identity-",
      ) ||
      !entry.node_identity_attestation.endsWith("-v1.json")
    ) {
      fail(prefix + "_attestation_path_invalid");
    }
    if (!/^[0-9a-f]{64}$/.test(String(entry?.node_identity_attestation_sha256 ?? ""))) {
      fail(prefix + "_attestation_sha256_invalid");
    }
    return {
      machine_role: machineRole,
      void_node_id: voidNodeId,
      besu_validator_address: address,
      besu_public_key: publicKey,
      node_identity_attestation: entry.node_identity_attestation,
      node_identity_attestation_sha256:
        entry.node_identity_attestation_sha256,
    };
  });

  for (const [field, values] of [
    ["machine_role", normalized.map((x) => x.machine_role)],
    ["void_node_id", normalized.map((x) => x.void_node_id)],
    ["besu_validator_address", normalized.map((x) => x.besu_validator_address)],
    ["besu_public_key", normalized.map((x) => x.besu_public_key)],
    [
      "node_identity_attestation_sha256",
      normalized.map((x) => x.node_identity_attestation_sha256),
    ],
  ]) {
    if (new Set(values).size !== values.length) fail(field + "_duplicate");
  }

  if (normalized.length < REQUIRED_VALIDATORS) {
    return {
      marker: MARKER,
      version: 1,
      status: "HOLD",
      reason: "insufficient_attested_live_nodes",
      attested_live_node_count: normalized.length,
      required_live_node_count: REQUIRED_VALIDATORS,
      attested_identity_slots_remaining:
        REQUIRED_VALIDATORS - normalized.length,
      validators: normalized.map((x) => x.besu_validator_address),
      required_validator_quorum: 2,
      byzantine_fault_tolerance: 0,
      one_byzantine_fault_tolerance_available: false,
      production_extra_data_built: false,
      production_validator_set_bound: false,
      authoritative_chain2050_write: false,
      migration_authorized: false,
      public_activation_authorized: false,
    };
  }
  if (normalized.length !== REQUIRED_VALIDATORS) {
    fail("production_binding_entry_count_must_equal_required");
  }

  return {
    marker: MARKER,
    version: 1,
    status: "READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING",
    attested_live_node_count: normalized.length,
    required_live_node_count: REQUIRED_VALIDATORS,
    attested_identity_slots_remaining: 0,
    validators: normalized.map((x) => x.besu_validator_address),
    validator_records: normalized,
    required_validator_quorum: 2,
    byzantine_fault_tolerance: 0,
    one_byzantine_fault_tolerance_available: false,
    besu: {
      client: "Besu",
      client_version: "26.8.1",
      image:
        "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
      rlp_command: [
        "rlp",
        "encode",
        "--from=/work/validators.json",
        "--type=QBFT_EXTRA_DATA",
      ],
    },
    production_extra_data_built: false,
    production_validator_set_bound: false,
    authoritative_chain2050_write: false,
    migration_authorized: false,
    public_activation_authorized: false,
  };
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href) {
  const bindingPath = path.resolve(
    String(
      arg("--binding") ||
        "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
    ),
  );
  const outputPath = arg("--output");
  const binding = JSON.parse(fs.readFileSync(bindingPath, "utf8"));
  const result = prepareQbftProductionExtraDataInputV1(binding);

  if (outputPath && result.status === "READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING") {
    const resolved = path.resolve(outputPath);
    if (fs.existsSync(resolved)) fail("output_already_exists");
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, JSON.stringify(result.validators) + "\n", {
      encoding: "utf8",
      flag: "wx",
      mode: 0o644,
    });
  }

  console.log(MARKER);
  console.log("status=" + result.status);
  console.log("attested_live_node_count=" + result.attested_live_node_count);
  console.log("required_live_node_count=" + result.required_live_node_count);
  console.log(
    "attested_identity_slots_remaining=" +
      result.attested_identity_slots_remaining,
  );
  console.log("production_extra_data_built=false");
  console.log("production_validator_set_bound=false");
  console.log("authoritative_chain2050_write=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  if (result.reason) console.log("hold_reason=" + result.reason);
}

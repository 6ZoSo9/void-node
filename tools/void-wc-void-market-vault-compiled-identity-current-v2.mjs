#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

import { keccak256 } from "ethers";

import {
  AUTHORITY as COMPILER_AUTHORITY,
  canonicalJson,
  sha256,
} from "./void-wc-void-market-vault-compiler-identity-v1.mjs";
import {
  verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2,
} from "./void-wc-void-market-vault-compiled-identity-correction-v2.mjs";

export const VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_V2 =
  "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_V2";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BINDING_REL =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-current-binding-v2.json";
const CORRECTION_REL =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-correction-v2.json";
const SUPERSEDED_REL =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json";
const ARCHIVE_REL =
  "ops/mainnet0/wc-void-market-vault-compiler-identity-v1-artifact.zip.b64";

const CORRECTED_LAUNCH =
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d";
const CORRECTED_VAULT =
  "0xb893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d";
const CORRECTION_ID =
  "voidwcvcic2_a33bd59683b48ddae0390fa1ed48c40263e61d094ec9fcdf6ff88d2b1361da8e";
const CREATION_KECCAK =
  "0xa741a938f6570d3b8de727e7487460a0dda04244e6e45a79ab22756b16369c41";
const RUNTIME_KECCAK =
  "0xea29fc4564e552b4b16a824f9f9566edc82d886b81d908f6205091cbe6ce24af";

export const EXPECTED = Object.freeze({
  packet_path: BINDING_REL,
  packet_id:
    "voidwcvcurrent2_bdc7c36595dd819924342a51cd38ed645edf304945ec773cc8877e07e767ca05",
  packet_json_sha256:
    "ff2f990f7be134fbf0fc61a0318d998f1cb5029a2aacd4eb9c1cd3fd6f487981",
  packet_json_bytes: 4104,
  identity_id:
    "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a",
  identity_json_sha256:
    "fb9a92e24afa9d7611364ca30b6eff4fe2df2cc2aa8002b77307bead4b864a4b",
  identity_json_bytes: 57245,
  source_commit:
    "dba4a50b444dc5b1369d96fd63f5aa79f185e3e4",
  contract_source_sha256:
    "2ac773c7580f5a5d477d12da62e1a597d64c174395af8b20b721873a63138925",
  creation_bytecode_bytes: 9441,
  creation_bytecode_sha256:
    "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540",
  creation_bytecode_keccak256: CREATION_KECCAK,
  runtime_template_bytes: 8342,
  runtime_template_sha256:
    "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e",
  runtime_template_keccak256: RUNTIME_KECCAK,
  immutable_layout_sha256:
    "61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b",
  compiled_identity_accepted: true,
  deployment_attested: false,
  final_role_bindings_attested: false,
  deployed_runtime_code_observed: false,
  inventory_funding_verified: false,
  inventory_lock_verified: false,
  market_activation_authorized: false,
  public_presale_activation_authorized: false,
});

export const VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_AUTHORITY_V2 =
  Object.freeze({
    source_artifact_read: true,
    filesystem_write: false,
    rpc_call: false,
    credential_access: false,
    private_key_access: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    deployment: false,
    chain2050_write: false,
    inventory_funding: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys, code) {
  if (!plain(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  return value;
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readBytes(relativePath, maxBytes = 8 * 1024 * 1024) {
  if (!/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/u.test(relativePath)) {
    fail("current_identity_path_invalid");
  }
  const resolved = path.join(ROOT, relativePath);
  const stat = fs.lstatSync(resolved);
  if (
    stat.isSymbolicLink() ||
    !stat.isFile() ||
    stat.size < 1 ||
    stat.size > maxBytes
  ) {
    fail("current_identity_source_invalid:" + relativePath);
  }
  const bytes = fs.readFileSync(resolved);
  if (bytes.length !== stat.size) {
    fail("current_identity_source_changed:" + relativePath);
  }
  return bytes;
}

function readJson(relativePath) {
  try {
    return JSON.parse(readBytes(relativePath).toString("utf8"));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("current_identity_")) {
      throw error;
    }
    fail("current_identity_json_invalid:" + relativePath);
  }
}

function readSingleDeflatedZipEntryV1(zipBytes, expectedName) {
  if (!Buffer.isBuffer(zipBytes) || zipBytes.length < 64) {
    fail("current_identity_archive_invalid");
  }
  if (zipBytes.readUInt32LE(0) !== 0x04034b50) {
    fail("current_identity_archive_header_invalid");
  }
  const flags = zipBytes.readUInt16LE(6);
  const method = zipBytes.readUInt16LE(8);
  const nameLength = zipBytes.readUInt16LE(26);
  const extraLength = zipBytes.readUInt16LE(28);
  if ((flags & 0x0008) !== 0x0008 || (flags & ~0x0808) !== 0 || method !== 8) {
    fail("current_identity_archive_contract_invalid");
  }
  const name = zipBytes.subarray(30, 30 + nameLength).toString("utf8");
  if (name !== expectedName) fail("current_identity_archive_entry_invalid");
  const dataStart = 30 + nameLength + extraLength;
  const central = zipBytes.indexOf(Buffer.from("PK\x01\x02", "binary"));
  if (central <= dataStart + 16) fail("current_identity_archive_central_missing");
  const descriptor = central - 16;
  if (zipBytes.readUInt32LE(descriptor) !== 0x08074b50) {
    fail("current_identity_archive_descriptor_invalid");
  }
  const compressedSize = zipBytes.readUInt32LE(descriptor + 8);
  const uncompressedSize = zipBytes.readUInt32LE(descriptor + 12);
  if (dataStart + compressedSize !== descriptor) {
    fail("current_identity_archive_size_invalid");
  }
  const inflated = inflateRawSync(
    zipBytes.subarray(dataStart, dataStart + compressedSize),
  );
  if (
    inflated.length !== uncompressedSize ||
    zipBytes.indexOf(Buffer.from("PK\x03\x04", "binary"), dataStart) !== -1
  ) {
    fail("current_identity_archive_entries_invalid");
  }
  return inflated;
}

function verifyBinding(binding) {
  exactKeys(binding, [
    "archive", "artifacts", "authority", "binding_id", "corrected_coupled_launch_id",
    "corrected_vault_bytes32", "correction_id", "decision",
    "deployment_identity_requirements", "identity", "marker", "source",
    "status", "version",
  ], "current_identity_binding_shape_invalid");
  const body = { ...binding };
  delete body.binding_id;
  if (
    binding.binding_id !== "voidwcvcurrent2_" + sha256(canonicalJson(body)) ||
    binding.binding_id !== EXPECTED.packet_id ||
    binding.marker !==
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_BINDING_V2" ||
    binding.version !== 2 ||
    binding.status !== "COMPILED_IDENTITY_CURRENT_CORRECTED_DEPLOYMENT_HOLD" ||
    binding.correction_id !== CORRECTION_ID ||
    binding.corrected_coupled_launch_id !== CORRECTED_LAUNCH ||
    binding.corrected_vault_bytes32 !== CORRECTED_VAULT
  ) {
    fail("current_identity_binding_invalid");
  }
  if (
    binding.archive?.path !== ARCHIVE_REL ||
    binding.archive?.zip_bytes !== 11283 ||
    binding.archive?.zip_sha256 !==
      "d8707b0a5abc530f888639bffb2079b2d193d147bacfc4a65c3e704858bcb2fc" ||
    binding.archive?.identity_entry !== "identity.json" ||
    binding.archive?.identity_json_bytes !== EXPECTED.identity_json_bytes ||
    binding.archive?.identity_json_sha256 !== EXPECTED.identity_json_sha256 ||
    binding.identity?.identity_id !== EXPECTED.identity_id ||
    binding.identity?.reviewed_at_utc !== "2026-09-28T18:20:05.000Z" ||
    binding.identity?.workflow_run_id !== 36464403015 ||
    binding.identity?.workflow_job_id !== 109070717228 ||
    binding.identity?.workflow_artifact_id !== 10988626461
  ) {
    fail("current_identity_archive_binding_invalid");
  }
  const artifacts = binding.artifacts;
  if (
    artifacts?.creation_bytecode_bytes !== EXPECTED.creation_bytecode_bytes ||
    artifacts?.creation_bytecode_sha256 !== EXPECTED.creation_bytecode_sha256 ||
    artifacts?.creation_bytecode_keccak256 !==
      EXPECTED.creation_bytecode_keccak256 ||
    artifacts?.runtime_template_bytes !== EXPECTED.runtime_template_bytes ||
    artifacts?.runtime_template_sha256 !== EXPECTED.runtime_template_sha256 ||
    artifacts?.runtime_template_keccak256 !==
      EXPECTED.runtime_template_keccak256 ||
    artifacts?.immutable_layout_sha256 !== EXPECTED.immutable_layout_sha256
  ) {
    fail("current_identity_artifact_binding_invalid");
  }
  if (
    binding.decision?.current_compiled_identity_binding !== true ||
    binding.decision?.v1_deployment_artifact_superseded !== true ||
    binding.decision?.old_control_signature_generation_reusable !== false ||
    binding.decision?.deployment_authorized !== false ||
    binding.decision?.inventory_funding_authorized !== false ||
    binding.decision?.market_activation_authorized !== false ||
    binding.decision?.public_presale_activation_authorized !== false
  ) {
    fail("current_identity_decision_invalid");
  }
  for (const [key, value] of Object.entries(binding.authority || {})) {
    if (value !== (key === "source_binding_only")) {
      fail("current_identity_binding_authority_invalid:" + key);
    }
  }
  return binding;
}

function compatibilityPacket(identity, binding) {
  return Object.freeze({
    marker:
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_PACKET_V2",
    version: 2,
    status:
      "COMPILED_IDENTITY_CURRENT_CORRECTED_HELD_ON_CHAIN2050_DEPLOYMENT_ATTESTATION",
    accepted_identity: Object.freeze({
      identity_id: EXPECTED.identity_id,
      identity_json_sha256: EXPECTED.identity_json_sha256,
      identity_json_bytes: EXPECTED.identity_json_bytes,
      workflow_run_id: 36464403015,
      workflow_job_id: 109070717228,
      workflow_artifact_id: 10988626461,
      workflow_artifact_zip_sha256: binding.archive.zip_sha256,
      reviewed_at_utc: "2026-09-28T18:20:05.000Z",
    }),
    source: identity.source,
    artifacts: Object.freeze({
      ...identity.artifacts,
      creation_bytecode_keccak256: EXPECTED.creation_bytecode_keccak256,
      runtime_template_keccak256: EXPECTED.runtime_template_keccak256,
    }),
    deployment_identity_requirements: identity.deployment_identity_requirements,
    correction_binding: Object.freeze({
      binding_id: binding.binding_id,
      correction_id: binding.correction_id,
      corrected_coupled_launch_id: binding.corrected_coupled_launch_id,
      corrected_vault_bytes32: binding.corrected_vault_bytes32,
    }),
    unresolved: identity.unresolved,
    authority: COMPILER_AUTHORITY,
    decision: Object.freeze({
      compiled_identity_accepted: true,
      v1_deployment_artifact_superseded: true,
      deployment_attested: false,
      final_role_bindings_attested: false,
      deployed_runtime_code_observed: false,
      inventory_funding_verified: false,
      inventory_lock_verified: false,
      market_activation_authorized: false,
      public_presale_activation_authorized: false,
      next_gate:
        "fresh_corrected_generation_control_and_role_qualification",
    }),
  });
}

export function verifyWcVoidMarketVaultCompiledIdentityCurrentV2(input) {
  exactKeys(input, [
    "accepted_identity", "artifacts", "authority", "correction_binding",
    "decision", "deployment_identity_requirements", "marker", "source",
    "status", "unresolved", "version",
  ], "current_identity_packet_shape_invalid");
  if (
    input.marker !==
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_PACKET_V2" ||
    input.version !== 2 ||
    input.status !==
      "COMPILED_IDENTITY_CURRENT_CORRECTED_HELD_ON_CHAIN2050_DEPLOYMENT_ATTESTATION" ||
    input.accepted_identity?.identity_id !== EXPECTED.identity_id ||
    input.accepted_identity?.identity_json_sha256 !== EXPECTED.identity_json_sha256 ||
    input.accepted_identity?.identity_json_bytes !== EXPECTED.identity_json_bytes ||
    input.source?.source_commit !== EXPECTED.source_commit ||
    input.source?.contract_source_sha256 !== EXPECTED.contract_source_sha256
  ) {
    fail("current_identity_packet_identity_invalid");
  }
  const artifacts = input.artifacts;
  const creationHex = String(artifacts?.creation_bytecode_hex || "");
  const runtimeHex = String(artifacts?.runtime_template_hex || "");
  if (
    !/^0x[0-9a-f]+$/u.test(creationHex) ||
    !/^0x[0-9a-f]+$/u.test(runtimeHex) ||
    creationHex.length % 2 !== 0 ||
    runtimeHex.length % 2 !== 0
  ) {
    fail("current_identity_bytecode_hex_invalid");
  }
  const creation = Buffer.from(creationHex.slice(2), "hex");
  const runtime = Buffer.from(runtimeHex.slice(2), "hex");
  if (
    creation.length !== EXPECTED.creation_bytecode_bytes ||
    runtime.length !== EXPECTED.runtime_template_bytes ||
    sha256Bytes(creation) !== EXPECTED.creation_bytecode_sha256 ||
    sha256Bytes(runtime) !== EXPECTED.runtime_template_sha256 ||
    keccak256(creationHex) !== EXPECTED.creation_bytecode_keccak256 ||
    keccak256(runtimeHex) !== EXPECTED.runtime_template_keccak256 ||
    artifacts.creation_bytecode_bytes !== EXPECTED.creation_bytecode_bytes ||
    artifacts.creation_bytecode_sha256 !== EXPECTED.creation_bytecode_sha256 ||
    artifacts.creation_bytecode_keccak256 !== EXPECTED.creation_bytecode_keccak256 ||
    artifacts.runtime_template_bytes !== EXPECTED.runtime_template_bytes ||
    artifacts.runtime_template_sha256 !== EXPECTED.runtime_template_sha256 ||
    artifacts.runtime_template_keccak256 !== EXPECTED.runtime_template_keccak256 ||
    artifacts.immutable_layout_sha256 !== EXPECTED.immutable_layout_sha256 ||
    sha256(canonicalJson(artifacts.immutable_layout)) !==
      EXPECTED.immutable_layout_sha256
  ) {
    fail("current_identity_artifact_invalid");
  }
  if (
    input.correction_binding?.binding_id !== EXPECTED.packet_id ||
    input.correction_binding?.correction_id !== CORRECTION_ID ||
    input.correction_binding?.corrected_coupled_launch_id !== CORRECTED_LAUNCH ||
    input.correction_binding?.corrected_vault_bytes32 !== CORRECTED_VAULT
  ) {
    fail("current_identity_correction_binding_invalid");
  }
  if (
    canonicalJson(input.deployment_identity_requirements) !==
      canonicalJson({
        constructor_signature:
          "constructor(address,address,address,address,bytes32)",
        constructor_order: [
          "void_token", "launch_controller", "settlement_executor",
          "closeout_controller", "coupled_launch_id",
        ],
        deployed_runtime_must_patch_exact_immutable_layout: true,
        live_opening_inventory_atoms_must_equal:
          "10000000000000000000000000",
      }) ||
    canonicalJson(input.authority) !== canonicalJson(COMPILER_AUTHORITY)
  ) {
    fail("current_identity_deployment_or_authority_invalid");
  }
  if (
    input.decision?.compiled_identity_accepted !== true ||
    input.decision?.v1_deployment_artifact_superseded !== true ||
    input.decision?.deployment_attested !== false ||
    input.decision?.final_role_bindings_attested !== false ||
    input.decision?.deployed_runtime_code_observed !== false ||
    input.decision?.inventory_funding_verified !== false ||
    input.decision?.inventory_lock_verified !== false ||
    input.decision?.market_activation_authorized !== false ||
    input.decision?.public_presale_activation_authorized !== false
  ) {
    fail("current_identity_packet_decision_invalid");
  }
  return Object.freeze({
    ok: true,
    status:
      "compiled_identity_current_corrected_held_on_chain2050_vault_deployment_attestation",
    marker: VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_V2,
    version: 2,
    packet_id: EXPECTED.packet_id,
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
      "fresh_corrected_generation_control_and_role_qualification",
    authority: COMPILER_AUTHORITY,
  });
}

// Compatibility export for current consumers during the atomic V2 rebind.
export const verifyWcVoidMarketVaultCompiledIdentityAcceptanceV1 =
  verifyWcVoidMarketVaultCompiledIdentityCurrentV2;

export function loadWcVoidMarketVaultCompiledIdentityCurrentV2() {
  const bindingBytes = readBytes(BINDING_REL, 64 * 1024);
  if (
    bindingBytes.length !== EXPECTED.packet_json_bytes ||
    sha256Bytes(bindingBytes) !== EXPECTED.packet_json_sha256
  ) {
    fail("current_identity_binding_bytes_invalid");
  }
  const binding = verifyBinding(JSON.parse(bindingBytes.toString("utf8")));
  const correction =
    readJson(CORRECTION_REL);
  const superseded =
    readJson(SUPERSEDED_REL);
  const corrected =
    verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: superseded,
      correctionV2: correction,
    });
  if (
    corrected?.ok !== true ||
    corrected.correction_id !== CORRECTION_ID ||
    corrected.corrected_coupled_launch_id !== CORRECTED_LAUNCH ||
    corrected.deployment_authorized !== false
  ) {
    fail("current_identity_correction_invalid");
  }

  const b64 = readBytes(ARCHIVE_REL, 64 * 1024).toString("utf8").trim();
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u
      .test(b64)
  ) {
    fail("current_identity_archive_base64_invalid");
  }
  const zip = Buffer.from(b64, "base64");
  if (
    zip.toString("base64") !== b64 ||
    zip.length !== binding.archive.zip_bytes ||
    sha256Bytes(zip) !== binding.archive.zip_sha256
  ) {
    fail("current_identity_archive_digest_invalid");
  }
  const identityBytes =
    readSingleDeflatedZipEntryV1(zip, binding.archive.identity_entry);
  if (
    identityBytes.length !== EXPECTED.identity_json_bytes ||
    sha256Bytes(identityBytes) !== EXPECTED.identity_json_sha256
  ) {
    fail("current_identity_json_digest_invalid");
  }
  const identity = JSON.parse(identityBytes.toString("utf8"));
  const identityBody = { ...identity };
  delete identityBody.identity_id;
  if (
    identity.identity_id !==
      "voidwcvci1_" + sha256(canonicalJson(identityBody)) ||
    identity.identity_id !== EXPECTED.identity_id ||
    identity.artifacts?.creation_bytecode_sha256 !==
      EXPECTED.creation_bytecode_sha256 ||
    identity.artifacts?.runtime_template_sha256 !==
      EXPECTED.runtime_template_sha256
  ) {
    fail("current_identity_archived_identity_invalid");
  }
  const packet = compatibilityPacket(identity, binding);
  verifyWcVoidMarketVaultCompiledIdentityCurrentV2(packet);
  return packet;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const current = loadWcVoidMarketVaultCompiledIdentityCurrentV2();
  const verified = verifyWcVoidMarketVaultCompiledIdentityCurrentV2(current);
  console.log(VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_V2);
  console.log("status=" + verified.status);
  console.log("binding_id=" + EXPECTED.packet_id);
  console.log("corrected_coupled_launch_id=" + CORRECTED_LAUNCH);
  console.log("corrected_creation_bytecode_sha256=" +
    EXPECTED.creation_bytecode_sha256);
  console.log("corrected_runtime_template_sha256=" +
    EXPECTED.runtime_template_sha256);
  console.log("deployment_authorized=false");
  console.log("funds_movement=false");
}

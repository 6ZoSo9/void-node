#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2 =
  "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2";

export const VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_AUTHORITY_V2 =
  Object.freeze({
    source_correction_only: true,
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const V1_REL =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json";
const V2_REL =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-correction-v2.json";

const ORIGINAL_IDENTITY_ID =
  "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a";
const ORIGINAL_IDENTITY_SHA256 =
  "fb9a92e24afa9d7611364ca30b6eff4fe2df2cc2aa8002b77307bead4b864a4b";
const ORIGINAL_IDENTITY_BYTES = 57245;
const ORIGINAL_WORKFLOW_RUN_ID = 36464403015;
const ORIGINAL_WORKFLOW_JOB_ID = 109070717228;
const ORIGINAL_WORKFLOW_ARTIFACT_ID = 10988626461;
const ORIGINAL_WORKFLOW_ARTIFACT_ZIP_SHA256 =
  "d8707b0a5abc530f888639bffb2079b2d193d147bacfc4a65c3e704858bcb2fc";
const ORIGINAL_REVIEWED_AT_UTC = "2026-09-28T18:20:05.000Z";
const CORRECT_CREATION_SHA256 =
  "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540";
const CORRECT_RUNTIME_SHA256 =
  "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e";
const CORRECTED_COUPLED_LAUNCH_ID =
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d";
const SUPERSEDED_COUPLED_LAUNCH_ID =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";

const CORRECT_CREATION_KECCAK256 =
  "0xa741a938f6570d3b8de727e7487460a0dda04244e6e45a79ab22756b16369c41";
const CORRECT_RUNTIME_KECCAK256 =
  "0xea29fc4564e552b4b16a824f9f9566edc82d886b81d908f6205091cbe6ce24af";

const V2_TOP_KEYS = Object.freeze([
  "accepted_identity", "authority", "canonical_compiler_artifacts",
  "correction", "correction_id", "coupled_launch_effect", "decision",
  "marker", "status", "superseded_v1", "version",
]);
const ACCEPTED_IDENTITY_KEYS = Object.freeze([
  "identity_id", "identity_json_bytes", "identity_json_sha256",
  "reviewed_at_utc", "workflow_artifact_id", "workflow_artifact_zip_sha256",
  "workflow_job_id", "workflow_run_id",
]);
const SUPERSEDED_V1_KEYS = Object.freeze([
  "creation_bytecode_bytes", "creation_bytecode_sha256",
  "deployment_artifact_usable", "packet_id", "packet_path",
  "runtime_template_bytes", "runtime_template_sha256",
]);
const CANONICAL_ARTIFACT_KEYS = Object.freeze([
  "abi_sha256", "creation_bytecode_bytes", "creation_bytecode_keccak256",
  "creation_bytecode_sha256", "immutable_layout_sha256", "metadata_sha256",
  "method_identifiers_sha256", "runtime_template_bytes",
  "runtime_template_keccak256", "runtime_template_sha256",
  "storage_layout_sha256",
]);
const CORRECTION_KEYS = Object.freeze([
  "canonical_bytecode_is_v1_prefix", "canonical_bytecode_source",
  "compiler_identity_recompile_required", "contract_semantics_change_required",
  "creation_v1_overcapture_bytes", "runtime_v1_overcapture_bytes",
  "solidity_source_change_required", "v1_deployment_bytes_superseded",
]);
const COUPLED_EFFECT_KEYS = Object.freeze([
  "corrected_coupled_launch_id", "corrected_vault_bytes32",
  "coupled_launch_regeneration_required", "old_control_signature_generation_reusable",
  "superseded_coupled_launch_id",
]);
const DECISION_KEYS = Object.freeze([
  "canonical_compiler_identity_preserved", "deployment_authorized",
  "inventory_funding_authorized", "market_activation_authorized", "next_gate",
  "public_presale_activation_authorized",
  "v1_acceptance_deployment_artifact_superseded",
]);

function fail(code) {
  throw new Error(code);
}

function sha256Hex(hex) {
  const text = String(hex || "");
  if (!/^0x[0-9a-f]+$/u.test(text) || text.length % 2 !== 0) {
    fail("compiled_identity_correction_hex_invalid");
  }
  return crypto
    .createHash("sha256")
    .update(Buffer.from(text.slice(2), "hex"))
    .digest("hex");
}

function parse(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label + "_invalid");
  }
  return value;
}

function exactObject(value, keys, label) {
  const object = parse(value, label);
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(label + "_keys_mismatch");
  }
  return object;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonicalJson(value[key]),
    ).join(",") + "}";
  }
  fail("compiled_identity_correction_canonical_value_invalid");
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function coupledLaunchCommitmentV1({
  identityId,
  creationSha256,
  runtimeSha256,
  immutableLayoutSha256,
}) {
  return Object.freeze({
    schema: "void.presale-wc-void-current-deployment-commitment.v1",
    version: 1,
    chain_id: 2050,
    presale: Object.freeze({
      policy_marker: "VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1",
      canonical_presale_max_void: "10000000",
      rate_void_units_numerator: "2",
      rate_void_units_denominator: "1",
    }),
    wc_void: Object.freeze({
      pair: "WC_VOID",
      protocol_void_inventory_atoms: "10000000000000000000000000",
      opening_sale_tranche_void_atoms: "5000000000000000000000000",
      post_opening_void_reserve_atoms: "5000000000000000000000000",
      protocol_wc_seed_units: "0",
      fixed_conversion: false,
      fixed_opening_price: false,
      opening_price_source: "settled_wc_over_opening_sale_tranche",
      opening_allocation_policy: "pro_rata_largest_remainder_v1",
    }),
    market_vault: Object.freeze({
      contract_name: "WCVoidMarketVaultV2",
      compiled_identity_id: identityId,
      creation_bytecode_sha256: creationSha256,
      runtime_template_sha256: runtimeSha256,
      immutable_layout_sha256: immutableLayoutSha256,
    }),
    launch_order: Object.freeze({
      presale_wc_void_simultaneous_launch: true,
      presale_launch_requires_wc_void_activation_ready: true,
      wc_void_launch_requires_presale_activation_ready: true,
    }),
  });
}

function deriveCoupledLaunchIdV1(input) {
  return "sha256:" + sha256Text(canonicalJson(coupledLaunchCommitmentV1(input)));
}

export function verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
  supersededV1,
  correctionV2,
}) {
  const v1 = parse(supersededV1, "superseded_v1");
  const v2 = exactObject(correctionV2, V2_TOP_KEYS, "correction_v2");
  exactObject(v2.accepted_identity, ACCEPTED_IDENTITY_KEYS, "accepted_identity");
  exactObject(v2.superseded_v1, SUPERSEDED_V1_KEYS, "superseded_v1_binding");
  exactObject(
    v2.canonical_compiler_artifacts,
    CANONICAL_ARTIFACT_KEYS,
    "canonical_compiler_artifacts",
  );
  exactObject(v2.correction, CORRECTION_KEYS, "correction");
  exactObject(v2.coupled_launch_effect, COUPLED_EFFECT_KEYS, "coupled_launch_effect");
  exactObject(v2.decision, DECISION_KEYS, "decision");

  if (
    v1.marker !==
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_PACKET_V1" ||
    v1.status !==
      "COMPILED_IDENTITY_ACCEPTED_HELD_ON_CHAIN2050_DEPLOYMENT_ATTESTATION"
  ) {
    fail("superseded_v1_identity_invalid");
  }
  if (
    v2.marker !==
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2" ||
    v2.version !== 2 ||
    v2.status !==
      "COMPILED_IDENTITY_V1_BYTECODE_SUPERSEDED_DEPLOYMENT_HOLD"
  ) {
    fail("compiled_identity_correction_v2_identity_invalid");
  }

  if (
    v1.accepted_identity?.identity_id !== ORIGINAL_IDENTITY_ID ||
    v2.accepted_identity?.identity_id !== ORIGINAL_IDENTITY_ID ||
    v1.accepted_identity?.identity_json_sha256 !== ORIGINAL_IDENTITY_SHA256 ||
    v2.accepted_identity?.identity_json_sha256 !== ORIGINAL_IDENTITY_SHA256
  ) {
    fail("compiler_identity_lineage_mismatch");
  }

  const expectedProvenance = Object.freeze({
    identity_json_bytes: ORIGINAL_IDENTITY_BYTES,
    workflow_run_id: ORIGINAL_WORKFLOW_RUN_ID,
    workflow_job_id: ORIGINAL_WORKFLOW_JOB_ID,
    workflow_artifact_id: ORIGINAL_WORKFLOW_ARTIFACT_ID,
    workflow_artifact_zip_sha256: ORIGINAL_WORKFLOW_ARTIFACT_ZIP_SHA256,
    reviewed_at_utc: ORIGINAL_REVIEWED_AT_UTC,
  });
  for (const [key, expected] of Object.entries(expectedProvenance)) {
    if (
      v1.accepted_identity?.[key] !== expected ||
      v2.accepted_identity?.[key] !== expected
    ) {
      fail("compiler_identity_provenance_mismatch:" + key);
    }
  }

  if (
    v1.artifacts?.creation_bytecode_bytes !==
      v2.superseded_v1?.creation_bytecode_bytes ||
    v1.artifacts?.creation_bytecode_sha256 !==
      v2.superseded_v1?.creation_bytecode_sha256 ||
    v1.artifacts?.runtime_template_bytes !==
      v2.superseded_v1?.runtime_template_bytes ||
    v1.artifacts?.runtime_template_sha256 !==
      v2.superseded_v1?.runtime_template_sha256
  ) {
    fail("superseded_v1_bytecode_binding_mismatch");
  }

  if (
    v2.superseded_v1?.packet_path !== V1_REL ||
    v2.superseded_v1?.packet_id !== v1.packet_id ||
    v2.superseded_v1?.deployment_artifact_usable !== false
  ) {
    fail("superseded_v1_packet_binding_mismatch");
  }

  const creationBytes =
    v2.canonical_compiler_artifacts?.creation_bytecode_bytes;
  const runtimeBytes =
    v2.canonical_compiler_artifacts?.runtime_template_bytes;

  if (creationBytes !== 9441 || runtimeBytes !== 8342) {
    fail("canonical_compiler_artifact_lengths_invalid");
  }

  const creationHex = String(v1.artifacts?.creation_bytecode_hex || "");
  const runtimeHex = String(v1.artifacts?.runtime_template_hex || "");
  const v1CreationBytes = v1.artifacts?.creation_bytecode_bytes;
  const v1RuntimeBytes = v1.artifacts?.runtime_template_bytes;

  if (
    !/^0x[0-9a-f]+$/u.test(creationHex) ||
    !/^0x[0-9a-f]+$/u.test(runtimeHex) ||
    creationHex.length % 2 !== 0 ||
    runtimeHex.length % 2 !== 0 ||
    (creationHex.length - 2) / 2 !== v1CreationBytes ||
    (runtimeHex.length - 2) / 2 !== v1RuntimeBytes ||
    sha256Hex(creationHex) !== v1.artifacts?.creation_bytecode_sha256 ||
    sha256Hex(runtimeHex) !== v1.artifacts?.runtime_template_sha256
  ) {
    fail("superseded_v1_artifact_bytes_invalid");
  }

  if (
    v2.canonical_compiler_artifacts?.creation_bytecode_sha256 !==
      CORRECT_CREATION_SHA256 ||
    v2.canonical_compiler_artifacts?.runtime_template_sha256 !==
      CORRECT_RUNTIME_SHA256
  ) {
    fail("canonical_compiler_artifact_hash_mismatch");
  }

  if (
    v2.canonical_compiler_artifacts?.creation_bytecode_keccak256 !==
      CORRECT_CREATION_KECCAK256 ||
    v2.canonical_compiler_artifacts?.runtime_template_keccak256 !==
      CORRECT_RUNTIME_KECCAK256
  ) {
    fail("canonical_compiler_artifact_keccak_mismatch");
  }

  for (const key of [
    "immutable_layout_sha256",
    "abi_sha256",
    "metadata_sha256",
    "storage_layout_sha256",
    "method_identifiers_sha256",
  ]) {
    if (
      v2.canonical_compiler_artifacts?.[key] !==
      v1.artifacts?.[key]
    ) {
      fail("canonical_compiler_unchanged_artifact_mismatch:" + key);
    }
  }

  if (
    v1CreationBytes - creationBytes !== 963 ||
    v1RuntimeBytes - runtimeBytes !== 953 ||
    v2.correction?.creation_v1_overcapture_bytes !== 963 ||
    v2.correction?.runtime_v1_overcapture_bytes !== 953 ||
    v2.correction?.canonical_bytecode_source !==
      "retained_compiler_identity_artifact_10988626461" ||
    v2.correction?.canonical_bytecode_is_v1_prefix !== false ||
    v2.correction?.compiler_identity_recompile_required !== false ||
    v2.correction?.solidity_source_change_required !== false ||
    v2.correction?.contract_semantics_change_required !== false ||
    v2.correction?.v1_deployment_bytes_superseded !== true
  ) {
    fail("superseded_v1_overcapture_shape_invalid");
  }

  const derivedSupersededLaunchId = deriveCoupledLaunchIdV1({
    identityId: v2.accepted_identity.identity_id,
    creationSha256: v2.superseded_v1.creation_bytecode_sha256,
    runtimeSha256: v2.superseded_v1.runtime_template_sha256,
    immutableLayoutSha256:
      v2.canonical_compiler_artifacts.immutable_layout_sha256,
  });
  const derivedCorrectedLaunchId = deriveCoupledLaunchIdV1({
    identityId: v2.accepted_identity.identity_id,
    creationSha256:
      v2.canonical_compiler_artifacts.creation_bytecode_sha256,
    runtimeSha256:
      v2.canonical_compiler_artifacts.runtime_template_sha256,
    immutableLayoutSha256:
      v2.canonical_compiler_artifacts.immutable_layout_sha256,
  });
  if (
    derivedSupersededLaunchId !== SUPERSEDED_COUPLED_LAUNCH_ID ||
    derivedCorrectedLaunchId !== CORRECTED_COUPLED_LAUNCH_ID ||
    v2.coupled_launch_effect?.superseded_coupled_launch_id !==
      derivedSupersededLaunchId ||
    v2.coupled_launch_effect?.corrected_coupled_launch_id !==
      derivedCorrectedLaunchId ||
    v2.coupled_launch_effect?.corrected_vault_bytes32 !==
      derivedCorrectedLaunchId.replace(/^sha256:/u, "0x") ||
    v2.coupled_launch_effect?.coupled_launch_regeneration_required !== true ||
    v2.coupled_launch_effect?.old_control_signature_generation_reusable !== false
  ) {
    fail("coupled_launch_correction_binding_invalid");
  }

  const authorityKeys = Object.keys(
    VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_AUTHORITY_V2,
  ).sort();
  const packetAuthorityKeys = Object.keys(v2.authority || {}).sort();
  if (
    authorityKeys.length !== packetAuthorityKeys.length ||
    authorityKeys.some(
      (key, index) => key !== packetAuthorityKeys[index],
    )
  ) {
    fail("correction_authority_shape_invalid");
  }
  for (const key of authorityKeys) {
    if (
      v2.authority?.[key] !==
      VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_AUTHORITY_V2[key]
    ) {
      fail("correction_authority_invalid:" + key);
    }
  }

  for (const key of [
    "deployment_authorized",
    "inventory_funding_authorized",
    "market_activation_authorized",
    "public_presale_activation_authorized",
  ]) {
    if (v2.decision?.[key] !== false) {
      fail("correction_hold_gate_invalid:" + key);
    }
  }
  if (
    v2.decision?.v1_acceptance_deployment_artifact_superseded !== true ||
    v2.decision?.canonical_compiler_identity_preserved !== true ||
    v2.decision?.next_gate !==
      "regenerate_coupled_launch_generation_from_corrected_compiler_identity"
  ) {
    fail("correction_decision_invalid");
  }

  const correctionBody = { ...v2 };
  delete correctionBody.correction_id;
  const expectedCorrectionId =
    "voidwcvcic2_" + sha256Text(canonicalJson(correctionBody));
  if (v2.correction_id !== expectedCorrectionId) {
    fail("correction_id_content_mismatch");
  }

  return Object.freeze({
    ok: true,
    status: "COMPILED_IDENTITY_CORRECTION_V2_PROOF_GREEN",
    identity_id: ORIGINAL_IDENTITY_ID,
    identity_json_sha256: ORIGINAL_IDENTITY_SHA256,
    corrected_creation_bytecode_bytes: creationBytes,
    corrected_creation_bytecode_sha256: CORRECT_CREATION_SHA256,
    corrected_creation_bytecode_keccak256: CORRECT_CREATION_KECCAK256,
    corrected_runtime_template_bytes: runtimeBytes,
    corrected_runtime_template_sha256: CORRECT_RUNTIME_SHA256,
    corrected_runtime_template_keccak256: CORRECT_RUNTIME_KECCAK256,
    correction_id: expectedCorrectionId,
    superseded_coupled_launch_id: derivedSupersededLaunchId,
    corrected_coupled_launch_id: derivedCorrectedLaunchId,
    deployment_authorized: false,
    funds_movement: false,
  });
}

function main() {
  const v1 = JSON.parse(fs.readFileSync(path.join(ROOT, V1_REL), "utf8"));
  const v2 = JSON.parse(fs.readFileSync(path.join(ROOT, V2_REL), "utf8"));
  const result =
    verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: v2,
    });
  console.log(VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2);
  for (const [key, value] of Object.entries(result)) {
    console.log(key + "=" + String(value));
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}

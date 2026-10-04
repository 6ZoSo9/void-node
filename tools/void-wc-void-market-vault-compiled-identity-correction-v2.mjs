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
const CORRECT_CREATION_SHA256 =
  "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540";
const CORRECT_RUNTIME_SHA256 =
  "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e";
const CORRECTED_COUPLED_LAUNCH_ID =
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d";
const SUPERSEDED_COUPLED_LAUNCH_ID =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";

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

export function verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
  supersededV1,
  correctionV2,
}) {
  const v1 = parse(supersededV1, "superseded_v1");
  const v2 = parse(correctionV2, "correction_v2");

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

  const creationBytes =
    v2.canonical_compiler_artifacts?.creation_bytecode_bytes;
  const runtimeBytes =
    v2.canonical_compiler_artifacts?.runtime_template_bytes;

  if (creationBytes !== 9441 || runtimeBytes !== 8342) {
    fail("canonical_compiler_artifact_lengths_invalid");
  }

  const creationHex = String(v1.artifacts?.creation_bytecode_hex || "");
  const runtimeHex = String(v1.artifacts?.runtime_template_hex || "");

  const creationPrefix =
    "0x" + creationHex.slice(2, 2 + creationBytes * 2);
  const runtimePrefix =
    "0x" + runtimeHex.slice(2, 2 + runtimeBytes * 2);

  if (
    sha256Hex(creationPrefix) !== CORRECT_CREATION_SHA256 ||
    sha256Hex(runtimePrefix) !== CORRECT_RUNTIME_SHA256 ||
    v2.canonical_compiler_artifacts?.creation_bytecode_sha256 !==
      CORRECT_CREATION_SHA256 ||
    v2.canonical_compiler_artifacts?.runtime_template_sha256 !==
      CORRECT_RUNTIME_SHA256
  ) {
    fail("canonical_compiler_artifact_hash_mismatch");
  }

  if (
    (creationHex.length - 2) / 2 - creationBytes !== 963 ||
    (runtimeHex.length - 2) / 2 - runtimeBytes !== 953 ||
    v2.correction?.creation_v1_extra_bytes !== 963 ||
    v2.correction?.runtime_v1_extra_bytes !== 953
  ) {
    fail("superseded_v1_overcapture_shape_invalid");
  }

  if (
    v2.coupled_launch_effect?.superseded_coupled_launch_id !==
      SUPERSEDED_COUPLED_LAUNCH_ID ||
    v2.coupled_launch_effect?.corrected_coupled_launch_id !==
      CORRECTED_COUPLED_LAUNCH_ID ||
    v2.coupled_launch_effect?.corrected_vault_bytes32 !==
      CORRECTED_COUPLED_LAUNCH_ID.replace(/^sha256:/u, "0x") ||
    v2.coupled_launch_effect?.coupled_launch_regeneration_required !== true ||
    v2.coupled_launch_effect?.old_control_signature_generation_reusable !== false
  ) {
    fail("coupled_launch_correction_binding_invalid");
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

  return Object.freeze({
    ok: true,
    status: "COMPILED_IDENTITY_CORRECTION_V2_PROOF_GREEN",
    identity_id: ORIGINAL_IDENTITY_ID,
    identity_json_sha256: ORIGINAL_IDENTITY_SHA256,
    corrected_creation_bytecode_bytes: creationBytes,
    corrected_creation_bytecode_sha256: CORRECT_CREATION_SHA256,
    corrected_runtime_template_bytes: runtimeBytes,
    corrected_runtime_template_sha256: CORRECT_RUNTIME_SHA256,
    superseded_coupled_launch_id: SUPERSEDED_COUPLED_LAUNCH_ID,
    corrected_coupled_launch_id: CORRECTED_COUPLED_LAUNCH_ID,
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

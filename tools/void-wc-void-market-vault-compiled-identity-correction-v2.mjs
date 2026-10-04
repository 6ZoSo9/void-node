#!/usr/bin/env node
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
const WORKFLOW_RUN_ID = 36464403015;
const WORKFLOW_JOB_ID = 109070717228;
const WORKFLOW_ARTIFACT_ID = 10988626461;
const WORKFLOW_ARTIFACT_ZIP_SHA256 =
  "d8707b0a5abc530f888639bffb2079b2d193d147bacfc4a65c3e704858bcb2fc";

const BAD_CREATION_BYTES = 10404;
const BAD_CREATION_SHA256 =
  "9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af";
const BAD_RUNTIME_BYTES = 9295;
const BAD_RUNTIME_SHA256 =
  "421f6e2ecbea1ccf02e20a52119323014a0f65906ff08d060d602ebebb327409";

const CORRECT_CREATION_BYTES = 9441;
const CORRECT_CREATION_SHA256 =
  "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540";
const CORRECT_CREATION_KECCAK256 =
  "0xa741a938f6570d3b8de727e7487460a0dda04244e6e45a79ab22756b16369c41";
const CORRECT_RUNTIME_BYTES = 8342;
const CORRECT_RUNTIME_SHA256 =
  "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e";
const CORRECT_RUNTIME_KECCAK256 =
  "0xea29fc4564e552b4b16a824f9f9566edc82d886b81d908f6205091cbe6ce24af";

const IMMUTABLE_LAYOUT_SHA256 =
  "61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b";
const ABI_SHA256 =
  "27e6d3a1b9e071b891bdd16abf0f2ee4a06ba988803e8dac60e2542b00f0ff5b";
const METADATA_SHA256 =
  "c51f421ac8f35bb8aa7d8b525c8291a12e9765a6300058ea859624bcac3f7141";
const STORAGE_LAYOUT_SHA256 =
  "f92175f62ad1bc13d0e3aa074dd95e28005553f2616530783a67b934cbc0a5d2";
const METHOD_IDENTIFIERS_SHA256 =
  "e8ad68bd3137823246432c9b6126da8f2c9f3fdabe097b95227bf9f47c5a0702";

const SUPERSEDED_COUPLED_LAUNCH_ID =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const CORRECTED_COUPLED_LAUNCH_ID =
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d";

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactIdentityBinding(value, label) {
  if (
    !plain(value) ||
    value.identity_id !== ORIGINAL_IDENTITY_ID ||
    value.identity_json_sha256 !== ORIGINAL_IDENTITY_SHA256 ||
    value.identity_json_bytes !== ORIGINAL_IDENTITY_BYTES ||
    value.workflow_run_id !== WORKFLOW_RUN_ID ||
    value.workflow_job_id !== WORKFLOW_JOB_ID ||
    value.workflow_artifact_id !== WORKFLOW_ARTIFACT_ID ||
    value.workflow_artifact_zip_sha256 !== WORKFLOW_ARTIFACT_ZIP_SHA256
  ) {
    fail(label + "_invalid");
  }
}

export function verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
  supersededV1,
  correctionV2,
}) {
  const v1 = plain(supersededV1) ? supersededV1 : fail("superseded_v1_invalid");
  const v2 = plain(correctionV2) ? correctionV2 : fail("correction_v2_invalid");

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

  exactIdentityBinding(v1.accepted_identity, "superseded_v1_identity_binding");
  exactIdentityBinding(v2.accepted_identity, "correction_v2_identity_binding");

  const evidence = v2.canonical_identity_evidence;
  if (
    !plain(evidence) ||
    evidence.source !== "pinned_github_actions_compiler_identity_artifact" ||
    evidence.workflow_run_id !== WORKFLOW_RUN_ID ||
    evidence.workflow_job_id !== WORKFLOW_JOB_ID ||
    evidence.workflow_artifact_id !== WORKFLOW_ARTIFACT_ID ||
    evidence.workflow_artifact_zip_sha256 !== WORKFLOW_ARTIFACT_ZIP_SHA256 ||
    evidence.identity_json_sha256 !== ORIGINAL_IDENTITY_SHA256 ||
    evidence.identity_json_bytes !== ORIGINAL_IDENTITY_BYTES ||
    evidence.corrected_bytes_derived_from_superseded_packet !== false
  ) {
    fail("canonical_identity_evidence_invalid");
  }

  if (
    v1.artifacts?.creation_bytecode_bytes !== BAD_CREATION_BYTES ||
    v1.artifacts?.creation_bytecode_sha256 !== BAD_CREATION_SHA256 ||
    v1.artifacts?.runtime_template_bytes !== BAD_RUNTIME_BYTES ||
    v1.artifacts?.runtime_template_sha256 !== BAD_RUNTIME_SHA256 ||
    v2.superseded_v1?.creation_bytecode_bytes !== BAD_CREATION_BYTES ||
    v2.superseded_v1?.creation_bytecode_sha256 !== BAD_CREATION_SHA256 ||
    v2.superseded_v1?.runtime_template_bytes !== BAD_RUNTIME_BYTES ||
    v2.superseded_v1?.runtime_template_sha256 !== BAD_RUNTIME_SHA256 ||
    v2.superseded_v1?.deployment_artifact_usable !== false
  ) {
    fail("superseded_v1_bytecode_binding_mismatch");
  }

  const canonical = v2.canonical_compiler_artifacts;
  if (
    !plain(canonical) ||
    canonical.creation_bytecode_bytes !== CORRECT_CREATION_BYTES ||
    canonical.creation_bytecode_sha256 !== CORRECT_CREATION_SHA256 ||
    canonical.creation_bytecode_keccak256 !== CORRECT_CREATION_KECCAK256 ||
    canonical.runtime_template_bytes !== CORRECT_RUNTIME_BYTES ||
    canonical.runtime_template_sha256 !== CORRECT_RUNTIME_SHA256 ||
    canonical.runtime_template_keccak256 !== CORRECT_RUNTIME_KECCAK256 ||
    canonical.immutable_layout_sha256 !== IMMUTABLE_LAYOUT_SHA256 ||
    canonical.abi_sha256 !== ABI_SHA256 ||
    canonical.metadata_sha256 !== METADATA_SHA256 ||
    canonical.storage_layout_sha256 !== STORAGE_LAYOUT_SHA256 ||
    canonical.method_identifiers_sha256 !== METHOD_IDENTIFIERS_SHA256
  ) {
    fail("canonical_compiler_artifact_binding_mismatch");
  }

  if (
    BAD_CREATION_BYTES - CORRECT_CREATION_BYTES !== 963 ||
    BAD_RUNTIME_BYTES - CORRECT_RUNTIME_BYTES !== 953 ||
    v2.correction?.canonical_creation_bytecode_bytes !==
      CORRECT_CREATION_BYTES ||
    v2.correction?.v1_creation_excess_bytes_vs_canonical !== 963 ||
    v2.correction?.canonical_runtime_template_bytes !==
      CORRECT_RUNTIME_BYTES ||
    v2.correction?.v1_runtime_excess_bytes_vs_canonical !== 953 ||
    v2.correction?.compiler_identity_recompile_required !== false ||
    v2.correction?.solidity_source_change_required !== false ||
    v2.correction?.contract_semantics_change_required !== false ||
    v2.correction?.v1_deployment_bytes_superseded !== true
  ) {
    fail("compiled_identity_correction_shape_invalid");
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
    workflow_artifact_id: WORKFLOW_ARTIFACT_ID,
    workflow_artifact_zip_sha256: WORKFLOW_ARTIFACT_ZIP_SHA256,
    corrected_creation_bytecode_bytes: CORRECT_CREATION_BYTES,
    corrected_creation_bytecode_sha256: CORRECT_CREATION_SHA256,
    corrected_runtime_template_bytes: CORRECT_RUNTIME_BYTES,
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

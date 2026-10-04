#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2,
} from "./void-wc-void-market-vault-compiled-identity-correction-v2.mjs";

export const VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_CENSUS_V2 =
  "VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_CENSUS_V2";

export const VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_CENSUS_AUTHORITY_V2 =
  Object.freeze({
    source_census_only: true,
    canonical_generation_derivation: true,
    repository_source_read: true,
    filesystem_write: false,
    canonical_candidate_update: false,
    runtime_binding_update: false,
    controller_challenge_update: false,
    signing_request_update: false,
    policy_bundle_update: false,
    deployment_qualification_update: false,
    activation_receipt_update: false,
    role_authorization: false,
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
const CORRECTION_REL =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-correction-v2.json";
const ACCEPTANCE_REL =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json";
const CANDIDATE_REL =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const PRESALE_REL =
  "src/economic/buy_void_source_finality_authority_v2.ts";

export const VOID_WC_VOID_SUPERSEDED_COUPLED_LAUNCH_DIGEST_V1 =
  "fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
export const VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_DIGEST_V2 =
  "b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d";
export const VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_ID_V2 =
  "sha256:" + VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_DIGEST_V2;
export const VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_BYTES32_V2 =
  "0x" + VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_DIGEST_V2;

export const VOID_WC_VOID_COUPLED_LAUNCH_AUTHORITATIVE_REBIND_PATHS_V2 =
  Object.freeze([
    CANDIDATE_REL,
    "tools/void-coupled-economic-successor-gate-v1.mjs",
    "src/economic/buy_void_coupled_launch_gate_v1.mjs",
    "tools/void-wc-void-market-vault-at-use-revalidation-v1.mjs",
    "tools/void-wc-void-coupled-launch-policy-bundle-v1.mjs",
    "tools/void-wc-void-bounded-canary-semantic-promotion-v1.mjs",
    "tools/void-wc-void-coupled-launch-policy-reviewed-core-v1.mjs",
    "tools/void-wc-void-bounded-canary-candidate-promotion-v1.mjs",
    "tools/void-participant-postpurchase-at-use-revalidation-v1.mjs",
    "tools/void-wc-void-bounded-canary-canonical-application-v1.mjs",
    "tools/void-wc-void-launch-controller-control-requalification-v1.mjs",
    "ops/nimo/void-nimo-wc-void-launch-controller-control-signing-v1.mjs",
    "tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs",
    "tools/void-wc-void-market-vault-live-deployment-observation-preflight-v1.mjs",
  ]);

export const VOID_WC_VOID_COUPLED_LAUNCH_HISTORICAL_GENERATION_PATHS_V2 =
  Object.freeze([
    "tools/void-wc-void-coupled-launch-identity-reconciliation-v1.mjs",
    "docs/operators/wc-void-coupled-launch-identity-reconciliation-v1.md",
  ]);

export const VOID_WC_VOID_COUPLED_LAUNCH_NON_AUTHORITY_SOURCE_PATHS_V2 =
  Object.freeze([
    CORRECTION_REL,
    "tools/void-wc-void-market-vault-compiled-identity-correction-v2.mjs",
    "tools/void-wc-void-coupled-launch-regeneration-census-v2.mjs",
    "tools/void-wc-void-coupled-launch-identity-reconciliation-v1.mjs",
  ]);

export const VOID_WC_VOID_SUPERSEDED_CREATION_BYTECODE_SHA256_V1 =
  "9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af";
export const VOID_WC_VOID_SUPERSEDED_RUNTIME_TEMPLATE_SHA256_V1 =
  "421f6e2ecbea1ccf02e20a52119323014a0f65906ff08d060d602ebebb327409";
const V1_ACCEPTANCE_MODULE_BASENAME =
  "void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs";

export const VOID_WC_VOID_COMPILED_IDENTITY_AUTHORITATIVE_CONSUMER_PATHS_V2 =
  Object.freeze([
    "ops/mainnet0/wc-void-production-candidate-v1.json",
    "tools/void-wc-void-production-readiness-v1.mjs",
    "tools/void-wc-void-market-vault-runtime-attestation-v1.mjs",
    "tools/void-wc-void-market-vault-runtime-attestation-import-v1.mjs",
    "tools/void-wc-void-market-vault-canonical-application-v1.mjs",
    "tools/void-wc-void-bounded-canary-evidence-v1.mjs",
    "tools/void-wc-void-bounded-canary-candidate-promotion-v1.mjs",
    "tools/void-wc-void-market-vault-at-use-revalidation-v1.mjs",
    "tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs",
  ]);

export const VOID_WC_VOID_COMPILED_IDENTITY_HISTORICAL_PATHS_V2 =
  Object.freeze([
    ACCEPTANCE_REL,
    "tools/void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs",
    "tools/void-wc-void-coupled-launch-identity-reconciliation-v1.mjs",
  ]);

export const VOID_WC_VOID_COMPILED_IDENTITY_NON_AUTHORITY_PATHS_V2 =
  Object.freeze([
    CORRECTION_REL,
    "tools/void-wc-void-market-vault-compiled-identity-correction-v2.mjs",
    "tools/void-wc-void-coupled-launch-regeneration-census-v2.mjs",
  ]);

const SOURCE_SCAN_ROOTS_V2 = Object.freeze([
  Object.freeze({ path: "src/economic", recursive: true }),
  Object.freeze({ path: "tools", recursive: true }),
  Object.freeze({ path: "ops/nimo", recursive: true }),
  Object.freeze({ path: "ops/mainnet0", recursive: false }),
]);
const SOURCE_SCAN_EXTENSIONS_V2 =
  new Set([".cjs", ".js", ".json", ".mjs", ".sh", ".ts"]);
const MAX_SOURCE_SCAN_FILES_V2 = 10_000;

const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (plain(value)) {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("coupled_launch_regeneration_canonical_json_invalid");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function readText(relativePath) {
  if (
    typeof relativePath !== "string" ||
    !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/u.test(relativePath)
  ) {
    fail("coupled_launch_regeneration_path_invalid");
  }
  const resolved = path.join(ROOT, relativePath);
  const stat = fs.lstatSync(resolved);
  if (
    stat.isSymbolicLink() ||
    !stat.isFile() ||
    stat.size < 1 ||
    stat.size > MAX_SOURCE_BYTES
  ) {
    fail("coupled_launch_regeneration_source_invalid:" + relativePath);
  }
  const bytes = fs.readFileSync(resolved);
  if (bytes.length !== stat.size) {
    fail("coupled_launch_regeneration_source_changed:" + relativePath);
  }
  return bytes.toString("utf8");
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch {
    fail("coupled_launch_regeneration_json_invalid:" + relativePath);
  }
}

function countDigest(text, digest) {
  return text.split(digest).length - 1;
}

export function discoverVoidWcVoidSupersededGenerationSourcePathsV2() {
  const found = [];
  let visited = 0;
  const inspectFile = (relativePath) => {
    if (!SOURCE_SCAN_EXTENSIONS_V2.has(path.extname(relativePath))) return;
    visited += 1;
    if (visited > MAX_SOURCE_SCAN_FILES_V2) {
      fail("coupled_launch_regeneration_source_scan_file_limit");
    }
    const text = readText(relativePath);
    if (
      countDigest(
        text,
        VOID_WC_VOID_SUPERSEDED_COUPLED_LAUNCH_DIGEST_V1,
      ) > 0
    ) {
      found.push(relativePath);
    }
  };
  const walk = (relativeRoot, recursive) => {
    const absoluteRoot = path.join(ROOT, relativeRoot);
    for (const entry of fs.readdirSync(absoluteRoot, {
      withFileTypes: true,
    })) {
      const relativePath = relativeRoot + "/" + entry.name;
      if (entry.isSymbolicLink()) {
        fail("coupled_launch_regeneration_source_scan_symlink:" + relativePath);
      }
      if (entry.isDirectory()) {
        if (recursive) walk(relativePath, true);
        continue;
      }
      if (!entry.isFile()) {
        fail("coupled_launch_regeneration_source_scan_type:" + relativePath);
      }
      inspectFile(relativePath);
    }
  };
  for (const root of SOURCE_SCAN_ROOTS_V2) {
    walk(root.path, root.recursive);
  }
  return Object.freeze([...new Set(found)].sort());
}

function compiledIdentityDependencyCountsV2(text) {
  return Object.freeze({
    superseded_creation_sha256_occurrences: countDigest(
      text,
      VOID_WC_VOID_SUPERSEDED_CREATION_BYTECODE_SHA256_V1,
    ),
    superseded_runtime_sha256_occurrences: countDigest(
      text,
      VOID_WC_VOID_SUPERSEDED_RUNTIME_TEMPLATE_SHA256_V1,
    ),
    v1_acceptance_module_occurrences: countDigest(
      text,
      V1_ACCEPTANCE_MODULE_BASENAME,
    ),
    correction_v2_occurrences: countDigest(
      text,
      "void-wc-void-market-vault-compiled-identity-correction-v2",
    ),
  });
}

export function discoverVoidWcVoidSupersededCompiledIdentitySourcePathsV2() {
  const found = [];
  let visited = 0;
  const inspectFile = (relativePath) => {
    if (!SOURCE_SCAN_EXTENSIONS_V2.has(path.extname(relativePath))) return;
    visited += 1;
    if (visited > MAX_SOURCE_SCAN_FILES_V2) {
      fail("coupled_launch_regeneration_identity_scan_file_limit");
    }
    const text = readText(relativePath);
    const counts = compiledIdentityDependencyCountsV2(text);
    if (
      counts.superseded_creation_sha256_occurrences > 0 ||
      counts.superseded_runtime_sha256_occurrences > 0 ||
      counts.v1_acceptance_module_occurrences > 0
    ) {
      found.push(relativePath);
    }
  };
  const walk = (relativeRoot, recursive) => {
    const absoluteRoot = path.join(ROOT, relativeRoot);
    for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
      const relativePath = relativeRoot + "/" + entry.name;
      if (entry.isSymbolicLink()) {
        fail("coupled_launch_regeneration_identity_scan_symlink:" + relativePath);
      }
      if (entry.isDirectory()) {
        if (recursive) walk(relativePath, true);
        continue;
      }
      if (!entry.isFile()) {
        fail("coupled_launch_regeneration_identity_scan_type:" + relativePath);
      }
      inspectFile(relativePath);
    }
  };
  for (const root of SOURCE_SCAN_ROOTS_V2) walk(root.path, root.recursive);
  return Object.freeze([...new Set(found)].sort());
}


function validateCorrectionV2(correction) {
  let verified;
  try {
    verified =
      verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
        supersededV1: readJson(ACCEPTANCE_REL),
        correctionV2: correction,
      });
  } catch {
    fail("coupled_launch_regeneration_correction_v2_invalid");
  }
  if (
    verified?.ok !== true ||
    verified.corrected_creation_bytecode_sha256 !==
      "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540" ||
    verified.corrected_runtime_template_sha256 !==
      "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e" ||
    verified.corrected_coupled_launch_id !==
      VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_ID_V2 ||
    correction?.coupled_launch_effect?.corrected_vault_bytes32 !==
      VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_BYTES32_V2 ||
    correction?.coupled_launch_effect?.old_control_signature_generation_reusable !==
      false ||
    correction?.coupled_launch_effect?.coupled_launch_regeneration_required !==
      true
  ) {
    fail("coupled_launch_regeneration_correction_v2_invalid");
  }
}
function validateOpening(candidate) {
  const opening = candidate?.wc_void_opening;
  if (
    candidate?.marker !== "VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1" ||
    candidate?.version !== 1 ||
    candidate?.chain_id !== 2050 ||
    candidate?.execution_epoch !== 2 ||
    candidate?.presale_wc_void_coupled_launch_required !== true ||
    opening?.protocol_void_inventory_atoms !==
      "10000000000000000000000000" ||
    opening?.opening_sale_tranche_void_atoms !==
      "5000000000000000000000000" ||
    opening?.post_opening_void_reserve_atoms !==
      "5000000000000000000000000" ||
    opening?.protocol_wc_seed_units !== "0" ||
    opening?.fixed_conversion !== false ||
    opening?.fixed_opening_price !== false ||
    opening?.opening_price_source !==
      "settled_wc_over_opening_sale_tranche" ||
    opening?.opening_allocation_policy !==
      "pro_rata_largest_remainder_v1"
  ) {
    fail("coupled_launch_regeneration_opening_policy_invalid");
  }
  return opening;
}

function validatePresaleSource(source) {
  for (const required of [
    'marker: "VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1"',
    'canonical_presale_max_void: "10000000"',
    'rate_void_units_numerator: "2"',
    'rate_void_units_denominator: "1"',
  ]) {
    if (!source.includes(required)) {
      fail("coupled_launch_regeneration_presale_policy_invalid");
    }
  }
}

export function deriveCorrectedVoidWcVoidCoupledLaunchGenerationV2({
  correction,
  candidate,
  presale_source,
}) {
  validateCorrectionV2(correction);
  const opening = validateOpening(candidate);
  validatePresaleSource(presale_source);

  const commitment = Object.freeze({
    schema: "void.presale-wc-void-current-deployment-commitment.v1",
    version: 1,
    chain_id: 2050,
    presale: Object.freeze({
      policy_marker:
        "VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1",
      canonical_presale_max_void: "10000000",
      rate_void_units_numerator: "2",
      rate_void_units_denominator: "1",
    }),
    wc_void: Object.freeze({
      pair: "WC_VOID",
      protocol_void_inventory_atoms: opening.protocol_void_inventory_atoms,
      opening_sale_tranche_void_atoms:
        opening.opening_sale_tranche_void_atoms,
      post_opening_void_reserve_atoms:
        opening.post_opening_void_reserve_atoms,
      protocol_wc_seed_units: opening.protocol_wc_seed_units,
      fixed_conversion: opening.fixed_conversion,
      fixed_opening_price: opening.fixed_opening_price,
      opening_price_source: opening.opening_price_source,
      opening_allocation_policy: opening.opening_allocation_policy,
    }),
    market_vault: Object.freeze({
      contract_name: "WCVoidMarketVaultV2",
      compiled_identity_id: correction.accepted_identity.identity_id,
      creation_bytecode_sha256:
        correction.canonical_compiler_artifacts.creation_bytecode_sha256,
      runtime_template_sha256:
        correction.canonical_compiler_artifacts.runtime_template_sha256,
      immutable_layout_sha256:
        correction.canonical_compiler_artifacts.immutable_layout_sha256,
    }),
    launch_order: Object.freeze({
      presale_wc_void_simultaneous_launch: true,
      presale_launch_requires_wc_void_activation_ready: true,
      wc_void_launch_requires_presale_activation_ready: true,
    }),
  });

  const digest = sha256Text(canonicalJson(commitment));
  const openingId = "sha256:" + digest;
  const vaultId = "0x" + digest;
  if (
    openingId !== VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_ID_V2 ||
    vaultId !== VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_BYTES32_V2
  ) {
    fail("coupled_launch_regeneration_corrected_digest_mismatch");
  }
  return Object.freeze({
    commitment,
    digest_hex: digest,
    opening_domain_id: openingId,
    vault_bytes32_id: vaultId,
  });
}

export function buildVoidWcVoidCoupledLaunchRegenerationCensusV2({
  correction = readJson(CORRECTION_REL),
  candidate = readJson(CANDIDATE_REL),
  presale_source = readText(PRESALE_REL),
} = {}) {
  const generation =
    deriveCorrectedVoidWcVoidCoupledLaunchGenerationV2({
      correction,
      candidate,
      presale_source,
    });

  const bindings = VOID_WC_VOID_COUPLED_LAUNCH_AUTHORITATIVE_REBIND_PATHS_V2
    .map((relativePath) => {
      const text = readText(relativePath);
      return Object.freeze({
        path: relativePath,
        superseded_digest_occurrences: countDigest(
          text,
          VOID_WC_VOID_SUPERSEDED_COUPLED_LAUNCH_DIGEST_V1,
        ),
        corrected_digest_occurrences: countDigest(
          text,
          VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_DIGEST_V2,
        ),
      });
    });

  const remaining = bindings.filter(
    (entry) => entry.superseded_digest_occurrences > 0,
  );

  const compiledIdentityBindings =
    VOID_WC_VOID_COMPILED_IDENTITY_AUTHORITATIVE_CONSUMER_PATHS_V2
      .map((relativePath) => {
        const text = readText(relativePath);
        return Object.freeze({
          path: relativePath,
          ...compiledIdentityDependencyCountsV2(text),
        });
      });
  const remainingCompiledIdentityConsumers =
    compiledIdentityBindings.filter((entry) =>
      entry.superseded_creation_sha256_occurrences > 0 ||
      entry.superseded_runtime_sha256_occurrences > 0 ||
      entry.v1_acceptance_module_occurrences > 0
    );
  const discoveredCompiledIdentityPaths =
    discoverVoidWcVoidSupersededCompiledIdentitySourcePathsV2();
  const expectedCompiledIdentityPaths = [
    ...VOID_WC_VOID_COMPILED_IDENTITY_AUTHORITATIVE_CONSUMER_PATHS_V2,
    ...VOID_WC_VOID_COMPILED_IDENTITY_HISTORICAL_PATHS_V2,
    ...VOID_WC_VOID_COMPILED_IDENTITY_NON_AUTHORITY_PATHS_V2,
  ].sort();
  const unknownCompiledIdentityPaths =
    discoveredCompiledIdentityPaths.filter(
      (relativePath) => !expectedCompiledIdentityPaths.includes(relativePath),
    );
  const missingCompiledIdentityAuthoritativePaths =
    VOID_WC_VOID_COMPILED_IDENTITY_AUTHORITATIVE_CONSUMER_PATHS_V2
      .filter(
        (relativePath) => !discoveredCompiledIdentityPaths.includes(relativePath),
      );
  if (unknownCompiledIdentityPaths.length > 0) {
    fail("coupled_launch_regeneration_unknown_superseded_identity_source_path");
  }
  if (
    missingCompiledIdentityAuthoritativePaths.length > 0 ||
    remainingCompiledIdentityConsumers.length !==
      compiledIdentityBindings.length
  ) {
    fail("coupled_launch_regeneration_partial_compiled_identity_rebind_detected");
  }
  const discoveredSourcePaths =
    discoverVoidWcVoidSupersededGenerationSourcePathsV2();
  const expectedSourcePaths = [
    ...VOID_WC_VOID_COUPLED_LAUNCH_AUTHORITATIVE_REBIND_PATHS_V2,
    ...VOID_WC_VOID_COUPLED_LAUNCH_NON_AUTHORITY_SOURCE_PATHS_V2,
  ].sort();
  const unknownSourcePaths = discoveredSourcePaths.filter(
    (relativePath) => !expectedSourcePaths.includes(relativePath),
  );
  const missingAuthoritativePaths =
    VOID_WC_VOID_COUPLED_LAUNCH_AUTHORITATIVE_REBIND_PATHS_V2
      .filter((relativePath) => !discoveredSourcePaths.includes(relativePath));
  if (unknownSourcePaths.length > 0) {
    fail("coupled_launch_regeneration_unknown_superseded_source_path");
  }
  if (
    missingAuthoritativePaths.length > 0 ||
    remaining.length !== bindings.length
  ) {
    fail("coupled_launch_regeneration_partial_authoritative_rebind_detected");
  }
  const body = {
    marker: VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_CENSUS_V2,
    version: 2,
    status: "CORRECTED_GENERATION_DERIVED_REBIND_REQUIRED",
    superseded_coupled_launch_id:
      "sha256:" + VOID_WC_VOID_SUPERSEDED_COUPLED_LAUNCH_DIGEST_V1,
    corrected_coupled_launch_id: generation.opening_domain_id,
    corrected_vault_bytes32: generation.vault_bytes32_id,
    corrected_generation_derived: true,
    old_control_signature_generation_reusable: false,
    canonical_candidate_current_launch_id:
      candidate?.shared_post_discovery_reconciliation?.coupled_launch_id || null,
    authoritative_bindings: bindings,
    authoritative_path_count: bindings.length,
    remaining_superseded_authoritative_path_count: remaining.length,
    discovered_superseded_source_paths: discoveredSourcePaths,
    discovered_superseded_source_path_count: discoveredSourcePaths.length,
    expected_non_authority_superseded_source_paths:
      VOID_WC_VOID_COUPLED_LAUNCH_NON_AUTHORITY_SOURCE_PATHS_V2,
    unknown_superseded_source_paths: Object.freeze([]),
    all_authoritative_old_generation_pins_present: true,
    compiled_identity_authoritative_consumers: compiledIdentityBindings,
    compiled_identity_authoritative_consumer_count:
      compiledIdentityBindings.length,
    remaining_superseded_compiled_identity_consumer_count:
      remainingCompiledIdentityConsumers.length,
    discovered_superseded_compiled_identity_source_paths:
      discoveredCompiledIdentityPaths,
    discovered_superseded_compiled_identity_source_path_count:
      discoveredCompiledIdentityPaths.length,
    expected_historical_compiled_identity_paths:
      VOID_WC_VOID_COMPILED_IDENTITY_HISTORICAL_PATHS_V2,
    expected_non_authority_compiled_identity_paths:
      VOID_WC_VOID_COMPILED_IDENTITY_NON_AUTHORITY_PATHS_V2,
    unknown_superseded_compiled_identity_source_paths: Object.freeze([]),
    all_current_authority_compiled_identity_rebindings_complete: false,
    all_authoritative_rebindings_complete: false,
    canonical_candidate_update_authorized: false,
    controller_resigning_authorized: false,
    live_activation_receipt_reuse_authorized: false,
    deployment_authorized: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    next_gate:
      "apply_corrected_coupled_launch_generation_as_one_reviewed_rebind_set",
    authority:
      VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_CENSUS_AUTHORITY_V2,
  };
  return Object.freeze({
    ...body,
    census_id:
      "voidwclregen2_" + sha256Text(canonicalJson(body)),
  });
}

function main() {
  const result = buildVoidWcVoidCoupledLaunchRegenerationCensusV2();
  console.log(JSON.stringify(result, null, 2));
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}

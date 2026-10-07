#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_WC_VOID_COUPLED_LAUNCH_AUTHORITATIVE_REBIND_PATHS_V2,
  VOID_WC_VOID_COMPILED_IDENTITY_AUTHORITATIVE_CONSUMER_PATHS_V2,
  VOID_WC_VOID_COMPILED_IDENTITY_HISTORICAL_PATHS_V2,
  VOID_WC_VOID_COMPILED_IDENTITY_NON_AUTHORITY_PATHS_V2,
  VOID_WC_VOID_COUPLED_LAUNCH_HISTORICAL_GENERATION_PATHS_V2,
  VOID_WC_VOID_COUPLED_LAUNCH_NON_AUTHORITY_SOURCE_PATHS_V2,
  VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_CENSUS_AUTHORITY_V2,
  VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_CENSUS_V2,
  VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_BYTES32_V2,
  VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_ID_V2,
  VOID_WC_VOID_CORRECTED_CREATION_BYTECODE_SHA256_V2,
  VOID_WC_VOID_CORRECTED_RUNTIME_TEMPLATE_SHA256_V2,
  VOID_WC_VOID_CURRENT_COMPILED_IDENTITY_BINDING_ID_V2,
  VOID_WC_VOID_SUPERSEDED_COUPLED_LAUNCH_DIGEST_V1,
  buildVoidWcVoidCoupledLaunchRegenerationCensusV2,
  deriveCorrectedVoidWcVoidCoupledLaunchGenerationV2,
  discoverVoidWcVoidSupersededGenerationSourcePathsV2,
  discoverVoidWcVoidSupersededCompiledIdentitySourcePathsV2,
} from "../tools/void-wc-void-coupled-launch-regeneration-census-v2.mjs";

const correction = JSON.parse(fs.readFileSync(
  "ops/mainnet0/wc-void-market-vault-compiled-identity-correction-v2.json",
  "utf8",
));
const candidate = JSON.parse(fs.readFileSync(
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
  "utf8",
));
const presaleSource = fs.readFileSync(
  "src/economic/buy_void_source_finality_authority_v2.ts",
  "utf8",
);

const derived = deriveCorrectedVoidWcVoidCoupledLaunchGenerationV2({
  correction,
  candidate,
  presale_source: presaleSource,
});
assert.equal(
  derived.opening_domain_id,
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
);
assert.equal(
  derived.vault_bytes32_id,
  "0xb893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
);
assert.equal(
  derived.opening_domain_id,
  VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_ID_V2,
);
assert.equal(
  derived.vault_bytes32_id,
  VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_BYTES32_V2,
);
assert.equal(
  derived.commitment.market_vault.creation_bytecode_sha256,
  "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540",
);
assert.equal(
  derived.commitment.market_vault.runtime_template_sha256,
  "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e",
);

const census = buildVoidWcVoidCoupledLaunchRegenerationCensusV2();
assert.equal(
  census.marker,
  VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_CENSUS_V2,
);
assert.equal(census.version, 2);
assert.equal(
  census.status,
  "CORRECTED_GENERATION_ATOMIC_REBIND_SOURCE_GREEN",
);
assert.equal(census.corrected_generation_derived, true);
const parentRegenerationPath =
  "tools/void-wc-void-coupled-launch-regeneration-v2.mjs";
assert.equal(
  VOID_WC_VOID_COUPLED_LAUNCH_NON_AUTHORITY_SOURCE_PATHS_V2.includes(
    parentRegenerationPath,
  ),
  true,
);
assert.equal(
  VOID_WC_VOID_COUPLED_LAUNCH_AUTHORITATIVE_REBIND_PATHS_V2.includes(
    parentRegenerationPath,
  ),
  false,
);
assert.ok(
  fs.readFileSync(parentRegenerationPath, "utf8").includes(
    VOID_WC_VOID_SUPERSEDED_COUPLED_LAUNCH_DIGEST_V1,
  ),
  "parent corrected-generation derivation must retain explicit old-generation lineage",
);
const atomicMigrationPlanPath =
  "ops/mainnet0/wc-void-coupled-launch-atomic-migration-plan-v2.json";
assert.equal(
  VOID_WC_VOID_COUPLED_LAUNCH_NON_AUTHORITY_SOURCE_PATHS_V2.includes(
    atomicMigrationPlanPath,
  ),
  true,
);
assert.equal(
  VOID_WC_VOID_COMPILED_IDENTITY_NON_AUTHORITY_PATHS_V2.includes(
    atomicMigrationPlanPath,
  ),
  true,
);
assert.equal(
  VOID_WC_VOID_COUPLED_LAUNCH_AUTHORITATIVE_REBIND_PATHS_V2.includes(
    atomicMigrationPlanPath,
  ),
  false,
);
assert.equal(
  VOID_WC_VOID_COMPILED_IDENTITY_AUTHORITATIVE_CONSUMER_PATHS_V2.includes(
    atomicMigrationPlanPath,
  ),
  false,
);
const atomicMigrationPlan = JSON.parse(
  fs.readFileSync(atomicMigrationPlanPath, "utf8"),
);
assert.equal(atomicMigrationPlan.authority.source_plan_only, true);
assert.equal(atomicMigrationPlan.authority.repository_application, false);
assert.equal(atomicMigrationPlan.authority.deployment, false);
assert.equal(atomicMigrationPlan.authority.market_activation, false);
assert.equal(atomicMigrationPlan.authority.public_presale_activation, false);
assert.equal(atomicMigrationPlan.authority.funds_movement, false);
assert.equal(
  census.corrected_coupled_launch_id,
  VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_ID_V2,
);
assert.equal(
  census.corrected_vault_bytes32,
  VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_BYTES32_V2,
);
assert.equal(
  census.superseded_coupled_launch_id,
  "sha256:" + VOID_WC_VOID_SUPERSEDED_COUPLED_LAUNCH_DIGEST_V1,
);
assert.equal(census.old_control_signature_generation_reusable, false);
assert.equal(
  census.canonical_candidate_current_launch_id,
  census.corrected_coupled_launch_id,
);
assert.equal(
  census.authoritative_path_count,
  VOID_WC_VOID_COUPLED_LAUNCH_AUTHORITATIVE_REBIND_PATHS_V2.length,
);
assert.equal(census.authoritative_path_count, 15);
assert.ok(
  VOID_WC_VOID_COUPLED_LAUNCH_AUTHORITATIVE_REBIND_PATHS_V2.includes(
    "src/index.ts",
  ),
  "runtime loader must be part of the authoritative rebind census",
);
assert.equal(census.remaining_superseded_authoritative_path_count, 0);
assert.equal(census.all_authoritative_old_generation_pins_present, false);
assert.equal(
  census.compiled_identity_authoritative_consumer_count,
  VOID_WC_VOID_COMPILED_IDENTITY_AUTHORITATIVE_CONSUMER_PATHS_V2.length,
);
assert.equal(census.compiled_identity_authoritative_consumer_count, 9);
assert.equal(
  census.remaining_superseded_compiled_identity_consumer_count,
  0,
);
assert.equal(
  census.all_current_authority_compiled_identity_rebindings_complete,
  true,
);
assert.deepEqual(
  census.unknown_superseded_compiled_identity_source_paths,
  [],
);
const discoveredCompiledIdentityPaths =
  discoverVoidWcVoidSupersededCompiledIdentitySourcePathsV2();
assert.deepEqual(
  census.discovered_superseded_compiled_identity_source_paths,
  discoveredCompiledIdentityPaths,
);
assert.equal(
  census.discovered_superseded_compiled_identity_source_path_count,
  discoveredCompiledIdentityPaths.length,
);
assert.deepEqual(
  census.expected_historical_compiled_identity_paths,
  VOID_WC_VOID_COMPILED_IDENTITY_HISTORICAL_PATHS_V2,
);
assert.deepEqual(
  census.expected_non_authority_compiled_identity_paths,
  VOID_WC_VOID_COMPILED_IDENTITY_NON_AUTHORITY_PATHS_V2,
);
for (
  const required of
  VOID_WC_VOID_COMPILED_IDENTITY_AUTHORITATIVE_CONSUMER_PATHS_V2
) {
  const entry = census.compiled_identity_authoritative_consumers.find(
    (item) => item.path === required,
  );
  assert.ok(entry, required);
  assert.equal(entry.superseded_creation_sha256_occurrences, 0, required);
  assert.equal(entry.superseded_runtime_sha256_occurrences, 0, required);
  assert.equal(entry.v1_acceptance_module_occurrences, 0, required);
  assert.ok(
    entry.corrected_creation_sha256_occurrences > 0 ||
      entry.corrected_runtime_sha256_occurrences > 0 ||
      entry.current_identity_module_occurrences > 0 ||
      entry.current_binding_id_occurrences > 0,
    required + ": corrected compiled-identity dependency required",
  );
}
assert.equal(
  VOID_WC_VOID_CORRECTED_CREATION_BYTECODE_SHA256_V2,
  "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540",
);
assert.equal(
  VOID_WC_VOID_CORRECTED_RUNTIME_TEMPLATE_SHA256_V2,
  "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e",
);
assert.equal(
  VOID_WC_VOID_CURRENT_COMPILED_IDENTITY_BINDING_ID_V2,
  "voidwcvcurrent2_bdc7c36595dd819924342a51cd38ed645edf304945ec773cc8877e07e767ca05",
);
assert.deepEqual(census.unknown_superseded_source_paths, []);
const discoveredSourcePaths =
  discoverVoidWcVoidSupersededGenerationSourcePathsV2();
assert.deepEqual(census.discovered_superseded_source_paths, discoveredSourcePaths);
assert.equal(
  census.discovered_superseded_source_path_count,
  discoveredSourcePaths.length,
);
assert.deepEqual(
  census.expected_historical_superseded_source_paths,
  VOID_WC_VOID_COUPLED_LAUNCH_HISTORICAL_GENERATION_PATHS_V2,
);
assert.deepEqual(
  census.expected_non_authority_superseded_source_paths,
  VOID_WC_VOID_COUPLED_LAUNCH_NON_AUTHORITY_SOURCE_PATHS_V2,
);
assert.equal(census.all_authoritative_rebindings_complete, true);

const currentIdentityWorkflowDependencies = Object.freeze([
  "tools/void-wc-void-market-vault-compiled-identity-current-v2.mjs",
  "ops/mainnet0/wc-void-market-vault-compiled-identity-current-binding-v2.json",
  "tools/void-wc-void-market-vault-compiled-identity-correction-v2.mjs",
  "ops/mainnet0/wc-void-market-vault-compiled-identity-correction-v2.json",
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json",
  "tools/void-wc-void-market-vault-compiler-identity-v1.mjs",
  "ops/mainnet0/wc-void-market-vault-compiler-identity-v1-artifact.zip.b64"
]);
for (const workflowPath of [
  ".github/workflows/void-wc-void-market-vault-runtime-attestation-v1.yml",
  ".github/workflows/void-wc-void-market-vault-at-use-revalidation-v1.yml",
  ".github/workflows/void-wc-void-bounded-canary-evidence-v1.yml",
  ".github/workflows/void-wc-void-market-vault-canonical-application-v1.yml",
  ".github/workflows/void-wc-void-market-vault-runtime-attestation-import-v1.yml",
  ".github/workflows/void-wc-void-bounded-canary-semantic-promotion-v1.yml",
  ".github/workflows/void-wc-void-bounded-canary-candidate-promotion-v1.yml",
  ".github/workflows/void-wc-void-bounded-canary-canonical-application-v1.yml"
]) {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  for (const dependency of currentIdentityWorkflowDependencies) {
    const occurrences = workflow.split('"' + dependency + '"').length - 1;
    assert.equal(
      occurrences,
      2,
      workflowPath + ": dependency must trigger both pull_request and push: " + dependency,
    );
  }
}

assert.equal(census.canonical_candidate_update_authorized, false);
assert.equal(census.controller_resigning_authorized, false);
assert.equal(census.live_activation_receipt_reuse_authorized, false);
assert.equal(census.deployment_authorized, false);
assert.equal(census.market_activation_authorized, false);
assert.equal(census.public_presale_activation_authorized, false);
assert.equal(census.funds_movement_authorized, false);
assert.equal(
  census.next_gate,
  "fresh_corrected_generation_control_ceremony_then_read_only_vault_observation",
);
assert.match(census.census_id, /^voidwclregen2_[0-9a-f]{64}$/u);

for (
  const required of
  VOID_WC_VOID_COUPLED_LAUNCH_AUTHORITATIVE_REBIND_PATHS_V2
) {
  const entry = census.authoritative_bindings.find(
    (item) => item.path === required,
  );
  assert.ok(entry, required);
  assert.equal(
    entry.superseded_digest_occurrences,
    0,
    required + ": current authority must not retain superseded generation",
  );
  assert.ok(
    entry.corrected_digest_occurrences > 0,
    required + ": corrected generation must be visible",
  );
}
for (const historical of VOID_WC_VOID_COUPLED_LAUNCH_HISTORICAL_GENERATION_PATHS_V2) {
  assert.equal(
    VOID_WC_VOID_COUPLED_LAUNCH_AUTHORITATIVE_REBIND_PATHS_V2.includes(
      historical,
    ),
    false,
  );
}
for (const historical of VOID_WC_VOID_COUPLED_LAUNCH_HISTORICAL_GENERATION_PATHS_V2) {
  assert.ok(
    fs.readFileSync(historical, "utf8").includes(
      VOID_WC_VOID_SUPERSEDED_COUPLED_LAUNCH_DIGEST_V1,
    ),
    historical + ": historical old-generation lineage must remain explicit",
  );
}
for (
  const historical of
  VOID_WC_VOID_COMPILED_IDENTITY_HISTORICAL_PATHS_V2
) {
  const text = fs.readFileSync(historical, "utf8");
  assert.ok(
    text.includes("9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af") ||
      text.includes("421f6e2ecbea1ccf02e20a52119323014a0f65906ff08d060d602ebebb327409") ||
      text.includes("void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs"),
    historical + ": superseded compiled-identity lineage must remain explicit",
  );
}



for (const [key, value] of Object.entries(
  VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_CENSUS_AUTHORITY_V2,
)) {
  assert.equal(
    value,
    [
      "source_census_only",
      "canonical_generation_derivation",
      "repository_source_read",
    ].includes(key),
    key,
  );
}

{
  const tampered = structuredClone(correction);
  tampered.canonical_compiler_artifacts.runtime_template_sha256 =
    "0".repeat(64);
  assert.throws(
    () => deriveCorrectedVoidWcVoidCoupledLaunchGenerationV2({
      correction: tampered,
      candidate,
      presale_source: presaleSource,
    }),
    /coupled_launch_regeneration_correction_v2_invalid/u,
  );
}

{
  const tampered = structuredClone(correction);
  tampered.correction_id =
    "voidwcvcic2_" + "0".repeat(64);
  assert.throws(
    () => deriveCorrectedVoidWcVoidCoupledLaunchGenerationV2({
      correction: tampered,
      candidate,
      presale_source: presaleSource,
    }),
    /coupled_launch_regeneration_correction_v2_invalid/u,
  );
}

{
  const tampered = structuredClone(candidate);
  tampered.wc_void_opening.opening_sale_tranche_void_atoms = "1";
  assert.throws(
    () => deriveCorrectedVoidWcVoidCoupledLaunchGenerationV2({
      correction,
      candidate: tampered,
      presale_source: presaleSource,
    }),
    /coupled_launch_regeneration_opening_policy_invalid/u,
  );
}

assert.throws(
  () => deriveCorrectedVoidWcVoidCoupledLaunchGenerationV2({
    correction,
    candidate,
    presale_source: presaleSource.replace(
      'canonical_presale_max_void: "10000000"',
      'canonical_presale_max_void: "9999999"',
    ),
  }),
  /coupled_launch_regeneration_presale_policy_invalid/u,
);

console.log(
  "VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_CENSUS_V2_PROOF_GREEN",
);
console.log(
  "corrected_coupled_launch_id=" +
    VOID_WC_VOID_CORRECTED_COUPLED_LAUNCH_ID_V2,
);
console.log(
  "authoritative_path_count=" + String(census.authoritative_path_count),
);
console.log(
  "remaining_superseded_authoritative_path_count=" +
    String(census.remaining_superseded_authoritative_path_count),
);
console.log("authoritative_source_census_exhaustive=true");
console.log("unknown_superseded_source_paths=0");
console.log(
  "compiled_identity_authoritative_consumer_count=" +
    String(census.compiled_identity_authoritative_consumer_count),
);
console.log(
  "remaining_superseded_compiled_identity_consumer_count=" +
    String(census.remaining_superseded_compiled_identity_consumer_count),
);
console.log("unknown_superseded_compiled_identity_source_paths=0");
console.log("compiled_identity_dependency_census_exhaustive=true");
console.log("canonical_correction_verifier_required=true");
console.log("old_control_signature_generation_reusable=false");
console.log("atomic_corrected_generation_rebind_source_green=true");
console.log("all_authoritative_rebindings_complete=true");
console.log("all_current_authority_compiled_identity_rebindings_complete=true");
console.log("partial_rebind_authorized=false");
console.log("canonical_candidate_update_authorized=false");
console.log("controller_resigning_authorized=false");
console.log("deployment_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("funds_movement=false");

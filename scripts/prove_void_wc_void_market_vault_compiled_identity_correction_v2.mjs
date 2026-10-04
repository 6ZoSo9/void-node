#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_AUTHORITY_V2,
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2,
  verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2,
} from "../tools/void-wc-void-market-vault-compiled-identity-correction-v2.mjs";

import {
  deriveWcVoidCoupledLaunchIdentityV1,
} from "../tools/void-wc-void-coupled-launch-identity-reconciliation-v1.mjs";

const v1 = JSON.parse(fs.readFileSync(
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json",
  "utf8",
));
const v2 = JSON.parse(fs.readFileSync(
  "ops/mainnet0/wc-void-market-vault-compiled-identity-correction-v2.json",
  "utf8",
));

const preservedArtifactBase64 = fs.readFileSync(
  "ops/mainnet0/wc-void-market-vault-compiler-identity-v1-artifact.zip.b64",
  "utf8",
).trim();
assert.match(
  preservedArtifactBase64,
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u,
);
const preservedArtifactZip = Buffer.from(preservedArtifactBase64, "base64");
assert.equal(
  preservedArtifactZip.toString("base64"),
  preservedArtifactBase64,
);
assert.equal(preservedArtifactZip.length, 11283);
assert.equal(
  preservedArtifactZip.subarray(0, 4).toString("hex"),
  "504b0304",
);
assert.equal(
  crypto.createHash("sha256").update(preservedArtifactZip).digest("hex"),
  v2.canonical_identity_evidence.workflow_artifact_zip_sha256,
);

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2,
  "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2",
);

const result =
  verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
    supersededV1: v1,
    correctionV2: v2,
  });

const canonicalCommitment = (creationSha256, runtimeSha256) => ({
  schema: "void.presale-wc-void-current-deployment-commitment.v1",
  version: 1,
  chain_id: 2050,
  presale: {
    policy_marker: "VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1",
    canonical_presale_max_void: "10000000",
    rate_void_units_numerator: "2",
    rate_void_units_denominator: "1",
  },
  wc_void: {
    pair: "WC_VOID",
    protocol_void_inventory_atoms: "10000000000000000000000000",
    opening_sale_tranche_void_atoms: "5000000000000000000000000",
    post_opening_void_reserve_atoms: "5000000000000000000000000",
    protocol_wc_seed_units: "0",
    fixed_conversion: false,
    fixed_opening_price: false,
    opening_price_source: "settled_wc_over_opening_sale_tranche",
    opening_allocation_policy: "pro_rata_largest_remainder_v1",
  },
  market_vault: {
    contract_name: "WCVoidMarketVaultV2",
    compiled_identity_id: v2.accepted_identity.identity_id,
    creation_bytecode_sha256: creationSha256,
    runtime_template_sha256: runtimeSha256,
    immutable_layout_sha256:
      v2.canonical_compiler_artifacts.immutable_layout_sha256,
  },
  launch_order: {
    presale_wc_void_simultaneous_launch: true,
    presale_launch_requires_wc_void_activation_ready: true,
    wc_void_launch_requires_presale_activation_ready: true,
  },
});

const supersededDerived =
  deriveWcVoidCoupledLaunchIdentityV1(
    canonicalCommitment(
      v2.superseded_v1.creation_bytecode_sha256,
      v2.superseded_v1.runtime_template_sha256,
    ),
  );
const correctedDerived =
  deriveWcVoidCoupledLaunchIdentityV1(
    canonicalCommitment(
      v2.canonical_compiler_artifacts.creation_bytecode_sha256,
      v2.canonical_compiler_artifacts.runtime_template_sha256,
    ),
  );

assert.equal(result.ok, true);
assert.equal(
  result.status,
  "COMPILED_IDENTITY_CORRECTION_V2_PROOF_GREEN",
);
assert.equal(result.corrected_creation_bytecode_bytes, 9441);
assert.equal(
  result.corrected_creation_bytecode_sha256,
  "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540",
);
assert.equal(result.corrected_runtime_template_bytes, 8342);
assert.equal(
  result.corrected_runtime_template_sha256,
  "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e",
);
assert.equal(
  result.corrected_creation_bytecode_keccak256,
  "0xa741a938f6570d3b8de727e7487460a0dda04244e6e45a79ab22756b16369c41",
);
assert.equal(
  result.corrected_runtime_template_keccak256,
  "0xea29fc4564e552b4b16a824f9f9566edc82d886b81d908f6205091cbe6ce24af",
);
assert.equal(result.correction_id, v2.correction_id);
assert.equal(
  v2.canonical_identity_evidence.source,
  "pinned_github_actions_compiler_identity_artifact",
);
assert.equal(
  v2.canonical_identity_evidence.corrected_bytes_derived_from_superseded_packet,
  false,
);
assert.equal(v2.correction.canonical_creation_bytecode_bytes, 9441);
assert.equal(v2.correction.v1_creation_excess_bytes_vs_canonical, 963);
assert.equal(v2.correction.canonical_runtime_template_bytes, 8342);
assert.equal(v2.correction.v1_runtime_excess_bytes_vs_canonical, 953);
assert.equal(
  result.superseded_coupled_launch_id,
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26",
);
assert.equal(
  result.corrected_coupled_launch_id,
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
);
assert.equal(
  supersededDerived.opening_domain_id,
  result.superseded_coupled_launch_id,
  "superseded coupled launch ID must derive from the canonical launch commitment",
);
assert.equal(
  correctedDerived.opening_domain_id,
  result.corrected_coupled_launch_id,
  "corrected coupled launch ID must derive from the canonical launch commitment",
);
assert.equal(
  correctedDerived.vault_bytes32_id,
  v2.coupled_launch_effect.corrected_vault_bytes32,
  "corrected vault bytes32 must be the lossless launch-ID encoding bridge",
);
assert.notEqual(
  correctedDerived.opening_domain_id,
  supersededDerived.opening_domain_id,
  "corrected bytecode hashes must change the coupled launch identity",
);
assert.equal(result.deployment_authorized, false);
assert.equal(result.funds_movement, false);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_AUTHORITY_V2,
)) {
  assert.equal(
    value,
    key === "source_correction_only",
    key,
  );
}

const forged = structuredClone(v2);
forged.canonical_compiler_artifacts.creation_bytecode_sha256 =
  "0".repeat(64);
assert.throws(
  () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
    supersededV1: v1,
    correctionV2: forged,
  }),
  /canonical_compiler_artifact_hash_mismatch/u,
);

{
  const forgedProvenance = structuredClone(v2);
  forgedProvenance.accepted_identity.workflow_artifact_zip_sha256 =
    "0".repeat(64);
  assert.throws(
    () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: forgedProvenance,
    }),
    /compiler_identity_provenance_mismatch:workflow_artifact_zip_sha256/u,
  );
}

{
  const forgedUnchangedArtifact = structuredClone(v2);
  forgedUnchangedArtifact.canonical_compiler_artifacts.immutable_layout_sha256 =
    "0".repeat(64);
  assert.throws(
    () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: forgedUnchangedArtifact,
    }),
    /canonical_compiler_unchanged_artifact_mismatch:immutable_layout_sha256/u,
  );
}

{
  const forgedKeccak = structuredClone(v2);
  forgedKeccak.canonical_compiler_artifacts.creation_bytecode_keccak256 =
    "0x" + "0".repeat(64);
  assert.throws(
    () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: forgedKeccak,
    }),
    /canonical_compiler_artifact_keccak_mismatch/u,
  );
}

{
  const forgedCorrectionShape = structuredClone(v2);
  forgedCorrectionShape.correction.compiler_identity_recompile_required = true;
  assert.throws(
    () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: forgedCorrectionShape,
    }),
    /superseded_v1_overcapture_shape_invalid/u,
  );
}

{
  const forgedEvidenceSource = structuredClone(v2);
  forgedEvidenceSource.canonical_identity_evidence.source =
    "superseded_v1_packet";
  assert.throws(
    () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: forgedEvidenceSource,
    }),
    /canonical_identity_evidence_mismatch:source/u,
  );
}

{
  const forgedEvidenceDerivation = structuredClone(v2);
  forgedEvidenceDerivation.canonical_identity_evidence
    .corrected_bytes_derived_from_superseded_packet = true;
  assert.throws(
    () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: forgedEvidenceDerivation,
    }),
    /canonical_identity_evidence_mismatch:corrected_bytes_derived_from_superseded_packet/u,
  );
}

{
  const forgedEvidenceShape = structuredClone(v2);
  forgedEvidenceShape.canonical_identity_evidence.unexpected = false;
  assert.throws(
    () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: forgedEvidenceShape,
    }),
    /canonical_identity_evidence_keys_mismatch/u,
  );
}

{
  const forgedCanonicalBytes = structuredClone(v2);
  forgedCanonicalBytes.correction.canonical_creation_bytecode_bytes = 10404;
  assert.throws(
    () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: forgedCanonicalBytes,
    }),
    /superseded_v1_overcapture_shape_invalid/u,
  );
}

{
  const forgedExcess = structuredClone(v2);
  forgedExcess.correction.v1_runtime_excess_bytes_vs_canonical = 0;
  assert.throws(
    () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: forgedExcess,
    }),
    /superseded_v1_overcapture_shape_invalid/u,
  );
}

{
  const forgedAuthority = structuredClone(v2);
  forgedAuthority.authority.deployment = true;
  assert.throws(
    () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: forgedAuthority,
    }),
    /correction_authority_invalid:deployment/u,
  );
}

{
  const forgedLaunch = structuredClone(v2);
  forgedLaunch.coupled_launch_effect.corrected_coupled_launch_id =
    "sha256:" + "0".repeat(64);
  forgedLaunch.coupled_launch_effect.corrected_vault_bytes32 =
    "0x" + "0".repeat(64);
  assert.throws(
    () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: forgedLaunch,
    }),
    /coupled_launch_correction_binding_invalid/u,
  );
}

{
  const forgedCorrectionId = structuredClone(v2);
  forgedCorrectionId.correction_id =
    "voidwcvcic2_" + "0".repeat(64);
  assert.throws(
    () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: forgedCorrectionId,
    }),
    /correction_id_content_mismatch/u,
  );
}

{
  const forgedShape = structuredClone(v2);
  forgedShape.unexpected = false;
  assert.throws(
    () => verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
      supersededV1: v1,
      correctionV2: forgedShape,
    }),
    /correction_v2_keys_mismatch/u,
  );
}

console.log(
  "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2_PROOF_GREEN",
);
console.log("canonical_compiler_identity_preserved=true");
console.log("compiler_identity_provenance_bound=true");
console.log("unchanged_compiler_artifact_hashes_bound=true");
console.log("canonical_compiler_bytes_bound_to_retained_identity=true");
console.log("canonical_identity_evidence_schema_closed=true");
console.log("corrected_bytes_derived_from_superseded_packet=false");
console.log("correction_authority_exact_and_zero=true");
console.log("canonical_compiler_keccak_review_binding=true");
console.log("correction_schema_closed=true");
console.log("correction_id_content_addressed=true");
console.log("coupled_launch_id_recomputed_inside_verifier=true");
console.log("coupled_launch_id_recomputed_from_canonical_commitment=true");
console.log("coupled_launch_bytes32_bridge_recomputed=true");
console.log("v1_deployment_bytes_superseded=true");
console.log("corrected_creation_bytecode_bytes=9441");
console.log("corrected_runtime_template_bytes=8342");
console.log(
  "corrected_coupled_launch_id=sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
);
console.log("deployment_authorized=false");
console.log("canonical_compiler_artifact_archive_preserved=true");
console.log("canonical_compiler_artifact_archive_zip_sha256=" +
  v2.canonical_identity_evidence.workflow_artifact_zip_sha256);
console.log("funds_movement=false");

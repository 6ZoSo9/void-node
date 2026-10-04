#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_AUTHORITY_V2,
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2,
  verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2,
} from "../tools/void-wc-void-market-vault-compiled-identity-correction-v2.mjs";

const v1 = JSON.parse(fs.readFileSync(
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json",
  "utf8",
));
const v2 = JSON.parse(fs.readFileSync(
  "ops/mainnet0/wc-void-market-vault-compiled-identity-correction-v2.json",
  "utf8",
));

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2,
  "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2",
);

const result =
  verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
    supersededV1: v1,
    correctionV2: v2,
  });

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
  result.superseded_coupled_launch_id,
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26",
);
assert.equal(
  result.corrected_coupled_launch_id,
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
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

console.log(
  "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2_PROOF_GREEN",
);
console.log("canonical_compiler_identity_preserved=true");
console.log("v1_deployment_bytes_superseded=true");
console.log("corrected_creation_bytecode_bytes=9441");
console.log("corrected_runtime_template_bytes=8342");
console.log(
  "corrected_coupled_launch_id=sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
);
console.log("deployment_authorized=false");
console.log("funds_movement=false");

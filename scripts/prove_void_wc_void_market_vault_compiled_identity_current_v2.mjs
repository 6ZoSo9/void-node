#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  EXPECTED,
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_AUTHORITY_V2,
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_V2,
  loadWcVoidMarketVaultCompiledIdentityCurrentV2,
  verifyWcVoidMarketVaultCompiledIdentityCurrentV2,
} from "../tools/void-wc-void-market-vault-compiled-identity-current-v2.mjs";
import {
  verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2,
} from "../tools/void-wc-void-market-vault-compiled-identity-correction-v2.mjs";

const bindingBytes = fs.readFileSync(
  "ops/mainnet0/wc-void-market-vault-compiled-identity-current-binding-v2.json",
);
const binding = JSON.parse(bindingBytes.toString("utf8"));
const correction = JSON.parse(fs.readFileSync(
  "ops/mainnet0/wc-void-market-vault-compiled-identity-correction-v2.json",
  "utf8",
));
const superseded = JSON.parse(fs.readFileSync(
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json",
  "utf8",
));

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_V2,
  "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_V2",
);
assert.equal(binding.marker,
  "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_BINDING_V2");
assert.equal(binding.version, 2);
assert.equal(binding.status,
  "COMPILED_IDENTITY_CURRENT_CORRECTED_DEPLOYMENT_HOLD");
assert.equal(binding.binding_id, EXPECTED.packet_id);
assert.equal(bindingBytes.length, EXPECTED.packet_json_bytes);
assert.equal(
  crypto.createHash("sha256").update(bindingBytes).digest("hex"),
  EXPECTED.packet_json_sha256,
);
assert.equal(binding.corrected_coupled_launch_id,
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d");
assert.equal(binding.corrected_vault_bytes32,
  "0xb893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d");

const corrected =
  verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2({
    supersededV1: superseded,
    correctionV2: correction,
  });
assert.equal(corrected.ok, true);
assert.equal(corrected.correction_id, binding.correction_id);
assert.equal(
  corrected.corrected_coupled_launch_id,
  binding.corrected_coupled_launch_id,
);
assert.equal(corrected.deployment_authorized, false);

const current = loadWcVoidMarketVaultCompiledIdentityCurrentV2();
const verified = verifyWcVoidMarketVaultCompiledIdentityCurrentV2(current);
assert.equal(verified.ok, true);
assert.equal(
  verified.status,
  "compiled_identity_current_corrected_held_on_chain2050_vault_deployment_attestation",
);
assert.equal(verified.packet_id, EXPECTED.packet_id);
assert.equal(verified.identity_id, EXPECTED.identity_id);
assert.equal(current.accepted_identity.identity_id, EXPECTED.identity_id);
assert.equal(
  current.accepted_identity.identity_json_sha256,
  EXPECTED.identity_json_sha256,
);
assert.equal(
  current.artifacts.creation_bytecode_bytes,
  EXPECTED.creation_bytecode_bytes,
);
assert.equal(
  current.artifacts.creation_bytecode_sha256,
  EXPECTED.creation_bytecode_sha256,
);
assert.equal(
  current.artifacts.creation_bytecode_keccak256,
  EXPECTED.creation_bytecode_keccak256,
);
assert.equal(
  current.artifacts.runtime_template_bytes,
  EXPECTED.runtime_template_bytes,
);
assert.equal(
  current.artifacts.runtime_template_sha256,
  EXPECTED.runtime_template_sha256,
);
assert.equal(
  current.artifacts.runtime_template_keccak256,
  EXPECTED.runtime_template_keccak256,
);
assert.equal(
  current.artifacts.immutable_layout_sha256,
  EXPECTED.immutable_layout_sha256,
);
assert.equal(
  current.correction_binding.corrected_coupled_launch_id,
  binding.corrected_coupled_launch_id,
);
assert.equal(
  current.correction_binding.corrected_vault_bytes32,
  binding.corrected_vault_bytes32,
);
assert.equal(current.decision.v1_deployment_artifact_superseded, true);
assert.equal(current.decision.deployment_attested, false);
assert.equal(current.decision.market_activation_authorized, false);
assert.equal(current.decision.public_presale_activation_authorized, false);

assert.equal(
  superseded.artifacts.creation_bytecode_sha256,
  "9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af",
);
assert.equal(
  superseded.artifacts.runtime_template_sha256,
  "421f6e2ecbea1ccf02e20a52119323014a0f65906ff08d060d602ebebb327409",
);
assert.notEqual(
  current.artifacts.creation_bytecode_sha256,
  superseded.artifacts.creation_bytecode_sha256,
);
assert.notEqual(
  current.artifacts.runtime_template_sha256,
  superseded.artifacts.runtime_template_sha256,
);
assert.throws(
  () => verifyWcVoidMarketVaultCompiledIdentityCurrentV2(superseded),
  /current_identity_packet_/u,
);

{
  const tampered = structuredClone(current);
  tampered.artifacts.runtime_template_sha256 = "0".repeat(64);
  assert.throws(
    () => verifyWcVoidMarketVaultCompiledIdentityCurrentV2(tampered),
    /current_identity_artifact_invalid/u,
  );
}
{
  const tampered = structuredClone(current);
  tampered.correction_binding.corrected_coupled_launch_id =
    "sha256:" + "0".repeat(64);
  assert.throws(
    () => verifyWcVoidMarketVaultCompiledIdentityCurrentV2(tampered),
    /current_identity_correction_binding_invalid/u,
  );
}
{
  const tampered = structuredClone(current);
  tampered.authority.deployment = true;
  assert.throws(
    () => verifyWcVoidMarketVaultCompiledIdentityCurrentV2(tampered),
    /current_identity_deployment_or_authority_invalid/u,
  );
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_AUTHORITY_V2,
)) {
  assert.equal(value, key === "source_artifact_read", key);
}

const source = fs.readFileSync(
  "tools/void-wc-void-market-vault-compiled-identity-current-v2.mjs",
  "utf8",
);
assert.match(source, /wc-void-market-vault-compiler-identity-v1-artifact\.zip\.b64/u);
assert.match(source, /inflateRawSync/u);
assert.match(source, /verifyVoidWcVoidMarketVaultCompiledIdentityCorrectionV2/u);
assert.match(source, /verifyWcVoidMarketVaultCompiledIdentityCurrentV2/u);
assert.doesNotMatch(source, /eth_sendRawTransaction/u);
assert.doesNotMatch(source, /new Wallet/u);
assert.doesNotMatch(source, /writeFileSync/u);

console.log("VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CURRENT_V2_GREEN");
console.log("current_binding_id=" + EXPECTED.packet_id);
console.log("corrected_creation_bytecode_sha256=" +
  EXPECTED.creation_bytecode_sha256);
console.log("corrected_runtime_template_sha256=" +
  EXPECTED.runtime_template_sha256);
console.log("historical_v1_deployment_artifact_authoritative=false");
console.log("old_control_signature_generation_reusable=false");
console.log("deployment_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("funds_movement=false");

#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const manifestPath =
  "ops/mainnet0/wc-void-market-vault-v2-compiled-identity-v1.json";
const candidatePath =
  "ops/mainnet0/wc-void-production-candidate-v1.json";

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") +
    "}"
  );
}

function readHex(path) {
  const text = fs.readFileSync(path, "utf8").trim();
  assert.match(text, /^0x[0-9a-f]+$/);
  assert.equal((text.length - 2) % 2, 0);
  return Buffer.from(text.slice(2), "hex");
}

assert.equal(
  manifest.marker,
  "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_V1",
);
assert.equal(manifest.version, 1);
assert.equal(
  manifest.identity_id,
  "voidwcvci1_f4096e7c4520897d656a64a8be5b344a3541e0e960226787654415f867f2d045",
);
assert.equal(
  manifest.source_commit,
  "9309c9fff7e2e53de92977585897c678933d64b9",
);
assert.equal(
  manifest.contract_path,
  "contracts/mainnet/WCVoidMarketVaultV2.sol",
);
assert.equal(manifest.contract_name, "WCVoidMarketVaultV2");
assert.equal(manifest.compiler_profile.release, "0.8.24+commit.e11b9ed9");
assert.equal(manifest.compiler_profile.evm_version, "paris");
assert.equal(manifest.compiler_profile.optimizer_enabled, false);
assert.equal(manifest.compiler_profile.optimizer_runs, 200);
assert.equal(manifest.compiler_profile.via_ir, false);

const sourceBytes = fs.readFileSync(manifest.contract_path);
assert.equal(sha256(sourceBytes), manifest.contract_source_sha256);

const creation = readHex(manifest.artifacts.creation_bytecode_path);
const runtime = readHex(manifest.artifacts.runtime_template_path);

assert.equal(
  creation.length,
  manifest.artifacts.creation_bytecode_bytes,
);
assert.equal(
  sha256(creation),
  manifest.artifacts.creation_bytecode_sha256,
);
assert.equal(
  runtime.length,
  manifest.artifacts.runtime_template_bytes,
);
assert.equal(
  sha256(runtime),
  manifest.artifacts.runtime_template_sha256,
);

const layout = manifest.artifacts.immutable_layout;
assert.deepEqual(Object.keys(layout).sort(), [
  "closeoutController",
  "coupledLaunchId",
  "launchController",
  "settlementExecutor",
  "token",
]);
assert.equal(
  sha256(canonicalJson(layout)),
  manifest.artifacts.immutable_layout_sha256,
);

const occupied = new Set();
for (const value of Object.values(layout)) {
  assert.ok(Number.isSafeInteger(value.ast_id));
  assert.ok(Array.isArray(value.references));
  assert.ok(value.references.length >= 1);
  for (const ref of value.references) {
    assert.ok(Number.isSafeInteger(ref.start));
    assert.equal(ref.length, 32);
    assert.ok(ref.start >= 0);
    assert.ok(ref.start + ref.length <= runtime.length);
    for (let offset = ref.start; offset < ref.start + ref.length; offset += 1) {
      assert.equal(occupied.has(offset), false, "immutable reference overlap");
      occupied.add(offset);
    }
  }
}

assert.deepEqual(
  manifest.deployment_identity_requirements.constructor_order,
  [
    "void_token",
    "launch_controller",
    "settlement_executor",
    "closeout_controller",
    "coupled_launch_id",
  ],
);
assert.equal(
  manifest.deployment_identity_requirements.opening_inventory_atoms,
  "10000000000000000000000000",
);

assert.equal(manifest.workflow_provenance.workflow_run_id, 36150784375);
assert.equal(manifest.workflow_provenance.workflow_run_number, 4);
assert.equal(manifest.workflow_provenance.workflow_job_id, 108125074194);
assert.equal(manifest.workflow_provenance.artifact_id, 10871757418);
assert.equal(
  manifest.workflow_provenance.artifact_zip_sha256,
  "7675b346213bd9384c0680f2ef8f95d04ed6054597be1ca0864093ea404a663a",
);

assert.equal(manifest.accepted.compiled_identity_committed, true);
assert.equal(manifest.accepted.deployment_attested, false);
assert.equal(manifest.accepted.market_vault_address, null);
assert.equal(manifest.accepted.final_role_bindings_attested, false);
assert.equal(manifest.accepted.inventory_funding_verified, false);
assert.equal(manifest.accepted.inventory_lock_verified, false);
assert.equal(manifest.accepted.market_activation_authorized, false);
assert.equal(
  manifest.accepted.public_presale_activation_authorized,
  false,
);
for (const [key, value] of Object.entries(manifest.authority)) {
  assert.equal(value, false, "authority." + key);
}

assert.equal(candidate.market_vault_compiled_identity_committed, true);
assert.equal(
  candidate.market_vault_compiled_identity_id,
  manifest.identity_id,
);
assert.equal(
  candidate.market_vault_compiled_identity_manifest_path,
  manifestPath,
);
assert.equal(
  candidate.market_vault_creation_bytecode_sha256,
  manifest.artifacts.creation_bytecode_sha256,
);
assert.equal(
  candidate.market_vault_runtime_template_sha256,
  manifest.artifacts.runtime_template_sha256,
);
assert.equal(
  candidate.market_vault_immutable_layout_sha256,
  manifest.artifacts.immutable_layout_sha256,
);
assert.equal(candidate.market_vault_address, null);
assert.equal(candidate.market_vault_runtime_code_sha256, null);
assert.equal(candidate.market_vault_independently_verified, false);
assert.equal(candidate.inventory_funded, false);
assert.equal(candidate.inventory_lock_proven, false);
assert.equal(candidate.bounded_canary_green, false);
assert.equal(candidate.coupled_activation_ready, false);

const source = fs.readFileSync(
  "tools/void-wc-void-market-vault-compiler-identity-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider",
  "broadcastTransaction",
  "sendTransaction",
  "forge create",
  "cast send",
  "--private-key",
  "eth_sendRawTransaction",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_V1_PROOF_GREEN",
);
console.log("identity_id=" + manifest.identity_id);
console.log("source_commit=" + manifest.source_commit);
console.log(
  "creation_bytecode_sha256=" +
    manifest.artifacts.creation_bytecode_sha256,
);
console.log(
  "runtime_template_sha256=" +
    manifest.artifacts.runtime_template_sha256,
);
console.log(
  "immutable_layout_sha256=" +
    manifest.artifacts.immutable_layout_sha256,
);
console.log("compiled_identity_committed=true");
console.log("deployment_attested=false");
console.log("market_vault_address_present=false");
console.log("inventory_funding=false");
console.log("inventory_lock=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
